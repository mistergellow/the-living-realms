import { defineWeapon } from '../define.js';

/*
 * mace — everything about this weapon type in one place (request #77):
 * its numbers (identical for every mace; upgrades only multiply them) and how
 * the hero holds it. The pictures sit next to this file:
 *   _weapon_icon_mace.png  item icon, on the same canvas as the item frame
 *   _weapon_hand_mace.png  the weapon in the hero's hand
 *   _ability_icon_crush.png  icon of its basic attack (crush, request #79)
 *   _ability_icon_stagger.png  icon of its power (stagger)
 * The basic attack's own numbers live with the abilities (`crush`).
 */
export default defineWeapon({
  type: 'mace',
  name: 'Mace',
  hands: 1,
  category: 'melee',
  primary: 'endurance',
  secondary: null,
  attackType: 'physical',
  attackStyle: 'Blunt physical attack',
  identity: 'Heavy impact',
  baseDamage: { min: 22, max: 26 },
  basicAttack: 'crush',
  basicAttackCost: 3,
  art: {
    pose: 'down', // held point down, like resting on it
    grip: { x: 0.333, y: 0.644 },
    angle: -40.7,
    reach: 0.509,
    size: 101.2,
    scale: 1.25,
  },
});
