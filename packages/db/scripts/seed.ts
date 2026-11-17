import { loadEnv } from '../src/env.js';
import { createDb } from '../src/client.js';
import { ensureWorld } from '../src/seed.js';

loadEnv();
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
const handle = createDb(url, { max: 1 });
const world = await ensureWorld(handle.db, process.env.WORLD_SLUG ?? 'main');
console.log(`World ready: ${world.slug} (${world.id})`);
await handle.close();
