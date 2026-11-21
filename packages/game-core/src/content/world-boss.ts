import type { HexCoord } from '@realms/shared';
import { hexNeighbors } from '../hex.js';
import { getEnemy } from './enemies.js';
import { mapHexAt, RIFTLANDS_CENTER } from './world-map.js';

/*
 * World boss (request #43): one per season, roaming the Riftlands with a
 * huge shared HP pool meant to take months. Parties fight it until they fall;
 * the damage they deal comes off the pool and goes on the leaderboard.
 * PLACEHOLDER numbers and theme (A85–A87).
 */
export const WORLD_BOSS_ID = 'world_boss';

export interface WorldBossSeason {
  season: number;
  /** Season theme shown with the boss. */
  theme: string;
  enemy: string;
  name: string;
  description: string;
  maxHp: number;
}

export const WORLD_BOSS_SEASONS: readonly WorldBossSeason[] = [
  {
    season: 1,
    theme: 'Season 1 — The Hollow',
    enemy: 'hollow_colossus',
    name: 'The Hollow Colossus',
    description:
      'A giant of stone and Rift-light that walks the Riftlands. Every party that ' +
      'stands against it chips away at a life that will take months to end.',
    maxHp: 5_000_000,
  },
];

export const WORLD_BOSS_RULES = {
  /** Fights a character may start per real day (UTC). */
  attemptsPerDay: 1,
  /** Real hours between moves to a neighbouring Riftlands hex. */
  moveEveryHours: 3,
  /** Where a new season's boss appears. */
  spawn: RIFTLANDS_CENTER,
} as const;

export const CURRENT_WORLD_BOSS_SEASON = WORLD_BOSS_SEASONS[WORLD_BOSS_SEASONS.length - 1]!;

export function worldBossSeason(season: number): WorldBossSeason | undefined {
  return WORLD_BOSS_SEASONS.find((s) => s.season === season);
}

/** The boss's enemy definition for a season (falls back to the latest). */
export function worldBossEnemy(season: number) {
  return getEnemy((worldBossSeason(season) ?? CURRENT_WORLD_BOSS_SEASON).enemy)!;
}

/** Next hex for the roaming boss: a random neighbouring Riftlands hex (`roll` in [0, 1)). */
export function nextBossHex(from: HexCoord, roll: number): HexCoord {
  const options = hexNeighbors(from).filter((h) => mapHexAt(h)?.region === 'riftlands');
  if (!options.length) return WORLD_BOSS_RULES.spawn;
  return options[Math.min(options.length - 1, Math.floor(roll * options.length))]!;
}

/** Party key for the leaderboard: the sorted character ids. */
export const partyKeyOf = (characterIds: string[]) => [...characterIds].sort().join(',');
