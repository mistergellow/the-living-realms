import type { PresenceEntry } from '@realms/server-kit';
import type { ServerMessage } from '@realms/shared';
import type { WebSocket } from 'ws';
import { TokenBucket } from './rate-limiter.js';

/** One authenticated WebSocket connection (one browser tab). */
export class Connection {
  /** Set while the connection is "in the world" with a character. */
  presence: PresenceEntry | null = null;
  isAlive = true;
  violations = 0;
  readonly bucket = new TokenBucket(30, 10);

  constructor(
    readonly id: string,
    readonly socket: WebSocket,
    readonly accountId: string,
    readonly sessionId: string,
  ) {}

  get characterId(): string | null {
    return this.presence?.player.characterId ?? null;
  }

  send(msg: ServerMessage): void {
    if (this.socket.readyState === this.socket.OPEN) this.socket.send(JSON.stringify(msg));
  }

  close(code: number, reason: string): void {
    if (
      this.socket.readyState === this.socket.OPEN ||
      this.socket.readyState === this.socket.CONNECTING
    )
      this.socket.close(code, reason);
  }
}
