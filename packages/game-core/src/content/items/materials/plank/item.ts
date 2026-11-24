import { defineItem } from '../../define.js';

/*
 * Plank — everything about this item in one place (request #78).
 * Picture: drop `_item_icon_plank.png` (100×100, same scale as the frame) in
 * this folder; until then the game draws a placeholder glyph.
 */
export default defineItem({
  id: 'plank',
  name: 'Plank',
  description: 'Sawn wood for carpentry.',
  kind: 'material',
  slots: [],
});
