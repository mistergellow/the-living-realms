import { createCharacterRequestSchema, type CharacterListResponse } from '@realms/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parse } from '../../lib/errors.js';
import { requireAuth } from '../../plugins/auth.js';
import { toCharacterDto, type CharactersService } from './characters.service.js';

const idParams = z.object({ id: z.uuid() });

export async function charactersRoutes(
  app: FastifyInstance,
  { service }: { service: CharactersService },
) {
  app.addHook('preHandler', requireAuth);

  app.get('/', async (request): Promise<CharacterListResponse> => {
    const list = await service.list(request.auth!.account.id);
    return { characters: list.map(toCharacterDto), limit: service.limit };
  });

  app.post('/', async (request, reply) => {
    const input = parse(createCharacterRequestSchema, request.body);
    const character = await service.create(request.auth!.account.id, input);
    request.log.info({ characterId: character.id }, 'character created');
    return reply.status(201).send({ character: toCharacterDto(character) });
  });

  app.delete('/:id', async (request, reply) => {
    const { id } = parse(idParams, request.params);
    await service.delete(request.auth!.account.id, id);
    return reply.status(204).send();
  });
}
