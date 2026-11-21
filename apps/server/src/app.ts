import cookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import websocket from '@fastify/websocket';
import { ensureWorld } from '@realms/db';
import { loggerOptions } from '@realms/server-kit';
import { ErrorCode } from '@realms/shared';
import Fastify, { type FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AppContext, AppDeps } from './context.js';
import { registerErrorHandler } from './lib/errors.js';
import { adminRoutes, contentRoutes } from './modules/admin/admin.routes.js';
import { AdminService } from './modules/admin/admin.service.js';
import { CustomContentService } from './modules/admin/custom-content.service.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { SessionService } from './modules/auth/session.service.js';
import { charactersRoutes } from './modules/characters/characters.routes.js';
import { CharactersService } from './modules/characters/characters.service.js';
import { CharacterSheetService } from './modules/characters/sheet.service.js';
import { riftsRoutes } from './modules/rifts/rifts.routes.js';
import { professionsRoutes } from './modules/professions/professions.routes.js';
import { ProfessionsService } from './modules/professions/professions.service.js';
import { RiftsService } from './modules/rifts/rifts.service.js';
import { lobbiesRoutes } from './modules/rifts/lobbies.routes.js';
import { LobbiesService } from './modules/rifts/lobbies.service.js';
import { FriendsService } from './modules/social/friends.service.js';
import { socialRoutes } from './modules/social/social.routes.js';
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
  const sheets = new CharacterSheetService(deps.db);
  const gateway = new RealtimeGateway(ctx, characters, app.log);
  // Admin-made items/abilities (request #41) must be in the registry before any request.
  const content = new CustomContentService(ctx, app.log);
  await content.reload();
  gateway.onContentChanged = () => content.reload();

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
        sheets,
      });
      await api.register(professionsRoutes, {
        prefix: '/characters',
        service: new ProfessionsService(ctx, sheets),
      });
      const rifts = new RiftsService(ctx, sheets);
      const friends = new FriendsService(ctx, sheets);
      // Lobby routes first: '/rifts/lobbies' must not be captured by '/rifts/:riftId'.
      await api.register(lobbiesRoutes, {
        prefix: '/rifts/lobbies',
        lobbies: new LobbiesService(ctx, sheets, rifts, friends),
      });
      await api.register(riftsRoutes, { prefix: '/rifts', service: rifts });
      await api.register(socialRoutes, { prefix: '/social', friends });
      await api.register(worldRoutes, { prefix: '/world', ctx });
      await api.register(contentRoutes, { prefix: '/content', content });
      await api.register(adminRoutes, {
        prefix: '/admin',
        admin: new AdminService(ctx, sheets),
        content,
        adminEmails: config.ADMIN_EMAILS,
      });
    },
    { prefix: '/api' },
  );
  await app.register(realtimeRoutes, { gateway, allowedOrigins: config.WEB_ORIGIN });

  // Optional: serve the built SPA from the same origin (single-container deploys).
  const webDist = findWebDist(config.WEB_DIST_DIR, config.NODE_ENV);
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

/**
 * The built SPA: `WEB_DIST_DIR` (Docker image), or — in production only — the
 * repository's `apps/web/dist`, for hosts that build the repo themselves and run
 * `pnpm start` (e.g. Railway without the Dockerfile, request #26).
 */
function findWebDist(configured: string | undefined, nodeEnv: string): string | undefined {
  if (configured) return resolve(configured);
  if (nodeEnv !== 'production') return undefined;
  const here = dirname(fileURLToPath(import.meta.url));
  return [resolve(here, '../../web/dist'), resolve(process.cwd(), 'apps/web/dist')].find((d) =>
    existsSync(join(d, 'index.html')),
  );
}
