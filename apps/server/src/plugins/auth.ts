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
