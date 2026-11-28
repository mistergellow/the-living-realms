import { defineWeapon } from '../define.js';

/*
 * axe — everything about this weapon type in one place (request #77):
 * its numbers (identical for every axe; upgrades only multiply them) and how
 * the hero holds it. The pictures sit next to this file:
 *   _weapon_icon_axe.png  item icon, on the same canvas as the item frame
 *   _weapon_hand_axe.png  the weapon in the hero's hand
 *   _ability_icon_chop.png  icon of its basic attack (chop, request #79)
 *   _ability_icon_sunder.png  icon of its power (sunder)
 * The basic attack's own numbers live with the abilities (`chop`).
 */
export default defineWeapon({
  type: 'axe',
  name: 'Axe',
  hands: 1,
  category: 'melee',
  primary: 'might',
  secondary: 'endurance',
  attackType: 'physical',
  attackStyle: 'Heavy physical attack',
  identity: 'High impact',
  baseDamage: { min: 22, max: 30 },
  basicAttack: 'chop',
  basicAttackCost: 3,
  art: {
    pose: 'raised', // held up, point up and a little forward (request #92)
    grip: { x: 0.324, y: 0.615 },
    angle: -32.9,
    reach: 0.436,
    size: 101.2,
    scale: 1.25,
  },
});
