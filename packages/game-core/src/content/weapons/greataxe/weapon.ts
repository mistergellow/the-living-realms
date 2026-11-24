import { defineWeapon } from '../define.js';

/*
 * greataxe — everything about this weapon type in one place (request #77):
 * its numbers (identical for every greataxe; upgrades only multiply them) and how
 * the hero holds it. The pictures sit next to this file:
 *   _weapon_icon_greataxe.png  item icon, on the same canvas as the item frame
 *   _weapon_hand_greataxe.png  the weapon in the hero's hand
 * The basic attack's own numbers live with the abilities (`great_chop`).
 */
export default defineWeapon({
  type: 'greataxe',
  name: 'Greataxe',
  hands: 2,
  category: 'melee',
  primary: 'might',
  secondary: null,
  attackType: 'physical',
  attackStyle: 'Brutal two-handed chops',
  identity: 'The biggest single hits; makes wounds bleed',
  baseDamage: { min: 26, max: 34 },
  basicAttack: 'great_chop',
  basicAttackCost: 3,
  art: {
    pose: 'down', // held point down, like resting on it
    grip: { x: 0.254, y: 0.678 },
    angle: -35.3,
    reach: 0.627,
    size: 101.2,
  },
});
