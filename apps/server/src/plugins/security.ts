import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fp from 'fastify-plugin';
import type { Redis } from '@realms/server-kit';
import { errors } from '../lib/errors.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * - Security headers (helmet).
 * - CSRF defence in depth: SameSite=Lax cookies + Origin check on state-changing requests.
 * - Global rate limiting (Redis-backed so it holds across instances).
 */
export const securityPlugin = fp<{ allowedOrigins: string[]; redis?: Redis }>(
  async (app, { allowedOrigins, redis }) => {
    await app.register(helmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          connectSrc: ["'self'", 'ws:', 'wss:'],
          imgSrc: ["'self'", 'data:'],
          styleSrc: ["'self'", "'unsafe-inline'"],
        },
      },
    });

    await app.register(rateLimit, {
      global: true,
      max: 300,
      timeWindow: '1 minute',
      ...(redis ? { redis, nameSpace: 'realms:ratelimit:' } : {}),
    });

    app.addHook('onRequest', async (request) => {
      if (SAFE_METHODS.has(request.method)) return;
      const origin = request.headers.origin;
      // Browsers always send Origin on cross-site POST/PUT/DELETE; absent = same-origin or non-browser.
      if (origin && !allowedOrigins.includes(origin)) throw errors.forbidden('Origin not allowed.');
    });
  },
);
