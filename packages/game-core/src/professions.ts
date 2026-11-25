import type { Attributes } from '@realms/shared';
import { ATTRIBUTE_KEYS } from '@realms/shared';
import { Rng } from './combat/rng.js';
import { rollGrade, type SiteConditions } from './gathering.js';
import {
  MASTERY_RULES,
  MAX_RANK,
  PROFESSION_ATTRIBUTE_RULES,
  TOOL_RULES,
  type ActivityDef,
  type DropDef,
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
  /** Request #82: the hex's deposit, boom and motherlode today. */
  site?: SiteConditions;
}

/** Success chance (percent). Mastery counts most; tools and attributes add a little. */
export function activityChance(a: ActivityDef, input: ChanceInput): number {
  const raw =
    a.baseChance +
    MASTERY_RULES.successPerRank * Math.max(0, input.rank - a.rank) +
    toolBonus(input.toolTier ?? 0) +
    (input.attributeBonus ?? 0) +
    (input.site?.successBonus ?? 0);
  return Math.max(MASTERY_RULES.minChance, Math.min(MASTERY_RULES.maxChance, raw));
}

/**
 * Weight of a drop at `rank` (0 while it is locked). Deposit drops need a
 * deposit hex (request #82); without a `site` they count as found anywhere.
 */
export function dropWeight(d: DropDef, rank: number, site?: SiteConditions): number {
  const need = d.rank ?? 0;
  if (rank < need) return 0;
  const w = d.weight + (d.weightPerRank ?? 0) * (rank - need);
  return d.deposit && site ? w * site.depositMultiplier : w;
}

export interface DropChance {
  drop: DropDef;
  /** Percent chance that one attempt gives this drop (0 while locked). */
  chance: number;
  locked: boolean;
  /** A deposit drop on a hex without a deposit (request #82). */
  needsDeposit: boolean;
}

/**
 * Request #81: chance of each drop of a gathering action. An attempt first
 * succeeds (`activityChance`), then ONE unlocked drop is picked by weight.
 * `nothing` = the chance an attempt gives nothing.
 */
export function dropChances(
  a: ActivityDef,
  input: ChanceInput,
): { drops: DropChance[]; nothing: number } {
  const drops = a.drops ?? [];
  const success = activityChance(a, input);
  const total = drops.reduce((n, d) => n + dropWeight(d, input.rank, input.site), 0);
  return {
    drops: drops.map((d) => {
      const w = dropWeight(d, input.rank, input.site);
      return {
        drop: d,
        chance: total ? Math.round(((success * w) / total) * 10) / 10 : 0,
        locked: input.rank < (d.rank ?? 0),
        needsDeposit: !!d.deposit && !!input.site && !input.site.deposit,
      };
    }),
    nothing: total ? 100 - success : 100,
  };
}

/** Pick one unlocked drop by weight. */
function pickDrop(
  rng: Rng,
  drops: readonly DropDef[],
  rank: number,
  site?: SiteConditions,
): DropDef | null {
  const w = (d: DropDef) => dropWeight(d, rank, site);
  const total = drops.reduce((n, d) => n + w(d), 0);
  if (total <= 0) return null;
  let roll = rng.next() * total;
  for (const d of drops) {
    roll -= w(d);
    if (roll < 0 && w(d) > 0) return d;
  }
  return [...drops].reverse().find((d) => w(d) > 0) ?? null;
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
  const outputs: ActivityOutcome['outputs'] = [];
  if (a.drops) {
    // Request #81: one drop from the table.
    const drop = success ? pickDrop(rng, a.drops, input.rank, input.site) : null;
    const richness =
      input.nodeRichness === undefined
        ? undefined
        : Math.min(2, input.nodeRichness + (input.site?.richnessBonus ?? 0));
    const need = drop?.rank ?? 0;
    if (drop)
      for (const o of drop.outputs) {
        let qty = o.min + rng.int(o.max - o.min + 1);
        if (rng.chance(MASTERY_RULES.yieldPerRank * Math.max(0, input.rank - need))) qty++;
        const grade = richness === undefined ? null : rollGrade(rng, input.rank, richness);
        outputs.push({ item: o.item, qty, grade });
      }
    const points =
      drop && input.rank < MAX_RANK
        ? Math.round(
            (drop.points ?? a.points) * complexityFactor({ complexity: need + 1 }, input.rank),
          )
        : masteryPoints(a, input.rank, success && !!drop);
    return { success: !!drop, chance, points, outputs, repaired: 0 };
  }
  const above = Math.max(0, input.rank - a.rank);
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
