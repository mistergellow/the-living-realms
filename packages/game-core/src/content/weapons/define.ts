import type { AttributeKey } from '@realms/shared';

/*
 * The shape of a weapon type (request #77): each weapon folder fills one in
 * (weapons/<type>/weapon.ts). Kept apart from weapons.ts so the folders can
 * import it without a cycle.
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
  // request #46
  | 'scepter'
  | 'chakram'
  | 'scythe'
  | 'sling'
  // off-hands (not weapons of the catalogue, but share the field on items)
  | 'shield'
  | 'talisman';

export type WeaponCategory = 'melee' | 'ranged' | 'magic';
export type AttackType = 'physical' | 'ranged' | 'magic';

/**
 * How the hero holds a weapon (art only). The hand picture is a square; all
 * values are fractions of it, except \`size\` (the square's side in the hero's
 * 120×160 frame, so weapons keep their scale against each other).
 */
export interface WeaponArtDef {
  /** down = point to the ground; up = upright; bow = upright by the middle; level = pointing ahead; forward = ahead and up; hand = just held. */
  pose: 'down' | 'up' | 'bow' | 'level' | 'forward' | 'hand';
  /** Where the hand grips, as fractions of the picture (0,0 top left; 1,1 bottom right). */
  grip: { x: number; y: number };
  /** Direction from the grip to the tip inside the picture, in degrees (0 = right, -90 = up). */
  angle: number;
  /** Grip-to-tip length, as a fraction of the picture's side. */
  reach: number;
  /** Side of the hand picture in the hero's frame. */
  size: number;
  /** Extra size (one-handed weapons are drawn a bit bigger). */
  scale?: number;
  /** Override the pose's angle (degrees; 90 = straight down). */
  hold?: number;
}

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
  /** How the hero holds it (request #77). */
  art?: WeaponArtDef;
}

export const defineWeapon = <T extends WeaponTypeDef>(w: T) => w;
