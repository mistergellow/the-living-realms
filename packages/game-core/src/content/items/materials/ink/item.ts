import { defineItem } from '../../define.js';

/*
 * Ink — everything about this item in one place (request #78).
 * Picture: drop `_item_icon_ink.png` (100×100, same scale as the frame) in
 * this folder; until then the game draws a placeholder glyph.
 */
export default defineItem({
  id: 'ink',
  name: 'Ink',
  description: 'Dark herbal ink.',
  kind: 'material',
  slots: [],
});
