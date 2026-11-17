import { runActionRequestSchema, startRunRequestSchema } from '@realms/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parse } from '../../lib/errors.js';
import { requireAuth } from '../../plugins/auth.js';
import type { RiftsService } from './rifts.service.js';

const characterQuery = z.object({ characterId: z.uuid() });
const runParams = z.object({ runId: z.uuid() });
const riftParams = z.object({ riftId: z.string().max(64) });

export async function riftsRoutes(app: FastifyInstance, { service }: { service: RiftsService }) {
  app.addHook('preHandler', requireAuth);

  app.get('/', async () => ({ rifts: service.list() }));

  app.get('/active', async (request) => {
    const { characterId } = parse(characterQuery, request.query);
    return { run: await service.active(request.auth!.account.id, characterId) };
  });

  app.post('/:riftId/runs', async (request, reply) => {
    const { riftId } = parse(riftParams, request.params);
    const { characterId } = parse(startRunRequestSchema, request.body);
    const run = await service.start(request.auth!.account.id, riftId, characterId);
    request.log.info({ runId: run.id, riftId }, 'rift run started');
    return reply.status(201).send(run);
  });

  app.get('/runs/:runId', async (request) => {
    const { runId } = parse(runParams, request.params);
    const { characterId } = parse(characterQuery, request.query);
    return service.get(request.auth!.account.id, runId, characterId);
  });

  app.post('/runs/:runId/actions', async (request) => {
    const { runId } = parse(runParams, request.params);
    const { characterId, action } = parse(runActionRequestSchema, request.body);
    return service.act(request.auth!.account.id, runId, characterId, action);
  });
}
