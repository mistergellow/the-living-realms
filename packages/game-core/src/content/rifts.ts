import type { ItemDefId } from './items.js';
import type { EnemyId } from './enemies.js';
import type { EventId } from './events.js';
import type { MapTemplate } from '../rift/map.js';

/*
 * Rift definitions (data). A Rift is a dungeon (request #31): a branching
 * map of rooms generated from a template, ending with a mandatory boss
 * (D17). Difficulty does not scale with the number of players (D18).
 * PROVISIONAL CONTENT.
 */

/** A fight: enemy placement (D38): slots 0–1 front column, 2–3 mid, 4–5 back. */
export interface RiftRoomDef {
  name: string;
  enemies: Array<{ enemy: EnemyId; slot: number; elite?: boolean }>;
  isBoss?: boolean;
}

export interface LootEntry {
  item: ItemDefId;
  /** Relative weight. */
  weight: number;
}

export interface LootTable {
  /** Items per participant. */
  drops: number;
  loot: LootEntry[];
}

export interface RiftDef {
  id: string;
  name: string;
  description: string;
  map: MapTemplate;
  encounters: {
    combat: RiftRoomDef[];
    elite: RiftRoomDef[];
    boss: RiftRoomDef;
  };
  /** Random Events that can appear in this Rift. */
  events: EventId[];
  /** Main rewards, after the boss (request #31: the big rewards come at the end). */
  rewards: {
    /** Reputation granted to each participant on victory. */
    reputation: number;
  } & LootTable;
  /** Loot Rooms: guaranteed rewards, granted at once to everyone present. */
  lootRoom: LootTable;
  /** Secret Rooms: rarer rewards. */
  secretRoom: LootTable;
}

const rift = (r: RiftDef) => r;

/** Default map: 7 rows + boss, 5 lanes, 4 walks (≈ 15–20 rooms, 8 on any path). */
export const DEFAULT_MAP_TEMPLATE: MapTemplate = {
  rows: 7,
  cols: 5,
  paths: 4,
  minRooms: 10,
  firstRow: 'combat',
  lastRow: 'campsite',
  themes: {
    safe: { combat: 3, campsite: 4, event: 2, loot: 1 },
    explore: { combat: 2, event: 6, campsite: 1, loot: 1 },
    loot: { combat: 3, loot: 4, event: 2, campsite: 1 },
    danger: { combat: 3, elite: 4, event: 1, loot: 2 },
    mixed: { combat: 3, elite: 1, event: 2, campsite: 2, loot: 1 },
  },
  rules: {
    minEliteRow: 2,
    minLootRow: 1,
    noConsecutive: ['campsite', 'elite', 'loot'],
    minCounts: { elite: 1, event: 2, loot: 1, campsite: 2 },
  },
  secrets: { min: 1, max: 2, minRow: 1 },
};

export const RIFTS = {
  shattered_breach: rift({
    id: 'shattered_breach',
    name: 'Shattered Breach',
    description:
      'An unstable rift of branching halls. Choose your path, pick your fights, and reach the Warden with as much strength as you can.',
    map: DEFAULT_MAP_TEMPLATE,
    // D42: enemies use the formation — a blocker shares a column with an
    // attacker, and rooms spread over front, mid and back.
    encounters: {
      combat: [
        {
          name: 'The Threshold',
          enemies: [
            { enemy: 'rift_bulwark', slot: 0 },
            { enemy: 'rift_husk', slot: 1 },
            { enemy: 'shard_spitter', slot: 4 },
          ],
        },
        {
          name: 'Howling Gallery',
          enemies: [
            { enemy: 'hollow_hound', slot: 0 },
            { enemy: 'rift_husk', slot: 2 },
            { enemy: 'shard_spitter', slot: 4 },
          ],
        },
        {
          name: 'Husk Warren',
          enemies: [
            { enemy: 'rift_husk', slot: 0 },
            { enemy: 'rift_husk', slot: 1 },
          ],
        },
        {
          name: 'Shard Nest',
          enemies: [
            { enemy: 'hollow_hound', slot: 1 },
            { enemy: 'shard_spitter', slot: 4 },
            { enemy: 'shard_spitter', slot: 5 },
          ],
        },
      ],
      elite: [
        {
          name: 'The Bulwark Line',
          enemies: [
            { enemy: 'rift_bulwark', slot: 0, elite: true },
            { enemy: 'rift_husk', slot: 1, elite: true },
            { enemy: 'shard_spitter', slot: 4 },
          ],
        },
        {
          name: 'Alpha Den',
          enemies: [
            { enemy: 'hollow_hound', slot: 0, elite: true },
            { enemy: 'hollow_hound', slot: 1 },
            { enemy: 'shard_spitter', slot: 4, elite: true },
          ],
        },
      ],
      boss: {
        name: "Warden's Seal",
        isBoss: true,
        enemies: [
          { enemy: 'rift_warden', slot: 0 },
          { enemy: 'rift_bulwark', slot: 1 },
          { enemy: 'shard_spitter', slot: 4 },
        ],
      },
    },
    events: [
      'ancient_sealed_door',
      'whispering_idol',
      'collapsed_bridge',
      'toxic_mist',
      'trapped_corridor',
      'echoing_glyphs',
      'fallen_adventurer',
      'rift_spring',
    ],
    rewards: {
      reputation: 40,
      drops: 2,
      loot: [
        { item: 'wooden_shield', weight: 3 },
        { item: 'leather_cap', weight: 3 },
        { item: 'leather_leggings', weight: 3 },
        { item: 'bone_talisman', weight: 2 },
        { item: 'rusty_dagger', weight: 2 },
        { item: 'ring_of_vigor', weight: 1 },
        { item: 'charm_of_focus', weight: 1 },
        { item: 'hawkeye_band', weight: 1 },
        { item: 'brawler_wrap', weight: 1 },
      ],
    },
    lootRoom: {
      drops: 1,
      loot: [
        { item: 'leather_cap', weight: 3 },
        { item: 'leather_leggings', weight: 3 },
        { item: 'wooden_shield', weight: 2 },
        { item: 'bone_talisman', weight: 2 },
        { item: 'iron_mace', weight: 1 },
        { item: 'ash_spear', weight: 1 },
        { item: 'birch_wand', weight: 1 },
      ],
    },
    secretRoom: {
      drops: 1,
      loot: [
        { item: 'ring_of_vigor', weight: 2 },
        { item: 'charm_of_focus', weight: 2 },
        { item: 'hawkeye_band', weight: 2 },
        { item: 'brawler_wrap', weight: 2 },
      ],
    },
  }),
} satisfies Record<string, RiftDef>;

export type RiftId = keyof typeof RIFTS;

export function getRift(id: string): RiftDef | undefined {
  return (RIFTS as Record<string, RiftDef>)[id];
}
