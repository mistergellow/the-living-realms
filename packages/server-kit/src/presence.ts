import type { PresencePlayer } from '@realms/shared';
import type { Redis } from 'ioredis';
import { REDIS_PREFIX } from './bus.js';

/*
 * Who is currently in the world. Ephemeral by design (Redis): the persistent
 * truth about characters lives in PostgreSQL. Each entry records which
 * connection owns it so stale or replaced connections can't remove a newer one.
 */

export interface PresenceEntry {
  player: PresencePlayer;
  accountId: string;
  connectionId: string;
  instanceId: string;
  seenAt: number;
}

/** Entries not refreshed within this window are considered dead (instance crash). */
export const PRESENCE_STALE_MS = 60_000;
export const PRESENCE_REFRESH_MS = 15_000;

const key = (worldId: string) => `${REDIS_PREFIX}presence:${worldId}`;

// Delete field only if it is still owned by the given connection.
const REMOVE_IF_OWNER = `
local v = redis.call('HGET', KEYS[1], ARGV[1])
if not v then return 0 end
local ok, e = pcall(cjson.decode, v)
if ok and e.connectionId == ARGV[2] then redis.call('HDEL', KEYS[1], ARGV[1]) return 1 end
return 0`;

export class PresenceStore {
  constructor(private readonly redis: Redis) {}

  async set(worldId: string, entry: PresenceEntry): Promise<void> {
    await this.redis.hset(key(worldId), entry.player.characterId, JSON.stringify(entry));
  }

  /** Returns true if the entry was removed (i.e. this connection still owned it). */
  async removeIfOwner(
    worldId: string,
    characterId: string,
    connectionId: string,
  ): Promise<boolean> {
    const n = await this.redis.eval(REMOVE_IF_OWNER, 1, key(worldId), characterId, connectionId);
    return n === 1;
  }

  async list(worldId: string, now = Date.now()): Promise<PresenceEntry[]> {
    const all = await this.redis.hgetall(key(worldId));
    return Object.values(all)
      .map((v) => JSON.parse(v) as PresenceEntry)
      .filter((e) => now - e.seenAt < PRESENCE_STALE_MS);
  }

  /** Refresh `seenAt` for entries owned by the given connections. */
  async touch(worldId: string, entries: PresenceEntry[], now = Date.now()): Promise<void> {
    if (entries.length === 0) return;
    const args = entries.flatMap((e) => [
      e.player.characterId,
      JSON.stringify({ ...e, seenAt: now }),
    ]);
    await this.redis.hset(key(worldId), ...args);
  }

  /** Remove entries that stopped being refreshed. Returns removed entries. */
  async sweepStale(worldId: string, now = Date.now()): Promise<PresenceEntry[]> {
    const all = await this.redis.hgetall(key(worldId));
    const stale = Object.values(all)
      .map((v) => JSON.parse(v) as PresenceEntry)
      .filter((e) => now - e.seenAt >= PRESENCE_STALE_MS);
    const removed: PresenceEntry[] = [];
    for (const e of stale) {
      if (await this.removeIfOwner(worldId, e.player.characterId, e.connectionId)) removed.push(e);
    }
    return removed;
  }

  async clear(worldId: string): Promise<void> {
    await this.redis.del(key(worldId));
  }
}
