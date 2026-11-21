import type {
  AttributeKey,
  Attributes,
  WeaponInfoDto,
  WeaponRuneSlot,
  WeaponSpecial,
} from '@realms/shared';

/*
 * Weapon catalogue (request #31). PROVISIONAL NUMBERS — every value here is
 * configurable and tuned by simulation (`pnpm sim`).
 *
 * Rules (owner's spec):
 * - Weapons of the same type and upgrade level always have identical base
 *   statistics and the same basic attack. No random rolls.
 * - A weapon type defines: hands, category, primary/secondary attribute,
 *   attack type, base damage and its basic attack.
 * - Upgrades (+1, +2, …) only improve numbers (WEAPON_RULES.upgradePerLevel).
 * - Up to 5 special properties and 2 rune slots per weapon. Rune slots start
 *   locked; runes, rune effects and the Runemaster are future features.
 */

export type WeaponType =
  | 'sword'
  | 'axe'
  | 'dagger'
  | 'spear'
  | 'mace'
  | 'bow'
  | 'staff'
  | 'wand'
  | 'tome'
  // request #45
  | 'greatsword'
  | 'greataxe'
  | 'handaxe'
  | 'hammer'
  | 'greathammer'
  | 'morningstar'
  | 'lance'
  | 'crossbow'
  // off-hands (not weapons of the catalogue, but share the field on items)
  | 'shield'
  | 'talisman';

export type WeaponCategory = 'melee' | 'ranged' | 'magic';
export type AttackType = 'physical' | 'ranged' | 'magic';

export interface WeaponTypeDef {
  type: WeaponType;
  name: string;
  hands: 1 | 2;
  category: WeaponCategory;
  primary: AttributeKey;
  secondary: AttributeKey | null;
  attackType: AttackType;
  /** Short description of how it attacks. */
  attackStyle: string;
  /** What the weapon is good at. */
  identity: string;
  /** Damage of the basic attack at upgrade level 0 (before attribute scaling). */
  baseDamage: { min: number; max: number };
  /** Ability id of the basic attack shared by every weapon of this type. */
  basicAttack: string;
  /**
   * Focus cost of the basic attack (owner, request #33): heavy, hard-hitting
   * weapons cost 3, daggers 1; the others are provisional.
   */
  basicAttackCost: number;
}

export const WEAPON_RULES = {
  /** Attribute weights for ability scaling: primary and secondary attribute. */
  primaryWeight: 0.6,
  secondaryWeight: 0.4,
  /** Each upgrade level multiplies the weapon's ability values by +10% (provisional). */
  upgradePerLevel: 0.1,
  maxUpgradeLevel: 10,
  maxSpecials: 5,
  maxRuneSlots: 2,
} as const;

const weapon = (w: WeaponTypeDef) => w;

/** The catalogue. Tome is kept from Combat 2.0 (not in the initial list of request #31). */
export const WEAPON_TYPES = {
  sword: weapon({
    type: 'sword',
    name: 'Sword',
    hands: 1,
    category: 'melee',
    primary: 'might',
    secondary: 'agility',
    attackType: 'physical',
    attackStyle: 'Balanced physical attack',
    identity: 'Versatile and reliable',
    baseDamage: { min: 13, max: 16 },
    basicAttack: 'slash',
    basicAttackCost: 2,
  }),
  axe: weapon({
    type: 'axe',
    name: 'Axe',
    hands: 1,
    category: 'melee',
    primary: 'might',
    secondary: 'endurance',
    attackType: 'physical',
    attackStyle: 'Heavy physical attack',
    identity: 'High impact',
    baseDamage: { min: 18, max: 28 },
    basicAttack: 'chop',
    basicAttackCost: 3,
  }),
  dagger: weapon({
    type: 'dagger',
    name: 'Dagger',
    hands: 1,
    category: 'melee',
    primary: 'agility',
    secondary: 'precision',
    attackType: 'physical',
    attackStyle: 'Fast physical attack',
    identity: 'Critical hits and precision',
    baseDamage: { min: 8, max: 10 },
    basicAttack: 'stab',
    basicAttackCost: 1,
  }),
  spear: weapon({
    type: 'spear',
    name: 'Spear',
    hands: 2,
    category: 'melee',
    primary: 'might',
    secondary: 'precision',
    attackType: 'physical',
    attackStyle: 'Physical thrust',
    identity: 'Reach and positional control',
    baseDamage: { min: 8, max: 11 },
    basicAttack: 'thrust',
    basicAttackCost: 2,
  }),
  mace: weapon({
    type: 'mace',
    name: 'Mace',
    hands: 1,
    category: 'melee',
    primary: 'might',
    secondary: 'endurance',
    attackType: 'physical',
    attackStyle: 'Blunt physical attack',
    identity: 'Heavy impact',
    baseDamage: { min: 22, max: 26 },
    basicAttack: 'crush',
    basicAttackCost: 3,
  }),
  bow: weapon({
    type: 'bow',
    name: 'Bow',
    hands: 2,
    category: 'ranged',
    primary: 'precision',
    secondary: 'agility',
    attackType: 'ranged',
    attackStyle: 'Ranged physical attack',
    identity: 'Accuracy and exploiting weaknesses',
    baseDamage: { min: 8, max: 10 },
    basicAttack: 'aimed_shot',
    basicAttackCost: 2,
  }),
  staff: weapon({
    type: 'staff',
    name: 'Staff',
    hands: 2,
    category: 'magic',
    primary: 'intellect',
    secondary: 'will',
    attackType: 'magic',
    attackStyle: 'Magical attack',
    identity: 'Magical power and elemental effects',
    baseDamage: { min: 11, max: 14 },
    basicAttack: 'staff_strike',
    basicAttackCost: 2,
  }),
  wand: weapon({
    type: 'wand',
    name: 'Wand',
    hands: 1,
    category: 'magic',
    primary: 'intellect',
    secondary: 'precision',
    attackType: 'magic',
    attackStyle: 'Magical attack',
    identity: 'Magical precision and control',
    baseDamage: { min: 4, max: 6 },
    basicAttack: 'wand_bolt',
    basicAttackCost: 1,
  }),
  tome: weapon({
    type: 'tome',
    name: 'Tome',
    hands: 1,
    category: 'magic',
    primary: 'intellect',
    secondary: 'precision',
    attackType: 'magic',
    attackStyle: 'Magical attack',
    identity: 'Curses and sparks',
    baseDamage: { min: 4, max: 6 },
    basicAttack: 'spark',
    basicAttackCost: 1,
  }),
  // ---- request #45: more weapon types (PROVISIONAL numbers, tuned by `pnpm sim`) ----
  greatsword: weapon({
    type: 'greatsword',
    name: 'Greatsword',
    hands: 2,
    category: 'melee',
    primary: 'might',
    secondary: 'agility',
    attackType: 'physical',
    attackStyle: 'Wide two-handed swings',
    identity: 'Hits the two nearest enemies at once',
    baseDamage: { min: 12, max: 16 },
    basicAttack: 'great_swing',
    basicAttackCost: 3,
  }),
  greataxe: weapon({
    type: 'greataxe',
    name: 'Greataxe',
    hands: 2,
    category: 'melee',
    primary: 'might',
    secondary: 'endurance',
    attackType: 'physical',
    attackStyle: 'Brutal two-handed chops',
    identity: 'The biggest single hits; makes wounds bleed',
    baseDamage: { min: 26, max: 34 },
    basicAttack: 'great_chop',
    basicAttackCost: 3,
  }),
  handaxe: weapon({
    type: 'handaxe',
    name: 'Hand Axe',
    hands: 1,
    category: 'melee',
    primary: 'might',
    secondary: 'agility',
    attackType: 'physical',
    attackStyle: 'Quick hacks, or thrown',
    identity: 'Light enough for the off hand; can be thrown at any enemy',
    baseDamage: { min: 14, max: 17 },
    basicAttack: 'hack',
    basicAttackCost: 2,
  }),
  hammer: weapon({
    type: 'hammer',
    name: 'Hammer',
    hands: 1,
    category: 'melee',
    primary: 'might',
    secondary: 'endurance',
    attackType: 'physical',
    attackStyle: 'Crushing blows',
    identity: 'Can stun the enemy it hits',
    baseDamage: { min: 21, max: 25 },
    basicAttack: 'hammer_blow',
    basicAttackCost: 3,
  }),
  greathammer: weapon({
    type: 'greathammer',
    name: 'Great Hammer',
    hands: 2,
    category: 'melee',
    primary: 'might',
    secondary: 'endurance',
    attackType: 'physical',
    attackStyle: 'Earth-shaking blows',
    identity: 'Shakes and weakens the two nearest enemies',
    baseDamage: { min: 24, max: 30 },
    basicAttack: 'great_smash',
    basicAttackCost: 3,
  }),
  morningstar: weapon({
    type: 'morningstar',
    name: 'Morning Star',
    hands: 1,
    category: 'melee',
    primary: 'might',
    secondary: 'precision',
    attackType: 'physical',
    attackStyle: 'Spiked blows',
    identity: 'Every hit tears: Bleed',
    baseDamage: { min: 10, max: 13 },
    basicAttack: 'spiked_blow',
    basicAttackCost: 2,
  }),
  lance: weapon({
    type: 'lance',
    name: 'Lance',
    hands: 2,
    category: 'melee',
    primary: 'might',
    secondary: 'agility',
    attackType: 'physical',
    attackStyle: 'Long charging thrusts',
    identity: 'Reaches the two nearest enemies; charges and marks',
    baseDamage: { min: 14, max: 17 },
    basicAttack: 'lance_thrust',
    basicAttackCost: 2,
  }),
  crossbow: weapon({
    type: 'crossbow',
    name: 'Crossbow',
    hands: 2,
    category: 'ranged',
    primary: 'precision',
    secondary: 'might',
    attackType: 'ranged',
    attackStyle: 'Slow, heavy bolts',
    identity: 'Few shots, each one hits hard; pierces Dodge',
    baseDamage: { min: 12, max: 15 },
    basicAttack: 'bolt_shot',
    basicAttackCost: 3,
  }),
} satisfies Partial<Record<WeaponType, WeaponTypeDef>>;

export type CatalogueWeaponType = keyof typeof WEAPON_TYPES;

export function getWeaponType(type: string | undefined): WeaponTypeDef | undefined {
  return type ? (WEAPON_TYPES as Record<string, WeaponTypeDef>)[type] : undefined;
}

/** Ability scaling of a weapon type: primary + secondary attribute weights. */
export function weaponScaling(type: CatalogueWeaponType): Partial<Attributes> {
  const w = WEAPON_TYPES[type];
  if (!w.secondary) return { [w.primary]: 1 };
  return { [w.primary]: WEAPON_RULES.primaryWeight, [w.secondary]: WEAPON_RULES.secondaryWeight };
}

/** Multiplier from upgrade level (+1, +2, …) on the weapon's ability values. */
export function upgradeMultiplier(level: number): number {
  const l = Math.max(0, Math.min(WEAPON_RULES.maxUpgradeLevel, Math.floor(level)));
  return 1 + WEAPON_RULES.upgradePerLevel * l;
}

/** Base damage of a weapon type at an upgrade level (identical for every weapon of that type). */
export function weaponDamage(type: CatalogueWeaponType, level = 0): { min: number; max: number } {
  const m = upgradeMultiplier(level);
  const d = WEAPON_TYPES[type].baseDamage;
  return { min: Math.round(d.min * m), max: Math.round(d.max * m) };
}

/** Two locked rune slots: the default for every weapon (Runemaster = future). */
export function lockedRuneSlots(): WeaponRuneSlot[] {
  return Array.from({ length: WEAPON_RULES.maxRuneSlots }, () => ({
    unlocked: false,
    runeId: null,
  }));
}

/** Clamp stored instance data to the weapon's capacities. */
export function normalizeWeaponInstance(data: {
  upgradeLevel?: number | null;
  specials?: unknown;
  runeSlots?: unknown;
}): { upgradeLevel: number; specials: WeaponSpecial[]; runeSlots: WeaponRuneSlot[] } {
  const specials = (Array.isArray(data.specials) ? data.specials : [])
    .filter((s): s is WeaponSpecial => !!s && typeof (s as WeaponSpecial).id === 'string')
    .slice(0, WEAPON_RULES.maxSpecials);
  const stored = Array.isArray(data.runeSlots) ? (data.runeSlots as WeaponRuneSlot[]) : [];
  const runeSlots = lockedRuneSlots().map((d, i) => ({
    unlocked: stored[i]?.unlocked === true,
    runeId: typeof stored[i]?.runeId === 'string' ? stored[i]!.runeId : null,
  }));
  const upgradeLevel = Math.max(
    0,
    Math.min(WEAPON_RULES.maxUpgradeLevel, Math.floor(data.upgradeLevel ?? 0)),
  );
  return { upgradeLevel, specials, runeSlots };
}

/** Everything the player sees about a weapon (character sheet). */
export function weaponInfo(
  type: string | undefined,
  instance: { upgradeLevel?: number | null; specials?: unknown; runeSlots?: unknown },
): WeaponInfoDto | null {
  const def = getWeaponType(type);
  if (!def) return null;
  const n = normalizeWeaponInstance(instance);
  return {
    type: def.type,
    typeName: def.name,
    hands: def.hands,
    category: def.category,
    primaryAttribute: def.primary,
    secondaryAttribute: def.secondary,
    attackType: def.attackType,
    attackStyle: def.attackStyle,
    identity: def.identity,
    baseDamage: weaponDamage(def.type as CatalogueWeaponType, n.upgradeLevel),
    basicAttackId: def.basicAttack,
    basicAttackCost: def.basicAttackCost,
    upgradeLevel: n.upgradeLevel,
    specials: n.specials,
    maxSpecials: WEAPON_RULES.maxSpecials,
    runeSlots: n.runeSlots,
  };
}
