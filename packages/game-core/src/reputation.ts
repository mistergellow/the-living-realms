import { AFFIX_RULES } from './content/affixes.js';

/*
 * Reputation (request #49). Beating a Rift gives its reputation the first
 * time, less the second time, even less the third, then nothing — per
 * character and per Rift. Better gear, while equipped, raises reputation
 * gains: each bonus effect (rarity) and each upgrade level adds a little.
 * Professions will be another source later. PROVISIONAL numbers (A102–A103).
 */
export const REPUTATION_RULES = {
  /** Share of a Rift's reputation by how many times you already beat it. */
  riftClearFactors: [1, 0.5, 0.25] as const,
  /** +% reputation per bonus effect on equipped gear (rarity). */
  perBonusEffectPct: 3,
  /** +% reputation per upgrade level on equipped gear. */
  perUpgradeLevelPct: 2,
  /** Cap on the gear bonus. */
  maxGearBonusPct: 100,
} as const;

/** Share of the reward for this clear (0 once the factors run out). */
export function riftClearFactor(previousClears: number): number {
  return REPUTATION_RULES.riftClearFactors[previousClears] ?? 0;
}

/** Bonus % from equipped gear: bonus effects and upgrade levels. */
export function gearReputationBonusPct(
  equipped: Array<{ affixCount: number; upgradeLevel: number }>,
): number {
  const pct = equipped.reduce(
    (sum, i) =>
      sum +
      Math.min(i.affixCount, AFFIX_RULES.maxAffixes) * REPUTATION_RULES.perBonusEffectPct +
      Math.max(0, i.upgradeLevel) * REPUTATION_RULES.perUpgradeLevelPct,
    0,
  );
  return Math.min(REPUTATION_RULES.maxGearBonusPct, pct);
}

/** Reputation for beating a Rift: base × clear factor × (1 + gear bonus). */
export function riftReputation(base: number, previousClears: number, gearBonusPct: number): number {
  return Math.round(base * riftClearFactor(previousClears) * (1 + gearBonusPct / 100));
}
