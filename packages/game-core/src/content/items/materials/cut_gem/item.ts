import { defineItem } from '../../define.js';

/*
 * Cut Gem — everything about this item in one place (request #78).
 * Picture: drop `_item_icon_cut_gem.png` (100×100, same scale as the frame) in
 * this folder; until then the game draws a placeholder glyph.
 */
export default defineItem({
  id: 'cut_gem',
  name: 'Cut Gem',
  description: 'A polished gem for jewellery.',
  kind: 'material',
  slots: [],
});
