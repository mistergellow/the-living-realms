import type { EnemyId } from './enemies.js';
import type { RiftRoomDef } from './rifts.js';

/*
 * Rift themes (request #71, PROVISIONAL content A136): every Rift entrance on
 * the map opens into one theme, with its own enemies, rooms, Elite mini-bosses
 * and boss. Harder themes only appear from a tier on. The map, events and loot
 * come from the Rift template; a theme only changes who you fight.
 */

export interface RiftTheme {
  id: string;
  name: string;
  /** One line for the Rift card. */
  description: string;
  /** The lowest Rift tier this theme opens at. */
  minTier: number;
  combat: RiftRoomDef[];
  elite: RiftRoomDef[];
  boss: RiftRoomDef;
}

type Placement = [EnemyId, number] | [EnemyId, number, 'elite'];
const room = (name: string, ...enemies: Placement[]): RiftRoomDef => ({
  name,
  enemies: enemies.map(([enemy, slot, elite]) => ({
    enemy,
    slot,
    ...(elite ? { elite: true } : {}),
  })),
});
const boss = (name: string, ...enemies: Placement[]): RiftRoomDef => ({
  ...room(name, ...enemies),
  isBoss: true,
});

export const RIFT_THEMES = {
  hollow: {
    id: 'hollow',
    name: 'The Hollow Breach',
    description: 'Husks and hounds crawl out of a cracked seal. Crawlers go for your back line.',
    minTier: 1,
    combat: [
      room('The Threshold', ['rift_bulwark', 0], ['rift_husk', 1], ['shard_spitter', 2]),
      room('Howling Gallery', ['hollow_hound', 0], ['rift_husk', 1], ['bone_archer', 2]),
      room('Husk Warren', ['rift_husk', 0], ['rift_husk', 1], ['grave_crawler', 2]),
      room('Ossuary', ['rift_bulwark', 0], ['bone_archer', 2], ['bone_archer', 3]),
      room('Crawling Dark', ['hollow_hound', 0], ['grave_crawler', 1], ['grave_crawler', 2]),
      room('Leech Pools', ['rift_leech', 0], ['rift_leech', 1], ['bone_archer', 2]),
    ],
    elite: [
      room('The Abomination', ['husk_abomination', 0], ['bone_archer', 2]),
      room(
        'Alpha Den',
        ['hollow_hound', 0, 'elite'],
        ['hollow_hound', 1],
        ['grave_crawler', 2, 'elite'],
      ),
      room(
        'The Bulwark Line',
        ['rift_bulwark', 0, 'elite'],
        ['rift_husk', 1, 'elite'],
        ['bone_archer', 2],
      ),
    ],
    boss: boss("Warden's Seal", ['rift_warden', 0], ['bone_archer', 2]),
  },
  crystal: {
    id: 'crystal',
    name: 'The Crystal Nest',
    description: 'A hive of living crystal. Sentinels reflect blades; crushers break guards.',
    minTier: 1,
    combat: [
      room('Shard Nest', ['geode_crusher', 0], ['shard_spitter', 1], ['shard_spitter', 2]),
      room('Mirror Hall', ['prism_sentinel', 0], ['prism_sentinel', 1], ['shard_spitter', 2]),
      room('Thorn Thicket', ['thornback', 0], ['geode_crusher', 1], ['shard_spitter', 2]),
      room('Brood Chamber', ['brood_mother', 0], ['prism_sentinel', 2]),
      room('Geode Field', ['geode_crusher', 0], ['thornback', 1], ['prism_sentinel', 2]),
    ],
    elite: [
      room('The Titan', ['geode_titan', 0], ['shard_spitter', 2]),
      room(
        'The Mite Hive',
        ['brood_mother', 0, 'elite'],
        ['volatile_mite', 1],
        ['volatile_mite', 2],
      ),
      room(
        'Prism Court',
        ['prism_sentinel', 0, 'elite'],
        ['geode_crusher', 1, 'elite'],
        ['shard_spitter', 2],
      ),
    ],
    boss: boss('The Heart of the Nest', ['crystal_matriarch', 0], ['prism_sentinel', 2]),
  },
  cult: {
    id: 'cult',
    name: 'The Crimson Cult',
    description: 'Cultists bleed for their saint. Assassins strike your back; priests heal theirs.',
    minTier: 2,
    combat: [
      room('Zealot Shrine', ['cult_fanatic', 0], ['rift_zealot', 1], ['void_shaman', 2]),
      room('Penitent Row', ['flagellant', 0], ['flagellant', 1], ['blood_priest', 2]),
      room('Knife in the Dark', ['cult_fanatic', 0], ['cult_assassin', 1], ['cult_assassin', 2]),
      room('Blood Choir', ['flagellant', 0], ['blood_priest', 2], ['rift_zealot', 3]),
      room('Vestry', ['cult_fanatic', 0], ['cult_fanatic', 1], ['blood_priest', 2]),
    ],
    elite: [
      room('The Inquisition', ['high_inquisitor', 0], ['blood_priest', 2]),
      room(
        'Night of Knives',
        ['cult_assassin', 0, 'elite'],
        ['cult_assassin', 1],
        ['void_shaman', 2],
      ),
      room('Martyrs', ['flagellant', 0, 'elite'], ['rift_zealot', 1, 'elite'], ['blood_priest', 2]),
    ],
    boss: boss('The Bleeding Altar', ['bleeding_saint', 0], ['blood_priest', 2]),
  },
  drowned: {
    id: 'drowned',
    name: 'The Drowned Depths',
    description: 'Cold water and colder hands. Their Chill steals your Focus; sirens weaken you.',
    minTier: 3,
    combat: [
      room('Flooded Hall', ['drowned_thrall', 0], ['rift_leech', 1], ['drowned_siren', 2]),
      room('Undertow', ['drowned_thrall', 0], ['tide_lurker', 1], ['tide_lurker', 2]),
      room('Siren Rocks', ['rift_leech', 0], ['drowned_siren', 1], ['drowned_siren', 2]),
      room('Sunken Gate', ['drowned_thrall', 0], ['drowned_thrall', 1], ['tide_lurker', 2]),
    ],
    elite: [
      room('The Drowned Knight', ['drowned_knight', 0], ['drowned_siren', 2]),
      room(
        'Lurker Pit',
        ['tide_lurker', 0, 'elite'],
        ['tide_lurker', 1, 'elite'],
        ['drowned_siren', 2],
      ),
    ],
    boss: boss('The Maw', ['leviathan_maw', 0], ['drowned_siren', 2]),
  },
  heart: {
    id: 'heart',
    name: 'The Rift Heart',
    description:
      'The core of the Rift. Knights punish Dodge, unmakers steal Focus, horrors mark you.',
    minTier: 4,
    combat: [
      room('Event Horizon', ['rift_knight', 0], ['void_horror', 1], ['unmaker', 2]),
      room('Phase Hall', ['phase_stalker', 0], ['phase_stalker', 1], ['unmaker', 2]),
      room('Broken Order', ['rift_knight', 0], ['rift_knight', 1], ['void_horror', 2]),
      room('Null Garden', ['void_horror', 0], ['unmaker', 1], ['unmaker', 2]),
    ],
    elite: [
      room('The Herald', ['void_herald', 0], ['unmaker', 2]),
      room('Stalker Pack', ['phase_stalker', 0, 'elite'], ['phase_stalker', 1], ['void_horror', 2]),
    ],
    boss: boss('The Beating Heart', ['rift_heart', 0], ['unmaker', 2]),
  },
} satisfies Record<string, RiftTheme>;

export type RiftThemeId = keyof typeof RIFT_THEMES;
export const RIFT_THEME_IDS = Object.keys(RIFT_THEMES) as RiftThemeId[];

export function getRiftTheme(id: string | undefined): RiftTheme | undefined {
  return id ? (RIFT_THEMES as Record<string, RiftTheme>)[id] : undefined;
}

/** Themes that may open at a tier. */
export const themesForTier = (tier: number): RiftTheme[] =>
  RIFT_THEME_IDS.map((id) => RIFT_THEMES[id] as RiftTheme).filter((t) => t.minTier <= tier);

/**
 * The theme of the Rift at (q, r) on a day: stable for that Rift, varied across
 * the map. Harder themes come with higher tiers (newest themes weigh more).
 */
export function themeFor(q: number, r: number, tier: number, day = 0): RiftTheme {
  const pool = themesForTier(tier);
  let h = (q * 73856093) ^ (r * 19349663) ^ (day * 83492791) ^ (tier * 2654435761);
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  h = (h ^ (h >>> 13)) >>> 0;
  return pool[h % pool.length]!;
}
