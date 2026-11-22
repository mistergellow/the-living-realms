import {
  ATTRIBUTE_KEYS,
  ITEM_RARITIES,
  type AffixGroup,
  type AttributeKey,
  type Attributes,
  type GearCombatEffects,
  type ItemAffixDto,
  type ItemKind,
  type ItemRarity,
  type WeaponSpecial,
} from '@realms/shared';
import type { Rng } from '../combat/rng.js';

/*
 * Bonus effects on gear (request #37). PROVISIONAL CONTENT AND NUMBERS — the
 * owner chose the four groups (attributes, derived stats, offensive %, combat
 * effects); the list, the ranges and the drop weights are placeholders.
 *
 * - Every piece of gear holds 0–5 bonus effects, stored in `items.specials`
 *   as `{ id, value }`. The same effect never appears twice on one item.
 * - Rarity is just the number of effects: 0 common … 5 mythic.
 */

export const AFFIX_RULES = {
  maxAffixes: 5,
  /**
   * Chance (weights) of each number of effects on a dropped piece of gear,
   * index = number of effects. Provisional.
   */
  dropAffixWeights: [50, 28, 13, 6, 2.5, 0.5],
  /**
   * Request #50: drops scale with the Rift tier — a Rare (2 effects) in a
   * tier-1 Rift is very rare. Weights for 0…5 effects, per tier (PROVISIONAL, A105).
   */
  dropAffixWeightsByTier: {
    1: [85, 13, 1.7, 0.25, 0.05, 0],
    2: [70, 24, 5, 0.8, 0.15, 0.05],
    3: [55, 30, 11, 3, 0.8, 0.2],
    4: [40, 32, 18, 7, 2.4, 0.6],
    5: [25, 30, 25, 13, 5, 2],
  } as Record<number, readonly number[]>,
  /** On-hit statuses: duration and damage per round (bleed/burn). */
  onHitTurns: { bleed: 2, burn: 2, stun: 1 },
  onHitValue: { bleed: 3, burn: 3, stun: 0 },
} as const;

export const RARITY_NAMES: Record<ItemRarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
  mythic: 'Mythic',
};

export const rarityOf = (affixCount: number): ItemRarity =>
  ITEM_RARITIES[Math.max(0, Math.min(AFFIX_RULES.maxAffixes, affixCount))]!;

type GearKind = Extract<ItemKind, 'weapon' | 'offhand' | 'armor' | 'accessory'>;
const ALL: GearKind[] = ['weapon', 'offhand', 'armor', 'accessory'];
const OFFENSIVE: GearKind[] = ['weapon', 'offhand', 'accessory'];
const DEFENSIVE: GearKind[] = ['offhand', 'armor', 'accessory'];

/** What an effect does. Each kind is applied in `gearTotals`. */
export type AffixEffect =
  | { kind: 'attribute'; attribute: AttributeKey }
  | {
      kind: 'stat';
      stat: 'maxHp' | 'maxMana' | 'armor' | 'magicResist' | 'initiative' | 'focusPerRound';
    }
  | { kind: 'offense'; stat: 'damagePct' | 'critChance' | 'critDamage' | 'bossDamagePct' }
  | { kind: 'lifesteal' }
  | { kind: 'thorns' }
  | { kind: 'onHit'; status: 'bleed' | 'burn' | 'stun' };

export interface AffixDef {
  id: string;
  label: string;
  group: AffixGroup;
  effect: AffixEffect;
  /** Rolled value range (inclusive). */
  min: number;
  max: number;
  /** Shown as a percentage. */
  percent?: boolean;
  /** Gear kinds it can roll on. */
  kinds: GearKind[];
}

const ATTRIBUTE_LABEL: Record<AttributeKey, string> = {
  might: 'Might',
  agility: 'Agility',
  precision: 'Precision',
  endurance: 'Endurance',
  intellect: 'Intellect',
  will: 'Will',
};

const attributeAffixes: AffixDef[] = ATTRIBUTE_KEYS.map((k) => ({
  id: k,
  label: ATTRIBUTE_LABEL[k],
  group: 'attribute',
  effect: { kind: 'attribute', attribute: k },
  min: 1,
  max: 3,
  kinds: ALL,
}));

export const AFFIXES: Record<string, AffixDef> = Object.fromEntries(
  [
    ...attributeAffixes,
    // ---- derived stats ----
    {
      id: 'health',
      label: 'Health',
      group: 'stat',
      effect: { kind: 'stat', stat: 'maxHp' },
      min: 5,
      max: 20,
      kinds: ALL,
    },
    {
      id: 'mana',
      label: 'Mana',
      group: 'stat',
      effect: { kind: 'stat', stat: 'maxMana' },
      min: 4,
      max: 12,
      kinds: ALL,
    },
    {
      id: 'armor',
      label: 'Armor',
      group: 'stat',
      effect: { kind: 'stat', stat: 'armor' },
      min: 2,
      max: 8,
      kinds: DEFENSIVE,
    },
    {
      id: 'magic_resist',
      label: 'Magic Resist',
      group: 'stat',
      effect: { kind: 'stat', stat: 'magicResist' },
      min: 2,
      max: 8,
      kinds: DEFENSIVE,
    },
    {
      id: 'initiative',
      label: 'Initiative',
      group: 'stat',
      effect: { kind: 'stat', stat: 'initiative' },
      min: 1,
      max: 3,
      kinds: ALL,
    },
    {
      id: 'focus',
      label: 'Focus per round',
      group: 'stat',
      effect: { kind: 'stat', stat: 'focusPerRound' },
      min: 1,
      max: 1,
      kinds: ['weapon', 'accessory'],
    },
    // ---- offensive % ----
    {
      id: 'damage',
      label: 'Damage',
      group: 'offense',
      effect: { kind: 'offense', stat: 'damagePct' },
      min: 3,
      max: 10,
      percent: true,
      kinds: OFFENSIVE,
    },
    {
      id: 'crit_chance',
      label: 'Critical chance',
      group: 'offense',
      effect: { kind: 'offense', stat: 'critChance' },
      min: 2,
      max: 6,
      percent: true,
      kinds: OFFENSIVE,
    },
    {
      id: 'crit_damage',
      label: 'Critical damage',
      group: 'offense',
      effect: { kind: 'offense', stat: 'critDamage' },
      min: 10,
      max: 25,
      percent: true,
      kinds: OFFENSIVE,
    },
    {
      id: 'boss_damage',
      label: 'Damage vs bosses',
      group: 'offense',
      effect: { kind: 'offense', stat: 'bossDamagePct' },
      min: 5,
      max: 15,
      percent: true,
      kinds: OFFENSIVE,
    },
    // ---- combat effects ----
    {
      id: 'bleed_on_hit',
      label: 'Bleed on hit',
      group: 'combat',
      effect: { kind: 'onHit', status: 'bleed' },
      min: 5,
      max: 15,
      percent: true,
      kinds: ['weapon'],
    },
    {
      id: 'burn_on_hit',
      label: 'Burn on hit',
      group: 'combat',
      effect: { kind: 'onHit', status: 'burn' },
      min: 5,
      max: 15,
      percent: true,
      kinds: ['weapon'],
    },
    {
      id: 'stun_on_hit',
      label: 'Stun on hit',
      group: 'combat',
      effect: { kind: 'onHit', status: 'stun' },
      min: 2,
      max: 5,
      percent: true,
      kinds: ['weapon'],
    },
    {
      id: 'lifesteal',
      label: 'Life steal',
      group: 'combat',
      effect: { kind: 'lifesteal' },
      min: 3,
      max: 8,
      percent: true,
      kinds: ['weapon', 'accessory'],
    },
    {
      id: 'thorns',
      label: 'Thorns',
      group: 'combat',
      effect: { kind: 'thorns' },
      min: 2,
      max: 6,
      kinds: ['offhand', 'armor'],
    },
  ].map((a) => [a.id, a as AffixDef]),
);

export const getAffix = (id: string): AffixDef | undefined => AFFIXES[id];

/** Valid, de-duplicated effects within the cap; values clamped to the range. */
export function normalizeAffixes(raw: unknown): WeaponSpecial[] {
  const out: WeaponSpecial[] = [];
  const seen = new Set<string>();
  for (const s of Array.isArray(raw) ? raw : []) {
    const id = (s as WeaponSpecial | null)?.id;
    const def = typeof id === 'string' ? getAffix(id) : undefined;
    if (!def || seen.has(def.id)) continue;
    seen.add(def.id);
    const v = Number((s as WeaponSpecial).value ?? def.min);
    out.push({ id: def.id, value: Math.max(def.min, Math.min(def.max, Math.round(v))) });
    if (out.length >= AFFIX_RULES.maxAffixes) break;
  }
  return out;
}

export function describeAffix(a: WeaponSpecial): ItemAffixDto | null {
  const def = getAffix(a.id);
  if (!def) return null;
  const value = a.value ?? def.min;
  const pct = def.percent ? '%' : '';
  const display = def.effect.kind === 'onHit' ? `${value}%` : `+${value}${pct}`;
  return { id: def.id, value, group: def.group, label: def.label, display };
}

/** Rolls `count` different effects that can appear on this kind of gear. */
export function rollAffixes(rng: Rng, kind: ItemKind, count: number): WeaponSpecial[] {
  const pool = Object.values(AFFIXES).filter((a) => (a.kinds as ItemKind[]).includes(kind));
  const out: WeaponSpecial[] = [];
  const n = Math.min(count, AFFIX_RULES.maxAffixes, pool.length);
  for (let i = 0; i < n; i++) {
    const [def] = pool.splice(rng.int(pool.length), 1);
    out.push({ id: def!.id, value: def!.min + rng.int(def!.max - def!.min + 1) });
  }
  return out;
}

/** Number of effects for a new drop; by Rift tier when given (request #50). */
export function rollAffixCount(rng: Rng, tier?: number): number {
  const w =
    tier !== undefined
      ? (AFFIX_RULES.dropAffixWeightsByTier[Math.max(1, Math.min(5, tier))] ??
        AFFIX_RULES.dropAffixWeights)
      : AFFIX_RULES.dropAffixWeights;
  let roll = rng.next() * w.reduce((s, x) => s + x, 0);
  for (let i = 0; i < w.length; i++) if ((roll -= w[i]!) < 0) return i;
  return 0;
}

export const isGear = (kind: ItemKind | undefined): kind is GearKind =>
  !!kind && (ALL as ItemKind[]).includes(kind);

export interface GearTotals {
  attributes: Partial<Attributes>;
  stats: {
    maxHp: number;
    maxMana: number;
    armor: number;
    magicResist: number;
    initiative: number;
    focusPerRound: number;
    critChance: number;
    critDamage: number;
  };
  combat: GearCombatEffects;
}

export const noGearEffects = (): GearCombatEffects => ({
  damagePct: 0,
  bossDamagePct: 0,
  lifestealPct: 0,
  thorns: 0,
  onHit: [],
});

/** Adds up the effects of all equipped gear. */
export function gearTotals(affixes: WeaponSpecial[]): GearTotals {
  const t: GearTotals = {
    attributes: {},
    stats: {
      maxHp: 0,
      maxMana: 0,
      armor: 0,
      magicResist: 0,
      initiative: 0,
      focusPerRound: 0,
      critChance: 0,
      critDamage: 0,
    },
    combat: noGearEffects(),
  };
  for (const a of affixes) {
    const def = getAffix(a.id);
    if (!def) continue;
    const v = a.value ?? def.min;
    const e = def.effect;
    switch (e.kind) {
      case 'attribute':
        t.attributes[e.attribute] = (t.attributes[e.attribute] ?? 0) + v;
        break;
      case 'stat':
        t.stats[e.stat] += v;
        break;
      case 'offense':
        if (e.stat === 'critChance' || e.stat === 'critDamage') t.stats[e.stat] += v;
        else t.combat[e.stat] += v;
        break;
      case 'lifesteal':
        t.combat.lifestealPct += v;
        break;
      case 'thorns':
        t.combat.thorns += v;
        break;
      case 'onHit': {
        const hit = t.combat.onHit.find((h) => h.status === e.status);
        if (hit) hit.chance += v;
        else t.combat.onHit.push({ status: e.status, chance: v });
        break;
      }
    }
  }
  return t;
}
