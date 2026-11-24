import { defineItem } from '../../define.js';

/*
 * Fine Felling Axe — everything about this item in one place (request #78).
 * Picture: drop `_item_icon_fine_felling_axe.png` (100×100, same scale as the frame) in
 * this folder; until then the game draws a placeholder glyph.
 */
export default defineItem({
  id: 'fine_felling_axe',
  name: 'Fine Felling Axe',
  description: 'A better axe (+5% success). Needs an Apprentice Lumberjack.',
  kind: 'tool',
  slots: [],
  tool: { type: 'axe', tier: 2, minRank: 1 },
});
