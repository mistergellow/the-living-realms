import type { HexCoord } from '@realms/shared';
import { hexDistance } from './hex.js';
import { mapHexAt } from './content/world-map.js';

/*
 * Action Points (request #43): AP measure the time an activity takes. They
 * refill in real time. Values confirmed by the owner: max 120, +10 per real
 * hour. The cost per hex is PROVISIONAL (A79).
 */
export const AP_RULES = {
  max: 120,
  perHour: 10,
  /** Request #50: travel was too costly (was 2). */
  moveCostPerHex: 1,
  /** Request #50: entering a Rift costs a little time. */
  riftEntryCost: 2,
  /** Request #52 (professions phase 2): each gathering attempt. Crafting costs no AP. */
  gatherCost: 2,
} as const;

const HOUR_MS = 3_600_000;

/** AP now, from the value stored at `since` plus what regenerated (fractional). */
export function currentAp(stored: number, since: Date, now: Date = new Date()): number {
  const gained = (Math.max(0, now.getTime() - since.getTime()) / HOUR_MS) * AP_RULES.perHour;
  return Math.min(AP_RULES.max, stored + gained);
}

/** When the AP bar will be full again (null if it already is). */
export function apFullAt(ap: number, now: Date = new Date()): Date | null {
  if (ap >= AP_RULES.max) return null;
  return new Date(now.getTime() + ((AP_RULES.max - ap) / AP_RULES.perHour) * HOUR_MS);
}

export type MoveCheck = { ok: true; cost: number; steps: number } | { ok: false; reason: string };

/** Can you travel from `from` to `to` with `ap` AP? (straight hex distance over land). */
export function checkMove(from: HexCoord, to: HexCoord, ap: number): MoveCheck {
  if (!mapHexAt(to)) return { ok: false, reason: 'You cannot travel into the sea.' };
  const steps = hexDistance(from, to);
  if (steps === 0) return { ok: false, reason: 'You are already there.' };
  const cost = steps * AP_RULES.moveCostPerHex;
  if (cost > Math.floor(ap))
    return { ok: false, reason: `That journey costs ${cost} AP; you have ${Math.floor(ap)}.` };
  return { ok: true, cost, steps };
}
