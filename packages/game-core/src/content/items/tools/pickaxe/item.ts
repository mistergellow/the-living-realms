import { defineItem } from '../../define.js';

/*
 * Pickaxe — everything about this item in one place (request #78).
 * Picture: drop `_item_icon_pickaxe.png` (100×100, same scale as the frame) in
 * this folder; until then the game draws a placeholder glyph.
 */
export default defineItem({
  id: 'pickaxe',
  name: 'Pickaxe',
  description: 'Needed to mine.',
  kind: 'tool',
  slots: [],
  tool: { type: 'pickaxe', tier: 1, minRank: 0 },
});
