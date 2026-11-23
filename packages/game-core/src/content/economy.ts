import type { ItemKind } from '@realms/shared';
import { getItemDef, type ItemDefId } from './items.js';
import type { WeaponType } from './weapons.js';

/*
 * Economy (request #50): the bag limit, the city general store, what NPCs pay
 * for gear, and the blacksmith (Metin2 style). PROVISIONAL numbers (A106–A109).
 *
 * Rule (professions spec §15): NPCs never buy materials or consumables at a
 * fixed price — only used gear, cheaply. Players set the value of resources.
 */

export const INVENTORY_RULES = {
  /** Bag slots (a stack of materials uses one slot). Equipped items do not count. */
  // Request #72: 40 (was 20, D97).
  bagSlots: 40,
  /** Request #59: city storage slots (more can be unlocked later). */
  storageSlots: 80,
} as const;

/** Request #63: player market (cities only). PROVISIONAL (A127). */
export const MARKET_RULES = {
  /** Items a player can have for sale at once, in all cities together. */
  maxListings: 20,
  /** Share of the price kept by the city (none for now). */
  feePct: 0,
} as const;

/** Request #59: the order "Sort" puts items in (by kind, then best first, then name). */
const SORT_KINDS: readonly string[] = [
  'weapon',
  'offhand',
  'armor',
  'accessory',
  'tool',
  'consumable',
  'material',
];

export interface SortableItem {
  itemDefId: string;
  /** Number of bonus effects (rarity). */
  affixCount: number;
  upgradeLevel: number;
  grade: number | null;
}

/** Comparator for sorting a bag or the storage. */
export function compareItemsForSort(a: SortableItem, b: SortableItem): number {
  const da = getItemDef(a.itemDefId);
  const db = getItemDef(b.itemDefId);
  const ka = SORT_KINDS.indexOf(da?.kind ?? 'material');
  const kb = SORT_KINDS.indexOf(db?.kind ?? 'material');
  if (ka !== kb) return ka - kb;
  if (a.affixCount !== b.affixCount) return b.affixCount - a.affixCount;
  if (a.upgradeLevel !== b.upgradeLevel) return b.upgradeLevel - a.upgradeLevel;
  const n = (da?.name ?? a.itemDefId).localeCompare(db?.name ?? b.itemDefId);
  if (n !== 0) return n;
  return (b.grade ?? -1) - (a.grade ?? -1);
}

/** What the general store in every capital sells (gold each). */
export const SHOP_STOCK: ReadonlyArray<{ item: ItemDefId; price: number }> = [
  { item: 'healing_draught', price: 15 },
  { item: 'mana_tonic', price: 15 },
  { item: 'bandage', price: 5 },
  { item: 'blessing_scroll', price: 150 },
  // Request #51: basic profession tools (fine tools are made by Crafters).
  { item: 'fishing_rod', price: 20 },
  { item: 'felling_axe', price: 20 },
  { item: 'pickaxe', price: 20 },
  { item: 'hunting_knife', price: 20 },
  { item: 'training_sword', price: 40 },
  { item: 'hunting_bow', price: 40 },
  { item: 'rusty_dagger', price: 35 },
  { item: 'birch_wand', price: 40 },
  { item: 'wooden_shield', price: 35 },
  { item: 'padded_tunic', price: 30 },
  { item: 'leather_cap', price: 25 },
  { item: 'leather_boots', price: 25 },
  { item: 'leather_belt', price: 25 },
];

const GEAR_BASE_VALUE: Partial<Record<ItemKind, number>> = {
  weapon: 10,
  offhand: 8,
  armor: 8,
  accessory: 12,
};

/**
 * What the store pays for a piece of gear: a small base, more for bonus effects
 * and upgrades, less when damaged. Materials and consumables: not bought (null).
 */
export function npcSellPrice(
  defId: string,
  affixCount: number,
  upgradeLevel: number,
  quality: number,
): number | null {
  const def = getItemDef(defId);
  const base = def ? GEAR_BASE_VALUE[def.kind] : undefined;
  if (base === undefined || def?.teaches) return null;
  const value = (base + affixCount * 15 + upgradeLevel * 10) * Math.max(0.2, quality / 100);
  return Math.max(1, Math.round(value));
}

// ---------------------------------------------------------------------------
// Blacksmith (Metin2 style)
// ---------------------------------------------------------------------------
export type WeaponFamily = 'blades' | 'axes' | 'blunt' | 'polearms' | 'ranged' | 'arcane';

export const WEAPON_FAMILIES: Record<WeaponFamily, { name: string; material: ItemDefId }> = {
  blades: { name: 'Blades', material: 'blade_shard' },
  axes: { name: 'Axes', material: 'axe_iron' },
  blunt: { name: 'Blunt weapons', material: 'heavy_core' },
  polearms: { name: 'Polearms', material: 'polearm_haft' },
  ranged: { name: 'Ranged weapons', material: 'sinew_string' },
  arcane: { name: 'Arcane weapons', material: 'arcane_focus' },
};

const FAMILY_OF: Partial<Record<WeaponType, WeaponFamily>> = {
  sword: 'blades',
  greatsword: 'blades',
  dagger: 'blades',
  scythe: 'blades',
  axe: 'axes',
  greataxe: 'axes',
  handaxe: 'axes',
  mace: 'blunt',
  hammer: 'blunt',
  greathammer: 'blunt',
  morningstar: 'blunt',
  spear: 'polearms',
  lance: 'polearms',
  bow: 'ranged',
  crossbow: 'ranged',
  sling: 'ranged',
  chakram: 'ranged',
  staff: 'arcane',
  wand: 'arcane',
  tome: 'arcane',
  scepter: 'arcane',
};

export function weaponFamily(type: WeaponType | undefined): WeaponFamily | null {
  return (type && FAMILY_OF[type]) ?? null;
}

/**
 * Cost and chance of going from level N-1 to N (index = target level).
 * +1…+3: gold and luck; +4…+10: gold, luck and the family's material.
 * A failure destroys the weapon — unless a Blessing Scroll is used, then it
 * loses 1 level instead.
 */
export const UPGRADE_STEPS: ReadonlyArray<{ gold: number; chance: number; materials: number }> = [
  { gold: 0, chance: 1, materials: 0 }, // +0 (unused)
  { gold: 50, chance: 0.9, materials: 0 },
  { gold: 100, chance: 0.8, materials: 0 },
  { gold: 200, chance: 0.7, materials: 0 },
  { gold: 350, chance: 0.6, materials: 1 },
  { gold: 500, chance: 0.5, materials: 2 },
  { gold: 750, chance: 0.4, materials: 3 },
  { gold: 1000, chance: 0.3, materials: 4 },
  { gold: 1500, chance: 0.2, materials: 5 },
  { gold: 2000, chance: 0.15, materials: 6 },
  { gold: 3000, chance: 0.1, materials: 8 },
];

export interface UpgradeQuote {
  toLevel: number;
  gold: number;
  chance: number;
  material: { item: ItemDefId; qty: number } | null;
}

/** What the next upgrade of a weapon costs, or why it cannot be upgraded. */
export function upgradeQuote(
  defId: string,
  level: number,
): { ok: true; quote: UpgradeQuote } | { ok: false; reason: string } {
  const def = getItemDef(defId);
  if (!def || def.kind !== 'weapon') return { ok: false, reason: 'Only weapons can be upgraded.' };
  const family = weaponFamily(def.weaponType);
  if (!family) return { ok: false, reason: 'This weapon cannot be upgraded.' };
  const toLevel = level + 1;
  const step = UPGRADE_STEPS[toLevel];
  if (!step) return { ok: false, reason: 'This weapon is already +10.' };
  return {
    ok: true,
    quote: {
      toLevel,
      gold: step.gold,
      chance: step.chance,
      material: step.materials
        ? { item: WEAPON_FAMILIES[family].material, qty: step.materials }
        : null,
    },
  };
}

/** Result of an attempt: `roll` in [0, 1). */
export function upgradeOutcome(
  level: number,
  chance: number,
  roll: number,
  blessed: boolean,
): { result: 'success' | 'downgraded' | 'destroyed'; level: number } {
  if (roll < chance) return { result: 'success', level: level + 1 };
  if (blessed) return { result: 'downgraded', level: Math.max(0, level - 1) };
  return { result: 'destroyed', level };
}
