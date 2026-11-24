import { defineWeapon } from '../define.js';

/*
 * staff — everything about this weapon type in one place (request #77):
 * its numbers (identical for every staff; upgrades only multiply them) and how
 * the hero holds it. The pictures sit next to this file:
 *   _weapon_icon_staff.png  item icon, on the same canvas as the item frame
 *   _weapon_hand_staff.png  the weapon in the hero's hand
 *   _ability_icon_staff_strike.png  icon of its basic attack (staff_strike, request #79)
 *   _ability_icon_firebolt.png  icon of its power (firebolt)
 * The basic attack's own numbers live with the abilities (`staff_strike`).
 */
export default defineWeapon({
  type: 'staff',
  name: 'Staff',
  hands: 2,
  category: 'magic',
  primary: 'intellect',
  secondary: 'will',
  attackType: 'magic',
  attackStyle: 'Magical attack',
  identity: 'Magical power and elemental effects',
  baseDamage: { min: 14, max: 17 },
  basicAttack: 'staff_strike',
  basicAttackCost: 2,
  art: {
    pose: 'up', // held upright, like a staff
    grip: { x: 0.432, y: 0.575 },
    angle: -50.8,
    reach: 0.487,
    size: 101.2,
  },
});
