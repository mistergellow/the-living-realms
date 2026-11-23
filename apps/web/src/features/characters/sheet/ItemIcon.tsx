import { getItemDef } from '@realms/game-core';
import type { EquipSlot, ItemDto } from '@realms/shared';

/*
 * Item icons. Request #73: weapons and shields use the owner's painted icons
 * (`icons/*.webp`, cut from art/source/weapon-icons.png); every item sits on the
 * same iron frame over a dark tile tinted by its rarity (sheet.css). Items
 * without painted art yet keep a stroke glyph (request #39).
 */

/** Painted icons by name (file name without extension). */
const PAINTED = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>('./icons/*.webp', { eager: true, query: '?url', import: 'default' }),
  ).map(([path, url]) => [path.slice('./icons/'.length, -'.webp'.length), url]),
) as Record<string, string>;

/** Tools drawn with a weapon's icon. */
const TOOL_ICON: Record<string, string> = { hunting_knife: 'dagger', axe: 'handaxe' };

/** Stable pick from a list of variants for an item id (same item, same icon). */
function variant(id: string, pool: number[]): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return pool[Math.abs(h) % pool.length]!;
}

/**
 * Request #75: gear sheet variants (`<kind>_<n>.webp`, 7 each). Helmets and
 * boots follow the armour weight: leather, chain/mixed, plate.
 */
const BY_WEIGHT: Record<'helm' | 'boots', Record<string, number[]>> = {
  helm: { light: [5, 4], medium: [2, 3], heavy: [1, 6, 7] },
  boots: { light: [1, 3], medium: [2, 4, 5], heavy: [6, 7] },
};
const ALL = [1, 2, 3, 4, 5, 6, 7];
const SLOT_ART: Partial<Record<EquipSlot, 'helm' | 'boots' | 'belt' | 'mask'>> = {
  head: 'helm',
  feet: 'boots',
  belt: 'belt',
  face: 'mask',
};

/** The painted icon of an item, if there is one. */
export function paintedIconFor(item: ItemDto): string | null {
  if (item.weapon) return PAINTED[item.weapon.type] ?? null;
  if (item.tool) return PAINTED[TOOL_ICON[item.tool.type] ?? ''] ?? null;
  const def = getItemDef(item.defId);
  // Off-hands (shields…) have a weapon type but no weapon stats.
  if (def?.weaponType) return PAINTED[def.weaponType] ?? null;
  // Skill books.
  if (def?.teaches) return PAINTED[`book_${variant(item.defId, ALL)}`] ?? null;
  const kind = item.slots[0] ? SLOT_ART[item.slots[0]] : undefined;
  if (!kind) return null;
  const pool =
    kind === 'helm' || kind === 'boots'
      ? (BY_WEIGHT[kind][item.armorClass ?? 'medium'] ?? ALL)
      : ALL;
  return PAINTED[`${kind}_${variant(item.defId, pool)}`] ?? null;
}

const GLYPHS = {
  belt: 'M3 10h18v4H3zM10 9h4v6h-4z',
  mask: 'M4 6c3-2 13-2 16 0 0 7-3 12-8 12S4 13 4 6Zm4 4h3M13 10h3',
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
  // request #51: tools and scribing
  rod: 'M4 21 18 3M18 3v11M18 14a2 2 0 1 1-2 2M4 21l2-1',
  pickaxe: 'M4 20 14 10M6 6c4-3 9-3 14 1-4-1-7-1-10 1M13 9l2 2',
  scroll:
    'M7 4h11a2 2 0 0 1 0 4H7M7 4a2 2 0 0 0 0 4v10a2 2 0 0 0 2 2h9a2 2 0 0 0 0-4H9M10 11h6M10 14h4',
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
  parchment: 'scroll',
  ink: 'potion',
  blank_scroll: 'scroll',
  blessing_scroll: 'scroll',
};

/** Request #51: profession tools by type. */
const BY_TOOL: Record<string, Glyph> = {
  fishing_rod: 'rod',
  axe: 'axe',
  pickaxe: 'pickaxe',
  hunting_knife: 'dagger',
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
  belt: 'belt',
  face: 'mask',
};

export function glyphFor(item: ItemDto): Glyph {
  if (item.weapon) return BY_WEAPON[item.weapon.type] ?? 'sword';
  if (item.tool) return BY_TOOL[item.tool.type] ?? 'bag';
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
  const painted = paintedIconFor(item);
  return (
    <span
      className="item-icon"
      data-tone={itemTone(item)}
      data-rarity={item.rarity}
      data-broken={item.broken}
    >
      {painted ? (
        <img className="item-art" src={painted} alt="" draggable={false} />
      ) : (
        <GlyphSvg glyph={glyphFor(item)} />
      )}
      {item.grade && (
        <i
          className="grade-pip"
          data-grade={item.grade.value}
          title={item.grade.name}
          aria-label={`${item.grade.name} quality`}
        />
      )}
    </span>
  );
}
