import { z } from 'zod';
import type { HexCoord } from './api.js';

/** World boss (request #43): the season's boss, its shared HP and the leaderboard. */
export interface WorldBossDto {
  season: number;
  theme: string;
  name: string;
  description: string;
  hp: number;
  maxHp: number;
  position: HexCoord;
  /** When it moves to a neighbouring Riftlands hex next (ISO). */
  nextMoveAt: string;
  defeatedAt: string | null;
  /** Fights a character may start per real day. */
  attemptsPerDay: number;
  /** For the character asking: fights left today, and whether it stands on the boss's hex. */
  you: { attemptsLeft: number; here: boolean } | null;
  leaderboard: WorldBossRankDto[];
  /** Season end (request #44): the date, whether it is over, when the reward was given. */
  endsAt: string;
  seasonOver: boolean;
  rewardedAt: string | null;
  /** Given to every member of the party with the most damage when the season ends. */
  reward: { reputation: number; item: string };
}

export interface WorldBossRankDto {
  rank: number;
  /** Party members' names (the party is the set of characters who fought together). */
  members: string[];
  damage: number;
  attempts: number;
}

export const worldBossQuerySchema = z.object({ characterId: z.uuid().optional() });
export const worldBossFightSchema = z.object({ characterId: z.uuid() });
