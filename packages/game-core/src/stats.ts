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
  hpPerVitality: 6,
  manaBase: 10,
  manaPerArcana: 4,
  dodgePerAgility: 2,
  maxDodge: 40,
  critBase: 5,
  critPerPrecision: 2,
  maxCrit: 60,
  critDamageBase: 150,
  critDamagePerPrecision: 4,
  healingPerSpirit: 3,
  healingReceivedPerVitality: 2,
  resistPerSpirit: 2,
  manaRegenBase: 1,
  spiritPerManaRegen: 5,
  potencyPerSpirit: 5,
  /** Rating that gives 50% reduction. */
  mitigationK: 50,
  /** Ability damage/heal/block multiplier per scaled attribute point (+8%). */
  scalingPerPoint: 0.08,
} as const;

export const reductionFromRating = (rating: number) =>
  rating <= 0 ? 0 : rating / (rating + STAT_RULES.mitigationK);

const pct = (v: number) => Math.round(v * 100);

export function deriveStats(
  attributes: Attributes,
  armor: number,
  extraResist = 0,
): DerivedStatsDto {
  const a = attributes;
  const magicResist = STAT_RULES.resistPerSpirit * a.spirit + extraResist;
  return {
    maxHp: STAT_RULES.hpBase + STAT_RULES.hpPerVitality * a.vitality,
    maxMana: STAT_RULES.manaBase + STAT_RULES.manaPerArcana * a.arcana,
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
    healingPower: STAT_RULES.healingPerSpirit * a.spirit,
    healingReceived: STAT_RULES.healingReceivedPerVitality * a.vitality,
    manaRegen: STAT_RULES.manaRegenBase + Math.floor(a.spirit / STAT_RULES.spiritPerManaRegen),
    effectPotency: STAT_RULES.potencyPerSpirit * a.spirit,
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
