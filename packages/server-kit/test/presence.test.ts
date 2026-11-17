import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createRedis } from '../src/redis.js';
import { PRESENCE_STALE_MS, PresenceStore, type PresenceEntry } from '../src/presence.js';

const redis = createRedis(process.env.TEST_REDIS_URL ?? 'redis://localhost:6379/15', 'test');
const store = new PresenceStore(redis);
const WORLD = 'test-world';

const entry = (characterId: string, connectionId: string, seenAt = Date.now()): PresenceEntry => ({
  player: {
    characterId,
    name: 'Tester',
    appearance: { version: 1, color: '#c0392b', emblem: 'circle' },
    position: { q: 0, r: 0 },
  },
  accountId: 'acc',
  connectionId,
  instanceId: 'i1',
  seenAt,
});

beforeEach(() => store.clear(WORLD));
afterAll(async () => {
  await store.clear(WORLD);
  redis.disconnect();
});

describe('PresenceStore (Redis integration)', () => {
  it('only lets the owning connection remove an entry', async () => {
    await store.set(WORLD, entry('c1', 'new-conn'));
    expect(await store.removeIfOwner(WORLD, 'c1', 'old-conn')).toBe(false);
    expect(await store.list(WORLD)).toHaveLength(1);
    expect(await store.removeIfOwner(WORLD, 'c1', 'new-conn')).toBe(true);
    expect(await store.list(WORLD)).toHaveLength(0);
  });

  it('hides and sweeps stale entries', async () => {
    const now = Date.now();
    await store.set(WORLD, entry('fresh', 'a', now));
    await store.set(WORLD, entry('stale', 'b', now - PRESENCE_STALE_MS - 1));
    expect((await store.list(WORLD, now)).map((e) => e.player.characterId)).toEqual(['fresh']);
    const removed = await store.sweepStale(WORLD, now);
    expect(removed.map((e) => e.player.characterId)).toEqual(['stale']);
  });
});
