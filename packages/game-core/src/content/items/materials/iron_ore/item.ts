import { defineItem } from '../../define.js';

/*
 * Iron Ore — everything about this item in one place (request #78).
 * Picture: drop `_item_icon_iron_ore.png` (100×100, same scale as the frame) in
 * this folder; until then the game draws a placeholder glyph.
 */
export default defineItem({
  id: 'iron_ore',
  name: 'Iron Ore',
  description: 'Smelt it into ingots.',
  kind: 'material',
  slots: [],
});
