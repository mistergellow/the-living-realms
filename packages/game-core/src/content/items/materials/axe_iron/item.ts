import { defineItem } from '../../define.js';

/*
 * Axe Iron — everything about this item in one place (request #78).
 * Picture: drop `_item_icon_axe_iron.png` (100×100, same scale as the frame) in
 * this folder; until then the game draws a placeholder glyph.
 */
export default defineItem({
  id: 'axe_iron',
  name: 'Axe Iron',
  description: 'Dense iron for upgrading axes (+4 and up).',
  kind: 'material',
  slots: [],
});
