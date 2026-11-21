import {
  createCharacterRequestSchema,
  allocateAttributesRequestSchema,
  equipRequestSchema,
  loadoutRequestSchema,
  unequipRequestSchema,
  type CharacterListResponse,
} from '@realms/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parse } from '../../lib/errors.js';
import { requireAuth } from '../../plugins/auth.js';
import { toCharacterDto, type CharactersService } from './characters.service.js';
import type { CharacterSheetService } from './sheet.service.js';

const idParams = z.object({ id: z.uuid() });

export async function charactersRoutes(
  app: FastifyInstance,
  { service, sheets }: { service: CharactersService; sheets: CharacterSheetService },
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

  app.get('/:id', async (request) => {
    const { id } = parse(idParams, request.params);
    return sheets.getSheet(request.auth!.account.id, id);
  });

  app.post('/:id/equip', async (request) => {
    const { id } = parse(idParams, request.params);
    const { itemId, slot } = parse(equipRequestSchema, request.body);
    return sheets.equip(request.auth!.account.id, id, itemId, slot);
  });

  app.post('/:id/attributes', async (request) => {
    const { id } = parse(idParams, request.params);
    const { add } = parse(allocateAttributesRequestSchema, request.body);
    return sheets.allocate(request.auth!.account.id, id, add);
  });

  app.put('/:id/loadout', async (request) => {
    const { id } = parse(idParams, request.params);
    const { slots } = parse(loadoutRequestSchema, request.body);
    return sheets.setLoadout(request.auth!.account.id, id, slots);
  });

  app.post('/:id/unequip', async (request) => {
    const { id } = parse(idParams, request.params);
    const { slot } = parse(unequipRequestSchema, request.body);
    return sheets.unequip(request.auth!.account.id, id, slot);
  });

  app.delete('/:id', async (request, reply) => {
    const { id } = parse(idParams, request.params);
    await service.delete(request.auth!.account.id, id);
    return reply.status(204).send();
  });
}
