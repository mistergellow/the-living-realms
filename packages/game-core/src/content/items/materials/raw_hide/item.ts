import { defineItem } from '../../define.js';

/*
 * Raw Hide — everything about this item in one place (request #78).
 * Picture: drop `_item_icon_raw_hide.png` (100×100, same scale as the frame) in
 * this folder; until then the game draws a placeholder glyph.
 */
export default defineItem({
  id: 'raw_hide',
  name: 'Raw Hide',
  description: 'Needs curing before use.',
  kind: 'material',
  slots: [],
});
