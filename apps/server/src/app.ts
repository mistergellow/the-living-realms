import cookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import websocket from '@fastify/websocket';
import { ensureWorld } from '@realms/db';
import { loggerOptions } from '@realms/server-kit';
import { ErrorCode } from '@realms/shared';
import Fastify, { type FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { AppContext, AppDeps } from './context.js';
import { registerErrorHandler } from './lib/errors.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { SessionService } from './modules/auth/session.service.js';
import { charactersRoutes } from './modules/characters/characters.routes.js';
import { CharactersService } from './modules/characters/characters.service.js';
import { CharacterSheetService } from './modules/characters/sheet.service.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { worldRoutes } from './modules/world/world.routes.js';
import { authPlugin } from './plugins/auth.js';
import { securityPlugin } from './plugins/security.js';
import { RealtimeGateway } from './realtime/gateway.js';
import { realtimeRoutes } from './realtime/routes.js';

export interface BuiltApp {
  app: FastifyInstance;
  gateway: RealtimeGateway;
  ctx: AppContext;
}

export async function buildApp(deps: AppDeps): Promise<BuiltApp> {
  const { config } = deps;
  const app = Fastify({
    logger: loggerOptions({
      service: 'server',
      level: config.LOG_LEVEL,
      pretty: config.NODE_ENV === 'development',
    }),
    genReqId: () => randomUUID(),
    trustProxy: config.TRUST_PROXY,
    bodyLimit: 64 * 1024,
  });

  const world = await ensureWorld(deps.db, config.WORLD_SLUG);
  const ctx: AppContext = { ...deps, world };
  const sessions = new SessionService(deps.db, config.SESSION_TTL_DAYS);
  const characters = new CharactersService(ctx);
  const gateway = new RealtimeGateway(ctx, characters, app.log);

  app.addHook('onSend', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });
  registerErrorHandler(app);

  await app.register(cookie);
  await app.register(securityPlugin, {
    allowedOrigins: config.WEB_ORIGIN,
    ...(config.NODE_ENV === 'test' ? {} : { redis: deps.redis }),
  });
  await app.register(websocket, { options: { maxPayload: 16 * 1024 } });
  await app.register(authPlugin, { sessions });

  await app.register(healthRoutes, { ctx });
  await app.register(
    async (api) => {
      await api.register(authRoutes, { prefix: '/auth', ctx, sessions });
      await api.register(charactersRoutes, {
        prefix: '/characters',
        service: characters,
        sheets: new CharacterSheetService(deps.db),
      });
      await api.register(worldRoutes, { prefix: '/world', ctx });
    },
    { prefix: '/api' },
  );
  await app.register(realtimeRoutes, { gateway, allowedOrigins: config.WEB_ORIGIN });

  // Optional: serve the built SPA from the same origin (single-container deploys).
  const webDist = config.WEB_DIST_DIR ? resolve(config.WEB_DIST_DIR) : undefined;
  if (webDist && existsSync(webDist)) {
    await app.register(fastifyStatic, { root: webDist, wildcard: false });
  }
  app.setNotFoundHandler((request, reply) => {
    if (webDist && request.method === 'GET' && !request.url.startsWith('/api/')) {
      return reply.sendFile('index.html');
    }
    return reply.status(404).send({
      error: { code: ErrorCode.NOT_FOUND, message: 'Route not found.', requestId: request.id },
    });
  });

  app.addHook('onClose', async () => gateway.stop());
  await gateway.start();
  return { app, gateway, ctx };
}
