import { defineItem } from '../../define.js';

/*
 * Blessing Scroll — everything about this item in one place (request #78).
 * Picture: drop `_item_icon_blessing_scroll.png` (100×100, same scale as the frame) in
 * this folder; until then the game draws a placeholder glyph.
 */
export default defineItem({
  id: 'blessing_scroll',
  name: 'Blessing Scroll',
  description:
    'Used at the blacksmith: if an upgrade fails, the weapon loses 1 level instead of breaking.',
  kind: 'consumable',
  slots: [],
});
