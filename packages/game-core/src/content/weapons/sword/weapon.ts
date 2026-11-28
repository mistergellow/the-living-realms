import { defineWeapon } from '../define.js';

/*
 * sword — everything about this weapon type in one place (request #77):
 * its numbers (identical for every sword; upgrades only multiply them) and how
 * the hero holds it. The pictures sit next to this file:
 *   _weapon_icon_sword.png  item icon, on the same canvas as the item frame
 *   _weapon_hand_sword.png  the weapon in the hero's hand
 *   _ability_icon_slash.png  icon of its basic attack (slash, request #79)
 *   _ability_icon_cleave.png  icon of its power (cleave)
 * The basic attack's own numbers live with the abilities (`slash`).
 */
export default defineWeapon({
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
  art: {
    pose: 'raised', // held up, point up and a little forward (request #92)
    grip: { x: 0.328, y: 0.619 },
    angle: -36.1,
    reach: 0.484,
    size: 101.2,
    scale: 1.25,
  },
});
