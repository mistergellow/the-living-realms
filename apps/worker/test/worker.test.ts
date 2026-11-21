import { createDb, ensureWorld, loadEnv, runMigrations, accounts, sessions } from '@realms/db';
import { channels, createLogger, createRedis, PresenceStore } from '@realms/server-kit';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { purgeExpiredSessions } from '../src/jobs/maintenance.js';
import { LeaderLock } from '../src/leader.js';
import { WorldLoop } from '../src/world-loop.js';

loadEnv();
const url = process.env.TEST_DATABASE_URL!;
const redisUrl = process.env.TEST_REDIS_URL ?? 'redis://localhost:6379/15';

let h: ReturnType<typeof createDb>;
const redis = createRedis(redisUrl, 'worker-test');
const sub = createRedis(redisUrl, 'worker-test-sub');

beforeAll(async () => {
  await runMigrations(url);
  h = createDb(url, { max: 4 });
});
afterAll(async () => {
  await h.close();
  redis.disconnect();
  sub.disconnect();
});

describe('world worker', () => {
  it('advances the world tick and broadcasts it on the bus', async () => {
    const world = await ensureWorld(h.db, 'main');
    const received = new Promise<string>((resolve) => sub.on('message', (_c, m) => resolve(m)));
    await sub.subscribe(channels.world(world.id));

    const loop = new WorldLoop({
      db: h.db,
      redis,
      presence: new PresenceStore(redis),
      log: createLogger({ service: 'test', level: 'silent', pretty: false }),
      worldId: world.id,
      tickMs: 1000,
    });
    const tick = await loop.tickOnce();
    expect(tick).toBe(world.tick + 1);
    expect(JSON.parse(await received).message).toMatchObject({
      type: 'world.tick',
      data: { tick },
    });
  });

  it('elects a single leader', async () => {
    const a = new LeaderLock(h.sql, 'test-lock');
    const b = new LeaderLock(h.sql, 'test-lock');
    expect(await a.tryAcquire()).toBe(true);
    expect(await b.tryAcquire()).toBe(false);
    await a.release();
    expect(await b.tryAcquire()).toBe(true);
    await b.release();
  });

  it('purges expired sessions only', async () => {
    await h.db.execute(
      sql`TRUNCATE world_events, custom_content, rift_lobby_invites, rift_lobby_members, rift_lobbies, friendships, rift_run_participants, rift_runs, items, character_skills, characters, sessions, accounts CASCADE`,
    );
    const [acc] = await h.db
      .insert(accounts)
      .values({ email: 'w@example.com', passwordHash: 'x' })
      .returning();
    await h.db.insert(sessions).values([
      { accountId: acc!.id, tokenHash: 'expired', expiresAt: new Date(Date.now() - 1000) },
      { accountId: acc!.id, tokenHash: 'valid', expiresAt: new Date(Date.now() + 60_000) },
    ]);
    expect(await purgeExpiredSessions(h.db)).toBe(1);
    const left = await h.db.select().from(sessions);
    expect(left.map((s) => s.tokenHash)).toEqual(['valid']);
  });
});
