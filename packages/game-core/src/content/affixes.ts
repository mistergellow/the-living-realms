import {
  ATTRIBUTE_KEYS,
  ENEMY_FAMILIES,
  ITEM_RARITIES,
  type AffixGroup,
  type AttributeKey,
  type Attributes,
  type EnemyFamily,
  type GearCombatEffects,
  type GearStatus,
  type ItemAffixDto,
  type ItemKind,
  type ItemRarity,
  type WeaponSpecial,
} from '@realms/shared';
import type { Rng } from '../combat/rng.js';
import type { ItemDef } from './items.js';
import { getWeaponType } from './weapons.js';

/*
 * Bonus effects on gear (requests #37, #64). PROVISIONAL CONTENT AND NUMBERS.
 *
 * Request #64 (owner, D122): Metin2-style pools. Every piece of gear holds
 * 0–5 bonuses rolled from the pool of its SLOT (weapon, head, face, …), never
 * the same one twice on one item (the same bonus may sit on several items and
 * then adds up). Every bonus has 5 value tiers (T1–T5); the tier comes from
 * the Rift tier — harder Rifts give better gear. Two-handed weapons roll
 * attack bonuses at ×1.5. Rarity is just the number of bonuses.
 * Full list and reasoning: docs/EQUIPMENT_SPECIALS.md.
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
  /** Request #64: chance (%) that a bonus rolls one value tier above the Rift tier. */
  tierUpChance: 10,
  /** Request #64: attack bonuses on two-handed weapons are worth this much more. */
  twoHandedMultiplier: 1.5,
  /** On-hit statuses: duration and value (bleed/burn: damage per round; weaken/mark/blind: %; chill: Focus lost). */
  onHitTurns: { bleed: 2, burn: 2, stun: 1, weaken: 2, mark: 2, chill: 2, blind: 2 },
  onHitValue: { bleed: 3, burn: 3, stun: 0, weaken: 25, mark: 25, chill: 1, blind: 25 },
  /** Impale: share of the hit stored on the target, and how long it waits. */
  impalePct: 30,
  impaleTurns: 3,
  /** Onslaught: Strength gained on kill lasts this many rounds. */
  onslaughtTurns: 2,
  /** Guard at full health: "full" means at least this % of max HP. */
  fullHpThresholdPct: 90,
} as const;

/**
 * Request #64 (owner, D122): a one-handed weapon in each hand deals more
 * damage. PROVISIONAL: +40% basic attack damage while dual wielding.
 */
export const DUAL_WIELD_RULES = { basicDamagePct: 40 } as const;

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
const GEAR_KINDS: GearKind[] = ['weapon', 'offhand', 'armor', 'accessory'];

/** Request #64: each slot has its own pool of bonuses. */
export const GEAR_SLOTS = [
  'weapon',
  'head',
  'face',
  'pendant',
  'body',
  'belt',
  'boots',
  'ring',
  'offhand',
] as const;
export type GearSlot = (typeof GEAR_SLOTS)[number];

/** Which pool an item rolls from: weapons → weapon, shields/talismans → offhand, else its slot. */
export function gearSlotOf(def: Pick<ItemDef, 'kind' | 'slots'> | undefined): GearSlot | null {
  if (!def || !isGear(def.kind)) return null;
  if (def.kind === 'weapon') return 'weapon';
  if (def.kind === 'offhand') return 'offhand';
  switch (def.slots[0]) {
    case 'head':
      return 'head';
    case 'face':
      return 'face';
    case 'pendant':
      return 'pendant';
    case 'body':
      return 'body';
    case 'belt':
      return 'belt';
    case 'feet':
      return 'boots';
    case 'ring1':
    case 'ring2':
      return 'ring';
    default:
      return null;
  }
}

/** Numeric fields of `GearCombatEffects` a bonus can add to. */
type GearField = {
  [K in keyof GearCombatEffects]-?: NonNullable<GearCombatEffects[K]> extends number ? K : never;
}[keyof GearCombatEffects];

/** What an effect does. Each kind is applied in `gearTotals`. */
export type AffixEffect =
  | { kind: 'attribute'; attribute: AttributeKey }
  | {
      kind: 'stat';
      stat:
        | 'maxHp'
        | 'maxMana'
        | 'armor'
        | 'magicResist'
        | 'initiative'
        | 'focusPerRound'
        | 'critChance'
        | 'critDamage'
        | 'manaRegen';
    }
  | { kind: 'gear'; field: GearField }
  | { kind: 'vsFamily'; family: EnemyFamily }
  | { kind: 'onHit'; status: GearStatus }
  /** Request #62: a melee attacker that hits you gets the status (named gear only). */
  | { kind: 'whenHit'; status: GearStatus }
  /** Request #64: chance to ignore the status. */
  | { kind: 'resist'; status: GearStatus };

/** Request #64: the three groups of the Metin2 tables. */
export type AffixCategory = 'attack' | 'resistance' | 'other';

export interface AffixDef {
  id: string;
  label: string;
  /** Colour group on the item card. */
  group: AffixGroup;
  category: AffixCategory;
  effect: AffixEffect;
  /** Best value of each tier, T1…T5 (request #64). */
  tiers: readonly [number, number, number, number, number];
  /** Lowest tier it can roll at (e.g. Focus only from T4). */
  minTier?: number;
  /** Lowest possible value (T1 low end) and highest (T5; two-handed ×1.5 for attack). */
  min: number;
  max: number;
  /** Shown as a percentage. */
  percent?: boolean;
  /** Shown as "X% chance" rather than "+X". */
  chance?: boolean;
  /** Slots whose pool holds it (empty = named items only). */
  slots: GearSlot[];
}

const ATTRIBUTE_LABEL: Record<AttributeKey, string> = {
  might: 'Might',
  agility: 'Agility',
  precision: 'Precision',
  endurance: 'Endurance',
  intellect: 'Intellect',
  will: 'Will',
};

const FAMILY_LABEL: Record<EnemyFamily, string> = {
  beast: 'Beasts',
  hollow: 'Hollow',
  void: 'Void',
  construct: 'Constructs',
  brood: 'Brood',
  humanoid: 'Humanoids',
};

type Tiers = readonly [number, number, number, number, number];
type Draft = Omit<AffixDef, 'min' | 'max' | 'group'> & { group?: AffixGroup };

const groupOf = (d: Draft): AffixGroup => {
  if (d.group) return d.group;
  switch (d.effect.kind) {
    case 'attribute':
      return 'attribute';
    case 'stat':
      return d.category === 'attack' ? 'offense' : 'stat';
    case 'onHit':
    case 'whenHit':
    case 'resist':
      return 'combat';
    default:
      return d.category === 'attack' ? 'offense' : 'combat';
  }
};

const lowOf = (tiers: Tiers) => Math.max(1, Math.round(tiers[0] / 2));

function finish(d: Draft): AffixDef {
  const top = d.tiers[4];
  return {
    ...d,
    group: groupOf(d),
    min: lowOf(d.tiers),
    max: d.category === 'attack' ? Math.round(top * AFFIX_RULES.twoHandedMultiplier) : top,
  };
}

// Slot shorthands.
const W: GearSlot = 'weapon';
const H: GearSlot = 'head';
const F: GearSlot = 'face';
const P: GearSlot = 'pendant';
const BO: GearSlot = 'body';
const BE: GearSlot = 'belt';
const BT: GearSlot = 'boots';
const R: GearSlot = 'ring';
const O: GearSlot = 'offhand';

const gear = (
  id: string,
  label: string,
  category: AffixCategory,
  field: GearField,
  tiers: Tiers,
  slots: GearSlot[],
  opts: Partial<Draft> = {},
): Draft => ({
  id,
  label,
  category,
  effect: { kind: 'gear', field },
  tiers,
  slots,
  percent: true,
  ...opts,
});

const statusName: Record<GearStatus, string> = {
  bleed: 'Bleed',
  burn: 'Burn',
  stun: 'Stun',
  weaken: 'Weaken',
  mark: 'Mark',
  chill: 'Chill',
  blind: 'Blind',
};

const onHit = (status: GearStatus, label: string, tiers: Tiers, slots: GearSlot[]): Draft => ({
  id: `${status}_on_hit`,
  label,
  category: 'attack',
  effect: { kind: 'onHit', status },
  tiers,
  slots,
  percent: true,
  chance: true,
});

const resist = (status: GearStatus, tiers: Tiers, slots: GearSlot[]): Draft => ({
  id: `${status}_resist`,
  label: `${statusName[status]} resistance`,
  category: 'resistance',
  effect: { kind: 'resist', status },
  tiers,
  slots,
  percent: true,
  chance: true,
});

const DRAFTS: Draft[] = [
  // ======================= ATTACK =======================
  ...ENEMY_FAMILIES.map((family): Draft => ({
    id: `vs_${family}`,
    label: `Strong against ${FAMILY_LABEL[family]}`,
    category: 'attack',
    effect: { kind: 'vsFamily', family },
    tiers: family === 'humanoid' ? [1, 2, 3, 5, 8] : [2, 4, 6, 10, 15],
    slots: [W, H, F, R, O],
    percent: true,
  })),
  gear(
    'boss_damage',
    'Strong against Bosses',
    'attack',
    'bossDamagePct',
    [2, 3, 5, 8, 12],
    [W, P, BE],
  ),
  gear('damage', 'Damage', 'attack', 'damagePct', [2, 3, 5, 7, 10], [W, BO, R]),
  gear('skill_damage', 'Skill damage', 'attack', 'skillDamagePct', [2, 4, 6, 8, 12], [W, H, P]),
  gear(
    'basic_damage',
    'Basic attack damage',
    'attack',
    'basicDamagePct',
    [2, 4, 6, 8, 12],
    [W, BE, R],
  ),
  gear(
    'weapon_damage',
    'Increased weapon damage',
    'attack',
    'weaponDamagePct',
    [10, 20, 30, 40, 50],
    [W],
  ),
  gear('pvp_damage', 'Strong against players', 'attack', 'pvpDamagePct', [1, 2, 3, 5, 8], [W, R]),
  gear('added_damage', 'Adds damage', 'attack', 'addedPhysical', [2, 3, 4, 5, 7], [W, BE, R], {
    percent: false,
  }),
  gear('added_magic', 'Adds magic damage', 'attack', 'addedMagic', [2, 3, 4, 5, 6], [W, P, R], {
    percent: false,
  }),
  {
    id: 'crit_chance',
    label: 'Chance of critical hit',
    category: 'attack',
    effect: { kind: 'stat', stat: 'critChance' },
    tiers: [1, 2, 3, 5, 8],
    slots: [W, F, P, BT],
    percent: true,
  },
  {
    id: 'crit_damage',
    label: 'Critical damage',
    category: 'attack',
    effect: { kind: 'stat', stat: 'critDamage' },
    tiers: [5, 10, 15, 20, 25],
    slots: [W, F],
    percent: true,
  },
  gear(
    'pierce_chance',
    'Chance for piercing hits',
    'attack',
    'pierceChance',
    [1, 2, 3, 5, 10],
    [W, P, R],
    {
      chance: true,
    },
  ),
  gear('armor_pen', 'Armor penetration', 'attack', 'armorPenPct', [3, 6, 9, 12, 15], [W, F]),
  gear('magic_pen', 'Magic penetration', 'attack', 'magicPenPct', [3, 6, 9, 12, 15], [W, H]),
  onHit('bleed', 'Bleeding attack', [2, 4, 6, 10, 15], [W, H, BE]),
  onHit('burn', 'Burning attack', [2, 4, 6, 10, 15], [W, H, BE]),
  onHit('stun', 'Stun chance', [1, 2, 3, 4, 5], [W, P, BE, BT]),
  onHit('weaken', 'Weakening chance', [2, 4, 6, 8, 12], [W, BE, BT]),
  onHit('mark', 'Exposing chance', [2, 4, 6, 8, 12], [W, F]),
  onHit('chill', 'Chilling attack', [3, 5, 7, 9, 12], [W, BE]),
  onHit('blind', 'Blinding attack', [2, 3, 5, 6, 8], [W, F]),
  gear('lifesteal', 'Life steal', 'attack', 'lifestealPct', [1, 2, 3, 5, 8], [W, BO, BE, R]),
  gear('mana_steal', 'Mana steal', 'attack', 'manaStealPct', [1, 2, 3, 5, 8], [F, R]),
  gear('life_on_hit', 'Life gained on hit', 'attack', 'lifeOnHit', [1, 1, 2, 2, 3], [W, R], {
    percent: false,
  }),
  gear('life_on_kill', 'Life gained on kill', 'attack', 'lifeOnKill', [2, 3, 5, 6, 8], [W, BE, R], {
    percent: false,
  }),
  gear('mana_on_kill', 'Mana gained on kill', 'attack', 'manaOnKill', [2, 3, 4, 5, 6], [W, H, R], {
    percent: false,
  }),
  gear(
    'focus_on_kill',
    'Focus on kill',
    'attack',
    'focusOnKillChance',
    [10, 15, 20, 25, 30],
    [W, F, P],
    {
      chance: true,
    },
  ),
  gear(
    'onslaught',
    'Onslaught (Strength on kill)',
    'attack',
    'onslaught',
    [1, 1, 2, 2, 3],
    [W, BT],
    {
      percent: false,
    },
  ),
  gear(
    'casting_speed',
    'Casting speed (Focus refund)',
    'attack',
    'focusRefundChance',
    [3, 6, 10, 15, 20],
    [BO, R],
    {
      chance: true,
    },
  ),
  gear('dot_damage', 'Damage over time', 'attack', 'dotDamagePct', [5, 10, 15, 20, 25], [W, BE, R]),
  gear(
    'status_duration',
    'Ailment duration',
    'attack',
    'statusDurationChance',
    [5, 10, 15, 20, 25],
    [W, F, R],
    {
      chance: true,
    },
  ),
  gear(
    'stun_duration',
    'Stun duration',
    'attack',
    'stunDurationChance',
    [10, 15, 20, 25, 30],
    [W, BE, O],
    {
      chance: true,
    },
  ),
  gear('culling', 'Culling Strike', 'attack', 'cullingPct', [3, 4, 5, 7, 10], [W]),
  gear(
    'vs_bleeding',
    'Damage vs bleeding enemies',
    'attack',
    'vsBleedingPct',
    [5, 8, 12, 16, 20],
    [W, F, R],
  ),
  gear(
    'vs_burning',
    'Damage vs burning enemies',
    'attack',
    'vsBurningPct',
    [5, 8, 12, 16, 20],
    [W, H, R],
  ),
  gear(
    'vs_stunned',
    'Damage vs stunned enemies',
    'attack',
    'vsStunnedPct',
    [5, 10, 15, 20, 25],
    [W, BE],
  ),
  gear('impale', 'Impale', 'attack', 'impaleChance', [5, 8, 12, 16, 20], [W], { chance: true }),

  // ===================== RESISTANCE =====================
  {
    id: 'armor',
    label: 'Armor',
    category: 'resistance',
    effect: { kind: 'stat', stat: 'armor' },
    tiers: [2, 3, 5, 6, 8],
    slots: [H, BO, BE, BT, O],
  },
  {
    id: 'magic_resist',
    label: 'Magic Resistance',
    category: 'resistance',
    effect: { kind: 'stat', stat: 'magicResist' },
    tiers: [2, 3, 5, 6, 8],
    slots: [H, BO, R, O],
  },
  gear(
    'physical_defence',
    'Physical defence',
    'resistance',
    'physicalDefencePct',
    [2, 4, 6, 8, 12],
    [H, BO, BT, O],
  ),
  gear(
    'magic_defence',
    'Magic defence',
    'resistance',
    'magicDefencePct',
    [2, 4, 6, 8, 12],
    [H, BO, BT, O],
  ),
  resist('bleed', [2, 4, 6, 10, 15], [F, BE, R]),
  resist('burn', [2, 4, 6, 10, 15], [F, BE, R]),
  resist('stun', [5, 10, 15, 20, 30], [H, BE, O]),
  resist('weaken', [5, 10, 15, 20, 30], [BE, BT, O]),
  resist('chill', [5, 10, 15, 20, 30], [H, BO, BT, O]),
  resist('blind', [5, 10, 15, 20, 30], [H, F, O]),
  gear(
    'boss_resist',
    'Resistance to bosses',
    'resistance',
    'bossResistPct',
    [1, 2, 3, 4, 5],
    [BO, BE, O],
  ),
  gear(
    'humanoid_resist',
    'Resistance to humanoids',
    'resistance',
    'humanoidResistPct',
    [1, 2, 3, 5, 8],
    [BO, BE],
  ),
  gear(
    'pvp_resist',
    'Resistance to players',
    'resistance',
    'pvpResistPct',
    [1, 2, 3, 5, 8],
    [BO, O],
  ),
  gear('block_chance', 'Chance to block', 'resistance', 'blockChance', [2, 4, 6, 8, 12], [O], {
    chance: true,
  }),
  gear(
    'reflect_chance',
    'Chance to reflect melee hits',
    'resistance',
    'reflectChance',
    [1, 2, 3, 6, 10],
    [BO, BE, O],
    {
      chance: true,
    },
  ),
  gear('thorns', 'Thorns', 'resistance', 'thorns', [1, 2, 3, 4, 6], [BO, O], { percent: false }),
  gear(
    'damage_to_mana',
    'Damage absorbed by Mana',
    'resistance',
    'damageToManaPct',
    [1, 2, 3, 5, 10],
    [H, P, BO, BE],
  ),
  gear(
    'full_hp_guard',
    'Guard at full health',
    'resistance',
    'fullHpGuardPct',
    [1, 2, 3, 4, 5],
    [BO],
  ),

  // ======================== OTHER ========================
  ...ATTRIBUTE_KEYS.map((k): Draft => ({
    id: k,
    label: ATTRIBUTE_LABEL[k],
    category: 'other',
    effect: { kind: 'attribute', attribute: k },
    tiers: [1, 1, 2, 2, 3],
    // Weapons: only their own primary / secondary attribute (see `poolFor`).
    slots: [W, P, BE, R, O],
  })),
  {
    id: 'health',
    label: 'Max. HP',
    category: 'other',
    effect: { kind: 'stat', stat: 'maxHp' },
    tiers: [4, 8, 12, 16, 20],
    slots: [H, P, BO, BE, BT, R],
  },
  {
    id: 'mana',
    label: 'Max. Mana',
    category: 'other',
    effect: { kind: 'stat', stat: 'maxMana' },
    tiers: [3, 5, 8, 10, 12],
    slots: [H, P, BO, BT, R],
  },
  {
    id: 'initiative',
    label: 'Initiative',
    category: 'other',
    effect: { kind: 'stat', stat: 'initiative' },
    tiers: [1, 1, 2, 2, 3],
    slots: [W, H, BT],
  },
  gear('hp_regen', 'HP regeneration', 'other', 'hpRegen', [1, 1, 2, 3, 4], [H, P, BE], {
    percent: false,
    group: 'stat',
  }),
  {
    id: 'mana_regen',
    label: 'Mana regeneration',
    category: 'other',
    effect: { kind: 'stat', stat: 'manaRegen' },
    tiers: [1, 1, 2, 2, 3],
    slots: [H, P],
  },
  {
    id: 'focus',
    label: 'Focus per round',
    category: 'other',
    effect: { kind: 'stat', stat: 'focusPerRound' },
    tiers: [1, 1, 1, 1, 1],
    minTier: 4,
    slots: [W, P],
  },
  gear('skill_levels', 'Level of all skills', 'other', 'skillLevels', [1, 1, 1, 1, 2], [H, P], {
    percent: false,
    group: 'stat',
  }),

  // Request #62: only on named gear (never rolled on drops: no slots).
  {
    id: 'ignite_attackers',
    label: 'Ignite melee attackers',
    category: 'resistance',
    effect: { kind: 'whenHit', status: 'burn' },
    tiers: [5, 10, 25, 50, 100],
    slots: [],
    percent: true,
    chance: true,
  },
  {
    id: 'bleed_attackers',
    label: 'Cut melee attackers (Bleed)',
    category: 'resistance',
    effect: { kind: 'whenHit', status: 'bleed' },
    tiers: [5, 10, 25, 50, 100],
    slots: [],
    percent: true,
    chance: true,
  },
];

export const AFFIXES: Record<string, AffixDef> = Object.fromEntries(
  DRAFTS.map((d) => [d.id, finish(d)]),
);

export const getAffix = (id: string): AffixDef | undefined => AFFIXES[id];

/** Value range of a bonus at a tier (1–5): from just above the tier below up to the tier's best. */
export function affixValueRange(def: AffixDef, tier: number): { min: number; max: number } {
  const t = Math.max(1, Math.min(5, Math.round(tier)));
  const max = def.tiers[t - 1]!;
  const below = t === 1 ? lowOf(def.tiers) : def.tiers[t - 2]! + 1;
  return { min: Math.min(below, max), max };
}

/** Valid, de-duplicated effects within the cap; values clamped to the possible range. */
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
  let display: string;
  if (
    def.effect.kind === 'gear' &&
    (def.effect.field === 'addedPhysical' || def.effect.field === 'addedMagic')
  )
    display = `${Math.max(1, Math.ceil(value / 2))}–${value}`;
  else if (def.chance) display = `${value}%`;
  else display = `+${value}${def.percent ? '%' : ''}`;
  return { id: def.id, value, group: def.group, label: def.label, display };
}

/**
 * The pool of a slot. Weapons only roll their own primary / secondary
 * attribute; named-only effects never roll.
 */
export function poolFor(slot: GearSlot, def?: Pick<ItemDef, 'weaponType'>): AffixDef[] {
  const w = slot === 'weapon' ? getWeaponType(def?.weaponType) : undefined;
  return Object.values(AFFIXES).filter((a) => {
    if (!a.slots.includes(slot)) return false;
    if (slot === 'weapon' && a.effect.kind === 'attribute')
      return !!w && (a.effect.attribute === w.primary || a.effect.attribute === w.secondary);
    return true;
  });
}

/**
 * Rolls `count` different bonuses from the pool of `slot`, with values of the
 * given Rift tier (sometimes one tier higher). Two-handed: attack ×1.5.
 */
export function rollAffixes(
  rng: Rng,
  slot: GearSlot,
  count: number,
  tier = 1,
  opts: { twoHanded?: boolean; weaponType?: ItemDef['weaponType'] } = {},
): WeaponSpecial[] {
  const pool = poolFor(slot, { weaponType: opts.weaponType });
  const out: WeaponSpecial[] = [];
  const n = Math.min(count, AFFIX_RULES.maxAffixes, pool.length);
  for (let i = 0; i < n; i++) {
    const [def] = pool.splice(rng.int(pool.length), 1);
    const up = rng.chance(AFFIX_RULES.tierUpChance) ? 1 : 0;
    const t = Math.max(def!.minTier ?? 1, Math.min(5, tier + up));
    const { min, max } = affixValueRange(def!, t);
    let value = min + rng.int(max - min + 1);
    if (opts.twoHanded && def!.category === 'attack')
      value = Math.round(value * AFFIX_RULES.twoHandedMultiplier);
    out.push({ id: def!.id, value });
  }
  return out;
}

/** Bonuses of a new piece of gear; materials and tools get none. */
export function rollItemAffixes(
  rng: Rng,
  def: ItemDef | undefined,
  count: number,
  tier = 1,
): WeaponSpecial[] {
  const slot = gearSlotOf(def);
  if (!def || !slot) return [];
  return rollAffixes(rng, slot, count, tier, {
    twoHanded: !!def.twoHanded,
    weaponType: def.weaponType,
  });
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
  !!kind && (GEAR_KINDS as ItemKind[]).includes(kind);

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
    manaRegen: number;
  };
  combat: GearCombatEffects;
}

export const noGearEffects = (): GearCombatEffects => ({
  damagePct: 0,
  bossDamagePct: 0,
  lifestealPct: 0,
  thorns: 0,
  onHit: [],
  whenHit: [],
});

const addChance = (
  list: Array<{ status: GearStatus; chance: number }>,
  status: GearStatus,
  v: number,
) => {
  const hit = list.find((h) => h.status === status);
  if (hit) hit.chance += v;
  else list.push({ status, chance: v });
};

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
      manaRegen: 0,
    },
    combat: noGearEffects(),
  };
  const c = t.combat;
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
      case 'gear':
        c[e.field] = (c[e.field] ?? 0) + v;
        break;
      case 'vsFamily':
        c.vsFamily = { ...c.vsFamily, [e.family]: (c.vsFamily?.[e.family] ?? 0) + v };
        break;
      case 'onHit':
        addChance(c.onHit, e.status, v);
        break;
      case 'whenHit':
        addChance((c.whenHit ??= []), e.status, v);
        break;
      case 'resist':
        c.statusResist = { ...c.statusResist, [e.status]: (c.statusResist?.[e.status] ?? 0) + v };
        break;
    }
  }
  return t;
}
