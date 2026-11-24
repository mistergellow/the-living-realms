import { defineItem } from '../../define.js';

/*
 * Fine Hunting Knife — everything about this item in one place (request #78).
 * Picture: drop `_item_icon_fine_hunting_knife.png` (100×100, same scale as the frame) in
 * this folder; until then the game draws a placeholder glyph.
 */
export default defineItem({
  id: 'fine_hunting_knife',
  name: 'Fine Hunting Knife',
  description: 'A better knife (+5% success). Needs an Apprentice Hunter.',
  kind: 'tool',
  slots: [],
  tool: { type: 'hunting_knife', tier: 2, minRank: 1 },
});
