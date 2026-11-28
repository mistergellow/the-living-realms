import { defineWeapon } from '../define.js';

/*
 * handaxe — everything about this weapon type in one place (request #77):
 * its numbers (identical for every handaxe; upgrades only multiply them) and how
 * the hero holds it. The pictures sit next to this file:
 *   _weapon_icon_handaxe.png  item icon, on the same canvas as the item frame
 *   _weapon_hand_handaxe.png  the weapon in the hero's hand
 *   _ability_icon_hack.png  icon of its basic attack (hack, request #79)
 *   _ability_icon_throw_axe.png  icon of its power (throw_axe)
 * The basic attack's own numbers live with the abilities (`hack`).
 */
export default defineWeapon({
  type: 'handaxe',
  name: 'Hand Axe',
  hands: 1,
  category: 'melee',
  primary: 'agility',
  secondary: 'endurance',
  attackType: 'physical',
  attackStyle: 'Quick hacks, or thrown',
  identity: 'Light enough for the off hand; can be thrown at any enemy',
  baseDamage: { min: 14, max: 17 },
  basicAttack: 'hack',
  basicAttackCost: 2,
  art: {
    pose: 'raised', // held up, point up and a little forward (request #92)
    grip: { x: 0.339, y: 0.605 },
    angle: -32.2,
    reach: 0.397,
    size: 101.2,
    scale: 1.25,
  },
});
