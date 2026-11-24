import { defineWeapon } from '../define.js';

/*
 * chakram — everything about this weapon type in one place (request #77):
 * its numbers (identical for every chakram; upgrades only multiply them) and how
 * the hero holds it. The pictures sit next to this file:
 *   _weapon_icon_chakram.png  item icon, on the same canvas as the item frame
 *   _weapon_hand_chakram.png  the weapon in the hero's hand
 * The basic attack's own numbers live with the abilities (`chakram_throw`).
 */
export default defineWeapon({
  type: 'chakram',
  name: 'Chakram',
  hands: 1,
  category: 'magic',
  primary: 'agility',
  secondary: 'intellect',
  attackType: 'magic',
  attackStyle: 'Spinning, rune-charged rings',
  identity: 'Thrown at any enemy; ricochets through all of them',
  baseDamage: { min: 8, max: 10 },
  basicAttack: 'chakram_throw',
  basicAttackCost: 1,
  art: {
    pose: 'hand', // simply in the hand
    grip: { x: 0.5, y: 0.499 },
    angle: 0,
    reach: 0.171,
    size: 101.2,
    scale: 1.25,
  },
});
