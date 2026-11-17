import type { ServerMessage } from '@realms/shared';
import { create } from 'zustand';
import type { ConnectionStatus } from '../../lib/realtime';
import { applyServerMessage, applyStatus, initialWorldState, type WorldState } from './world-state';

/** Real-time world state (fed by the WebSocket), separate from REST data in TanStack Query. */
interface WorldStore extends WorldState {
  receive: (msg: ServerMessage) => void;
  setStatus: (s: ConnectionStatus) => void;
  reset: () => void;
}

export const useWorldStore = create<WorldStore>()((set) => ({
  ...initialWorldState,
  receive: (msg) => set((s) => applyServerMessage(s, msg)),
  setStatus: (status) => set((s) => applyStatus(s, status)),
  reset: () => set(initialWorldState),
}));
