import { defineWeapon } from '../define.js';

/*
 * wand — everything about this weapon type in one place (request #77):
 * its numbers (identical for every wand; upgrades only multiply them) and how
 * the hero holds it. The pictures sit next to this file:
 *   _weapon_icon_wand.png  item icon, on the same canvas as the item frame
 *   _weapon_hand_wand.png  the weapon in the hero's hand
 *   _ability_icon_wand_bolt.png  icon of its basic attack (wand_bolt, request #79)
 *   _ability_icon_focused_bolt.png  icon of its power (focused_bolt)
 * The basic attack's own numbers live with the abilities (`wand_bolt`).
 */
export default defineWeapon({
  type: 'wand',
  name: 'Wand',
  hands: 1,
  category: 'magic',
  primary: 'intellect',
  secondary: null,
  attackType: 'magic',
  attackStyle: 'Magical attack',
  identity: 'Magical precision and control',
  baseDamage: { min: 6, max: 8 },
  basicAttack: 'wand_bolt',
  basicAttackCost: 1,
  art: {
    pose: 'forward', // held forward and up
    grip: { x: 0.349, y: 0.569 },
    angle: -25.8,
    reach: 0.411,
    size: 101.2,
    scale: 1.25,
    hold: -35,
  },
});
