import {
  characterScopedSchema,
  createLobbySchema,
  lobbyInviteSchema,
  lobbyKickSchema,
  lobbyReadySchema,
  lobbySlotSchema,
} from '@realms/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parse } from '../../lib/errors.js';
import { requireAuth } from '../../plugins/auth.js';
import type { LobbiesService } from './lobbies.service.js';

const lobbyParams = z.object({ lobbyId: z.uuid() });

export async function lobbiesRoutes(
  app: FastifyInstance,
  { lobbies }: { lobbies: LobbiesService },
) {
  app.addHook('preHandler', requireAuth);
  const account = (r: { auth: { account: { id: string } } | null }) => r.auth!.account.id;

  app.get('/', async (request) => {
    const { characterId } = parse(characterScopedSchema, request.query);
    return lobbies.overview(account(request), characterId);
  });

  app.post('/', async (request, reply) => {
    const { characterId, riftId, visibility } = parse(createLobbySchema, request.body);
    return reply
      .status(201)
      .send(await lobbies.create(account(request), characterId, riftId, visibility));
  });

  app.get('/:lobbyId', async (request) => {
    const { lobbyId } = parse(lobbyParams, request.params);
    const { characterId } = parse(characterScopedSchema, request.query);
    return lobbies.get(account(request), characterId, lobbyId);
  });

  app.post('/:lobbyId/join', async (request) => {
    const { lobbyId } = parse(lobbyParams, request.params);
    const { characterId } = parse(characterScopedSchema, request.body);
    return lobbies.join(account(request), characterId, lobbyId);
  });

  app.post('/:lobbyId/leave', async (request, reply) => {
    const { lobbyId } = parse(lobbyParams, request.params);
    const { characterId } = parse(characterScopedSchema, request.body);
    await lobbies.leave(account(request), characterId, lobbyId);
    return reply.status(204).send();
  });

  app.post('/:lobbyId/kick', async (request) => {
    const { lobbyId } = parse(lobbyParams, request.params);
    const { characterId, targetCharacterId } = parse(lobbyKickSchema, request.body);
    return lobbies.kick(account(request), characterId, lobbyId, targetCharacterId);
  });

  app.post('/:lobbyId/slot', async (request) => {
    const { lobbyId } = parse(lobbyParams, request.params);
    const { characterId, slot } = parse(lobbySlotSchema, request.body);
    return lobbies.setSlot(account(request), characterId, lobbyId, slot);
  });

  app.post('/:lobbyId/ready', async (request) => {
    const { lobbyId } = parse(lobbyParams, request.params);
    const { characterId, ready } = parse(lobbyReadySchema, request.body);
    return lobbies.setReady(account(request), characterId, lobbyId, ready);
  });

  app.post('/:lobbyId/invite', async (request) => {
    const { lobbyId } = parse(lobbyParams, request.params);
    const { characterId, friendCharacterId } = parse(lobbyInviteSchema, request.body);
    return lobbies.invite(account(request), characterId, lobbyId, friendCharacterId);
  });

  app.post('/:lobbyId/start', async (request) => {
    const { lobbyId } = parse(lobbyParams, request.params);
    const { characterId } = parse(characterScopedSchema, request.body);
    return lobbies.start(account(request), characterId, lobbyId);
  });
}
