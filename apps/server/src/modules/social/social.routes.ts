import { characterScopedSchema, friendRequestSchema } from '@realms/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parse } from '../../lib/errors.js';
import { requireAuth } from '../../plugins/auth.js';
import type { FriendsService } from './friends.service.js';

const otherParams = z.object({ otherId: z.uuid() });

export async function socialRoutes(app: FastifyInstance, { friends }: { friends: FriendsService }) {
  app.addHook('preHandler', requireAuth);

  app.get('/friends', async (request) => {
    const { characterId } = parse(characterScopedSchema, request.query);
    return friends.list(request.auth!.account.id, characterId);
  });

  app.post('/friends/requests', async (request) => {
    const { characterId, name } = parse(friendRequestSchema, request.body);
    return friends.request(request.auth!.account.id, characterId, name);
  });

  app.post('/friends/requests/:otherId/accept', async (request) => {
    const { otherId } = parse(otherParams, request.params);
    const { characterId } = parse(characterScopedSchema, request.body);
    return friends.accept(request.auth!.account.id, characterId, otherId);
  });

  app.delete('/friends/:otherId', async (request) => {
    const { otherId } = parse(otherParams, request.params);
    const { characterId } = parse(characterScopedSchema, request.query);
    return friends.remove(request.auth!.account.id, characterId, otherId);
  });
}
