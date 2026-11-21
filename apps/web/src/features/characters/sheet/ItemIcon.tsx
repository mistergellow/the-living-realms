import type { EquipSlot, ItemDto } from '@realms/shared';

/*
 * PLACEHOLDER item icons (request #36): a simple stroke glyph per kind of item
 * on a tinted tile. Real item art can replace `GLYPHS` entries later without
 * touching the inventory or the tooltips.
 */

const GLYPHS = {
  sword: 'M14.5 4H20v5.5L9 20.5 3.5 15 14.5 4ZM5 13l6 6M3 21l3-3',
  axe: 'M8 21 17 6M13 4c4-2 8 1 8 5-3 0-5-1-6-3M15 8l-4-1',
  dagger: 'M15 3l3 3-9 9-3-3 9-9ZM6 12l-2 2 6 6 2-2M5 19l-2 2',
  bow: 'M7 3c8 3 8 15 0 18M7 3v18M3 12h14M14 9l3 3-3 3',
  staff: 'M6 21 16 8M15 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z',
  spear: 'M4 20 17 7M17 7l1-4 3 3-4 1ZM6 15l3 3',
  mace: 'M5 21l8-8M15 4a5 5 0 1 1 0 10 5 5 0 0 1 0-10ZM15 2v2M21 9h-2M19.5 4.5 18 6',
  wand: 'M5 20 15 10M17 3v3M15.5 4.5h3M19 8l2 1M13 6l1-2',
  tome: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4ZM5 17a3 3 0 0 1 3-3h11M10 8h5',
  shield: 'M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z',
  talisman:
    'M12 3v4M12 7a6 6 0 1 1 0 12 6 6 0 0 1 0-12ZM12 10l1 2.5 2.5.5-2 1.5.5 2.5-2-1.5-2 1.5.5-2.5-2-1.5 2.5-.5L12 10Z',
  helmet: 'M4 15a8 8 0 0 1 16 0v3H4v-3ZM12 7v11M4 15h5M15 15h5',
  armor: 'M8 3 4 6v5l3 1v9h10v-9l3-1V6l-4-3c-1 2-2 3-4 3S9 5 8 3Z',
  boots: 'M7 3h6v10l6 3c1 .5 2 1.5 2 3v2H5v-6l2-2V3ZM5 18h16',
  ring: 'M12 8a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13ZM9 8l3-5 3 5',
  pendant: 'M4 3c1 6 4 9 8 9s7-3 8-9M12 12l3 4-3 5-3-5 3-4Z',
  ore: 'M4 15 8 7l6-2 6 5-1 7-7 3-8-5ZM8 7l2 6 9-3M10 13l2 7',
  fish: 'M3 12c3-4 8-5 12-3 2 1 3 2 4 3-1 1-2 2-4 3-4 2-9 1-12-3ZM19 12l3-3v6l-3-3ZM8 11h.01',
  log: 'M6 7a3 5 0 1 0 0 10h12a3 5 0 1 0 0-10H6ZM18 7a3 5 0 1 1 0 10',
  herb: 'M12 21V9M12 13c-4 0-7-3-7-7 4 0 7 3 7 7ZM12 10c3 0 6-2 6-6-3 0-6 2-6 6Z',
  hide: 'M6 4c2 1 4 1 6 0 2 1 4 1 6 0l1 5-2 3 2 5-3 3c-2-1-6-1-8 0l-3-3 2-5-2-3 1-5Z',
  gem: 'M7 4h10l4 6-9 11L3 10l4-6ZM3 10h18M9 4l3 6 3-6M12 21l-3-11M12 21l3-11',
  potion: 'M10 3h4M10 3v5L5 17a3 3 0 0 0 3 4h8a3 3 0 0 0 3-4l-5-9V3M7 14h10',
  food: 'M4 12h16a8 8 0 0 1-16 0ZM8 8c0-2 1-2 1-4M12 8c0-2 1-2 1-4M16 8c0-2 1-2 1-4',
  bandage: 'M4 15 15 4a3 3 0 0 1 5 5L9 20a3 3 0 0 1-5-5ZM10 10l4 4M8.5 12h.01M12 8.5h.01',
  stone: 'M5 9l5-5h4l5 5v6l-5 5h-4l-5-5V9ZM12 8v8M9 11l6 2',
  cloth: 'M4 6h16v12H4zM4 10h16M4 14h16M9 6v12M15 6v12',
  grain:
    'M12 21V8M12 8c-2-1-3-3-3-5 2 1 3 3 3 5ZM12 8c2-1 3-3 3-5-2 1-3 3-3 5ZM12 13c-2-1-4-2-4-5 2 1 4 2 4 5ZM12 13c2-1 4-2 4-5-2 1-4 2-4 5Z',
  bag: 'M8 7V6a4 4 0 0 1 8 0v1M5 7h14l-1 14H6L5 7Z',
} as const;
type Glyph = keyof typeof GLYPHS;

const BY_DEF: Record<string, Glyph> = {
  raw_fish: 'fish',
  grilled_fish: 'food',
  hearty_stew: 'food',
  raw_meat: 'food',
  iron_ore: 'ore',
  iron_ingot: 'ore',
  rough_gem: 'gem',
  cut_gem: 'gem',
  log: 'log',
  plank: 'log',
  herb: 'herb',
  raw_hide: 'hide',
  leather: 'hide',
  grain: 'grain',
  flax: 'grain',
  linen: 'cloth',
  rune_stone: 'stone',
  healing_draught: 'potion',
  mana_tonic: 'potion',
  bandage: 'bandage',
};

const BY_WEAPON: Record<string, Glyph> = {
  sword: 'sword',
  axe: 'axe',
  dagger: 'dagger',
  bow: 'bow',
  staff: 'staff',
  spear: 'spear',
  mace: 'mace',
  wand: 'wand',
  tome: 'tome',
  shield: 'shield',
  talisman: 'talisman',
};

/** Silhouette shown in an empty equipment slot. */
export const SLOT_GLYPH: Record<EquipSlot, Glyph> = {
  mainHand: 'sword',
  offHand: 'shield',
  head: 'helmet',
  body: 'armor',
  feet: 'boots',
  ring1: 'ring',
  ring2: 'ring',
  pendant: 'pendant',
};

export function glyphFor(item: ItemDto): Glyph {
  if (item.weapon) return BY_WEAPON[item.weapon.type] ?? 'sword';
  if (BY_DEF[item.defId]) return BY_DEF[item.defId]!;
  const slot = item.slots[0];
  if (slot) return SLOT_GLYPH[slot];
  return item.kind === 'consumable' ? 'potion' : 'bag';
}

/** Tile tint: gear by kind; materials and consumables muted. */
export function itemTone(item: ItemDto): string {
  if (item.kind === 'weapon' || item.kind === 'offhand') return 'weapon';
  return item.kind;
}

export function GlyphSvg({ glyph }: { glyph: Glyph }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={GLYPHS[glyph]} />
    </svg>
  );
}

export function ItemIcon({ item }: { item: ItemDto }) {
  return (
    <span className="item-icon" data-tone={itemTone(item)} data-broken={item.broken}>
      <GlyphSvg glyph={glyphFor(item)} />
    </span>
  );
}
