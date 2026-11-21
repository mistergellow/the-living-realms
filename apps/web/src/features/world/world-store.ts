import type { CharacterDto, ClientMessage, ServerMessage } from '@realms/shared';
import { create } from 'zustand';
import type { ConnectionStatus } from '../../lib/realtime';
import { applyServerMessage, applyStatus, initialWorldState, type WorldState } from './world-state';

/** Real-time world state (fed by the WebSocket), separate from REST data in TanStack Query. */
interface WorldStore extends WorldState {
  receive: (msg: ServerMessage) => void;
  /** Your character as the server returned it after an action (e.g. travel, request #43). */
  updateSelf: (c: CharacterDto) => void;
  setStatus: (s: ConnectionStatus) => void;
  reset: () => void;
  /** Sends an intent over the open world connection (no-op when offline). */
  send: (msg: ClientMessage) => void;
  setSender: (send: ((msg: ClientMessage) => void) | null) => void;
}

export const useWorldStore = create<WorldStore>()((set) => ({
  ...initialWorldState,
  receive: (msg) => set((s) => applyServerMessage(s, msg)),
  updateSelf: (c) =>
    set((s) =>
      s.self?.id === c.id
        ? {
            self: c,
            players: s.players[c.id]
              ? { ...s.players, [c.id]: { ...s.players[c.id]!, position: c.position } }
              : s.players,
          }
        : {},
    ),
  setStatus: (status) => set((s) => applyStatus(s, status)),
  reset: () => set(initialWorldState),
  send: () => {},
  setSender: (sender) => set({ send: sender ?? (() => {}) }),
}));
