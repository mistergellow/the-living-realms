import { defineWeapon } from '../define.js';

/*
 * hammer — everything about this weapon type in one place (request #77):
 * its numbers (identical for every hammer; upgrades only multiply them) and how
 * the hero holds it. The pictures sit next to this file:
 *   _weapon_icon_hammer.png  item icon, on the same canvas as the item frame
 *   _weapon_hand_hammer.png  the weapon in the hero's hand
 *   _ability_icon_hammer_blow.png  icon of its basic attack (hammer_blow, request #79)
 *   _ability_icon_concuss.png  icon of its power (concuss)
 * The basic attack's own numbers live with the abilities (`hammer_blow`).
 */
export default defineWeapon({
  type: 'hammer',
  name: 'Hammer',
  hands: 1,
  category: 'melee',
  primary: 'endurance',
  secondary: 'will',
  attackType: 'physical',
  attackStyle: 'Crushing blows',
  identity: 'Can stun the enemy it hits',
  baseDamage: { min: 23, max: 27 },
  basicAttack: 'hammer_blow',
  basicAttackCost: 3,
  art: {
    pose: 'down', // held point down, like resting on it
    grip: { x: 0.332, y: 0.656 },
    angle: -42.8,
    reach: 0.535,
    size: 101.2,
    scale: 1.25,
  },
});
