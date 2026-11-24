import { defineItem } from '../../define.js';

/*
 * Raw Fish — everything about this item in one place (request #78).
 * Picture: drop `_item_icon_raw_fish.png` (100×100, same scale as the frame) in
 * this folder; until then the game draws a placeholder glyph.
 */
export default defineItem({
  id: 'raw_fish',
  name: 'Raw Fish',
  description: 'A fresh catch. Cook it before eating.',
  kind: 'material',
  slots: [],
});
