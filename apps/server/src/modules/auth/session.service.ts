import { accounts, sessions, type Account, type Database } from '@realms/db';
import { and, eq, gt } from 'drizzle-orm';
import { newToken, sha256 } from '../../lib/crypto.js';

export const SESSION_COOKIE = 'lr_session';
/** Sliding expiration is refreshed at most this often per session. */
const REFRESH_EVERY_MS = 60 * 60 * 1000;

export interface AuthContext {
  sessionId: string;
  account: Pick<Account, 'id' | 'email' | 'status' | 'createdAt'>;
}

export class SessionService {
  constructor(
    private readonly db: Database,
    private readonly ttlDays: number,
  ) {}

  get ttlMs(): number {
    return this.ttlDays * 24 * 60 * 60 * 1000;
  }

  async create(accountId: string, meta: { ip?: string; userAgent?: string }): Promise<string> {
    const token = newToken();
    await this.db.insert(sessions).values({
      accountId,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + this.ttlMs),
      ip: meta.ip ?? null,
      userAgent: meta.userAgent?.slice(0, 512) ?? null,
    });
    return token;
  }

  /** Resolve a raw token to an active session + account, refreshing its expiry (sliding window). */
  async resolve(token: string | undefined): Promise<AuthContext | null> {
    if (!token || token.length > 128) return null;
    const now = new Date();
    const [row] = await this.db
      .select({
        sessionId: sessions.id,
        lastSeenAt: sessions.lastSeenAt,
        account: {
          id: accounts.id,
          email: accounts.email,
          status: accounts.status,
          createdAt: accounts.createdAt,
        },
      })
      .from(sessions)
      .innerJoin(accounts, eq(accounts.id, sessions.accountId))
      .where(and(eq(sessions.tokenHash, sha256(token)), gt(sessions.expiresAt, now)));
    if (!row || row.account.status !== 'active') return null;

    if (now.getTime() - row.lastSeenAt.getTime() > REFRESH_EVERY_MS) {
      await this.db
        .update(sessions)
        .set({ lastSeenAt: now, expiresAt: new Date(now.getTime() + this.ttlMs) })
        .where(eq(sessions.id, row.sessionId));
    }
    return { sessionId: row.sessionId, account: row.account };
  }

  async revoke(sessionId: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.id, sessionId));
  }
}
