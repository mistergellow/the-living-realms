import { performActivitySchema } from '@realms/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parse } from '../../lib/errors.js';
import { requireAuth } from '../../plugins/auth.js';
import type { ProfessionsService } from './professions.service.js';

const characterParams = z.object({ id: z.uuid() });
const nameParams = z.object({ name: z.string().trim().min(1).max(40) });
const activityParams = z.object({
  id: z.uuid(),
  professionId: z.string().max(64),
  activityId: z.string().max(64),
});

/** /api/characters/:id/professions (request #33, profiles from request #51). */
export async function professionsRoutes(
  app: FastifyInstance,
  { service }: { service: ProfessionsService },
) {
  app.addHook('preHandler', requireAuth);

  app.get('/:id/professions', async (request) => {
    const { id } = parse(characterParams, request.params);
    return service.list(request.auth!.account.id, id);
  });

  // Request #51: inspect another character's professional profile (by id or by name).
  app.get('/:id/professions/profile', async (request) => {
    const { id } = parse(characterParams, request.params);
    return service.profile({ id });
  });

  app.get('/by-name/:name/professions/profile', async (request) => {
    const { name } = parse(nameParams, request.params);
    return service.profile({ name });
  });

  app.post('/:id/professions/:professionId/activities/:activityId', async (request) => {
    const { id, professionId, activityId } = parse(activityParams, request.params);
    const { targetItemId } = parse(performActivitySchema, request.body ?? {});
    return service.perform(request.auth!.account.id, id, professionId, activityId, targetItemId);
  });
}
