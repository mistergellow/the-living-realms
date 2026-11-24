# Art sources

Original art sheets from the project owner (request #72). Pieces used by the
game are cut out with `scripts/art/cut-sheet.py` and assembled in code:

- `source/weapon-icons.png`, `source/weapon-icons-framed.webp` → item icons (request #73; now in the weapon folders, request #77).
- `source/gear-icons.webp` → books, masks, boots, belts and helmets in the same
  icons folder (request #75).
- `source/weapons.webp` → weapons the hero holds (request #76). Since request #77
  every weapon lives in its own folder, `packages/game-core/src/content/weapons/<type>/`:
  `weapon.ts` (stats + hand pose), `_weapon_icon_<type>.png` (100×100 icon) and
  `_weapon_hand_<type>.png` (held weapon). Replace a PNG to change the art.
- Craft items (request #78): `packages/game-core/src/content/items/<materials|consumables|tools>/<id>/`
  with `item.ts` and `_item_icon_<id>.png` (100×100).
- Icon frame and tile: `packages/game-core/src/content/items/_item_frame.png`,
  `_item_tile.png` (100×100; the tile is tinted by rarity).
- `source/base-hero.webp` → `apps/web/src/features/avatar/base/*.webp`, rig in
  `CharacterAvatar.tsx` (ADR-054).

To add a sheet: put it in `source/`, run the script, pick the pieces you need
and place them in the rig (players face right; monsters use `--mirror`).
