import { defineItem } from '../../define.js';

/*
 * Rift Moss — everything about this item in one place (request #78).
 * Picture: drop `_item_icon_herb.png` (100×100, same scale as the frame) in
 * this folder; until then the game draws a placeholder glyph.
 */
export default defineItem({
  id: 'herb',
  name: 'Rift Moss',
  description: 'A medicinal herb that grows near rifts.',
  kind: 'material',
  slots: [],
});
