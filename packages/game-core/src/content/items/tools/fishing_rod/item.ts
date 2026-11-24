import { defineItem } from '../../define.js';

/*
 * Fishing Rod — everything about this item in one place (request #78).
 * Picture: drop `_item_icon_fishing_rod.png` (100×100, same scale as the frame) in
 * this folder; until then the game draws a placeholder glyph.
 */
export default defineItem({
  id: 'fishing_rod',
  name: 'Fishing Rod',
  description: 'Needed to fish.',
  kind: 'tool',
  slots: [],
  tool: { type: 'fishing_rod', tier: 1, minRank: 0 },
});
