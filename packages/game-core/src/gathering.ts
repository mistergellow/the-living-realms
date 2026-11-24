import type { Rng } from './combat/rng.js';
import { PROFESSIONS, professionTerrains } from './content/professions.js';
import { mapHexAt } from './content/world-map.js';
import type { HexCoord, ItemRarity } from '@realms/shared';

/*
 * Gathering, phase 2 of the Professions & Economy spec (request #52).
 *
 * Resource nodes: every hex whose terrain suits a gathering profession has one
 * node for it. A node holds a number of charges; each successful gather takes
 * one, and it regrows over time. Like AP, the server stores the amount and the
 * time it was written, and works out the current amount when read (nothing
 * runs on a timer). A node's richness is fixed per hex (deterministic).
 *
 * Material quality: gathered materials get a grade (Poor … Exceptional) from
 * the node's richness and the gatherer's Mastery. ALL NUMBERS PROVISIONAL.
 */

export const NODE_RICHNESS = ['poor', 'normal', 'rich'] as const;
export type NodeRichness = (typeof NODE_RICHNESS)[number];
export const NODE_RICHNESS_NAMES: Record<NodeRichness, string> = {
  poor: 'Poor',
  normal: 'Normal',
  rich: 'Rich',
};

export const RESOURCE_NODE_RULES = {
  /** Charges of a full node, by richness (poor, normal, rich). */
  maxByRichness: [12, 20, 30] as readonly number[],
  /** Charges regrown per hour. */
  regenPerHour: 5,
  /** Share of hexes with a poor / rich node (the rest are normal). */
  poorShare: 0.25,
  richShare: 0.2,
} as const;

export const MATERIAL_GRADES = ['poor', 'common', 'fine', 'superior', 'exceptional'] as const;
export type MaterialGrade = (typeof MATERIAL_GRADES)[number];
export const MATERIAL_GRADE_NAMES: Record<MaterialGrade, string> = {
  poor: 'Poor',
  common: 'Common',
  fine: 'Fine',
  superior: 'Superior',
  exceptional: 'Exceptional',
};
export const gradeName = (grade: number) =>
  MATERIAL_GRADE_NAMES[MATERIAL_GRADES[Math.max(0, Math.min(4, grade))]!];

/**
 * Request #78: the better the grade, the rarer the material (its name colour
 * and icon tile follow). PROVISIONAL mapping, A141: Poor → Common … Exceptional
 * → Legendary.
 */
export const GRADE_RARITY: readonly ItemRarity[] = [
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
];
export const gradeRarity = (grade: number): ItemRarity =>
  GRADE_RARITY[Math.max(0, Math.min(GRADE_RARITY.length - 1, grade))]!;

export const GRADE_RULES = {
  /** Roll 0–99, plus these; then the thresholds below pick the grade. */
  perRank: 8,
  /** Per richness step away from normal (poor −, rich +). */
  perRichness: 12,
  /** Upper bounds (exclusive) for Poor, Common, Fine, Superior; above = Exceptional. */
  thresholds: [20, 70, 92, 110] as readonly number[],
} as const;

const HOUR_MS = 3_600_000;

/** Stable value in [0, 1) per hex and profession. */
function hash(q: number, r: number, key: string): number {
  let n = (q * 374761393 + r * 668265263) | 0;
  for (let i = 0; i < key.length; i++) n = Math.imul(n ^ key.charCodeAt(i), 2654435761);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 2 ** 32;
}

export interface ResourceNodeDef {
  professionId: string;
  hex: HexCoord;
  /** 0 poor, 1 normal, 2 rich. */
  richness: number;
  max: number;
}

/** The node for a gathering profession on a hex, or null if the terrain has none. */
export function resourceNodeAt(hex: HexCoord, professionId: string): ResourceNodeDef | null {
  const terrains = professionTerrains(professionId);
  const h = mapHexAt(hex);
  if (!terrains || !h || !terrains.includes(h.terrain)) return null;
  const v = hash(hex.q, hex.r, professionId);
  const richness =
    v < RESOURCE_NODE_RULES.poorShare ? 0 : v >= 1 - RESOURCE_NODE_RULES.richShare ? 2 : 1;
  return {
    professionId,
    hex: { q: hex.q, r: hex.r },
    richness,
    max: RESOURCE_NODE_RULES.maxByRichness[richness]!,
  };
}

/** Charges a node has now: stored amount plus regrowth since it was written. */
export function nodeAmount(
  node: Pick<ResourceNodeDef, 'max'>,
  stored: number,
  since: Date,
  now: Date = new Date(),
): number {
  const grown =
    (Math.max(0, now.getTime() - since.getTime()) / HOUR_MS) * RESOURCE_NODE_RULES.regenPerHour;
  return Math.min(node.max, stored + grown);
}

/** When the node has at least one charge again (null if it has one now). */
export function nodeReadyAt(amount: number, now: Date = new Date()): Date | null {
  if (amount >= 1) return null;
  return new Date(now.getTime() + ((1 - amount) / RESOURCE_NODE_RULES.regenPerHour) * HOUR_MS);
}

/** Grade of a gathered material: richer nodes and more Mastery give better grades. */
export function rollGrade(rng: Rng, rank: number, richness: number): number {
  const roll = rng.int(100) + rank * GRADE_RULES.perRank + (richness - 1) * GRADE_RULES.perRichness;
  const i = GRADE_RULES.thresholds.findIndex((t) => roll < t);
  return i === -1 ? GRADE_RULES.thresholds.length : i;
}

/** Materials that come from gathering: they always carry a grade. */
export const GATHERED_MATERIALS: ReadonlySet<string> = new Set(
  Object.values(PROFESSIONS)
    .filter((p) => p.category === 'gathering')
    .flatMap((p) => p.activities.flatMap((a) => a.outputs.map((o) => o.item))),
);

/** Grade an item gets when none is given: Common for gathered materials, else none. */
export const defaultGrade = (defId: string): number | null =>
  GATHERED_MATERIALS.has(defId) ? 1 : null;
