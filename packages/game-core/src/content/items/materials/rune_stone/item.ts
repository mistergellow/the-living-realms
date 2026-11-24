import { defineItem } from '../../define.js';

/*
 * Rune Stone — everything about this item in one place (request #78).
 * Picture: drop `_item_icon_rune_stone.png` (100×100, same scale as the frame) in
 * this folder; until then the game draws a placeholder glyph.
 */
export default defineItem({
  id: 'rune_stone',
  name: 'Rune Stone',
  description: 'A blank stone shaped by a runesmith. Runes come later.',
  kind: 'material',
  slots: [],
});
