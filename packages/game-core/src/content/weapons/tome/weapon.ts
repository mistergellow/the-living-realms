import { defineWeapon } from '../define.js';

/*
 * tome — everything about this weapon type in one place (request #77):
 * its numbers (identical for every tome; upgrades only multiply them) and how
 * the hero holds it. The pictures sit next to this file:
 *   _weapon_icon_tome.png  item icon, on the same canvas as the item frame
 *   _weapon_hand_tome.png  the weapon in the hero's hand
 *   _ability_icon_spark.png  icon of its basic attack (spark, request #79)
 *   _ability_icon_hex.png  icon of its power (hex)
 * The basic attack's own numbers live with the abilities (`spark`).
 */
export default defineWeapon({
  type: 'tome',
  name: 'Tome',
  hands: 1,
  category: 'magic',
  primary: 'intellect',
  secondary: 'precision',
  attackType: 'magic',
  attackStyle: 'Magical attack',
  identity: 'Curses and sparks',
  baseDamage: { min: 3, max: 5 },
  basicAttack: 'spark',
  basicAttackCost: 1,
  art: {
    pose: 'hand', // simply in the hand
    grip: { x: 0.496, y: 0.497 },
    angle: 0,
    reach: 0.165,
    size: 101.2,
    scale: 1.25,
  },
});
