import { defineItem } from '../../define.js';

/*
 * Hearty Stew — everything about this item in one place (request #78).
 * Picture: drop `_item_icon_hearty_stew.png` (100×100, same scale as the frame) in
 * this folder; until then the game draws a placeholder glyph.
 */
export default defineItem({
  id: 'hearty_stew',
  name: 'Hearty Stew',
  description: 'A warming meal. Restores 25% of your health.',
  kind: 'consumable',
  heal: 25,
  slots: [],
});
