import { publishControl } from '@realms/server-kit';
import { loginRequestSchema, registerRequestSchema, type MeResponse } from '@realms/shared';
import type { FastifyInstance, FastifyReply } from 'fastify';
import type { AppContext } from '../../context.js';
import { parse } from '../../lib/errors.js';
import { isAdminEmail, requireAuth } from '../../plugins/auth.js';
import { AuthService } from './auth.service.js';
import { SESSION_COOKIE, type SessionService } from './session.service.js';

export async function authRoutes(
  app: FastifyInstance,
  { ctx, sessions }: { ctx: AppContext; sessions: SessionService },
) {
  const auth = new AuthService(ctx.db);
  const toAccountDto = (a: { id: string; email: string; createdAt: Date }) => ({
    id: a.id,
    email: a.email,
    createdAt: a.createdAt.toISOString(),
    isAdmin: isAdminEmail(ctx.config.ADMIN_EMAILS, a.email),
  });
  const authRateLimit = { rateLimit: { max: ctx.config.AUTH_RATE_LIMIT, timeWindow: '1 minute' } };

  const setSessionCookie = (reply: FastifyReply, token: string) =>
    reply.setCookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: ctx.config.COOKIE_SECURE,
      path: '/',
      maxAge: Math.floor(sessions.ttlMs / 1000),
    });

  app.post('/register', { config: authRateLimit }, async (request, reply) => {
    const input = parse(registerRequestSchema, request.body);
    const account = await auth.register(input);
    const token = await sessions.create(account.id, {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });
    request.log.info({ accountId: account.id }, 'account registered');
    setSessionCookie(reply, token);
    return reply.status(201).send({ account: toAccountDto(account) } satisfies MeResponse);
  });

  app.post('/login', { config: authRateLimit }, async (request, reply) => {
    const input = parse(loginRequestSchema, request.body);
    const account = await auth.login(input);
    const token = await sessions.create(account.id, {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });
    request.log.info({ accountId: account.id }, 'login');
    setSessionCookie(reply, token);
    return { account: toAccountDto(account) } satisfies MeResponse;
  });

  app.post('/logout', async (request, reply) => {
    const authCtx = await sessions.resolve(request.cookies[SESSION_COOKIE]);
    if (authCtx) {
      await sessions.revoke(authCtx.sessionId);
      await publishControl(ctx.redis, { kind: 'session.revoked', sessionId: authCtx.sessionId });
    }
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return reply.status(204).send();
  });

  app.get('/me', { preHandler: requireAuth }, async (request) => {
    return { account: toAccountDto(request.auth!.account) } satisfies MeResponse;
  });
}
