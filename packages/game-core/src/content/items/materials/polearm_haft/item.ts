import { defineItem } from '../../define.js';

/*
 * Ironwood Haft — everything about this item in one place (request #78).
 * Picture: drop `_item_icon_polearm_haft.png` (100×100, same scale as the frame) in
 * this folder; until then the game draws a placeholder glyph.
 */
export default defineItem({
  id: 'polearm_haft',
  name: 'Ironwood Haft',
  description: 'For upgrading spears and lances (+4 and up).',
  kind: 'material',
  slots: [],
});
