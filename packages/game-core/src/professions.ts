import type { Attributes } from '@realms/shared';
import { ATTRIBUTE_KEYS } from '@realms/shared';
import { Rng } from './combat/rng.js';
import { rollGrade } from './gathering.js';
import {
  MASTERY_RULES,
  MAX_RANK,
  PROFESSION_ATTRIBUTE_RULES,
  TOOL_RULES,
  type ActivityDef,
  type ProfessionDef,
} from './content/professions.js';

/*
 * Profession rules (request #33, Mastery from request #51). Pure: the server
 * supplies the rank, the BASE attributes, the best tool tier and the random
 * seed; it applies the result.
 */

/** Mastery points needed to go from `rank` to `rank + 1` (0 at Grandmaster). */
export const pointsToNext = (rank: number) =>
  rank >= MAX_RANK ? 0 : (MASTERY_RULES.pointsToNext[rank] ?? 0);

/**
 * Share of an activity's points a character of `rank` still gets: simple work
 * teaches an expert little, then nothing (so farming cheap items cannot reach
 * Grandmaster).
 */
export function complexityFactor(a: Pick<ActivityDef, 'complexity'>, rank: number): number {
  const above = Math.max(0, rank - (a.complexity - 1));
  const f = MASTERY_RULES.complexityFalloff;
  return f[Math.min(above, f.length - 1)]!;
}

/** Mastery points an attempt gives at `rank` (after the complexity falloff). */
export function masteryPoints(a: ActivityDef, rank: number, success: boolean): number {
  if (rank >= MAX_RANK) return 0;
  return Math.round((success ? a.points : a.failurePoints) * complexityFactor(a, rank));
}

/** Add Mastery points; returns the new rank/points and how many ranks were gained. */
export function addMastery(
  rank: number,
  points: number,
  gain: number,
): { rank: number; points: number; ranksGained: number } {
  let r = rank;
  let p = points + gain;
  let gained = 0;
  while (r < MAX_RANK && p >= pointsToNext(r)) {
    p -= pointsToNext(r);
    r++;
    gained++;
  }
  if (r >= MAX_RANK) p = 0;
  return { rank: r, points: p, ranksGained: gained };
}

/**
 * §21: success bonus from BASE attributes (never gear), weighted per
 * profession and capped well below what one rank gives.
 */
export function attributeBonus(p: Pick<ProfessionDef, 'attributes'>, base: Attributes): number {
  const { baseline, perPoint, cap } = PROFESSION_ATTRIBUTE_RULES;
  let sum = 0;
  for (const k of ATTRIBUTE_KEYS) {
    const w = p.attributes[k];
    if (w) sum += w * Math.max(0, base[k] - baseline) * perPoint;
  }
  return Math.min(cap, Math.floor(sum));
}

/** Success bonus of a tool tier (tier 1 = none). */
export const toolBonus = (tier: number) => Math.max(0, tier - 1) * TOOL_RULES.chanceBonusPerTier;

export interface ChanceInput {
  rank: number;
  /** From `attributeBonus`. */
  attributeBonus?: number;
  /** Tier of the best usable tool (0 = none needed). */
  toolTier?: number;
  /** Gathering (request #52): richness of the node (0–2); outputs get a material grade. */
  nodeRichness?: number;
}

/** Success chance (percent). Mastery counts most; tools and attributes add a little. */
export function activityChance(a: ActivityDef, input: ChanceInput): number {
  const raw =
    a.baseChance +
    MASTERY_RULES.successPerRank * Math.max(0, input.rank - a.rank) +
    toolBonus(input.toolTier ?? 0) +
    (input.attributeBonus ?? 0);
  return Math.max(MASTERY_RULES.minChance, Math.min(MASTERY_RULES.maxChance, raw));
}

export const repairAmount = (rank: number) =>
  MASTERY_RULES.repairBase + MASTERY_RULES.repairPerRank * rank;

export interface ActivityOutcome {
  success: boolean;
  chance: number;
  /** Mastery points gained (after the complexity falloff). */
  points: number;
  /** Items produced (success only); gathered ones have a grade (0 Poor … 4 Exceptional). */
  outputs: Array<{ item: string; qty: number; grade: number | null }>;
  /** Quality restored (repair). */
  repaired: number;
}

/** Roll an attempt. Rank improves the chance and the result. */
export function resolveActivity(a: ActivityDef, input: ChanceInput, seed: number): ActivityOutcome {
  const rng = new Rng(seed);
  const chance = activityChance(a, input);
  const success = rng.chance(chance);
  const above = Math.max(0, input.rank - a.rank);
  const outputs: ActivityOutcome['outputs'] = [];
  if (success)
    for (const o of a.outputs) {
      let qty = o.min + rng.int(o.max - o.min + 1);
      if (rng.chance(MASTERY_RULES.yieldPerRank * above)) qty++;
      const grade =
        input.nodeRichness === undefined ? null : rollGrade(rng, input.rank, input.nodeRichness);
      outputs.push({ item: o.item, qty, grade });
    }
  return {
    success,
    chance,
    points: masteryPoints(a, input.rank, success),
    outputs,
    repaired: success && a.effect === 'repair' ? repairAmount(input.rank) : 0,
  };
}

/*
 * Jobs (request #56): instead of one click per attempt, choose how many
 * attempts and pay either in AP (everything at once) or in real time (the
 * items arrive when the job ends). PROVISIONAL numbers (A122).
 */
export const JOB_RULES = {
  maxCount: 50,
  /** AP per attempt: gathering uses AP_RULES.gatherCost; crafting this. */
  craftApCost: 1,
  /** Real time per gathering attempt (crafting uses the recipe's own time). */
  gatherSeconds: 600,
} as const;

/** AP a job of `count` attempts costs, paid in AP. */
export const jobApCost = (category: 'gathering' | 'crafting', count: number, gatherCost: number) =>
  (category === 'gathering' ? gatherCost : JOB_RULES.craftApCost) * count;

/** Seconds a job of `count` attempts takes, paid in real time. */
export const jobSeconds = (
  category: 'gathering' | 'crafting',
  a: Pick<ActivityDef, 'cooldownSeconds'>,
  count: number,
) => (category === 'gathering' ? JOB_RULES.gatherSeconds : a.cooldownSeconds) * count;
