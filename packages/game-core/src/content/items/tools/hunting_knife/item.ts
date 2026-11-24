import { defineItem } from '../../define.js';

/*
 * Hunting Knife — everything about this item in one place (request #78).
 * Picture: drop `_item_icon_hunting_knife.png` (100×100, same scale as the frame) in
 * this folder; until then the game draws a placeholder glyph.
 */
export default defineItem({
  id: 'hunting_knife',
  name: 'Hunting Knife',
  description: 'Needed to hunt.',
  kind: 'tool',
  slots: [],
  tool: { type: 'hunting_knife', tier: 1, minRank: 0 },
});
