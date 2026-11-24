import { defineItem } from '../../define.js';

/*
 * Raw Meat — everything about this item in one place (request #78).
 * Picture: drop `_item_icon_raw_meat.png` (100×100, same scale as the frame) in
 * this folder; until then the game draws a placeholder glyph.
 */
export default defineItem({
  id: 'raw_meat',
  name: 'Raw Meat',
  description: 'Game meat. Cook it first.',
  kind: 'material',
  slots: [],
});
