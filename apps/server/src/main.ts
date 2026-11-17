import { createDb, loadEnv } from '@realms/db';
import { createRedis, PresenceStore } from '@realms/server-kit';
import { randomUUID } from 'node:crypto';
import { buildApp } from './app.js';
import { loadConfig } from './config.js';

loadEnv();
const config = loadConfig();
const instanceId = `server-${randomUUID().slice(0, 8)}`;

const dbHandle = createDb(config.DATABASE_URL, { appName: instanceId });
const redis = createRedis(config.REDIS_URL, instanceId);
const redisSub = createRedis(config.REDIS_URL, `${instanceId}-sub`);

const { app } = await buildApp({
  config,
  db: dbHandle.db,
  redis,
  redisSub,
  presence: new PresenceStore(redis),
  instanceId,
});

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  app.log.info({ signal }, 'shutting down');
  const force = setTimeout(() => process.exit(1), 10_000).unref();
  try {
    await app.close(); // closes HTTP, WebSockets (gateway.stop) and removes presence
    await Promise.allSettled([dbHandle.close(), redis.quit(), redisSub.quit()]);
  } finally {
    clearTimeout(force);
    process.exit(0);
  }
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

await app.listen({ host: config.HOST, port: config.PORT });
app.log.info({ instanceId }, 'The Living Realms server ready');
