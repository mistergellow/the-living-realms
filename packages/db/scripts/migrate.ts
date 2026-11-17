import { loadEnv } from '../src/env.js';
import { runMigrations } from '../src/client.js';

loadEnv();
const url = process.argv[2] ?? process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
await runMigrations(url);
console.log('Migrations applied.');
