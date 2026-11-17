import type { ReservedSql, Sql } from '@realms/db';

/**
 * Leader election with a PostgreSQL session-level advisory lock.
 * Only one worker per world runs the simulation; extra workers wait as hot
 * standbys and take over automatically if the leader's connection dies.
 */
export class LeaderLock {
  private reserved: ReservedSql | null = null;

  constructor(
    private readonly sql: Sql,
    private readonly key: string,
  ) {}

  async tryAcquire(): Promise<boolean> {
    this.reserved ??= await this.sql.reserve();
    const [row] = await this.reserved<{ ok: boolean }[]>`
      select pg_try_advisory_lock(hashtext(${this.key})) as ok`;
    return row?.ok === true;
  }

  async release(): Promise<void> {
    if (!this.reserved) return;
    try {
      await this.reserved`select pg_advisory_unlock(hashtext(${this.key}))`;
    } finally {
      this.reserved.release();
      this.reserved = null;
    }
  }
}
