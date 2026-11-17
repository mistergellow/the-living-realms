import { z } from 'zod';
import type { CharacterAppearance, CharacterDto, HexCoord, WorldDto } from './api.js';

/* ---------------------------------------------------------------------------
 * Real-time protocol (WebSocket).
 *
 * Envelope: { type: string, data?: object }.
 * Client -> server messages are *intents*; they are validated here and then by
 * game rules on the server. The server is the only source of truth.
 * ------------------------------------------------------------------------- */

export const PROTOCOL_VERSION = 1;
export const WS_PATH = '/ws';

/** WebSocket close codes in the private 4000-4999 range. */
export const WsCloseCode = {
  UNAUTHENTICATED: 4001,
  SESSION_REPLACED: 4002,
  PROTOCOL_ERROR: 4003,
  SERVER_SHUTDOWN: 4004,
  FORBIDDEN_ORIGIN: 4005,
} as const;

// ---- Client -> Server ----
export const clientMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('world.enter'), data: z.object({ characterId: z.uuid() }) }),
  z.object({ type: z.literal('world.leave') }),
  z.object({ type: z.literal('ping'), data: z.object({ t: z.number() }) }),
]);
export type ClientMessage = z.infer<typeof clientMessageSchema>;

// ---- Server -> Client ----
export interface PresencePlayer {
  characterId: string;
  name: string;
  appearance: CharacterAppearance;
  position: HexCoord;
}

export type ServerMessage =
  | { type: 'welcome'; data: { protocolVersion: number; connectionId: string } }
  | {
      type: 'world.entered';
      data: { world: WorldDto; character: CharacterDto; players: PresencePlayer[] };
    }
  | { type: 'world.left' }
  | { type: 'player.joined'; data: { player: PresencePlayer } }
  | { type: 'player.left'; data: { characterId: string } }
  | { type: 'world.tick'; data: { tick: number; at: string } }
  | { type: 'pong'; data: { t: number } }
  | { type: 'error'; data: { code: string; message: string } };

export type ServerMessageType = ServerMessage['type'];
