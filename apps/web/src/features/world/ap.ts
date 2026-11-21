import type { ApDto } from '@realms/shared';

/**
 * AP shown now (request #43): AP refill in real time, so the client derives
 * the value from when the bar will be full (`fullAt`) instead of polling.
 */
export function liveAp(ap: ApDto, now: number = Date.now()): number {
  if (!ap.fullAt) return ap.max;
  const hoursLeft = Math.max(0, new Date(ap.fullAt).getTime() - now) / 3_600_000;
  return Math.max(0, Math.min(ap.max, Math.floor(ap.max - hoursLeft * ap.perHour)));
}

/** "in 2 h 15 min" until the bar is full, or null when full. */
export function fullIn(ap: ApDto, now: number = Date.now()): string | null {
  if (!ap.fullAt) return null;
  const min = Math.ceil(Math.max(0, new Date(ap.fullAt).getTime() - now) / 60_000);
  if (min <= 0) return null;
  const h = Math.floor(min / 60);
  return h ? `${h} h ${min % 60} min` : `${min} min`;
}
