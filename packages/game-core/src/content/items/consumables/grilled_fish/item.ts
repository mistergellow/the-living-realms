import { defineItem } from '../../define.js';

/*
 * Grilled Fish — everything about this item in one place (request #78).
 * Picture: drop `_item_icon_grilled_fish.png` (100×100, same scale as the frame) in
 * this folder; until then the game draws a placeholder glyph.
 */
export default defineItem({
  id: 'grilled_fish',
  name: 'Grilled Fish',
  description: 'A simple, filling meal. Restores 15% of your health.',
  kind: 'consumable',
  heal: 15,
  slots: [],
});
