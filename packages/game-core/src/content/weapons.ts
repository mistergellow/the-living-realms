import type { Attributes, WeaponInfoDto, WeaponRuneSlot, WeaponSpecial } from '@realms/shared';
import type { WeaponType, WeaponTypeDef } from './weapons/define.js';
import { WEAPON_DEFS } from './weapons/index.js';

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

export type {
  AttackType,
  WeaponArtDef,
  WeaponCategory,
  WeaponType,
  WeaponTypeDef,
} from './weapons/define.js';

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

/**
 * The catalogue (request #31). Request #77: each weapon lives in its own
 * folder, weapons/<type>/ (numbers in weapon.ts, pictures next to it).
 */
export const WEAPON_TYPES = WEAPON_DEFS satisfies Partial<Record<WeaponType, WeaponTypeDef>>;

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
