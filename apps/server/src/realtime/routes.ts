import { WS_PATH } from '@realms/shared';
import type { FastifyInstance } from 'fastify';
import { errors } from '../lib/errors.js';
import type { RealtimeGateway } from './gateway.js';

export async function realtimeRoutes(
  app: FastifyInstance,
  { gateway, allowedOrigins }: { gateway: RealtimeGateway; allowedOrigins: string[] },
) {
  app.get(
    WS_PATH,
    {
      websocket: true,
      // Cross-Site WebSocket Hijacking defence: browsers always send Origin on WS handshakes.
      preValidation: async (request) => {
        const origin = request.headers.origin;
        if (origin && !allowedOrigins.includes(origin))
          throw errors.forbidden('Origin not allowed.');
      },
    },
    (socket, request) => gateway.handle(socket, request.auth),
  );
}
