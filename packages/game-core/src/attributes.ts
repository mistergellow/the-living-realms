import { ATTRIBUTE_KEYS, type AttributeKey, type Attributes } from '@realms/shared';

/*
 * Six linear attributes (decision D33). Every point always has the same effect;
 * no D&D-style modifiers. Characters start at BASE in each and distribute
 * CREATION_POINTS at creation; equipment adds points on top (D21).
 */

export const ATTRIBUTE_NAMES: Record<AttributeKey, string> = {
  might: 'Might',
  agility: 'Agility',
  precision: 'Precision',
  endurance: 'Endurance',
  intellect: 'Intellect',
  will: 'Will',
};

export const ATTRIBUTE_SUMMARIES: Record<AttributeKey, string> = {
  might: 'Physical strength, impact and heavy weapons',
  agility: 'Initiative, evasion and speed',
  precision: 'Accuracy, critical hits, exploiting weaknesses and Focus per round',
  endurance: 'Health, physical resistance and defence',
  intellect: 'Magical power, elemental effects and maximum Mana',
  will: 'Support, healing, control and mental resistance',
};

export const ATTRIBUTE_RULES = {
  base: 5,
  creationPoints: 12,
  /** Highest score allowed from creation points alone (equipment can exceed it). */
  creationMax: 10,
} as const;

export const BASE_ATTRIBUTES: Attributes = Object.fromEntries(
  ATTRIBUTE_KEYS.map((k) => [k, ATTRIBUTE_RULES.base]),
) as Attributes;

export function pointsSpent(a: Attributes): number {
  return ATTRIBUTE_KEYS.reduce((sum, k) => sum + (a[k] - ATTRIBUTE_RULES.base), 0);
}

export type AttributeValidation =
  { ok: true; spent: number; unspent: number } | { ok: false; reason: string };

/** Creation: every score between base and creationMax, total extra ≤ creation points. */
export function validateCreationAttributes(a: Attributes): AttributeValidation {
  for (const k of ATTRIBUTE_KEYS) {
    const v = a[k];
    if (!Number.isInteger(v) || v < ATTRIBUTE_RULES.base || v > ATTRIBUTE_RULES.creationMax)
      return {
        ok: false,
        reason: `${ATTRIBUTE_NAMES[k]} must be between ${ATTRIBUTE_RULES.base} and ${ATTRIBUTE_RULES.creationMax}.`,
      };
  }
  const spent = pointsSpent(a);
  if (spent > ATTRIBUTE_RULES.creationPoints)
    return {
      ok: false,
      reason: `You spent ${spent} points; you have ${ATTRIBUTE_RULES.creationPoints}.`,
    };
  return { ok: true, spent, unspent: ATTRIBUTE_RULES.creationPoints - spent };
}

/** Spending unspent points later (same per-attribute cap as creation). */
export function validateAllocation(
  base: Attributes,
  add: Partial<Attributes>,
  available: number,
): { ok: true; result: Attributes; used: number } | { ok: false; reason: string } {
  let used = 0;
  const result = { ...base };
  for (const k of ATTRIBUTE_KEYS) {
    const n = add[k] ?? 0;
    if (!Number.isInteger(n) || n < 0)
      return { ok: false, reason: 'Points must be positive whole numbers.' };
    result[k] += n;
    used += n;
    if (n > 0 && result[k] > ATTRIBUTE_RULES.creationMax)
      return {
        ok: false,
        reason: `${ATTRIBUTE_NAMES[k]} cannot go above ${ATTRIBUTE_RULES.creationMax} with points.`,
      };
  }
  if (used === 0) return { ok: false, reason: 'Choose where to put your points.' };
  if (used > available) return { ok: false, reason: `You only have ${available} points.` };
  return { ok: true, result, used };
}

export function addAttributes(base: Attributes, ...bonuses: Partial<Attributes>[]): Attributes {
  const out = { ...base };
  for (const b of bonuses) for (const k of ATTRIBUTE_KEYS) out[k] += b[k] ?? 0;
  return out;
}
