import { defineItem } from '../../define.js';

/*
 * Fine Pickaxe — everything about this item in one place (request #78).
 * Picture: drop `_item_icon_fine_pickaxe.png` (100×100, same scale as the frame) in
 * this folder; until then the game draws a placeholder glyph.
 */
export default defineItem({
  id: 'fine_pickaxe',
  name: 'Fine Pickaxe',
  description: 'A better pick (+5% success). Needs an Apprentice Miner.',
  kind: 'tool',
  slots: [],
  tool: { type: 'pickaxe', tier: 2, minRank: 1 },
});
