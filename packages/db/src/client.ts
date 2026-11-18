import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as schema from './schema.js';

export type Database = PostgresJsDatabase<typeof schema>;
/** A database handle usable inside or outside a transaction. */
export type DbOrTx = Database | Parameters<Parameters<Database['transaction']>[0]>[0];

export interface DbHandle {
  db: Database;
  sql: postgres.Sql;
  close: () => Promise<void>;
}

export function createDb(url: string, opts: { max?: number; appName?: string } = {}): DbHandle {
  const sql = postgres(url, {
    max: opts.max ?? 10,
    connection: { application_name: opts.appName ?? 'living-realms' },
    onnotice: () => {},
  });
  const db = drizzle(sql, { schema, casing: 'snake_case' });
  return { db, sql, close: () => sql.end({ timeout: 5 }) };
}

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * Where the migrations live, whatever way the app was built or started:
 * - `MIGRATIONS_DIR` (set by the Docker image: /app/migrations);
 * - next to the code: `packages/db/src/../migrations` (tsx, tests) or
 *   `/app/server.js` → `/app/migrations` (Docker);
 * - a bundle inside the repository, `apps/<app>/dist/main.js` → `packages/db/migrations`
 *   (when the host builds the repo itself and runs `pnpm start`, e.g. Railway without
 *   the Dockerfile — request #26);
 * - the working directory (repository root).
 * The first folder that has `meta/_journal.json` wins.
 */
export function findMigrationsDir(): string {
  const candidates = [
    process.env.MIGRATIONS_DIR,
    resolve(HERE, '../migrations'),
    resolve(HERE, '../../../packages/db/migrations'),
    resolve(process.cwd(), 'packages/db/migrations'),
    resolve(process.cwd(), 'migrations'),
  ].filter((c): c is string => !!c);
  const found = candidates.find((c) => existsSync(join(c, 'meta', '_journal.json')));
  if (found) return found;
  throw new Error(`Database migrations not found. Looked in: ${candidates.join(', ')}`);
}

export async function runMigrations(
  url: string,
  migrationsFolder = findMigrationsDir(),
): Promise<void> {
  const handle = createDb(url, { max: 1, appName: 'living-realms-migrate' });
  try {
    await migrate(handle.db, { migrationsFolder });
  } finally {
    await handle.close();
  }
}

export type Sql = postgres.Sql;
export type ReservedSql = postgres.ReservedSql;

/**
 * Applies pending migrations while holding a PostgreSQL advisory lock, so that
 * several processes starting at once (server replicas, worker) never run them
 * concurrently: the first one migrates, the others wait and then find nothing
 * to do. Safe to call on every boot (already-applied migrations are skipped).
 */
export async function migrateWithLock(
  url: string,
  migrationsFolder = findMigrationsDir(),
): Promise<void> {
  // max: 1 → every query below runs on the same session, which owns the lock.
  const handle = createDb(url, { max: 1, appName: 'living-realms-migrate' });
  try {
    await handle.sql`select pg_advisory_lock(hashtext('realms:migrations'))`;
    try {
      await migrate(handle.db, { migrationsFolder });
    } finally {
      await handle.sql`select pg_advisory_unlock(hashtext('realms:migrations'))`;
    }
  } finally {
    await handle.close();
  }
}
