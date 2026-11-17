import type { ServerMessage } from '@realms/shared';
import type { Redis } from 'ioredis';

/*
 * Internal message bus over Redis pub/sub. Lets any process (API instances,
 * world worker) push messages to players connected to *any* API instance.
 * Delivery is fire-and-forget: anything that must not be lost is persisted in
 * PostgreSQL first and the bus only notifies.
 */

export const REDIS_PREFIX = 'realms:';

export const channels = {
  /** Broadcast to every player in a world. */
  world: (worldId: string) => `${REDIS_PREFIX}bus:world:${worldId}`,
  /** Control messages addressed to API instances. */
  control: `${REDIS_PREFIX}bus:control`,
} as const;

export interface WorldBroadcast {
  message: ServerMessage;
  /** Skip delivery to this character's connection (e.g. the originator). */
  exceptCharacterId?: string;
}

export type ControlMessage =
  /** An account entered the world on `keepConnectionId`; drop its other in-world connections. */
  | { kind: 'account.replace'; accountId: string; keepConnectionId: string }
  /** A session was revoked (logout); close every connection opened with it. */
  | { kind: 'session.revoked'; sessionId: string };

export async function publishToWorld(
  redis: Redis,
  worldId: string,
  b: WorldBroadcast,
): Promise<void> {
  await redis.publish(channels.world(worldId), JSON.stringify(b));
}

export async function publishControl(redis: Redis, msg: ControlMessage): Promise<void> {
  await redis.publish(channels.control, JSON.stringify(msg));
}
