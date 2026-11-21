import {
  channels,
  chatKey,
  PRESENCE_REFRESH_MS,
  publishControl,
  publishToWorld,
  type ControlMessage,
  type WorldBroadcast,
} from '@realms/server-kit';
import {
  CHAT_HISTORY,
  clientMessageSchema,
  ErrorCode,
  PROTOCOL_VERSION,
  WsCloseCode,
  type CharacterAppearance,
  type ChatMessage,
  type ClientMessage,
} from '@realms/shared';
import type { FastifyBaseLogger as Logger } from 'fastify';
import { randomUUID } from 'node:crypto';
import type { WebSocket } from 'ws';
import type { AppContext } from '../context.js';
import type { AuthContext } from '../modules/auth/session.service.js';
import { charactersRepository } from '../modules/characters/characters.repository.js';
import {
  toCharacterDto,
  type CharactersService,
} from '../modules/characters/characters.service.js';
import { loadWorld, toWorldDto } from '../modules/world/world.routes.js';
import { AppError } from '../lib/errors.js';
import { Connection } from './connection.js';

const MAX_VIOLATIONS = 50;
const HEARTBEAT_MS = 30_000;
/** Hex chat history lives this long after the last message (seconds). */
const CHAT_TTL_S = 24 * 60 * 60;
/** Control characters are replaced by spaces in chat text. */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

/**
 * Real-time gateway. Owns this instance's WebSocket connections, validates
 * client intents, and bridges the Redis bus to local sockets.
 *
 * Invariant: an account has at most one connection *in the world* at a time
 * (one active character per player). Enforced cluster-wide via the bus.
 */
export class RealtimeGateway {
  private readonly connections = new Map<string, Connection>();
  private timers: NodeJS.Timeout[] = [];

  constructor(
    private readonly ctx: AppContext,
    private readonly characters: CharactersService,
    private readonly log: Logger,
  ) {}

  get size(): number {
    return this.connections.size;
  }

  async start(): Promise<void> {
    const worldChannel = channels.world(this.ctx.world.id);
    this.ctx.redisSub.on('message', (channel, raw) => {
      try {
        if (channel === worldChannel) this.onWorldBroadcast(JSON.parse(raw) as WorldBroadcast);
        else if (channel === channels.control) this.onControl(JSON.parse(raw) as ControlMessage);
      } catch (err) {
        this.log.error({ err, channel }, 'bad bus message');
      }
    });
    await this.ctx.redisSub.subscribe(worldChannel, channels.control);

    this.timers.push(
      setInterval(() => this.heartbeat(), HEARTBEAT_MS),
      setInterval(() => void this.refreshPresence(), PRESENCE_REFRESH_MS),
    );
  }

  async stop(): Promise<void> {
    this.timers.forEach(clearInterval);
    this.timers = [];
    await Promise.allSettled(
      [...this.connections.values()].map(async (c) => {
        await this.leaveWorld(c);
        c.close(WsCloseCode.SERVER_SHUTDOWN, 'Server shutting down');
      }),
    );
    this.connections.clear();
  }

  /** Called for every upgraded socket. `auth` was resolved from the session cookie. */
  handle(socket: WebSocket, auth: AuthContext | null): void {
    if (!auth) {
      socket.close(WsCloseCode.UNAUTHENTICATED, 'Not authenticated');
      return;
    }
    const conn = new Connection(randomUUID(), socket, auth.account.id, auth.sessionId);
    this.connections.set(conn.id, conn);
    const log = this.log.child({ connectionId: conn.id, accountId: conn.accountId });
    log.debug('ws connected');

    socket.on('pong', () => (conn.isAlive = true));
    socket.on(
      'message',
      (raw, isBinary) => void this.onMessage(conn, raw.toString(), isBinary, log),
    );
    socket.on('close', () => {
      this.connections.delete(conn.id);
      void this.leaveWorld(conn).catch((err) => log.error({ err }, 'leave on close failed'));
      log.debug('ws closed');
    });
    socket.on('error', (err) => log.warn({ err }, 'ws error'));

    conn.send({
      type: 'welcome',
      data: { protocolVersion: PROTOCOL_VERSION, connectionId: conn.id },
    });
  }

  // ---------------------------------------------------------------------------
  // Inbound
  // ---------------------------------------------------------------------------
  private async onMessage(
    conn: Connection,
    raw: string,
    isBinary: boolean,
    log: Logger,
  ): Promise<void> {
    if (!conn.bucket.take()) {
      if (++conn.violations > MAX_VIOLATIONS) conn.close(WsCloseCode.PROTOCOL_ERROR, 'Rate limit');
      return conn.send({
        type: 'error',
        data: { code: ErrorCode.RATE_LIMITED, message: 'Too many messages.' },
      });
    }
    let msg: ClientMessage;
    try {
      if (isBinary) throw new Error('binary');
      msg = clientMessageSchema.parse(JSON.parse(raw));
    } catch {
      if (++conn.violations > MAX_VIOLATIONS)
        conn.close(WsCloseCode.PROTOCOL_ERROR, 'Protocol error');
      return conn.send({
        type: 'error',
        data: { code: ErrorCode.VALIDATION_FAILED, message: 'Malformed message.' },
      });
    }

    try {
      switch (msg.type) {
        case 'ping':
          return conn.send({ type: 'pong', data: { t: msg.data.t } });
        case 'world.enter':
          return await this.enterWorld(conn, msg.data.characterId);
        case 'world.leave':
          await this.leaveWorld(conn);
          return conn.send({ type: 'world.left' });
        case 'chat.send':
          return await this.chat(conn, msg.data.text);
      }
    } catch (err) {
      if (err instanceof AppError)
        return conn.send({ type: 'error', data: { code: err.code, message: err.message } });
      log.error({ err, type: msg.type }, 'ws handler failed');
      conn.send({
        type: 'error',
        data: { code: ErrorCode.INTERNAL, message: 'Something went wrong.' },
      });
    }
  }

  private async enterWorld(conn: Connection, characterId: string): Promise<void> {
    const { world, presence, redis, instanceId } = this.ctx;
    const character = await this.characters.getOwned(conn.accountId, characterId);

    if (conn.presence) await this.leaveWorld(conn);
    // Enforce "one active character per account" across all instances.
    await publishControl(redis, {
      kind: 'account.replace',
      accountId: conn.accountId,
      keepConnectionId: conn.id,
    });

    const player = {
      characterId: character.id,
      name: character.name,
      appearance: character.appearance as CharacterAppearance,
      position: { q: character.hexQ, r: character.hexR },
    };
    conn.presence = {
      player,
      accountId: conn.accountId,
      connectionId: conn.id,
      instanceId,
      seenAt: Date.now(),
    };
    await presence.set(world.id, conn.presence);
    await charactersRepository.markPlayed(this.ctx.db, character.id);

    const [players, current, chat] = await Promise.all([
      presence.list(world.id),
      loadWorld(this.ctx),
      this.chatHistory(player.position.q, player.position.r),
    ]);
    conn.send({
      type: 'world.entered',
      data: {
        world: toWorldDto(current),
        character: toCharacterDto({ ...character, lastPlayedAt: new Date() }),
        players: players.map((p) => p.player),
        chat,
      },
    });
    await publishToWorld(redis, world.id, {
      message: { type: 'player.joined', data: { player } },
      exceptCharacterId: character.id,
    });
  }

  /** Hex chat: everyone on the sender's hex (on any instance) receives it. */
  private async chat(conn: Connection, raw: string): Promise<void> {
    if (!conn.presence) {
      throw new AppError(400, ErrorCode.VALIDATION_FAILED, 'Enter the world before chatting.');
    }
    if (!conn.chatBucket.take()) {
      throw new AppError(429, ErrorCode.RATE_LIMITED, 'You are talking too fast.');
    }
    const text = raw.replace(CONTROL_CHARS, ' ').trim();
    if (!text) return;
    const { player } = conn.presence;
    const message: ChatMessage = {
      id: randomUUID(),
      characterId: player.characterId,
      name: player.name,
      text,
      at: new Date().toISOString(),
      hex: player.position,
    };
    const key = chatKey(this.ctx.world.id, player.position.q, player.position.r);
    await this.ctx.redis
      .multi()
      .lpush(key, JSON.stringify(message))
      .ltrim(key, 0, CHAT_HISTORY - 1)
      .expire(key, CHAT_TTL_S)
      .exec();
    await publishToWorld(this.ctx.redis, this.ctx.world.id, {
      message: { type: 'chat.message', data: { message } },
      onlyHex: player.position,
    });
  }

  /** Recent chat of a hex, oldest first. */
  private async chatHistory(q: number, r: number): Promise<ChatMessage[]> {
    const raw = await this.ctx.redis.lrange(chatKey(this.ctx.world.id, q, r), 0, CHAT_HISTORY - 1);
    return raw.map((m) => JSON.parse(m) as ChatMessage).reverse();
  }

  private async leaveWorld(conn: Connection): Promise<void> {
    const entry = conn.presence;
    if (!entry) return;
    conn.presence = null;
    const { world, presence, redis } = this.ctx;
    // Only announce if we still owned the presence (not replaced by a newer connection).
    if (await presence.removeIfOwner(world.id, entry.player.characterId, conn.id)) {
      await publishToWorld(redis, world.id, {
        message: { type: 'player.left', data: { characterId: entry.player.characterId } },
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Bus -> local sockets
  // ---------------------------------------------------------------------------
  private onWorldBroadcast(b: WorldBroadcast): void {
    for (const c of this.connections.values()) {
      if (!c.presence || c.characterId === b.exceptCharacterId) continue;
      const pos = c.presence.player.position;
      if (b.onlyHex && (pos.q !== b.onlyHex.q || pos.r !== b.onlyHex.r)) continue;
      c.send(b.message);
    }
  }

  private onControl(msg: ControlMessage): void {
    for (const c of this.connections.values()) {
      if (
        msg.kind === 'account.replace' &&
        c.accountId === msg.accountId &&
        c.id !== msg.keepConnectionId &&
        c.presence
      ) {
        void this.leaveWorld(c).finally(() =>
          c.close(WsCloseCode.SESSION_REPLACED, 'Playing from another tab or device'),
        );
      } else if (msg.kind === 'session.revoked' && c.sessionId === msg.sessionId) {
        void this.leaveWorld(c).finally(() => c.close(WsCloseCode.UNAUTHENTICATED, 'Logged out'));
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Maintenance
  // ---------------------------------------------------------------------------
  private heartbeat(): void {
    for (const c of this.connections.values()) {
      if (!c.isAlive) {
        c.socket.terminate();
        continue;
      }
      c.isAlive = false;
      c.socket.ping();
    }
  }

  private async refreshPresence(): Promise<void> {
    const entries = [...this.connections.values()].flatMap((c) => (c.presence ? [c.presence] : []));
    try {
      await this.ctx.presence.touch(this.ctx.world.id, entries);
    } catch (err) {
      this.log.warn({ err }, 'presence refresh failed');
    }
  }
}
