import type { ItemDef } from '../items.js';

/*
 * One folder per item (request #78), like the weapons (request #77):
 *
 *   items/materials/<id>/item.ts        what the item is (name, description…)
 *   items/materials/<id>/_item_icon_<id>.png   its icon, 100×100
 *
 * Same for `consumables/` and `tools/`. The game finds the picture by its file
 * name, so replacing the PNG is enough to change the art. The icon sits on the
 * shared frame and tile (`_item_frame.png`, `_item_tile.png` in this folder);
 * the tile is tinted by the item's rarity — for gathered materials, the better
 * the grade, the rarer the item (`gradeRarity` in gathering.ts).
 */
export const defineItem = <T extends ItemDef>(item: T) => item;
