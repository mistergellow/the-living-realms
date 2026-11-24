import { defineItem } from '../../define.js';

/*
 * Healing Draught — everything about this item in one place (request #78).
 * Picture: drop `_item_icon_healing_draught.png` (100×100, same scale as the frame) in
 * this folder; until then the game draws a placeholder glyph.
 */
export default defineItem({
  id: 'healing_draught',
  name: 'Healing Draught',
  description: 'Restores health.',
  kind: 'consumable',
  slots: [],
});
