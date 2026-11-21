import { z } from 'zod';

/* Professions (request #33): levels 0–10 that improve success and results. */

export type ProfessionCategory = 'gathering' | 'crafting' | 'service';

export interface ActivityDto {
  id: string;
  name: string;
  description: string;
  minLevel: number;
  /** Your success chance now (percent). For upgrades it depends on the weapon. */
  chance: number;
  cooldownSeconds: number;
  locked: boolean;
  inputs: Array<{ itemDefId: string; name: string; qty: number; have: number }>;
  outputs: Array<{ itemDefId: string; name: string; min: number; max: number }>;
  /** Works on one of your items (repair, upgrade). */
  effect: 'repair' | 'upgrade' | null;
}

export interface ProfessionDto {
  id: string;
  name: string;
  title: string;
  category: ProfessionCategory;
  description: string;
  level: number;
  maxLevel: number;
  xp: number;
  /** XP needed for the next level (0 at max level). */
  xpToNext: number;
  /** ISO time from which the profession can be practised again (null = now). */
  readyAt: string | null;
  activities: ActivityDto[];
  /** Terrains this profession needs (request #43); null = anywhere. */
  terrains: string[] | null;
  /** Whether the hex you stand on allows it. */
  availableHere: boolean;
}

export interface ProfessionsDto {
  professions: ProfessionDto[];
}

export const performActivitySchema = z.object({
  /** Repair/upgrade: the item worked on. */
  targetItemId: z.uuid().optional(),
});

export interface ActivityResultDto {
  success: boolean;
  chance: number;
  message: string;
  xpGained: number;
  levelsGained: number;
  produced: Array<{ name: string; qty: number }>;
  consumed: Array<{ name: string; qty: number }>;
  profession: ProfessionDto;
}
