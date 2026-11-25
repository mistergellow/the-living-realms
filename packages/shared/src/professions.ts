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
  /** Crafting: seconds the profession is busy afterwards (0 for gathering). */
  cooldownSeconds: number;
  /** Gathering (request #52): AP each attempt costs (0 for crafting). */
  apCost: number;
  /** Not unlocked yet: your rank is too low. */
  locked: boolean;
  /** Mastery points it gives you now on success (0 = too simple for you). */
  points: number;
  inputs: Array<{ itemDefId: string; name: string; qty: number; have: number }>;
  outputs: Array<{ itemDefId: string; name: string; min: number; max: number }>;
  /** Works on one of your items (repair). */
  effect: 'repair' | null;
  /**
   * Request #81: gathering drop table (null for crafting). One attempt gives at
   * most one line; `nothingChance` = the chance it gives nothing.
   */
  drops: GatherDropDto[] | null;
  nothingChance: number | null;
}

export interface GatherDropDto {
  items: Array<{ itemDefId: string; name: string; min: number; max: number }>;
  /** Percent chance per attempt, on the hex you stand on, today. */
  chance: number;
  /** Rank index that unlocks it, and its name. */
  rank: number;
  rankName: string;
  locked: boolean;
  /** Only found on deposit hexes (request #82). */
  deposit: boolean;
  /** A deposit drop and this hex has no deposit. */
  needsDeposit: boolean;
}

/** Request #82: what the hex you stand on offers a gathering profession today. */
export interface GatherSiteDto {
  deposit: boolean;
  boom: boolean;
  motherlode: boolean;
  /** The region booming today for this profession. */
  boomRegion: string;
}

/** Request #82: the day's word on the roads for one gathering profession. */
export interface GatherRumourDto {
  professionId: string;
  professionName: string;
  regionName: string;
  /** A hex near the day's motherlode (null = none). */
  near: { q: number; r: number } | null;
  /** When the boom moves on (ISO). */
  endsAt: string;
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
  /**
   * Gathering (request #52): the resource node on the hex you stand on, or null
   * (crafting, or no node here). `readyAt` = when it has a charge again.
   */
  node: {
    richness: string;
    amount: number;
    max: number;
    readyAt: string | null;
  } | null;
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
  /** Gathering: deposit / boom / motherlode on your hex today (null for crafting). */
  site: GatherSiteDto | null;
}

export interface ProfessionsDto {
  professions: ProfessionDto[];
  /** The running (or finished, not yet dismissed) real-time job (request #56). */
  job: ProfessionJobDto | null;
  /** Request #82: where each gathering profession booms today. */
  rumours: GatherRumourDto[];
}

/** Summary of several attempts (request #56). */
export interface JobResultDto {
  attempts: number;
  successes: number;
  pointsGained: number;
  ranksGained: number;
  produced: Array<{ name: string; qty: number; grade: string | null }>;
  consumed: Array<{ name: string; qty: number }>;
  apSpent: number;
  message: string;
}

export interface ProfessionJobDto {
  id: string;
  professionId: string;
  professionName: string;
  activityId: string;
  activityName: string;
  count: number;
  startedAt: string;
  finishesAt: string;
  status: 'running' | 'done';
  result: JobResultDto | null;
}

/** Start a job: `ap` = all at once for AP; `time` = real time, no AP. */
export const startJobSchema = z.object({
  mode: z.enum(['ap', 'time']),
  count: z.number().int().min(1).max(50),
});

export interface JobResponseDto {
  /** Filled at once for an AP job. */
  result: JobResultDto | null;
  job: ProfessionJobDto | null;
  profession: ProfessionDto;
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
  /** Gathered items carry their grade name (request #52). */
  produced: Array<{ name: string; qty: number; grade: string | null }>;
  /** AP spent (gathering). */
  apSpent: number;
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
