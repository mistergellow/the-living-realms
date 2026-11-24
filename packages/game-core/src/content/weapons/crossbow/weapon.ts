import { defineWeapon } from '../define.js';

/*
 * crossbow — everything about this weapon type in one place (request #77):
 * its numbers (identical for every crossbow; upgrades only multiply them) and how
 * the hero holds it. The pictures sit next to this file:
 *   _weapon_icon_crossbow.png  item icon, on the same canvas as the item frame
 *   _weapon_hand_crossbow.png  the weapon in the hero's hand
 *   _ability_icon_bolt_shot.png  icon of its basic attack (bolt_shot, request #79)
 *   _ability_icon_piercing_bolt.png  icon of its power (piercing_bolt)
 * The basic attack's own numbers live with the abilities (`bolt_shot`).
 */
export default defineWeapon({
  type: 'crossbow',
  name: 'Crossbow',
  hands: 2,
  category: 'ranged',
  primary: 'precision',
  secondary: null,
  attackType: 'ranged',
  attackStyle: 'Slow, heavy bolts',
  identity: 'Few shots, each one hits hard; pierces Dodge',
  baseDamage: { min: 10, max: 12 },
  basicAttack: 'bolt_shot',
  basicAttackCost: 3,
  art: {
    pose: 'level', // held level, pointing at the enemy
    grip: { x: 0.384, y: 0.565 },
    angle: -17.8,
    reach: 0.421,
    size: 101.2,
    scale: 1.25,
  },
});
