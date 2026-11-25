import type { Rng } from './combat/rng.js';
import { activityItems, PROFESSIONS, professionTerrains } from './content/professions.js';
import { mapHexAt, regionAt, REGIONS, REGION_IDS, worldMapHexes, type RegionId } from './content/world-map.js';
import { hexDistance } from './hex.js';
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
    .flatMap((p) => p.activities.flatMap((a) => activityItems(a))),
);

/** Grade an item gets when none is given: Common for gathered materials, else none. */
export const defaultGrade = (defId: string): number | null =>
  GATHERED_MATERIALS.has(defId) ? 1 : null;

/*
 * Request #82: hot zones. Where gathering pays changes every day.
 *
 * - DEPOSITS are fixed: some hexes hold a vein (gems, later gold…) and always
 *   will. Deposit drops are only found there, so players learn the map.
 * - Every day each gathering profession has one region IN BOOM (a nation or the
 *   Riftlands). Every region gets its day once in each cycle, in an order that
 *   changes from cycle to cycle. There: more success, better grades, deposit
 *   drops more often.
 * - Inside the booming region one hex is the day's MOTHERLODE. Nobody is told
 *   where; the rumour only names a hex near it. Standing on it reveals it.
 *
 * Everything is a pure function of the hex, the profession and the day (UTC,
 * the same day as the Rift layout). ALL NUMBERS PROVISIONAL (A144).
 */
export const HOTZONE_RULES = {
  /** Share of suitable hexes that hold a deposit (fixed forever). */
  depositShare: 0.2,
  /** Booming region: success bonus, grade richness steps, deposit weight ×. */
  boomSuccess: 10,
  boomRichness: 1,
  boomDepositMultiplier: 3,
  /** The day's motherlode (on top of the boom). */
  motherlodeSuccess: 10,
  motherlodeDepositMultiplier: 2,
  /** The rumour names a hex at most this far from the motherlode. */
  rumourRadius: 3,
} as const;

const DAY_MS = 86_400_000;
/** The gathering day (UTC), same clock as the Rift layout. */
export const gatheringDay = (now: Date = new Date()) => Math.floor(now.getTime() / DAY_MS);

/** Whether a hex holds a fixed deposit for a profession. */
export function isDepositHex(hex: HexCoord, professionId: string): boolean {
  if (!resourceNodeAt(hex, professionId)) return false;
  return hash(hex.q, hex.r, `deposit:${professionId}`) < HOTZONE_RULES.depositShare;
}

/** The region in boom for a profession on a day: each region once per cycle. */
export function boomRegion(professionId: string, day: number): RegionId {
  const n = REGION_IDS.length;
  const cycle = Math.floor(day / n);
  // Shuffle the regions for this cycle (stable per profession and cycle).
  const order = [...REGION_IDS]
    .map((id, i) => ({ id, k: hash(cycle, i, `boom:${professionId}`) }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.id);
  return order[((day % n) + n) % n]!;
}

const suitableCache = new Map<string, HexCoord[]>();
/** Hexes of a region where a profession can gather (deposits first if any). */
function suitableHexes(professionId: string, region: RegionId): HexCoord[] {
  const key = `${professionId}|${region}`;
  let list = suitableCache.get(key);
  if (!list) {
    list = worldMapHexes(new Date(0))
      .filter((h) => h.region === region && resourceNodeAt(h, professionId))
      .map((h) => ({ q: h.q, r: h.r }));
    suitableCache.set(key, list);
  }
  return list;
}

/** The day's motherlode for a profession (null if its booming region has no suitable hex). */
export function motherlodeHex(professionId: string, day: number): HexCoord | null {
  const all = suitableHexes(professionId, boomRegion(professionId, day));
  if (!all.length) return null;
  const deposits = all.filter((h) => isDepositHex(h, professionId));
  const pool = deposits.length ? deposits : all;
  return pool[Math.floor(hash(day, pool.length, `lode:${professionId}`) * pool.length)]!;
}

/** What a hex offers a profession today. */
export interface SiteConditions {
  deposit: boolean;
  boom: boolean;
  motherlode: boolean;
  /** Added to the success chance. */
  successBonus: number;
  /** Added to the node richness for grades (capped at rich). */
  richnessBonus: number;
  /** Weight multiplier of deposit drops (0 = none here). */
  depositMultiplier: number;
}

export function siteConditions(
  hex: HexCoord,
  professionId: string,
  day: number = gatheringDay(),
): SiteConditions {
  const R = HOTZONE_RULES;
  const deposit = isDepositHex(hex, professionId);
  const region = regionAt(hex)?.id;
  const boom = !!region && region === boomRegion(professionId, day);
  const lode = boom ? motherlodeHex(professionId, day) : null;
  const motherlode = !!lode && lode.q === hex.q && lode.r === hex.r;
  return {
    deposit,
    boom,
    motherlode,
    successBonus: (boom ? R.boomSuccess : 0) + (motherlode ? R.motherlodeSuccess : 0),
    richnessBonus: boom ? R.boomRichness : 0,
    depositMultiplier: !deposit
      ? 0
      : (boom ? R.boomDepositMultiplier : 1) * (motherlode ? R.motherlodeDepositMultiplier : 1),
  };
}

export interface GatheringRumour {
  professionId: string;
  regionId: RegionId;
  regionName: string;
  /** A hex within `rumourRadius` of the motherlode (null = no motherlode). */
  near: HexCoord | null;
}

/** The day's word on the roads: where each gathering profession booms. */
export function gatheringRumours(day: number = gatheringDay()): GatheringRumour[] {
  return Object.values(PROFESSIONS)
    .filter((p) => p.category === 'gathering')
    .map((p) => {
      const regionId = boomRegion(p.id, day);
      const lode = motherlodeHex(p.id, day);
      let near: HexCoord | null = null;
      if (lode) {
        // A stable hex near the motherlode, inside the map.
        const around = suitableHexes(p.id, regionId).filter(
          (h) => hexDistance(h, lode) <= HOTZONE_RULES.rumourRadius,
        );
        const candidates = around.length ? around : [lode];
        near = candidates[Math.floor(hash(day, 7, `rumour:${p.id}`) * candidates.length)]!;
      }
      return { professionId: p.id, regionId, regionName: REGIONS[regionId].name, near };
    });
}
