import { defineItem } from '../../define.js';

/*
 * Linen — everything about this item in one place (request #78).
 * Picture: drop `_item_icon_linen.png` (100×100, same scale as the frame) in
 * this folder; until then the game draws a placeholder glyph.
 */
export default defineItem({
  id: 'linen',
  name: 'Linen',
  description: 'Woven cloth.',
  kind: 'material',
  slots: [],
});
