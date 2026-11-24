import { defineWeapon } from '../define.js';

/*
 * scythe — everything about this weapon type in one place (request #77):
 * its numbers (identical for every scythe; upgrades only multiply them) and how
 * the hero holds it. The pictures sit next to this file:
 *   _weapon_icon_scythe.png  item icon, on the same canvas as the item frame
 *   _weapon_hand_scythe.png  the weapon in the hero's hand
 * The basic attack's own numbers live with the abilities (`reap`).
 */
export default defineWeapon({
  type: 'scythe',
  name: 'Scythe',
  hands: 2,
  category: 'melee',
  primary: 'agility',
  secondary: 'will',
  attackType: 'physical',
  attackStyle: 'Long reaping sweeps',
  identity: 'Reaps the two nearest enemies; drinks their life',
  baseDamage: { min: 9, max: 12 },
  basicAttack: 'reap',
  basicAttackCost: 2,
  art: {
    pose: 'up', // held upright, like a staff
    grip: { x: 0.408, y: 0.563 },
    angle: -23.8,
    reach: 0.486,
    size: 101.2,
  },
});
