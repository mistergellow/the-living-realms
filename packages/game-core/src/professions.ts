import { Rng } from './combat/rng.js';
import { PROFESSION_RULES, type ActivityDef } from './content/professions.js';

/*
 * Profession rules (request #33). Pure: the server supplies the level, the
 * random seed and the target item; it applies the result.
 */

/** XP needed to go from `level` to `level + 1`. */
export const xpToNext = (level: number) =>
  level >= PROFESSION_RULES.maxLevel
    ? 0
    : PROFESSION_RULES.xpBase + PROFESSION_RULES.xpPerLevel * level;

/** Add XP; returns the new level/xp and how many levels were gained. */
export function addProfessionXp(
  level: number,
  xp: number,
  gain: number,
): { level: number; xp: number; levelsGained: number } {
  let l = level;
  let x = xp + gain;
  let gained = 0;
  while (l < PROFESSION_RULES.maxLevel && x >= xpToNext(l)) {
    x -= xpToNext(l);
    l++;
    gained++;
  }
  if (l >= PROFESSION_RULES.maxLevel) x = 0;
  return { level: l, xp: x, levelsGained: gained };
}

/** Success chance (percent) at a level; upgrades get harder per existing +1. */
export function activityChance(a: ActivityDef, level: number, targetUpgrade = 0): number {
  const raw =
    a.baseChance +
    PROFESSION_RULES.successPerLevel * level -
    (a.effect === 'upgrade' ? PROFESSION_RULES.upgradePenaltyPerLevel * targetUpgrade : 0);
  return Math.max(PROFESSION_RULES.minChance, Math.min(PROFESSION_RULES.maxChance, raw));
}

export const repairAmount = (level: number) =>
  PROFESSION_RULES.repairBase + PROFESSION_RULES.repairPerLevel * level;

export interface ActivityOutcome {
  success: boolean;
  chance: number;
  xp: number;
  /** Items produced (success only). */
  outputs: Array<{ item: string; qty: number }>;
  /** Quality restored (repair). */
  repaired: number;
  /** Weapon upgrade gained (upgrade). */
  upgraded: boolean;
}

/** Roll an attempt. Level improves both the chance and the result. */
export function resolveActivity(
  a: ActivityDef,
  level: number,
  seed: number,
  targetUpgrade = 0,
): ActivityOutcome {
  const rng = new Rng(seed);
  const chance = activityChance(a, level, targetUpgrade);
  const success = rng.chance(chance);
  const outputs: ActivityOutcome['outputs'] = [];
  if (success)
    for (const o of a.outputs) {
      let qty = o.min + rng.int(o.max - o.min + 1);
      if (rng.chance(PROFESSION_RULES.yieldPerLevel * level)) qty++;
      outputs.push({ item: o.item, qty });
    }
  return {
    success,
    chance,
    xp: success ? a.xpSuccess : a.xpFailure,
    outputs,
    repaired: success && a.effect === 'repair' ? repairAmount(level) : 0,
    upgraded: success && a.effect === 'upgrade',
  };
}
