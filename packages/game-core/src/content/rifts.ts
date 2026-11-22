import type { ItemDefId } from './items.js';
import { skillBookId, SKILLS } from './skills.js';
import type { EnemyId } from './enemies.js';
import type { EventId } from './events.js';
import type { HexCoord } from '@realms/shared';
import type { MapTemplate } from '../rift/map.js';
import { riftSiteById } from './world-map.js';

/*
 * Rift definitions (data). A Rift is a dungeon (request #31): a branching
 * map of rooms generated from a template, ending with a mandatory boss
 * (D17). Difficulty does not scale with the number of players (D18).
 * PROVISIONAL CONTENT.
 */

/** A fight: enemy placement in one line (request #35): slot 0 front … 3 back. */
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
  /**
   * Rift entrances on the map (request #43): difficulty tier (1 … RIFT_TIERS)
   * and the hex you must stand on to enter. Absent on the template.
   */
  tier?: number;
  site?: HexCoord;
  /** Dungeon Threat the run starts with (deeper Rifts start more restless). */
  startingThreat?: number;
}

const rift = (r: RiftDef) => r;

/** Blacksmith materials for +4…+10 (request #50), one per weapon family. */
const familyMaterials = (weight: number): LootEntry[] =>
  (
    [
      'blade_shard',
      'axe_iron',
      'heavy_core',
      'polearm_haft',
      'sinew_string',
      'arcane_focus',
    ] as ItemDefId[]
  ).map((item) => ({ item, weight }));

/** Skill Books in the loot (request #47), with a weight each. */
const books = (weight: number): LootEntry[] =>
  Object.keys(SKILLS).map((id) => ({ item: skillBookId(id) as ItemDefId, weight }));

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

/*
 * Request #60: Rifts are longer and Campsites rare. A route from the entrance
 * to the boss has 10 rooms at tier 1 and up to 20 at tier 5 (boss included);
 * Campsites per route: at most 3 at tiers 1–2, 2 at tiers 3–4, 1 at tier 5
 * (the one before the boss is always there). PROVISIONAL (A124).
 */
export const RIFT_SIZE_RULES = {
  minLength: 10,
  maxLength: 20,
  campsitesPerRoute: [3, 3, 2, 2, 1] as readonly number[],
} as const;

/** Rooms on a route (boss included) at a tier. */
export const riftLength = (tier: number) => {
  const t = Math.max(1, Math.min(5, tier));
  return Math.round(
    RIFT_SIZE_RULES.minLength +
      ((RIFT_SIZE_RULES.maxLength - RIFT_SIZE_RULES.minLength) * (t - 1)) / 4,
  );
};

/** The map template of a tier: longer, harder, with fewer Campsites. */
export function mapTemplateForTier(tier: number): MapTemplate {
  const length = riftLength(tier);
  const camps = RIFT_SIZE_RULES.campsitesPerRoute[Math.max(1, Math.min(5, tier)) - 1] ?? 1;
  return {
    ...DEFAULT_MAP_TEMPLATE,
    rows: length - 1,
    minRooms: Math.round(length * 1.6),
    themes: {
      safe: { combat: 4, campsite: camps > 1 ? 0.6 : 0, event: 3, loot: 1 },
      explore: { combat: 3, event: 6, campsite: camps > 1 ? 0.2 : 0, loot: 1 },
      loot: { combat: 4, loot: 3, event: 2 },
      danger: { combat: 3, elite: 4, event: 1, loot: 2 },
      mixed: { combat: 4, elite: 1.5, event: 2, campsite: camps > 2 ? 0.3 : 0, loot: 1 },
    },
    rules: {
      ...DEFAULT_MAP_TEMPLATE.rules,
      minCounts: { elite: 1 + Math.floor(tier / 2), event: 2, loot: 1, campsite: 1 },
    },
    secrets: { min: 1, max: 3, minRow: 1 },
    maxCampsitesPerPath: camps,
  };
}

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
            { enemy: 'shard_spitter', slot: 2 },
          ],
        },
        {
          name: 'Howling Gallery',
          enemies: [
            { enemy: 'hollow_hound', slot: 0 },
            { enemy: 'rift_husk', slot: 1 },
            { enemy: 'shard_spitter', slot: 2 },
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
            { enemy: 'hollow_hound', slot: 0 },
            { enemy: 'shard_spitter', slot: 1 },
            { enemy: 'shard_spitter', slot: 2 },
          ],
        },
        // Request #44: rooms built around the new enemies' mechanics.
        {
          name: 'Leech Pools',
          enemies: [
            { enemy: 'rift_leech', slot: 0 },
            { enemy: 'rift_leech', slot: 1 },
            { enemy: 'shard_spitter', slot: 2 },
          ],
        },
        {
          name: 'Thorn Thicket',
          enemies: [
            { enemy: 'thornback', slot: 0 },
            { enemy: 'rift_husk', slot: 1 },
            { enemy: 'void_shaman', slot: 2 },
          ],
        },
        {
          name: 'Brood Chamber',
          enemies: [
            { enemy: 'brood_mother', slot: 0 },
            { enemy: 'shard_spitter', slot: 2 },
          ],
        },
        {
          name: 'Phase Hall',
          enemies: [
            { enemy: 'phase_stalker', slot: 0 },
            { enemy: 'hollow_hound', slot: 1 },
          ],
        },
        {
          name: 'Zealot Shrine',
          enemies: [
            { enemy: 'rift_husk', slot: 0 },
            { enemy: 'rift_zealot', slot: 1 },
            { enemy: 'void_shaman', slot: 2 },
          ],
        },
      ],
      elite: [
        {
          name: 'The Bulwark Line',
          enemies: [
            { enemy: 'rift_bulwark', slot: 0, elite: true },
            { enemy: 'rift_husk', slot: 1, elite: true },
            { enemy: 'shard_spitter', slot: 2 },
          ],
        },
        {
          name: 'The Mite Hive',
          enemies: [
            { enemy: 'brood_mother', slot: 0, elite: true },
            { enemy: 'volatile_mite', slot: 1 },
            { enemy: 'volatile_mite', slot: 2 },
          ],
        },
        {
          name: 'Stalker Pack',
          enemies: [
            { enemy: 'phase_stalker', slot: 0, elite: true },
            { enemy: 'phase_stalker', slot: 1 },
            { enemy: 'rift_zealot', slot: 2 },
          ],
        },
        {
          name: 'Alpha Den',
          enemies: [
            { enemy: 'hollow_hound', slot: 0, elite: true },
            { enemy: 'hollow_hound', slot: 1 },
            { enemy: 'shard_spitter', slot: 2, elite: true },
          ],
        },
      ],
      boss: {
        name: "Warden's Seal",
        isBoss: true,
        // Request #44 (balance): the Warden stands in front, so melee can reach it.
        enemies: [
          { enemy: 'rift_warden', slot: 0 },
          { enemy: 'shard_spitter', slot: 2 },
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
        { item: 'leather_boots', weight: 3 },
        { item: 'bone_talisman', weight: 2 },
        { item: 'rusty_dagger', weight: 2 },
        { item: 'ring_of_vigor', weight: 1 },
        { item: 'charm_of_focus', weight: 1 },
        { item: 'hawkeye_band', weight: 1 },
        { item: 'brawler_wrap', weight: 1 },
        // Request #45: the new weapon types.
        { item: 'iron_greatsword', weight: 1 },
        { item: 'bearded_greataxe', weight: 1 },
        { item: 'hand_axe', weight: 1 },
        { item: 'war_hammer', weight: 1 },
        { item: 'great_maul', weight: 1 },
        { item: 'morning_star', weight: 1 },
        { item: 'knight_lance', weight: 1 },
        { item: 'light_crossbow', weight: 1 },
        // Request #46
        { item: 'oak_scepter', weight: 1 },
        { item: 'rune_chakram', weight: 1 },
        { item: 'reaper_scythe', weight: 1 },
        { item: 'leather_sling', weight: 1 },
        ...books(0.5),
        ...familyMaterials(1),
      ],
    },
    lootRoom: {
      drops: 1,
      loot: [
        { item: 'leather_cap', weight: 3 },
        { item: 'leather_boots', weight: 3 },
        { item: 'leather_belt', weight: 2 },
        { item: 'bone_mask', weight: 2 },
        { item: 'wooden_shield', weight: 2 },
        { item: 'bone_talisman', weight: 2 },
        { item: 'iron_mace', weight: 1 },
        { item: 'ash_spear', weight: 1 },
        { item: 'birch_wand', weight: 1 },
        { item: 'hand_axe', weight: 1 },
        { item: 'morning_star', weight: 1 },
        { item: 'war_hammer', weight: 1 },
        { item: 'light_crossbow', weight: 1 },
        { item: 'leather_sling', weight: 1 },
        { item: 'oak_scepter', weight: 1 },
        ...familyMaterials(1.5),
      ],
    },
    secretRoom: {
      drops: 1,
      loot: [
        { item: 'ring_of_vigor', weight: 2 },
        { item: 'charm_of_focus', weight: 2 },
        { item: 'hawkeye_band', weight: 2 },
        { item: 'brawler_wrap', weight: 2 },
        ...books(1),
      ],
    },
  }),
} satisfies Record<string, RiftDef>;

export type RiftId = keyof typeof RIFTS;

/**
 * Difficulty per Rift tier (request #43), PROVISIONAL (A81): tier 1 is the
 * base Rift; each tier above adds enemy HP and damage, starting Threat and
 * reputation.
 */
export const RIFT_TIER_RULES = {
  hpPerTier: 0.25,
  powerPerTier: 0.15,
  threatPerTier: 1,
  reputationPerTier: 0.5,
  names: ['Fringe Rift', 'Shallow Rift', 'Deep Rift', 'Abyssal Rift', 'Heart Rift'],
} as const;

/**
 * Gold (request #50): every won Rift pays gold; Loot and Secret rooms hold
 * some too (kept only if the party wins, like items). Scaled by tier.
 * PROVISIONAL (A104).
 */
export const RIFT_GOLD_RULES = {
  victory: { min: 25, max: 40 },
  lootRoom: { min: 5, max: 12 },
  secretRoom: { min: 12, max: 25 },
  perTier: 0.5,
} as const;

export const goldTierMultiplier = (tier = 1) => 1 + RIFT_GOLD_RULES.perTier * Math.max(0, tier - 1);

/** Extra enemy strength for a tier (1 = none). */
export function riftTierModifiers(tier = 1): { hpMultiplier: number; powerMultiplier: number } {
  const t = Math.max(0, tier - 1);
  return {
    hpMultiplier: 1 + RIFT_TIER_RULES.hpPerTier * t,
    powerMultiplier: 1 + RIFT_TIER_RULES.powerPerTier * t,
  };
}

/** The Rift at a map entrance: the template Rift scaled to the site's tier. */
function siteRift(id: string): RiftDef | undefined {
  const h = riftSiteById(id);
  if (!h?.rift) return undefined;
  const base = RIFTS.shattered_breach as RiftDef;
  const tier = h.rift.tier;
  const t = tier - 1;
  return {
    ...base,
    map: mapTemplateForTier(tier),
    id,
    name: `${RIFT_TIER_RULES.names[t] ?? 'Rift'} (${h.q}, ${h.r})`,
    description: `A Rift of tier ${tier}. The deeper into the Riftlands, the stronger what waits inside.`,
    tier,
    site: { q: h.q, r: h.r },
    startingThreat: RIFT_TIER_RULES.threatPerTier * t,
    rewards: {
      ...base.rewards,
      reputation: Math.round(base.rewards.reputation * (1 + RIFT_TIER_RULES.reputationPerTier * t)),
    },
  };
}

/** A Rift by id: a map entrance (`rift_q_r`) or a template. */
export function getRift(id: string): RiftDef | undefined {
  return (RIFTS as Record<string, RiftDef>)[id] ?? siteRift(id);
}
