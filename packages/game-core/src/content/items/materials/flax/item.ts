import { defineItem } from '../../define.js';

/*
 * Flax — everything about this item in one place (request #78).
 * Picture: drop `_item_icon_flax.png` (100×100, same scale as the frame) in
 * this folder; until then the game draws a placeholder glyph.
 */
export default defineItem({
  id: 'flax',
  name: 'Flax',
  description: 'Fibres for weaving.',
  kind: 'material',
  slots: [],
});
