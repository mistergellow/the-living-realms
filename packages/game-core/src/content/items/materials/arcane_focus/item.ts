import { defineItem } from '../../define.js';

/*
 * Arcane Focus — everything about this item in one place (request #78).
 * Picture: drop `_item_icon_arcane_focus.png` (100×100, same scale as the frame) in
 * this folder; until then the game draws a placeholder glyph.
 */
export default defineItem({
  id: 'arcane_focus',
  name: 'Arcane Focus',
  description: 'A humming crystal for upgrading staves, wands, tomes and scepters (+4 and up).',
  kind: 'material',
  slots: [],
});
