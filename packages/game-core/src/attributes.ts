import { ATTRIBUTE_KEYS, type AttributeKey, type Attributes } from '@realms/shared';

/*
 * The six D&D abilities, set at character creation with point-buy (D&D 5e
 * rules). Base scores never grow on their own; equipment can add bonuses.
 */

export const ATTRIBUTE_NAMES: Record<AttributeKey, string> = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
};

export const ATTRIBUTE_SUMMARIES: Record<AttributeKey, string> = {
  str: 'Physical damage',
  dex: 'Initiative, ranged damage, dodge, critical chance',
  con: 'Health and defense',
  int: 'Maximum mana and spell power',
  wis: 'Healing, resistance, mana recovery',
  cha: 'Buffs and debuffs; trade and reputation later',
};

export const POINT_BUY = {
  budget: 27,
  min: 8,
  max: 15,
  /** Cost of each score (D&D 5e). */
  cost: { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 } as Record<number, number>,
} as const;

export const BASE_ATTRIBUTES: Attributes = { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 };

/** D&D ability modifier: 10–11 → 0, 12–13 → +1, 8–9 → −1 … */
export function attributeModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function pointBuySpent(a: Attributes): number {
  return ATTRIBUTE_KEYS.reduce((sum, k) => sum + (POINT_BUY.cost[a[k]] ?? Infinity), 0);
}

export type PointBuyValidation = { ok: true; spent: number } | { ok: false; reason: string };

/** Unspent points are allowed; overspending or out-of-range scores are not. */
export function validatePointBuy(a: Attributes): PointBuyValidation {
  for (const k of ATTRIBUTE_KEYS) {
    const v = a[k];
    if (!Number.isInteger(v) || v < POINT_BUY.min || v > POINT_BUY.max)
      return {
        ok: false,
        reason: `${ATTRIBUTE_NAMES[k]} must be between ${POINT_BUY.min} and ${POINT_BUY.max}.`,
      };
  }
  const spent = pointBuySpent(a);
  if (spent > POINT_BUY.budget)
    return { ok: false, reason: `You spent ${spent} points; the budget is ${POINT_BUY.budget}.` };
  return { ok: true, spent };
}

export function addAttributes(base: Attributes, ...bonuses: Partial<Attributes>[]): Attributes {
  const out = { ...base };
  for (const b of bonuses) for (const k of ATTRIBUTE_KEYS) out[k] += b[k] ?? 0;
  return out;
}
