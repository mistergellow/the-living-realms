import { defineItem } from '../../define.js';

/*
 * Log — everything about this item in one place (request #78).
 * Picture: drop `_item_icon_log.png` (100×100, same scale as the frame) in
 * this folder; until then the game draws a placeholder glyph.
 */
export default defineItem({
  id: 'log',
  name: 'Log',
  description: 'Raw timber.',
  kind: 'material',
  slots: [],
});
