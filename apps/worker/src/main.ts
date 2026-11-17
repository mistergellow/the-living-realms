import { createDb, ensureWorld, loadEnv, migrateWithLock } from '@realms/db';
import { createLogger, createRedis, PresenceStore } from '@realms/server-kit';
import { loadWorkerConfig } from './config.js';
import { LeaderLock } from './leader.js';
import { WorldLoop } from './world-loop.js';

loadEnv();
const config = loadWorkerConfig();
const log = createLogger({
  service: 'worker',
  level: config.LOG_LEVEL,
  pretty: config.NODE_ENV === 'development',
});

if (config.MIGRATE_ON_START) {
  await migrateWithLock(config.DATABASE_URL);
  log.info('database migrations up to date');
}

const dbHandle = createDb(config.DATABASE_URL, { max: 3, appName: 'living-realms-worker' });
const redis = createRedis(config.REDIS_URL, 'worker');
const world = await ensureWorld(dbHandle.db, config.WORLD_SLUG);
const lock = new LeaderLock(dbHandle.sql, `world-loop:${world.id}`);
const loop = new WorldLoop({
  db: dbHandle.db,
  redis,
  presence: new PresenceStore(redis),
  log,
  worldId: world.id,
  tickMs: config.WORLD_TICK_MS,
});

let standbyTimer: NodeJS.Timeout | null = null;
async function becomeLeader(): Promise<void> {
  if (await lock.tryAcquire()) {
    log.info(
      { world: world.slug, tickMs: config.WORLD_TICK_MS },
      'leader acquired; world simulation running',
    );
    loop.start();
  } else {
    log.info('another worker is leading; standing by');
    standbyTimer = setTimeout(() => void becomeLeader(), 5_000);
  }
}

async function shutdown(signal: string) {
  log.info({ signal }, 'worker shutting down');
  if (standbyTimer) clearTimeout(standbyTimer);
  await loop.stop();
  await lock.release().catch(() => {});
  await Promise.allSettled([dbHandle.close(), redis.quit()]);
  process.exit(0);
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

await becomeLeader();
