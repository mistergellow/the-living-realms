/*
 * Request #85: health carries over between Rifts. A character keeps the
 * damage it took; it heals only over real time or with potions and food. The
 * server stores the HP LOST (not the HP left) and when it was written, so a
 * new maximum (gear, attributes) never hurts or heals by itself; like AP, the
 * current value is worked out when read. PROVISIONAL numbers (A145).
 */
export const HEALTH_RULES = {
  /** Share of the maximum healed per real hour (10 → full in 10 h). */
  regenPctPerHour: 10,
  /** HP needed to enter a Rift. */
  minToEnter: 1,
} as const;

const HOUR_MS = 3_600_000;

/** HP lost now: the stored loss minus what healed since it was written. */
export function hpLostNow(
  storedLost: number,
  since: Date,
  maxHp: number,
  now: Date = new Date(),
): number {
  const healed =
    (Math.max(0, now.getTime() - since.getTime()) / HOUR_MS) *
    ((HEALTH_RULES.regenPctPerHour / 100) * maxHp);
  return Math.max(0, Math.min(maxHp, storedLost - healed));
}

/** Current HP (whole points) from the maximum and the loss. */
export const hpNow = (maxHp: number, lost: number) =>
  Math.max(0, Math.min(maxHp, Math.floor(maxHp - lost)));

/** When the character is at full health again (null if already). */
export function healthFullAt(lost: number, maxHp: number, now: Date = new Date()): Date | null {
  if (lost <= 0 || maxHp <= 0) return null;
  const perHour = (HEALTH_RULES.regenPctPerHour / 100) * maxHp;
  return new Date(now.getTime() + (lost / perHour) * HOUR_MS);
}

/** HP a potion or food restores (`heal` = percent of the maximum). */
export const healAmount = (healPct: number, maxHp: number) => Math.round((healPct / 100) * maxHp);
