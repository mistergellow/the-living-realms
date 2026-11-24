import { defineItem } from '../../define.js';

/*
 * Mana Tonic — everything about this item in one place (request #78).
 * Picture: drop `_item_icon_mana_tonic.png` (100×100, same scale as the frame) in
 * this folder; until then the game draws a placeholder glyph.
 */
export default defineItem({
  id: 'mana_tonic',
  name: 'Mana Tonic',
  description: 'Restores mana.',
  kind: 'consumable',
  slots: [],
});
