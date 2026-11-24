import { defineWeapon } from '../define.js';

/*
 * morningstar — everything about this weapon type in one place (request #77):
 * its numbers (identical for every morningstar; upgrades only multiply them) and how
 * the hero holds it. The pictures sit next to this file:
 *   _weapon_icon_morningstar.png  item icon, on the same canvas as the item frame
 *   _weapon_hand_morningstar.png  the weapon in the hero's hand
 *   _ability_icon_spiked_blow.png  icon of its basic attack (spiked_blow, request #79)
 *   _ability_icon_flail_spin.png  icon of its power (flail_spin)
 * The basic attack's own numbers live with the abilities (`spiked_blow`).
 */
export default defineWeapon({
  type: 'morningstar',
  name: 'Morning Star',
  hands: 1,
  category: 'melee',
  primary: 'might',
  secondary: 'will',
  attackType: 'physical',
  attackStyle: 'Spiked blows',
  identity: 'Every hit tears: Bleed',
  baseDamage: { min: 16, max: 19 },
  basicAttack: 'spiked_blow',
  basicAttackCost: 2,
  art: {
    pose: 'down', // held point down, like resting on it
    grip: { x: 0.311, y: 0.603 },
    angle: -24.0,
    reach: 0.476,
    size: 101.2,
    scale: 1.25,
  },
});
