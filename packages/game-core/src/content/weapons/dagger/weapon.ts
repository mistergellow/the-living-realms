import { defineWeapon } from '../define.js';

/*
 * dagger — everything about this weapon type in one place (request #77):
 * its numbers (identical for every dagger; upgrades only multiply them) and how
 * the hero holds it. The pictures sit next to this file:
 *   _weapon_icon_dagger.png  item icon, on the same canvas as the item frame
 *   _weapon_hand_dagger.png  the weapon in the hero's hand
 *   _ability_icon_stab.png  icon of its basic attack (stab, request #79)
 *   _ability_icon_backstab.png  icon of its power (backstab)
 * The basic attack's own numbers live with the abilities (`stab`).
 */
export default defineWeapon({
  type: 'dagger',
  name: 'Dagger',
  hands: 1,
  category: 'melee',
  primary: 'agility',
  secondary: null,
  attackType: 'physical',
  attackStyle: 'Fast physical attack',
  identity: 'Critical hits and precision',
  baseDamage: { min: 6, max: 8 },
  basicAttack: 'stab',
  basicAttackCost: 1,
  art: {
    pose: 'raised', // held up, point up and a little forward (request #92)
    grip: { x: 0.382, y: 0.578 },
    angle: -32.2,
    reach: 0.354,
    size: 101.2,
    scale: 1.25,
  },
});
