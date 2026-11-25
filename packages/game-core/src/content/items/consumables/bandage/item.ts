import { defineItem } from '../../define.js';

/*
 * Bandage — everything about this item in one place (request #78).
 * Picture: drop `_item_icon_bandage.png` (100×100, same scale as the frame) in
 * this folder; until then the game draws a placeholder glyph.
 */
export default defineItem({
  id: 'bandage',
  name: 'Bandage',
  description: 'Stops bleeding. Restores 10% of your health.',
  kind: 'consumable',
  heal: 10,
  slots: [],
});
