import { worldBossFightSchema, worldBossQuerySchema } from '@realms/shared';
import type { FastifyInstance } from 'fastify';
import { parse } from '../../lib/errors.js';
import { requireAuth } from '../../plugins/auth.js';
import type { RiftsService } from '../rifts/rifts.service.js';
import type { WorldBossService } from './worldboss.service.js';

/** World boss (request #43), under /api/world-boss. */
export async function worldBossRoutes(
  app: FastifyInstance,
  { service, rifts }: { service: WorldBossService; rifts: RiftsService },
) {
  app.addHook('preHandler', requireAuth);

  app.get('/', async (request) => {
    const { characterId } = parse(worldBossQuerySchema, request.query);
    return service.view(request.auth!.account.id, characterId);
  });

  /** Solo fight; groups start from a lobby whose riftId is 'world_boss'. */
  app.post('/fight', async (request, reply) => {
    const { characterId } = parse(worldBossFightSchema, request.body);
    const accountId = request.auth!.account.id;
    const runId = await service.fight(accountId, characterId);
    return reply.status(201).send({ run: await rifts.get(accountId, runId, characterId) });
  });
}
