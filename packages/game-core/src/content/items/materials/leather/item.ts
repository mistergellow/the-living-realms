import { defineItem } from '../../define.js';

/*
 * Leather — everything about this item in one place (request #78).
 * Picture: drop `_item_icon_leather.png` (100×100, same scale as the frame) in
 * this folder; until then the game draws a placeholder glyph.
 */
export default defineItem({
  id: 'leather',
  name: 'Leather',
  description: 'Cured hide for leatherworking.',
  kind: 'material',
  slots: [],
});
