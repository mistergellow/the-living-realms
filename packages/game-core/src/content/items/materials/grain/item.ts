import { defineItem } from '../../define.js';

/*
 * Grain — everything about this item in one place (request #78).
 * Picture: drop `_item_icon_grain.png` (100×100, same scale as the frame) in
 * this folder; until then the game draws a placeholder glyph.
 */
export default defineItem({
  id: 'grain',
  name: 'Grain',
  description: 'A sack of grain.',
  kind: 'material',
  slots: [],
});
