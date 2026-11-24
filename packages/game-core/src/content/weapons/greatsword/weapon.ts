import { defineWeapon } from '../define.js';

/*
 * greatsword — everything about this weapon type in one place (request #77):
 * its numbers (identical for every greatsword; upgrades only multiply them) and how
 * the hero holds it. The pictures sit next to this file:
 *   _weapon_icon_greatsword.png  item icon, on the same canvas as the item frame
 *   _weapon_hand_greatsword.png  the weapon in the hero's hand
 *   _ability_icon_great_swing.png  icon of its basic attack (great_swing, request #79)
 *   _ability_icon_executioner.png  icon of its power (executioner)
 * The basic attack's own numbers live with the abilities (`great_swing`).
 */
export default defineWeapon({
  type: 'greatsword',
  name: 'Greatsword',
  hands: 2,
  category: 'melee',
  primary: 'might',
  secondary: 'intellect',
  attackType: 'physical',
  attackStyle: 'Wide two-handed swings',
  identity: 'Hits the two nearest enemies at once',
  baseDamage: { min: 12, max: 16 },
  basicAttack: 'great_swing',
  basicAttackCost: 3,
  art: {
    pose: 'down', // held point down, like resting on it
    grip: { x: 0.244, y: 0.707 },
    angle: -39.6,
    reach: 0.758,
    size: 101.2,
  },
});
