import { defineItem } from '../../define.js';

/*
 * Blank Scroll — everything about this item in one place (request #78).
 * Picture: drop `_item_icon_blank_scroll.png` (100×100, same scale as the frame) in
 * this folder; until then the game draws a placeholder glyph.
 */
export default defineItem({
  id: 'blank_scroll',
  name: 'Blank Scroll',
  description: 'Ruled parchment for scrolls. Scribes will write on it in a later update.',
  kind: 'material',
  slots: [],
});
