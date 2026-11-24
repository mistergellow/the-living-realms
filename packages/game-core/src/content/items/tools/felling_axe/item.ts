import { defineItem } from '../../define.js';

/*
 * Felling Axe — everything about this item in one place (request #78).
 * Picture: drop `_item_icon_felling_axe.png` (100×100, same scale as the frame) in
 * this folder; until then the game draws a placeholder glyph.
 */
export default defineItem({
  id: 'felling_axe',
  name: 'Felling Axe',
  description: 'Needed to chop wood.',
  kind: 'tool',
  slots: [],
  tool: { type: 'axe', tier: 1, minRank: 0 },
});
