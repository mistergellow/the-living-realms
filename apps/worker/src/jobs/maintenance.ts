import { sessions, type Database } from '@realms/db';
import { publishToWorld, type PresenceStore, type Redis } from '@realms/server-kit';
import { lt } from 'drizzle-orm';

/** Deletes expired sessions. Returns how many were removed. */
export async function purgeExpiredSessions(db: Database, now = new Date()): Promise<number> {
  const rows = await db
    .delete(sessions)
    .where(lt(sessions.expiresAt, now))
    .returning({ id: sessions.id });
  return rows.length;
}

/** Removes presence left behind by crashed server instances and tells players. */
export async function sweepPresence(presence: PresenceStore, redis: Redis, worldId: string) {
  const removed = await presence.sweepStale(worldId);
  for (const e of removed) {
    await publishToWorld(redis, worldId, {
      message: { type: 'player.left', data: { characterId: e.player.characterId } },
    });
  }
  return removed.length;
}
