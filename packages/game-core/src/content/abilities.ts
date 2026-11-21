import type { AbilitySource, Attributes, CombatColumn, StatusId } from '@realms/shared';
import { customAbilityDef } from './custom.js';
import { WEAPON_TYPES, weaponScaling, type CatalogueWeaponType } from './weapons.js';

/*
 * Ability definitions (data). PROVISIONAL CONTENT — names and numbers are
 * placeholders tuned by simulation (see docs/REQUESTS.md).
 *
 * Battlefield (D38): per side 3 columns (front, mid, back) × 2 lines. Each
 * ability states its reach: 'first' = the first *occupied* column (melee,
 * A30), 'any' = every column, or specific columns.
 * Attacks never pick a single unit (D41): they pick a column and hit both
 * units in it. Support abilities on allies still pick one ally (A32).
 * Costs: Focus (per-turn energy) and, for spells, Mana.
 * Scaling (D33): each weapon ability scales with two attributes; the effect
 * value is multiplied by 1 + 8% × weighted attribute points.
 */

export type Column = CombatColumn;
/** 'first2' = the two nearest occupied columns (spear reach). */
export type Reach = 'first' | 'first2' | 'any' | Column[];
export type DamageType = 'physical' | 'ranged' | 'magic';

export interface AbilityTargeting {
  side: 'enemy' | 'ally' | 'self';
  reach: Reach;
  /** One target, both units of one column, or everyone on that side. */
  area: 'single' | 'column' | 'all';
}

export type AbilityEffect =
  | {
      kind: 'damage';
      damageType: DamageType;
      min: number;
      max: number;
      /** Extra damage against targets with a status (synergies). */
      bonusVs?: { status: StatusId; multiplier: number };
      /** Heals the attacker for the damage dealt (request #44). */
      drain?: boolean;
    }
  | { kind: 'heal'; min: number; max: number }
  | { kind: 'block'; min: number; max: number }
  /** value = damage per turn for bleed/burn (scaled), unused for others. */
  | { kind: 'status'; status: StatusId; turns: number; value?: number }
  | { kind: 'swap' }
  /** Calls an enemy into the first empty position of the actor's side (request #44). */
  | { kind: 'summon'; enemy: string };

export interface AbilityDef {
  id: string;
  name: string;
  description: string;
  source: AbilitySource;
  focusCost: number;
  manaCost: number;
  targeting: AbilityTargeting;
  effects: AbilityEffect[];
  scaling: Partial<Attributes>;
}

const ability = (a: AbilityDef) => a;
// Request #35: one line of 4 positions per side; a "column" is one position.
const ENEMY_FIRST_COLUMN: AbilityTargeting = { side: 'enemy', reach: 'first', area: 'column' };
const ENEMY_ANY_COLUMN: AbilityTargeting = { side: 'enemy', reach: 'any', area: 'column' };
const ALLY_ANY: AbilityTargeting = { side: 'ally', reach: 'any', area: 'single' };

// Weapon scaling comes from the weapon catalogue (primary + secondary attribute).
const SWORD = weaponScaling('sword');
const AXE = weaponScaling('axe');
const DAGGER = weaponScaling('dagger');
const BOW = weaponScaling('bow');
const STAFF = weaponScaling('staff');
const TOME = weaponScaling('tome');
const SHIELD = { might: 0.5, endurance: 0.5 };
const TALISMAN = { will: 1 };

/**
 * Actions every character has (combat spec, request #31). Costs are confirmed
 * by the owner (1 Focus each); the Block amount is PROVISIONAL.
 */
export const BASIC_ACTIONS = {
  changePosition: { focusCost: 1 },
  /** Dodge action: 5 + 1 per 2 Agility (request #44, PROVISIONAL). */
  block: { focusCost: 1, amount: 5, perAgility: 0.5 },
} as const;

/**
 * The basic attack of a weapon type: same for every weapon of that type.
 * Damage = the type's base damage; cost = the type's basicAttackCost (heavy 3, dagger 1).
 */
function basicAttack(
  type: CatalogueWeaponType,
  a: Pick<AbilityDef, 'id' | 'name' | 'description' | 'targeting'>,
): AbilityDef {
  const w = WEAPON_TYPES[type];
  return {
    ...a,
    source: 'weapon',
    focusCost: w.basicAttackCost,
    manaCost: 0,
    effects: [{ kind: 'damage', damageType: w.attackType, ...w.baseDamage }],
    scaling: weaponScaling(type),
  };
}

export const ABILITIES = {
  // ---- universal ----
  swap_position: ability({
    id: 'swap_position',
    name: 'Swap Position',
    description:
      'Move to another slot on your side. Swapping with another player costs Focus for both of you.',
    source: 'universal',
    focusCost: BASIC_ACTIONS.changePosition.focusCost,
    manaCost: 0,
    targeting: { side: 'ally', reach: 'any', area: 'single' },
    effects: [{ kind: 'swap' }],
    scaling: {},
  }),
  block: ability({
    id: 'block',
    name: 'Dodge',
    description:
      'Get ready to evade: gain Dodge until the end of the round (+1 per 2 Agility). Stacks.',
    source: 'universal',
    focusCost: BASIC_ACTIONS.block.focusCost,
    manaCost: 0,
    targeting: { side: 'self', reach: 'any', area: 'single' },
    effects: [{ kind: 'block', min: BASIC_ACTIONS.block.amount, max: BASIC_ACTIONS.block.amount }],
    scaling: {},
  }),
  unarmed_strike: ability({
    id: 'unarmed_strike',
    name: 'Unarmed Strike',
    description: 'A desperate punch.',
    source: 'weapon',
    focusCost: 1,
    manaCost: 0,
    targeting: ENEMY_FIRST_COLUMN,
    effects: [{ kind: 'damage', damageType: 'physical', min: 2, max: 3 }],
    scaling: { might: 1 },
  }),

  // ---- sword: Might + Agility ----
  slash: basicAttack('sword', {
    id: 'slash',
    name: 'Slash',
    description: 'Basic sword attack: a quick cut at the nearest column.',
    targeting: ENEMY_FIRST_COLUMN,
  }),
  cleave: ability({
    id: 'cleave',
    name: 'Cleave',
    description: 'A wide swing that hits the two nearest enemies.',
    source: 'weapon',
    focusCost: 2,
    manaCost: 0,
    targeting: { side: 'enemy', reach: 'first2', area: 'all' },
    effects: [{ kind: 'damage', damageType: 'physical', min: 7, max: 9 }],
    scaling: SWORD,
  }),
  rend: ability({
    id: 'rend',
    name: 'Rend',
    description: 'A tearing cut that makes the target bleed.',
    source: 'weapon',
    focusCost: 1,
    manaCost: 0,
    targeting: ENEMY_FIRST_COLUMN,
    effects: [
      { kind: 'damage', damageType: 'physical', min: 2, max: 3 },
      { kind: 'status', status: 'bleed', turns: 2, value: 3 },
    ],
    scaling: SWORD,
  }),

  // ---- axe: Might + Endurance (one-handed) ----
  chop: basicAttack('axe', {
    id: 'chop',
    name: 'Chop',
    description: 'Basic axe attack: a heavy blow.',
    targeting: ENEMY_FIRST_COLUMN,
  }),
  sunder: ability({
    id: 'sunder',
    name: 'Sunder',
    description: 'Crushes the target, weakening its attacks.',
    source: 'weapon',
    focusCost: 2,
    manaCost: 0,
    targeting: ENEMY_FIRST_COLUMN,
    effects: [
      { kind: 'damage', damageType: 'physical', min: 8, max: 10 },
      { kind: 'status', status: 'weaken', turns: 2 },
    ],
    scaling: AXE,
  }),

  // ---- dagger: Agility + Precision (one-handed, also off-hand) ----
  stab: basicAttack('dagger', {
    id: 'stab',
    name: 'Stab',
    description: 'Basic dagger attack: a fast thrust.',
    targeting: ENEMY_FIRST_COLUMN,
  }),
  puncture: ability({
    id: 'puncture',
    name: 'Puncture',
    description: 'Opens a wound that bleeds.',
    source: 'weapon',
    focusCost: 1,
    manaCost: 0,
    targeting: ENEMY_FIRST_COLUMN,
    effects: [
      { kind: 'damage', damageType: 'physical', min: 1, max: 2 },
      { kind: 'status', status: 'bleed', turns: 3, value: 4 },
    ],
    scaling: DAGGER,
  }),
  backstab: ability({
    id: 'backstab',
    name: 'Backstab',
    description: 'Reaches any row. Much stronger against bleeding targets.',
    source: 'weapon',
    focusCost: 2,
    manaCost: 0,
    targeting: ENEMY_ANY_COLUMN,
    effects: [
      {
        kind: 'damage',
        damageType: 'physical',
        min: 8,
        max: 10,
        bonusVs: { status: 'bleed', multiplier: 1.6 },
      },
    ],
    scaling: DAGGER,
  }),

  shadowstep: ability({
    id: 'shadowstep',
    name: 'Shadowstep',
    description: 'Slip out of reach: gain Dodge until the end of the round.',
    source: 'weapon',
    focusCost: 1,
    manaCost: 0,
    targeting: { side: 'self', reach: 'any', area: 'single' },
    effects: [{ kind: 'block', min: 4, max: 5 }],
    scaling: DAGGER,
  }),

  // ---- spear: Might + Precision (two-handed) ----
  thrust: basicAttack('spear', {
    id: 'thrust',
    name: 'Thrust',
    description: 'Basic spear attack: reaches either of the two nearest enemies.',
    targeting: { side: 'enemy', reach: 'first2', area: 'column' },
  }),

  // ---- mace: Might + Endurance (one-handed) ----
  crush: basicAttack('mace', {
    id: 'crush',
    name: 'Crush',
    description: 'Basic mace attack: a blunt, steady blow.',
    targeting: ENEMY_FIRST_COLUMN,
  }),

  // ---- wand: Intellect + Precision (one-handed) ----
  wand_bolt: basicAttack('wand', {
    id: 'wand_bolt',
    name: 'Wand Bolt',
    description: 'Basic wand attack: a precise bolt at any column. Costs no mana.',
    targeting: ENEMY_ANY_COLUMN,
  }),

  /** Starting spell (request #43): a level-1 Fireball, learned at creation. */
  fireball: ability({
    id: 'fireball',
    name: 'Fireball',
    description: 'Level 1 spell: hurl a ball of fire that sets the target alight.',
    source: 'skill',
    focusCost: 1,
    manaCost: 4,
    targeting: ENEMY_ANY_COLUMN,
    effects: [
      { kind: 'damage', damageType: 'magic', min: 5, max: 7 },
      { kind: 'status', status: 'burn', turns: 2, value: 2 },
    ],
    scaling: weaponScaling('wand'),
  }),

  // ---- bow: Precision + Agility (two-handed) ----
  aimed_shot: basicAttack('bow', {
    id: 'aimed_shot',
    name: 'Aimed Shot',
    description: 'Basic bow attack: a precise arrow at any column.',
    targeting: ENEMY_ANY_COLUMN,
  }),
  volley: ability({
    id: 'volley',
    name: 'Volley',
    description: 'Rain arrows on every enemy.',
    source: 'weapon',
    focusCost: 2,
    manaCost: 0,
    targeting: { side: 'enemy', reach: 'any', area: 'all' },
    effects: [{ kind: 'damage', damageType: 'ranged', min: 2, max: 3 }],
    scaling: BOW,
  }),
  marking_shot: ability({
    id: 'marking_shot',
    name: 'Marking Shot',
    description: 'Marks a target: it takes more damage from everyone.',
    source: 'weapon',
    focusCost: 1,
    manaCost: 0,
    targeting: ENEMY_ANY_COLUMN,
    effects: [
      { kind: 'damage', damageType: 'ranged', min: 3, max: 4 },
      { kind: 'status', status: 'mark', turns: 2 },
    ],
    scaling: BOW,
  }),

  // ---- staff: Intellect + Will (two-handed) ----
  staff_strike: basicAttack('staff', {
    id: 'staff_strike',
    name: 'Staff Bolt',
    description: 'Basic staff attack: a weak bolt of magic at any column. Costs no mana.',
    targeting: ENEMY_ANY_COLUMN,
  }),
  arcane_bolt: ability({
    id: 'arcane_bolt',
    name: 'Arcane Bolt',
    description: 'A bolt of raw magic at any enemy.',
    source: 'weapon',
    focusCost: 1,
    manaCost: 2,
    targeting: ENEMY_ANY_COLUMN,
    effects: [{ kind: 'damage', damageType: 'magic', min: 4, max: 5 }],
    scaling: STAFF,
  }),
  firebolt: ability({
    id: 'firebolt',
    name: 'Firebolt',
    description: 'Sets the target on fire.',
    source: 'weapon',
    focusCost: 1,
    manaCost: 3,
    targeting: ENEMY_ANY_COLUMN,
    effects: [
      { kind: 'damage', damageType: 'magic', min: 2, max: 3 },
      { kind: 'status', status: 'burn', turns: 2, value: 3 },
    ],
    scaling: STAFF,
  }),
  mend: ability({
    id: 'mend',
    name: 'Mend',
    description: 'Restore health to an ally.',
    source: 'weapon',
    focusCost: 1,
    manaCost: 5,
    targeting: ALLY_ANY,
    effects: [{ kind: 'heal', min: 3, max: 4 }],
    scaling: { will: 0.7, intellect: 0.3 },
  }),

  // ---- tome: Intellect + Precision (one-handed) ----
  spark: basicAttack('tome', {
    id: 'spark',
    name: 'Spark',
    description: 'Basic tome attack: a spark at any column. Costs no mana.',
    targeting: ENEMY_ANY_COLUMN,
  }),
  hex: ability({
    id: 'hex',
    name: 'Hex',
    description: 'Curses a target: marked and weakened.',
    source: 'weapon',
    focusCost: 1,
    manaCost: 2,
    targeting: ENEMY_ANY_COLUMN,
    effects: [
      { kind: 'status', status: 'mark', turns: 2 },
      { kind: 'status', status: 'weaken', turns: 2 },
    ],
    scaling: TOME,
  }),

  // ---- shield (off-hand): Might + Endurance ----
  raise_shield: ability({
    id: 'raise_shield',
    name: 'Raise Shield',
    description: 'Gain Dodge until the end of the round.',
    source: 'weapon',
    focusCost: 1,
    manaCost: 0,
    targeting: { side: 'self', reach: 'any', area: 'single' },
    effects: [{ kind: 'block', min: 4, max: 5 }],
    scaling: SHIELD,
  }),
  shield_wall: ability({
    id: 'shield_wall',
    name: 'Shield Wall',
    description: 'Dodge for the two allies at the front until the end of the round.',
    source: 'weapon',
    focusCost: 2,
    manaCost: 0,
    targeting: { side: 'ally', reach: 'first2', area: 'all' },
    effects: [{ kind: 'block', min: 4, max: 5 }],
    scaling: SHIELD,
  }),

  // ---- talisman (off-hand): Will ----
  blessing: ability({
    id: 'blessing',
    name: 'Blessing',
    description: 'A small heal for an ally.',
    source: 'weapon',
    focusCost: 1,
    manaCost: 3,
    targeting: ALLY_ANY,
    effects: [{ kind: 'heal', min: 5, max: 6 }],
    scaling: TALISMAN,
  }),
  ward: ability({
    id: 'ward',
    name: 'Ward',
    description: 'A protective barrier: Dodge for an ally.',
    source: 'weapon',
    focusCost: 1,
    manaCost: 2,
    targeting: ALLY_ANY,
    effects: [{ kind: 'block', min: 3, max: 4 }],
    scaling: TALISMAN,
  }),

  // ---- enemies (PROVISIONAL); they scale with their own power multiplier ----
  husk_claw: ability({
    id: 'husk_claw',
    name: 'Claw',
    description: 'A clumsy rake at the nearest foe.',
    source: 'enemy',
    focusCost: 1,
    manaCost: 0,
    targeting: ENEMY_FIRST_COLUMN,
    effects: [{ kind: 'damage', damageType: 'physical', min: 4, max: 6 }],
    scaling: {},
  }),
  spit_shard: ability({
    id: 'spit_shard',
    name: 'Shard Spit',
    description: 'Spits a crystal shard at any foe.',
    source: 'enemy',
    focusCost: 1,
    manaCost: 0,
    targeting: ENEMY_ANY_COLUMN,
    effects: [{ kind: 'damage', damageType: 'ranged', min: 3, max: 5 }],
    scaling: {},
  }),
  hound_lunge: ability({
    id: 'hound_lunge',
    name: 'Lunge',
    description: 'A fast bite that makes the target bleed.',
    source: 'enemy',
    focusCost: 2,
    manaCost: 0,
    targeting: ENEMY_FIRST_COLUMN,
    effects: [
      { kind: 'damage', damageType: 'physical', min: 5, max: 7 },
      { kind: 'status', status: 'bleed', turns: 2, value: 2 },
    ],
    scaling: {},
  }),
  bulwark_wall: ability({
    id: 'bulwark_wall',
    name: 'Bulwark',
    description: 'Raises a barrier: Dodge for the two enemies at the front.',
    source: 'enemy',
    focusCost: 2,
    manaCost: 0,
    targeting: { side: 'ally', reach: 'first2', area: 'all' },
    effects: [{ kind: 'block', min: 6, max: 8 }],
    scaling: {},
  }),
  bulwark_bash: ability({
    id: 'bulwark_bash',
    name: 'Shield Bash',
    description: 'A heavy shove at the nearest column.',
    source: 'enemy',
    focusCost: 1,
    manaCost: 0,
    targeting: ENEMY_FIRST_COLUMN,
    effects: [{ kind: 'damage', damageType: 'physical', min: 2, max: 3 }],
    scaling: {},
  }),
  warden_slam: ability({
    id: 'warden_slam',
    name: 'Rift Slam',
    description: 'Shakes the two nearest foes.',
    source: 'enemy',
    focusCost: 2,
    manaCost: 0,
    targeting: { side: 'enemy', reach: 'first2', area: 'all' },
    effects: [{ kind: 'damage', damageType: 'physical', min: 4, max: 6 }],
    scaling: {},
  }),
  warden_pulse: ability({
    id: 'warden_pulse',
    name: 'Void Pulse',
    description: 'A wave of rift energy that burns everyone.',
    source: 'enemy',
    focusCost: 3,
    manaCost: 0,
    targeting: { side: 'enemy', reach: 'any', area: 'all' },
    effects: [
      { kind: 'damage', damageType: 'magic', min: 3, max: 4 },
      { kind: 'status', status: 'burn', turns: 2, value: 2 },
    ],
    scaling: {},
  }),
  // ---- request #44: enemies with their own mechanics ----
  leech_drain: ability({
    id: 'leech_drain',
    name: 'Drain',
    description: 'Bites and drinks: heals for the damage it deals.',
    source: 'enemy',
    focusCost: 1,
    manaCost: 0,
    targeting: ENEMY_FIRST_COLUMN,
    effects: [{ kind: 'damage', damageType: 'physical', min: 4, max: 5, drain: true }],
    scaling: {},
  }),
  thorn_lash: ability({
    id: 'thorn_lash',
    name: 'Thorn Lash',
    description: 'A whip of barbed vines at the two nearest foes.',
    source: 'enemy',
    focusCost: 2,
    manaCost: 0,
    targeting: { side: 'enemy', reach: 'first2', area: 'all' },
    effects: [{ kind: 'damage', damageType: 'physical', min: 3, max: 4 }],
    scaling: {},
  }),
  shaman_empower: ability({
    id: 'shaman_empower',
    name: 'Empower',
    description: 'Fills an ally with rift-fury: +3 Strength for 2 rounds.',
    source: 'enemy',
    focusCost: 1,
    manaCost: 0,
    targeting: ALLY_ANY,
    effects: [{ kind: 'status', status: 'strength', turns: 2, value: 3 }],
    scaling: {},
  }),
  shaman_mend: ability({
    id: 'shaman_mend',
    name: 'Dark Mend',
    description: 'Knits an ally back together.',
    source: 'enemy',
    focusCost: 2,
    manaCost: 0,
    targeting: ALLY_ANY,
    effects: [{ kind: 'heal', min: 7, max: 9 }],
    scaling: {},
  }),
  brood_spawn: ability({
    id: 'brood_spawn',
    name: 'Spawn Mite',
    description: 'Calls a Volatile Mite into an empty position.',
    source: 'enemy',
    focusCost: 2,
    manaCost: 0,
    targeting: { side: 'self', reach: 'any', area: 'single' },
    effects: [{ kind: 'summon', enemy: 'volatile_mite' }],
    scaling: {},
  }),
  brood_slam: ability({
    id: 'brood_slam',
    name: 'Brood Slam',
    description: 'A heavy body slam at the nearest foe.',
    source: 'enemy',
    focusCost: 1,
    manaCost: 0,
    targeting: ENEMY_FIRST_COLUMN,
    effects: [{ kind: 'damage', damageType: 'physical', min: 4, max: 6 }],
    scaling: {},
  }),
  mite_fuse: ability({
    id: 'mite_fuse',
    name: 'Light Fuse',
    description: 'Starts to glow: explodes in 2 rounds unless killed.',
    source: 'enemy',
    focusCost: 1,
    manaCost: 0,
    targeting: { side: 'self', reach: 'any', area: 'single' },
    effects: [{ kind: 'status', status: 'fuse', turns: 3, value: 8 }],
    scaling: {},
  }),
  stalker_phase: ability({
    id: 'stalker_phase',
    name: 'Phase Shift',
    description: 'Slips half out of this world: Intangible until its next turn.',
    source: 'enemy',
    focusCost: 1,
    manaCost: 0,
    targeting: { side: 'self', reach: 'any', area: 'single' },
    effects: [{ kind: 'status', status: 'intangible', turns: 2 }],
    scaling: {},
  }),
  stalker_strike: ability({
    id: 'stalker_strike',
    name: 'Shadow Strike',
    description: 'Strikes any foe from nowhere and marks it.',
    source: 'enemy',
    focusCost: 2,
    manaCost: 0,
    targeting: ENEMY_ANY_COLUMN,
    effects: [
      { kind: 'damage', damageType: 'physical', min: 5, max: 7 },
      { kind: 'status', status: 'mark', turns: 2 },
    ],
    scaling: {},
  }),
  zealot_ritual: ability({
    id: 'zealot_ritual',
    name: 'Dark Ritual',
    description: 'Begins a ritual: gains 2 Strength at the start of every round.',
    source: 'enemy',
    focusCost: 2,
    manaCost: 0,
    targeting: { side: 'self', reach: 'any', area: 'single' },
    effects: [{ kind: 'status', status: 'ritual', turns: 99, value: 2 }],
    scaling: {},
  }),
  zealot_strike: ability({
    id: 'zealot_strike',
    name: 'Zealous Strike',
    description: 'A frenzied blow at any foe.',
    source: 'enemy',
    focusCost: 1,
    manaCost: 0,
    targeting: ENEMY_ANY_COLUMN,
    effects: [{ kind: 'damage', damageType: 'magic', min: 3, max: 4 }],
    scaling: {},
  }),
  warden_seal: ability({
    id: 'warden_seal',
    name: 'Seal',
    description: 'Locks one foe in place: they cannot act next round.',
    source: 'enemy',
    focusCost: 3,
    manaCost: 0,
    targeting: ENEMY_ANY_COLUMN,
    effects: [
      { kind: 'damage', damageType: 'magic', min: 2, max: 3 },
      { kind: 'status', status: 'stun', turns: 1 },
    ],
    scaling: {},
  }),
} satisfies Record<string, AbilityDef>;

export type AbilityId = keyof typeof ABILITIES;

export function getAbility(id: string): AbilityDef | undefined {
  // Built-in content first; then admin-made abilities (request #41).
  return Object.hasOwn(ABILITIES, id)
    ? (ABILITIES as Record<string, AbilityDef>)[id]
    : customAbilityDef(id);
}

export const UNIVERSAL_ABILITIES: AbilityId[] = ['block', 'swap_position'];
export const UNARMED_ABILITIES: AbilityId[] = ['unarmed_strike'];

export const STATUS_NAMES: Record<StatusId, string> = {
  bleed: 'Bleed',
  burn: 'Burn',
  mark: 'Marked',
  weaken: 'Weakened',
  stun: 'Stunned',
  strength: 'Strength',
  thorns: 'Thorns',
  intangible: 'Intangible',
  ritual: 'Ritual',
  fuse: 'Fuse',
};

export const STATUS_DESCRIPTIONS: Record<StatusId, string> = {
  bleed: 'Takes damage at the start of each round (ignores armor).',
  burn: 'Takes damage at the start of each round (ignores resistance).',
  mark: 'Takes 25% more damage.',
  weaken: 'Deals 25% less damage.',
  stun: 'Cannot act next round.',
  strength: 'Deals that much extra damage with every hit.',
  thorns: 'Attackers that hit it take that much damage.',
  intangible: 'Every hit deals at most 1 damage.',
  ritual: 'Gains that much Strength at the start of every round.',
  fuse: 'Explodes when the counter runs out, hurting every foe. Kill it first!',
};

export function describeTargeting(t: AbilityTargeting): string {
  if (t.side === 'self') return 'Self';
  const who = t.side === 'ally' ? 'ally' : 'enemy';
  const where =
    t.reach === 'first'
      ? 'nearest position'
      : t.reach === 'first2'
        ? 'two nearest positions'
        : t.reach === 'any'
          ? 'any position'
          : `${t.reach.join(' or ')} position`;
  if (t.area === 'all')
    return t.reach === 'any'
      ? `All ${who === 'ally' ? 'allies' : 'enemies'}`
      : `All ${who === 'ally' ? 'allies' : 'enemies'} · ${where}`;
  if (t.area === 'column') return `One ${who} · ${where}`;
  return `One ${who} · ${where}`;
}

export function describeEffects(a: AbilityDef): string[] {
  return a.effects.flatMap((e) => {
    switch (e.kind) {
      case 'damage':
        return [
          `${e.min}–${e.max} ${e.damageType} damage` +
            (e.bonusVs
              ? ` (×${e.bonusVs.multiplier} vs ${STATUS_NAMES[e.bonusVs.status].toLowerCase()})`
              : '') +
            (e.drain ? ', heals for the damage' : ''),
        ];
      case 'heal':
        return [`Heal ${e.min}–${e.max}`];
      case 'block':
        return [`Dodge ${e.min}–${e.max}`];
      case 'status':
        return [
          `${STATUS_NAMES[e.status]}${e.value ? ` ${e.value}` : ''} for ${e.turns} turn${e.turns > 1 ? 's' : ''}`,
        ];
      case 'swap':
        return [];
      case 'summon':
        return [`Summon ${e.enemy.replace(/_/g, ' ')}`];
    }
  });
}

export function describeScaling(s: Partial<Attributes>): string {
  const names: Record<string, string> = {
    might: 'Might',
    agility: 'Agility',
    precision: 'Precision',
    endurance: 'Endurance',
    intellect: 'Intellect',
    will: 'Will',
  };
  return Object.entries(s)
    .map(([k, w]) => `${names[k]} ${Math.round((w ?? 0) * 100)}%`)
    .join(' · ');
}
