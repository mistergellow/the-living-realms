import { defineWeapon } from '../define.js';

/*
 * scepter — everything about this weapon type in one place (request #77):
 * its numbers (identical for every scepter; upgrades only multiply them) and how
 * the hero holds it. The pictures sit next to this file:
 *   _weapon_icon_scepter.png  item icon, on the same canvas as the item frame
 *   _weapon_hand_scepter.png  the weapon in the hero's hand
 * The basic attack's own numbers live with the abilities (`smite`).
 */
export default defineWeapon({
  type: 'scepter',
  name: 'Scepter',
  hands: 1,
  category: 'magic',
  primary: 'will',
  secondary: null,
  attackType: 'magic',
  attackStyle: 'Holy light',
  identity: 'Smites one enemy; its light heals the whole party',
  baseDamage: { min: 12, max: 15 },
  basicAttack: 'smite',
  basicAttackCost: 2,
  art: {
    pose: 'forward', // held forward and up
    grip: { x: 0.385, y: 0.612 },
    angle: -44.8,
    reach: 0.413,
    size: 101.2,
    scale: 1.25,
    hold: -60,
  },
});
