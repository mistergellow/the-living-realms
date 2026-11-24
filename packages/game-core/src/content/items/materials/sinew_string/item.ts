import { defineItem } from '../../define.js';

/*
 * Sinew String — everything about this item in one place (request #78).
 * Picture: drop `_item_icon_sinew_string.png` (100×100, same scale as the frame) in
 * this folder; until then the game draws a placeholder glyph.
 */
export default defineItem({
  id: 'sinew_string',
  name: 'Sinew String',
  description: 'For upgrading bows, crossbows, slings and chakrams (+4 and up).',
  kind: 'material',
  slots: [],
});
