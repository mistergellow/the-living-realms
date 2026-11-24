import { defineWeapon } from '../define.js';

/*
 * sling — everything about this weapon type in one place (request #77):
 * its numbers (identical for every sling; upgrades only multiply them) and how
 * the hero holds it. The pictures sit next to this file:
 *   _weapon_icon_sling.png  item icon, on the same canvas as the item frame
 *   _weapon_hand_sling.png  the weapon in the hero's hand
 * The basic attack's own numbers live with the abilities (`sling_stone`).
 */
export default defineWeapon({
  type: 'sling',
  name: 'Sling',
  hands: 1,
  category: 'ranged',
  primary: 'precision',
  secondary: 'will',
  attackType: 'ranged',
  attackStyle: 'Stones at any distance',
  identity: 'Cheap shots at anyone; a well-placed stone stuns',
  baseDamage: { min: 4, max: 6 },
  basicAttack: 'sling_stone',
  basicAttackCost: 1,
  art: {
    pose: 'hand', // simply in the hand
    grip: { x: 0.524, y: 0.518 },
    angle: 0,
    reach: 0.148,
    size: 101.2,
    scale: 1.25,
  },
});
