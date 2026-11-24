/*
 * Request #77: item and weapon pictures, found by file name in the weapon
 * folders (packages/game-core/src/content/weapons/<type>/):
 *   _weapon_icon_<type>.png  the item icon (same canvas as the item frame)
 *   _weapon_hand_<type>.png  the weapon in the hero's hand (a square)
 * Dropping the two files into a weapon's folder is enough for them to show.
 */

const byType = (files: Record<string, string>, prefix: string) =>
  Object.fromEntries(
    Object.entries(files).map(([path, url]) => {
      const file = path.slice(path.lastIndexOf('/') + 1);
      return [file.slice(prefix.length, -'.png'.length), url];
    }),
  ) as Record<string, string>;

export const WEAPON_ICON = byType(
  import.meta.glob<string>(
    '../../../../../packages/game-core/src/content/weapons/*/_weapon_icon_*.png',
    { eager: true, query: '?url', import: 'default' },
  ),
  '_weapon_icon_',
);

export const WEAPON_HAND = byType(
  import.meta.glob<string>(
    '../../../../../packages/game-core/src/content/weapons/*/_weapon_hand_*.png',
    { eager: true, query: '?url', import: 'default' },
  ),
  '_weapon_hand_',
);

/**
 * Request #78: one folder per item (materials, consumables, tools), with
 * `_item_icon_<id>.png` — keyed by item id.
 */
export const ITEM_ICON = byType(
  import.meta.glob<string>(
    '../../../../../packages/game-core/src/content/items/*/*/_item_icon_*.png',
    { eager: true, query: '?url', import: 'default' },
  ),
  '_item_icon_',
);

/**
 * Request #79: ability icons, keyed by ability id. Weapon attacks and powers sit
 * in their weapon's folder (`_ability_icon_<id>.png`), skills in their own
 * folder (`content/skills/<id>/_skill_icon_<id>.png`).
 */
export const ABILITY_ICON: Record<string, string> = {
  ...byType(
    import.meta.glob<string>(
      '../../../../../packages/game-core/src/content/**/_ability_icon_*.png',
      {
        eager: true,
        query: '?url',
        import: 'default',
      },
    ),
    '_ability_icon_',
  ),
  ...byType(
    import.meta.glob<string>(
      '../../../../../packages/game-core/src/content/skills/*/_skill_icon_*.png',
      {
        eager: true,
        query: '?url',
        import: 'default',
      },
    ),
    '_skill_icon_',
  ),
};
