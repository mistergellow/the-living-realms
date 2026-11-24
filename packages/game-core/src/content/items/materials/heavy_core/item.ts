import { defineItem } from '../../define.js';

/*
 * Heavy Core — everything about this item in one place (request #78).
 * Picture: drop `_item_icon_heavy_core.png` (100×100, same scale as the frame) in
 * this folder; until then the game draws a placeholder glyph.
 */
export default defineItem({
  id: 'heavy_core',
  name: 'Heavy Core',
  description: 'A weighted core for upgrading blunt weapons (+4 and up).',
  kind: 'material',
  slots: [],
});
