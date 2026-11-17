import { loadEnv, runMigrations } from '@realms/db';

/** Runs once before all integration tests: bring the test database schema up to date. */
export default async function setup() {
  loadEnv();
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('TEST_DATABASE_URL is required for integration tests');
  await runMigrations(url);
}
