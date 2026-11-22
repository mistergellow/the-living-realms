import { characters, type Character, type DbOrTx } from '@realms/db';
import { currentAp } from '@realms/game-core';
import { ErrorCode } from '@realms/shared';
import { eq } from 'drizzle-orm';
import { AppError } from '../../lib/errors.js';

/**
 * Spend Action Points (request #50): the character row must be locked by the
 * caller. Throws when there are not enough.
 */
export async function spendAp(tx: DbOrTx, c: Character, cost: number, what: string) {
  const now = new Date();
  const ap = currentAp(c.ap, c.apUpdatedAt, now);
  if (ap < cost)
    throw new AppError(
      409,
      ErrorCode.NOT_ENOUGH_AP,
      `${c.name} needs ${cost} AP to ${what} (has ${Math.floor(ap)}).`,
    );
  await tx
    .update(characters)
    .set({ ap: ap - cost, apUpdatedAt: now })
    .where(eq(characters.id, c.id));
}
