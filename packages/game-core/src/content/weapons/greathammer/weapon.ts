import { defineWeapon } from '../define.js';

/*
 * greathammer — everything about this weapon type in one place (request #77):
 * its numbers (identical for every greathammer; upgrades only multiply them) and how
 * the hero holds it. The pictures sit next to this file:
 *   _weapon_icon_greathammer.png  item icon, on the same canvas as the item frame
 *   _weapon_hand_greathammer.png  the weapon in the hero's hand
 *   _ability_icon_great_smash.png  icon of its basic attack (great_smash, request #79)
 *   _ability_icon_earthshaker.png  icon of its power (earthshaker)
 * The basic attack's own numbers live with the abilities (`great_smash`).
 */
export default defineWeapon({
  type: 'greathammer',
  name: 'Great Hammer',
  hands: 2,
  category: 'melee',
  primary: 'endurance',
  secondary: 'intellect',
  attackType: 'physical',
  attackStyle: 'Earth-shaking blows',
  identity: 'Shakes and weakens the two nearest enemies',
  baseDamage: { min: 24, max: 30 },
  basicAttack: 'great_smash',
  basicAttackCost: 3,
  art: {
    pose: 'down', // held point down, like resting on it
    grip: { x: 0.304, y: 0.68 },
    angle: -39.7,
    reach: 0.524,
    size: 101.2,
  },
});
