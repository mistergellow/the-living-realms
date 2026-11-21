import type {
  CharacterDto,
  ChatMessage,
  PresencePlayer,
  ServerMessage,
  WorldDto,
} from '@realms/shared';
import type { ConnectionStatus } from '../../lib/realtime';

export interface LogEntry {
  id: number;
  at: string;
  text: string;
  tone?: 'info' | 'warn' | 'error';
}

export interface WorldState {
  status: ConnectionStatus;
  world: WorldDto | null;
  self: CharacterDto | null;
  players: Record<string, PresencePlayer>;
  tick: number | null;
  log: LogEntry[];
  /** Chat of the hex you are on, oldest first. */
  chat: ChatMessage[];
  lastError: string | null;
}

export const initialWorldState: WorldState = {
  status: 'idle',
  world: null,
  self: null,
  players: {},
  tick: null,
  log: [],
  chat: [],
  lastError: null,
};

const MAX_LOG = 100;
const MAX_CHAT = 100;
let logSeq = 0;

function withLog(state: WorldState, text: string, tone: LogEntry['tone'] = 'info'): LogEntry[] {
  return [{ id: ++logSeq, at: new Date().toISOString(), text, tone }, ...state.log].slice(
    0,
    MAX_LOG,
  );
}

/** Pure reducer: server message -> next client state. Kept framework-free for testing. */
export function applyServerMessage(state: WorldState, msg: ServerMessage): WorldState {
  switch (msg.type) {
    case 'world.entered': {
      const players = Object.fromEntries(msg.data.players.map((p) => [p.characterId, p]));
      return {
        ...state,
        world: msg.data.world,
        self: msg.data.character,
        players,
        tick: msg.data.world.tick,
        chat: msg.data.chat.slice(-MAX_CHAT),
        lastError: null,
        log: withLog(state, `${msg.data.character.name} entered ${msg.data.world.name}.`),
      };
    }
    case 'world.left':
      return { ...state, self: null, players: {}, chat: [] };
    case 'chat.message': {
      const m = msg.data.message;
      if (state.chat.some((c) => c.id === m.id)) return state;
      return { ...state, chat: [...state.chat, m].slice(-MAX_CHAT) };
    }
    case 'player.joined': {
      const p = msg.data.player;
      return {
        ...state,
        players: { ...state.players, [p.characterId]: p },
        log: withLog(state, `${p.name} arrived.`),
      };
    }
    case 'player.left': {
      const left = state.players[msg.data.characterId];
      if (!left) return state;
      const { [msg.data.characterId]: _gone, ...rest } = state.players;
      return { ...state, players: rest, log: withLog(state, `${left.name} departed.`) };
    }
    case 'world.tick':
      return { ...state, tick: msg.data.tick };
    case 'error':
      return {
        ...state,
        lastError: msg.data.message,
        log: withLog(state, msg.data.message, 'error'),
      };
    case 'welcome':
    case 'pong':
      return state;
  }
}

export function applyStatus(state: WorldState, status: ConnectionStatus): WorldState {
  if (status === state.status) return state;
  const notes: Partial<Record<ConnectionStatus, [string, LogEntry['tone']]>> = {
    reconnecting: ['Connection lost. Reconnecting…', 'warn'],
    replaced: ['You started playing in another tab or device.', 'warn'],
    unauthenticated: ['Your session has ended.', 'error'],
  };
  const note = notes[status];
  return { ...state, status, log: note ? withLog(state, note[0], note[1]) : state.log };
}
