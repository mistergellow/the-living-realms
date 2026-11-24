import { defineWeapon } from '../define.js';

/*
 * spear — everything about this weapon type in one place (request #77):
 * its numbers (identical for every spear; upgrades only multiply them) and how
 * the hero holds it. The pictures sit next to this file:
 *   _weapon_icon_spear.png  item icon, on the same canvas as the item frame
 *   _weapon_hand_spear.png  the weapon in the hero's hand
 *   _ability_icon_thrust.png  icon of its basic attack (thrust, request #79)
 *   _ability_icon_skewer.png  icon of its power (skewer)
 * The basic attack's own numbers live with the abilities (`thrust`).
 */
export default defineWeapon({
  type: 'spear',
  name: 'Spear',
  hands: 2,
  category: 'melee',
  primary: 'might',
  secondary: 'precision',
  attackType: 'physical',
  attackStyle: 'Physical thrust',
  identity: 'Reach and positional control',
  baseDamage: { min: 7, max: 9 },
  basicAttack: 'thrust',
  basicAttackCost: 2,
  art: {
    pose: 'up', // held upright, like a staff
    grip: { x: 0.396, y: 0.532 },
    angle: -18.5,
    reach: 0.565,
    size: 101.2,
  },
});
