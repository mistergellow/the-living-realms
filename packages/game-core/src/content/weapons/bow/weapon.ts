import { defineWeapon } from '../define.js';

/*
 * bow — everything about this weapon type in one place (request #77):
 * its numbers (identical for every bow; upgrades only multiply them) and how
 * the hero holds it. The pictures sit next to this file:
 *   _weapon_icon_bow.png  item icon, on the same canvas as the item frame
 *   _weapon_hand_bow.png  the weapon in the hero's hand
 *   _ability_icon_aimed_shot.png  icon of its basic attack (aimed_shot, request #79)
 *   _ability_icon_marking_shot.png  icon of its power (marking_shot)
 * The basic attack's own numbers live with the abilities (`aimed_shot`).
 */
export default defineWeapon({
  type: 'bow',
  name: 'Bow',
  hands: 2,
  category: 'ranged',
  primary: 'precision',
  secondary: 'agility',
  attackType: 'ranged',
  attackStyle: 'Ranged physical attack',
  identity: 'Accuracy and exploiting weaknesses',
  baseDamage: { min: 7, max: 9 },
  basicAttack: 'aimed_shot',
  basicAttackCost: 2,
  art: {
    pose: 'bow', // held upright by the middle
    grip: { x: 0.516, y: 0.469 },
    angle: 16.2,
    reach: 0.354,
    size: 101.2,
    scale: 1.25,
  },
});
