import { defineItem } from '../../define.js';

/*
 * Iron Ingot — everything about this item in one place (request #78).
 * Picture: drop `_item_icon_iron_ingot.png` (100×100, same scale as the frame) in
 * this folder; until then the game draws a placeholder glyph.
 */
export default defineItem({
  id: 'iron_ingot',
  name: 'Iron Ingot',
  description: 'Used to repair and improve gear.',
  kind: 'material',
  slots: [],
});
