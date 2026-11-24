import { defineItem } from '../../define.js';

/*
 * Rough Gem — everything about this item in one place (request #78).
 * Picture: drop `_item_icon_rough_gem.png` (100×100, same scale as the frame) in
 * this folder; until then the game draws a placeholder glyph.
 */
export default defineItem({
  id: 'rough_gem',
  name: 'Rough Gem',
  description: 'An uncut stone with a faint glow.',
  kind: 'material',
  slots: [],
});
