import { defineConfig } from 'drizzle-kit';
import { loadEnv } from './src/env.js';

loadEnv();

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './migrations',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
  strict: true,
});
