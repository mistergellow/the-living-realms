import { defineItem } from '../../define.js';

/*
 * Blade Shard — everything about this item in one place (request #78).
 * Picture: drop `_item_icon_blade_shard.png` (100×100, same scale as the frame) in
 * this folder; until then the game draws a placeholder glyph.
 */
export default defineItem({
  id: 'blade_shard',
  name: 'Blade Shard',
  description: 'Hardened steel for upgrading blades (+4 and up).',
  kind: 'material',
  slots: [],
});
