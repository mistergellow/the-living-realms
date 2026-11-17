import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { dirname, resolve } from 'node:path';
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

export const MIGRATIONS_DIR =
  process.env.MIGRATIONS_DIR ?? resolve(dirname(fileURLToPath(import.meta.url)), '../migrations');

export async function runMigrations(url: string, migrationsFolder = MIGRATIONS_DIR): Promise<void> {
  const handle = createDb(url, { max: 1, appName: 'living-realms-migrate' });
  try {
    await migrate(handle.db, { migrationsFolder });
  } finally {
    await handle.close();
  }
}

export type Sql = postgres.Sql;
export type ReservedSql = postgres.ReservedSql;
