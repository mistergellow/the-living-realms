import { characters, type Character, type DbOrTx } from '@realms/db';
import { healthFullAt, hpLostNow, hpNow } from '@realms/game-core';
import type { HealthDto } from '@realms/shared';
import { eq } from 'drizzle-orm';

/*
 * Request #85: health carries over between Rifts (game-core `health.ts`).
 * The character row keeps the HP lost and when it was written.
 */

/** Health now for a character whose maximum HP is `maxHp`. */
export function healthOf(
  c: Pick<Character, 'hpLost' | 'hpLostAt'>,
  maxHp: number,
  now: Date = new Date(),
): HealthDto & { lost: number } {
  const lost = hpLostNow(c.hpLost, c.hpLostAt, maxHp, now);
  return {
    hp: hpNow(maxHp, lost),
    max: maxHp,
    fullAt: healthFullAt(lost, maxHp, now)?.toISOString() ?? null,
    lost,
  };
}

/** Store the HP lost now (clamped to [0, maxHp]). */
export async function saveHpLost(
  db: DbOrTx,
  characterId: string,
  lost: number,
  maxHp: number,
): Promise<void> {
  await db
    .update(characters)
    .set({ hpLost: Math.max(0, Math.min(maxHp, lost)), hpLostAt: new Date() })
    .where(eq(characters.id, characterId));
}
