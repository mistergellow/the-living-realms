import { z } from 'zod';
import type { AttributeKey } from './api.js';

/*
 * Professions (request #33) with Mastery (request #51): 15 professions, each
 * with 6 ranks (Novice → Grandmaster). Progress depends on how complex the
 * work is.
 */

export type ProfessionCategory = 'gathering' | 'crafting';

export interface ActivityDto {
  id: string;
  name: string;
  description: string;
  /** Rank index needed (0 = Novice) and its name. */
  rank: number;
  rankName: string;
  /** 1–6: how demanding it is. Simple work stops teaching you once you are above it. */
  complexity: number;
  /** Your success chance now (percent). */
  chance: number;
  cooldownSeconds: number;
  /** Not unlocked yet: your rank is too low. */
  locked: boolean;
  /** Mastery points it gives you now on success (0 = too simple for you). */
  points: number;
  inputs: Array<{ itemDefId: string; name: string; qty: number; have: number }>;
  outputs: Array<{ itemDefId: string; name: string; min: number; max: number }>;
  /** Works on one of your items (repair). */
  effect: 'repair' | null;
}

export interface ProfessionToolDto {
  type: string;
  /** Generic name, e.g. "Fishing Rod". */
  name: string;
  /** The best usable one you carry, or null. */
  best: { name: string; tier: number } | null;
}

export interface ProfessionStatsDto {
  attempts: number;
  successes: number;
  itemsMade: number;
}

export interface ProfessionDto {
  id: string;
  name: string;
  title: string;
  category: ProfessionCategory;
  description: string;
  /** Mastery rank index (0 Novice … 5 Grandmaster) and its name. */
  rank: number;
  rankName: string;
  maxRank: number;
  /** Mastery points towards the next rank, and how many it needs (0 at Grandmaster). */
  points: number;
  pointsToNext: number;
  /** ISO time from which the profession can be practised again (null = now). */
  readyAt: string | null;
  activities: ActivityDto[];
  /** Terrains this profession needs (request #43); null = anywhere. */
  terrains: string[] | null;
  /** Whether the hex you stand on allows it. */
  availableHere: boolean;
  /** Tool you must carry, or null. */
  tool: ProfessionToolDto | null;
  /** §21: BASE attributes that help, and the bonus (percent) they give you now. */
  attributes: Array<{ attribute: AttributeKey; weight: number }>;
  attributeBonus: number;
  /** Materials it gathers (gathering) or works with (crafting). */
  resources: Array<{ itemDefId: string; name: string }>;
  stats: ProfessionStatsDto;
  /** Recent rank-ups, newest first. */
  history: Array<{ at: string; rank: number; rankName: string }>;
}

export interface ProfessionsDto {
  professions: ProfessionDto[];
}

export const performActivitySchema = z.object({
  /** Repair: the item worked on. */
  targetItemId: z.uuid().optional(),
});

export interface ActivityResultDto {
  success: boolean;
  chance: number;
  message: string;
  pointsGained: number;
  ranksGained: number;
  produced: Array<{ name: string; qty: number }>;
  consumed: Array<{ name: string; qty: number }>;
  profession: ProfessionDto;
}

/** Another character's professional profile (request #51): public summary only. */
export interface ProfessionProfileDto {
  character: { id: string; name: string };
  professions: Array<{
    id: string;
    name: string;
    title: string;
    category: ProfessionCategory;
    rank: number;
    rankName: string;
    /** 0–1 towards the next rank (1 at Grandmaster). */
    progress: number;
    stats: ProfessionStatsDto;
  }>;
}
