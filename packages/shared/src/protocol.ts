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

/** Hex chat (request #40): players talk to everyone standing on the same hex. */
export const CHAT_MAX_LENGTH = 200;
/** How many recent messages of a hex are kept and sent when you arrive. */
export const CHAT_HISTORY = 50;

export interface ChatMessage {
  id: string;
  characterId: string;
  name: string;
  text: string;
  at: string;
  hex: HexCoord;
}

// ---- Client -> Server ----
export const clientMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('world.enter'), data: z.object({ characterId: z.uuid() }) }),
  z.object({ type: z.literal('world.leave') }),
  z.object({ type: z.literal('ping'), data: z.object({ t: z.number() }) }),
  z.object({
    type: z.literal('chat.send'),
    data: z.object({ text: z.string().trim().min(1).max(CHAT_MAX_LENGTH) }),
  }),
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
      data: {
        world: WorldDto;
        character: CharacterDto;
        players: PresencePlayer[];
        /** Recent chat of the hex you are on, oldest first. */
        chat: ChatMessage[];
      };
    }
  | { type: 'chat.message'; data: { message: ChatMessage } }
  | { type: 'world.left' }
  | { type: 'player.joined'; data: { player: PresencePlayer } }
  | { type: 'player.left'; data: { characterId: string } }
  /** A character travelled to another hex (request #43). */
  | { type: 'player.moved'; data: { characterId: string; position: HexCoord } }
  | { type: 'world.tick'; data: { tick: number; at: string } }
  | { type: 'pong'; data: { t: number } }
  | { type: 'error'; data: { code: string; message: string } };

export type ServerMessageType = ServerMessage['type'];
