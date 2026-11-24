import { defineItem } from '../../define.js';

/*
 * Parchment — everything about this item in one place (request #78).
 * Picture: drop `_item_icon_parchment.png` (100×100, same scale as the frame) in
 * this folder; until then the game draws a placeholder glyph.
 */
export default defineItem({
  id: 'parchment',
  name: 'Parchment',
  description: 'Scraped leather, ready to write on.',
  kind: 'material',
  slots: [],
});
