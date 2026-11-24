import { defineItem } from '../../define.js';

/*
 * Fine Fishing Rod — everything about this item in one place (request #78).
 * Picture: drop `_item_icon_fine_fishing_rod.png` (100×100, same scale as the frame) in
 * this folder; until then the game draws a placeholder glyph.
 */
export default defineItem({
  id: 'fine_fishing_rod',
  name: 'Fine Fishing Rod',
  description: 'A better rod (+5% success). Needs an Apprentice Fisher.',
  kind: 'tool',
  slots: [],
  tool: { type: 'fishing_rod', tier: 2, minRank: 1 },
});
