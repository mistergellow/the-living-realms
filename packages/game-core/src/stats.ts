import type { Attributes, DerivedStatsDto } from '@realms/shared';
import { addAttributes } from './attributes.js';
import { activeEquipment, type OwnedItem } from './equipment.js';

/*
 * Derived statistics (decision D33). All linear in attributes; FORMULAS ARE
 * PROVISIONAL and live only here.
 *
 * Mitigation (D34): reduction = rating / (rating + K). It never reaches 100%,
 * and each rating point adds the same amount of *effective* HP, which keeps
 * balance predictable. Players see the resulting percentage.
 */
export const STAT_RULES = {
  hpBase: 40,
  hpPerEndurance: 6,
  manaBase: 10,
  manaPerIntellect: 4,
  dodgePerAgility: 2,
  maxDodge: 40,
  critBase: 5,
  critPerPrecision: 2,
  maxCrit: 60,
  critDamageBase: 150,
  critDamagePerPrecision: 4,
  healingPerWill: 3,
  healingReceivedPerEndurance: 2,
  resistPerWill: 2,
  manaRegenBase: 1,
  willPerManaRegen: 5,
  potencyPerWill: 5,
  /** Rating that gives 50% reduction. */
  mitigationK: 50,
  /** Ability damage/heal/block multiplier per scaled attribute point (+8%). */
  scalingPerPoint: 0.08,
} as const;

/**
 * Focus generated per round (combat spec, request #31): every character gets
 * at least `minimum`; Precision above `basePrecision` adds 1 per
 * `precisionPerFocus` points, up to `maxPerRound`. PROVISIONAL, configurable.
 * Example: Precision 5 → 3, 7 → 4, 9 → 5, 11+ → 6.
 */
export const FOCUS_RULES = {
  minimum: 3,
  basePrecision: 5,
  precisionPerFocus: 2,
  maxPerRound: 6,
} as const;

export function focusPerRound(precision: number): number {
  const extra = Math.floor(
    Math.max(0, precision - FOCUS_RULES.basePrecision) / FOCUS_RULES.precisionPerFocus,
  );
  return Math.min(FOCUS_RULES.maxPerRound, FOCUS_RULES.minimum + extra);
}

export const reductionFromRating = (rating: number) =>
  rating <= 0 ? 0 : rating / (rating + STAT_RULES.mitigationK);

const pct = (v: number) => Math.round(v * 100);

export function deriveStats(
  attributes: Attributes,
  armor: number,
  extraResist = 0,
): DerivedStatsDto {
  const a = attributes;
  const magicResist = STAT_RULES.resistPerWill * a.will + extraResist;
  return {
    maxHp: STAT_RULES.hpBase + STAT_RULES.hpPerEndurance * a.endurance,
    maxMana: STAT_RULES.manaBase + STAT_RULES.manaPerIntellect * a.intellect,
    armor,
    magicResist,
    physicalReduction: pct(reductionFromRating(armor)),
    magicReduction: pct(reductionFromRating(magicResist)),
    initiative: a.agility,
    dodgeChance: Math.min(STAT_RULES.maxDodge, STAT_RULES.dodgePerAgility * a.agility),
    critChance: Math.min(
      STAT_RULES.maxCrit,
      STAT_RULES.critBase + STAT_RULES.critPerPrecision * a.precision,
    ),
    critDamage: STAT_RULES.critDamageBase + STAT_RULES.critDamagePerPrecision * a.precision,
    healingPower: STAT_RULES.healingPerWill * a.will,
    healingReceived: STAT_RULES.healingReceivedPerEndurance * a.endurance,
    manaRegen: STAT_RULES.manaRegenBase + Math.floor(a.will / STAT_RULES.willPerManaRegen),
    effectPotency: STAT_RULES.potencyPerWill * a.will,
    focusPerRound: focusPerRound(a.precision),
  };
}

export interface CharacterStats {
  attributes: Attributes;
  stats: DerivedStatsDto;
}

export function computeStats(base: Attributes, items: OwnedItem[] = []): CharacterStats {
  const equipped = activeEquipment(items);
  const attributes = addAttributes(base, ...equipped.map((i) => i.def.bonuses ?? {}));
  const armor = equipped.reduce((sum, i) => sum + (i.def.armor ?? 0), 0);
  const resist = equipped.reduce((sum, i) => sum + (i.def.magicResist ?? 0), 0);
  return { attributes, stats: deriveStats(attributes, armor, resist) };
}

/** Damage/heal/block multiplier for an ability's attribute scaling. */
export function scalingMultiplier(attributes: Attributes, scaling: Partial<Attributes>): number {
  let points = 0;
  for (const [k, w] of Object.entries(scaling))
    points += (attributes[k as keyof Attributes] ?? 0) * (w ?? 0);
  return 1 + STAT_RULES.scalingPerPoint * points;
}
