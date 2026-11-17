import { WS_PATH, WsCloseCode, type ClientMessage, type ServerMessage } from '@realms/shared';

export type ConnectionStatus =
  'idle' | 'connecting' | 'online' | 'reconnecting' | 'replaced' | 'unauthenticated' | 'offline';

export interface RealtimeHandlers {
  onMessage: (msg: ServerMessage) => void;
  onStatus: (status: ConnectionStatus) => void;
  /** Called after every (re)connection once the server says hello. */
  onReady: (send: (msg: ClientMessage) => void) => void;
}

const MAX_BACKOFF_MS = 15_000;

/**
 * WebSocket client with automatic reconnection (exponential backoff + jitter).
 * Does not reconnect when the server closed for auth or because another tab
 * took over the account.
 */
export class RealtimeClient {
  private ws: WebSocket | null = null;
  private attempts = 0;
  private stopped = false;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly handlers: RealtimeHandlers) {}

  connect(): void {
    this.stopped = false;
    this.open();
  }

  send(msg: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  disconnect(): void {
    this.stopped = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.ws?.close(1000, 'client leaving');
    this.ws = null;
  }

  private open(): void {
    this.handlers.onStatus(this.attempts === 0 ? 'connecting' : 'reconnecting');
    const url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}${WS_PATH}`;
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onmessage = (ev) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(String(ev.data)) as ServerMessage;
      } catch {
        return;
      }
      if (msg.type === 'welcome') {
        this.attempts = 0;
        this.handlers.onStatus('online');
        this.handlers.onReady((m) => this.send(m));
      }
      this.handlers.onMessage(msg);
    };

    ws.onclose = (ev) => {
      if (this.ws !== ws) return;
      this.ws = null;
      if (ev.code === WsCloseCode.UNAUTHENTICATED) return this.handlers.onStatus('unauthenticated');
      if (ev.code === WsCloseCode.SESSION_REPLACED) return this.handlers.onStatus('replaced');
      if (this.stopped) return this.handlers.onStatus('offline');
      this.scheduleRetry();
    };
  }

  private scheduleRetry(): void {
    this.attempts++;
    this.handlers.onStatus('reconnecting');
    const base = Math.min(MAX_BACKOFF_MS, 500 * 2 ** this.attempts);
    this.retryTimer = setTimeout(() => this.open(), base / 2 + Math.random() * (base / 2));
  }
}
