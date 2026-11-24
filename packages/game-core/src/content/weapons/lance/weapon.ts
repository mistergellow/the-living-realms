import { defineWeapon } from '../define.js';

/*
 * lance — everything about this weapon type in one place (request #77):
 * its numbers (identical for every lance; upgrades only multiply them) and how
 * the hero holds it. The pictures sit next to this file:
 *   _weapon_icon_lance.png  item icon, on the same canvas as the item frame
 *   _weapon_hand_lance.png  the weapon in the hero's hand
 *   _ability_icon_lance_thrust.png  icon of its basic attack (lance_thrust, request #79)
 *   _ability_icon_charge.png  icon of its power (charge)
 * The basic attack's own numbers live with the abilities (`lance_thrust`).
 */
export default defineWeapon({
  type: 'lance',
  name: 'Lance',
  hands: 2,
  category: 'melee',
  primary: 'precision',
  secondary: 'endurance',
  attackType: 'physical',
  attackStyle: 'Long charging thrusts',
  identity: 'Reaches the two nearest enemies; charges and marks',
  baseDamage: { min: 10, max: 13 },
  basicAttack: 'lance_thrust',
  basicAttackCost: 2,
  art: {
    pose: 'up', // held upright, like a staff
    grip: { x: 0.31, y: 0.548 },
    angle: -14.5,
    reach: 0.687,
    size: 101.2,
  },
});
