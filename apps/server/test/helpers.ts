import { createDb, loadEnv, type DbHandle } from '@realms/db';
import { createRedis, PresenceStore, type Redis } from '@realms/server-kit';
import type { ServerMessage } from '@realms/shared';
import { sql } from 'drizzle-orm';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import WebSocket from 'ws';
import { buildApp, type BuiltApp } from '../src/app.js';
import { loadConfig, type Config } from '../src/config.js';

loadEnv();

export const TEST_ORIGIN = 'http://localhost:5173';

export interface TestApp extends BuiltApp {
  dbHandle: DbHandle;
  redis: Redis;
  close: () => Promise<void>;
}

export async function createTestApp(
  overrides: Partial<Record<keyof Config, string>> = {},
): Promise<TestApp> {
  const config = loadConfig({
    ...process.env,
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    DATABASE_URL: process.env.TEST_DATABASE_URL,
    REDIS_URL: process.env.TEST_REDIS_URL ?? 'redis://localhost:6379/15',
    WEB_ORIGIN: TEST_ORIGIN,
    AUTH_RATE_LIMIT: '1000',
    MAX_CHARACTERS_PER_ACCOUNT: '3',
    ...overrides,
  });
  const dbHandle = createDb(config.DATABASE_URL, { max: 5 });
  const redis = createRedis(config.REDIS_URL, 'test');
  const redisSub = createRedis(config.REDIS_URL, 'test-sub');
  const built = await buildApp({
    config,
    db: dbHandle.db,
    redis,
    redisSub,
    presence: new PresenceStore(redis),
    instanceId: 'test-instance',
  });
  return {
    ...built,
    dbHandle,
    redis,
    close: async () => {
      await built.app.close();
      await dbHandle.close();
      redis.disconnect();
      redisSub.disconnect();
    },
  };
}

export async function resetState(t: TestApp): Promise<void> {
  await t.dbHandle.db.execute(
    sql`TRUNCATE world_events, rift_lobby_invites, rift_lobby_members, rift_lobbies, friendships, rift_run_participants, rift_runs, items, character_skills, characters, sessions, accounts CASCADE`,
  );
  await t.redis.flushdb();
}

/** Extracts the session cookie ("name=value") from a response. */
export function sessionCookie(res: LightMyRequestResponse): string {
  const c = res.cookies.find((x) => x.name === 'lr_session');
  if (!c) throw new Error('no session cookie in response');
  return `${c.name}=${c.value}`;
}

let counter = 0;
export async function registerUser(app: FastifyInstance, email = `user${++counter}@example.com`) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password: 'correct horse battery' },
  });
  if (res.statusCode !== 201) throw new Error(`register failed: ${res.body}`);
  return { email, cookie: sessionCookie(res), account: res.json().account as { id: string } };
}

const appearance = { version: 1, color: '#2e86c1', emblem: 'star' } as const;
export const VALID_ATTRIBUTES = {
  might: 10,
  agility: 8,
  precision: 5,
  vitality: 9,
  arcana: 5,
  spirit: 5,
} as const; // 12 points
export async function createCharacter(
  app: FastifyInstance,
  cookie: string,
  name: string,
  extra: {
    attributes?: Record<string, number>;
    startingWeapon?: string;
    startingOffhand?: string;
  } = {},
) {
  return app.inject({
    method: 'POST',
    url: '/api/characters',
    headers: { cookie },
    payload: {
      name,
      appearance,
      attributes: extra.attributes ?? VALID_ATTRIBUTES,
      startingWeapon: extra.startingWeapon ?? 'training_sword',
      ...(extra.startingOffhand ? { startingOffhand: extra.startingOffhand } : {}),
    },
  });
}

// ---- WebSocket test client ----
export class TestSocket {
  readonly messages: ServerMessage[] = [];
  private waiters: Array<{
    pred: (m: ServerMessage) => boolean;
    resolve: (m: ServerMessage) => void;
  }> = [];
  closeCode: number | null = null;
  readonly closed: Promise<number>;

  constructor(readonly ws: WebSocket) {
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString()) as ServerMessage;
      this.messages.push(msg);
      this.waiters = this.waiters.filter((w) => (w.pred(msg) ? (w.resolve(msg), false) : true));
    });
    this.closed = new Promise((resolve) =>
      ws.on('close', (code) => resolve((this.closeCode = code))),
    );
  }

  send(msg: unknown) {
    this.ws.send(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }

  /** Resolves with the first (past or future) message of the given type. */
  next<T extends ServerMessage['type']>(
    type: T,
    timeoutMs = 3000,
  ): Promise<Extract<ServerMessage, { type: T }>> {
    const seen = this.messages.findIndex((m) => m.type === type);
    if (seen >= 0)
      return Promise.resolve(
        this.messages.splice(seen, 1)[0] as Extract<ServerMessage, { type: T }>,
      );
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`timeout waiting for ${type}`)), timeoutMs);
      this.waiters.push({
        pred: (m) => m.type === type,
        resolve: (m) => {
          clearTimeout(timer);
          this.messages.splice(this.messages.indexOf(m), 1);
          resolve(m as Extract<ServerMessage, { type: T }>);
        },
      });
    });
  }

  close() {
    this.ws.close();
  }
}

export async function connectWs(
  baseUrl: string,
  cookie?: string,
  origin = TEST_ORIGIN,
): Promise<TestSocket> {
  const ws = new WebSocket(`${baseUrl.replace('http', 'ws')}/ws`, {
    headers: { ...(cookie ? { cookie } : {}), origin },
  });
  const sock = new TestSocket(ws);
  await new Promise<void>((resolve, reject) => {
    ws.once('open', () => resolve());
    ws.once('error', reject);
    ws.once('unexpected-response', (_req, res) => reject(new Error(`HTTP ${res.statusCode}`)));
  });
  return sock;
}
