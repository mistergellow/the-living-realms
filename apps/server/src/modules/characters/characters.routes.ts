import {
  createCharacterRequestSchema,
  allocateAttributesRequestSchema,
  equipRequestSchema,
  setOriginRequestSchema,
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
const itemParams = z.object({ id: z.uuid(), itemId: z.uuid() });

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

  // Request #36: reading a skill book is using an item from the inventory.
  app.post('/:id/items/:itemId/read', async (request) => {
    const { id, itemId } = parse(itemParams, request.params);
    return sheets.readBook(request.auth!.account.id, id, itemId);
  });

  app.post('/:id/origin', async (request) => {
    const { id } = parse(idParams, request.params);
    const { origin } = parse(setOriginRequestSchema, request.body);
    return sheets.setOrigin(request.auth!.account.id, id, origin);
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
