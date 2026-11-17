import type { Database } from '@realms/db';
import type { Logger, PresenceStore, Redis } from '@realms/server-kit';
import { advanceTick } from './jobs/advance-tick.js';
import { purgeExpiredSessions, sweepPresence } from './jobs/maintenance.js';

export interface WorldLoopDeps {
  db: Database;
  redis: Redis;
  presence: PresenceStore;
  log: Logger;
  worldId: string;
  tickMs: number;
}

/** Run maintenance every N ticks (≈1 minute at the default 5s tick). */
const MAINTENANCE_EVERY = 12;

/**
 * Fixed-interval world simulation loop. Ticks never overlap: the next one is
 * scheduled after the current one finishes. A failing tick is logged and
 * retried on the next interval; it never crashes the process.
 */
export class WorldLoop {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private current: Promise<void> = Promise.resolve();

  constructor(private readonly deps: WorldLoopDeps) {}

  start(): void {
    this.running = true;
    this.schedule(0);
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    await this.current;
  }

  /** One full tick. Public for tests. */
  async tickOnce(): Promise<number> {
    const { db, redis, presence, log, worldId } = this.deps;
    const tick = await advanceTick(db, redis, worldId);
    if (tick % MAINTENANCE_EVERY === 0) {
      const [sessionsPurged, presenceSwept] = await Promise.all([
        purgeExpiredSessions(db),
        sweepPresence(presence, redis, worldId),
      ]);
      log.info({ tick, sessionsPurged, presenceSwept }, 'maintenance');
    }
    log.debug({ tick }, 'tick');
    return tick;
  }

  private schedule(delay: number): void {
    if (!this.running) return;
    this.timer = setTimeout(() => {
      const started = Date.now();
      this.current = this.tickOnce()
        .then(() => undefined)
        .catch((err) => this.deps.log.error({ err }, 'tick failed'))
        .finally(() => this.schedule(Math.max(0, this.deps.tickMs - (Date.now() - started))));
    }, delay);
  }
}
