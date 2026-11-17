import { worlds, type Database } from '@realms/db';
import { publishToWorld, type Redis } from '@realms/server-kit';
import { eq, sql } from 'drizzle-orm';

/**
 * Advances the world clock by one tick and notifies connected players.
 * Future systems (NPC behaviour, events, economy) hook in here, processed
 * per tick and per region.
 */
export async function advanceTick(db: Database, redis: Redis, worldId: string) {
  const [row] = await db
    .update(worlds)
    .set({ tick: sql`${worlds.tick} + 1`, lastTickAt: new Date() })
    .where(eq(worlds.id, worldId))
    .returning({ tick: worlds.tick, lastTickAt: worlds.lastTickAt });
  if (!row) throw new Error(`world ${worldId} not found`);
  await publishToWorld(redis, worldId, {
    message: { type: 'world.tick', data: { tick: row.tick, at: row.lastTickAt!.toISOString() } },
  });
  return row.tick;
}
