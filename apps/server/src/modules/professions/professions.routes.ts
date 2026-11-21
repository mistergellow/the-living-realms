import { performActivitySchema } from '@realms/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parse } from '../../lib/errors.js';
import { requireAuth } from '../../plugins/auth.js';
import type { ProfessionsService } from './professions.service.js';

const characterParams = z.object({ id: z.uuid() });
const activityParams = z.object({
  id: z.uuid(),
  professionId: z.string().max(64),
  activityId: z.string().max(64),
});

/** /api/characters/:id/professions (request #33). */
export async function professionsRoutes(
  app: FastifyInstance,
  { service }: { service: ProfessionsService },
) {
  app.addHook('preHandler', requireAuth);

  app.get('/:id/professions', async (request) => {
    const { id } = parse(characterParams, request.params);
    return service.list(request.auth!.account.id, id);
  });

  app.post('/:id/professions/:professionId/activities/:activityId', async (request) => {
    const { id, professionId, activityId } = parse(activityParams, request.params);
    const { targetItemId } = parse(performActivitySchema, request.body ?? {});
    return service.perform(request.auth!.account.id, id, professionId, activityId, targetItemId);
  });
}
