import type { Attributes } from '@realms/shared';
import { ATTRIBUTE_NAMES } from './attributes.js';
import type { SkillBookDef } from './content/books.js';

/*
 * Skill ranks (request #36). A skill goes 1 → 10, then Mastery M1 → M9, and
 * M10 is shown as P (Perfect): 20 ranks in total.
 *
 * Books needed (successful reads) to reach a rank:
 *   rank 1 (learn): 1 · rank n (2–10): n · M1: 10 · Mk: 10 × k · P (= M10): 100.
 * A failed read consumes the book and gives no progress.
 * Every rank makes the skill a little stronger.
 * ALL NUMBERS PROVISIONAL (see docs/REQUESTS.md).
 */

export const SKILL_RULES = {
  maxRank: 20,
  /** Ranks 1–10 are normal; 11–20 are Mastery (M1–M10, M10 = P). */
  normalRanks: 10,
  /** Power per rank: +5% per rank up to 10, then +3% per Mastery rank (P = +75%). */
  powerPerRank: 0.05,
  powerPerMasteryRank: 0.03,
} as const;

/**
 * Reading a book (request #36). The cost will be AP once Action Points exist;
 * until then it is a short time cost (`cooldownSeconds`), like professions.
 * Chance: `baseChance` at the requirement, + `perPointAbove` per BASE point
 * above it, − `masteryPenalty` when reading towards a Mastery rank.
 */
export const READ_RULES = {
  apCost: 1,
  cooldownSeconds: 5,
  baseChance: 70,
  perPointAbove: 6,
  masteryPenalty: 20,
  minChance: 20,
  maxChance: 95,
  /** Reference score for books without a minimum. */
  defaultMinimum: 5,
} as const;

/** "1".."10", "M1".."M9", "P". 0 = not learned. */
export function rankLabel(rank: number): string {
  if (rank <= 0) return '—';
  if (rank <= SKILL_RULES.normalRanks) return String(rank);
  if (rank >= SKILL_RULES.maxRank) return 'P';
  return `M${rank - SKILL_RULES.normalRanks}`;
}

/** Successful reads needed to go from rank − 1 to `rank`. */
export function booksForRank(rank: number): number {
  if (rank <= 0 || rank > SKILL_RULES.maxRank) return 0;
  if (rank <= SKILL_RULES.normalRanks) return rank;
  return 10 * (rank - SKILL_RULES.normalRanks);
}

/** Total successful reads from nothing to `rank` (P = 605). */
export function totalBooksTo(rank: number): number {
  let n = 0;
  for (let r = 1; r <= rank; r++) n += booksForRank(r);
  return n;
}

/** Ability value multiplier for a skill rank (1 at rank 1). */
export function skillRankMultiplier(rank: number): number {
  if (rank <= 1) return 1;
  const normal = Math.min(rank, SKILL_RULES.normalRanks) - 1;
  const mastery = Math.max(0, Math.min(rank, SKILL_RULES.maxRank) - SKILL_RULES.normalRanks);
  return 1 + SKILL_RULES.powerPerRank * normal + SKILL_RULES.powerPerMasteryRank * mastery;
}

export type ReadCheck = { ok: true; chance: number } | { ok: false; reason: string };

/**
 * Can this character read the book now, and with what chance? `base` must be
 * the BASE attributes (creation only). `currentRank` is the skill's rank (0 =
 * not learned).
 */
export function readCheck(book: SkillBookDef, base: Attributes, currentRank: number): ReadCheck {
  if (currentRank >= SKILL_RULES.maxRank)
    return { ok: false, reason: 'You have already perfected this skill.' };
  const score = base[book.studyAttribute];
  const min = book.minimum ?? READ_RULES.defaultMinimum;
  if (book.minimum !== undefined && score < book.minimum)
    return {
      ok: false,
      reason: `You need ${ATTRIBUTE_NAMES[book.studyAttribute]} ${book.minimum} (base) to read this book.`,
    };
  const mastery = currentRank >= SKILL_RULES.normalRanks ? READ_RULES.masteryPenalty : 0;
  const raw = READ_RULES.baseChance + READ_RULES.perPointAbove * (score - min) - mastery;
  return {
    ok: true,
    chance: Math.max(READ_RULES.minChance, Math.min(READ_RULES.maxChance, raw)),
  };
}

export interface SkillProgress {
  rank: number;
  /** Successful reads towards the next rank. */
  progress: number;
}

export interface ReadOutcome extends SkillProgress {
  success: boolean;
  chance: number;
  rankedUp: boolean;
}

/** Applies one read. `roll` is a number in [0, 100). */
export function applyRead(current: SkillProgress, chance: number, roll: number): ReadOutcome {
  const success = roll < chance;
  if (!success) return { ...current, success, chance, rankedUp: false };
  const progress = current.progress + 1;
  const need = booksForRank(current.rank + 1);
  if (progress >= need)
    return { rank: current.rank + 1, progress: 0, success, chance, rankedUp: true };
  return { rank: current.rank, progress, success, chance, rankedUp: false };
}
