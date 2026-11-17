import type { Database, World } from '@realms/db';
import type { PresenceStore, Redis } from '@realms/server-kit';
import type { Config } from './config.js';

/** Dependencies shared by all modules. Created in main.ts (or tests) and injected. */
export interface AppDeps {
  config: Config;
  db: Database;
  /** General-purpose Redis connection (commands + publish). */
  redis: Redis;
  /** Dedicated Redis connection in subscriber mode. */
  redisSub: Redis;
  presence: PresenceStore;
  /** Unique id of this server process (for presence ownership). */
  instanceId: string;
}

export interface AppContext extends AppDeps {
  world: World;
}
