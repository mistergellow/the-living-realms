import { createHash } from 'node:crypto';
import fp from 'fastify-plugin';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { errors } from '../lib/errors.js';
import {
  SESSION_COOKIE,
  type AuthContext,
  type SessionService,
} from '../modules/auth/session.service.js';

declare module 'fastify' {
  interface FastifyRequest {
    auth: AuthContext | null;
  }
}

/** Resolves the session cookie (if any) into `request.auth` for every request. */
export const authPlugin = fp<{ sessions: SessionService }>(async (app, { sessions }) => {
  app.decorateRequest('auth', null);
  app.addHook('preHandler', async (request) => {
    const token = request.cookies[SESSION_COOKIE];
    request.auth = token ? await sessions.resolve(token) : null;
  });
});

/** Route-level guard. */
export async function requireAuth(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  if (!request.auth) throw errors.unauthenticated();
}

/**
 * The project owner is always an admin (request #43). Stored as a SHA-256 of
 * the lower-cased email so the address is not published in the repository.
 */
const OWNER_EMAIL_SHA256 = '4e35e029dbf001fcf4fbdb49f27eae3516e4f7daf0ffcb2e00f40873196ced9f';

/** Is this email the owner's or one of the admins in ADMIN_EMAILS (request #41)? */
export const isAdminEmail = (adminEmails: readonly string[], email: string) => {
  const e = email.toLowerCase();
  return (
    adminEmails.includes(e) || createHash('sha256').update(e).digest('hex') === OWNER_EMAIL_SHA256
  );
};

/** Route-level guard for the admin tools: logged in and listed in ADMIN_EMAILS. */
export function requireAdmin(adminEmails: readonly string[]) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    if (!request.auth) throw errors.unauthenticated();
    if (!isAdminEmail(adminEmails, request.auth.account.email))
      throw errors.forbidden('Admins only.');
  };
}
