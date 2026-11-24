import { defineWeapon } from '../define.js';

/*
 * dagger — everything about this weapon type in one place (request #77):
 * its numbers (identical for every dagger; upgrades only multiply them) and how
 * the hero holds it. The pictures sit next to this file:
 *   _weapon_icon_dagger.png  item icon, on the same canvas as the item frame
 *   _weapon_hand_dagger.png  the weapon in the hero's hand
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
    pose: 'down', // held point down, like resting on it
    grip: { x: 0.382, y: 0.578 },
    angle: -32.2,
    reach: 0.354,
    size: 101.2,
    scale: 1.25,
  },
});
