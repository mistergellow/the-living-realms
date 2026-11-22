import {
  createGuildSchema,
  guildGoldSchema,
  guildInviteSchema,
  guildItemSchema,
  guildMemberSchema,
  updateGuildSchema,
} from '@realms/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parse } from '../../lib/errors.js';
import { requireAuth } from '../../plugins/auth.js';
import type { GuildsService } from './guilds.service.js';

const params = z.object({ id: z.uuid() });
const inviteParams = z.object({ id: z.uuid(), guildId: z.uuid() });

/** Guilds (request #57) under /api/characters/:id/guild. */
export async function guildsRoutes(app: FastifyInstance, { guilds }: { guilds: GuildsService }) {
  app.addHook('preHandler', requireAuth);
  const account = (r: { auth?: { account: { id: string } } | null }) => r.auth!.account.id;

  app.get('/:id/guild', async (request) => {
    const { id } = parse(params, request.params);
    return guilds.get(account(request), id);
  });
  app.post('/:id/guild', async (request) => {
    const { id } = parse(params, request.params);
    return guilds.create(account(request), id, parse(createGuildSchema, request.body));
  });
  app.patch('/:id/guild', async (request) => {
    const { id } = parse(params, request.params);
    return guilds.update(account(request), id, parse(updateGuildSchema, request.body));
  });
  app.post('/:id/guild/invites', async (request) => {
    const { id } = parse(params, request.params);
    const { name } = parse(guildInviteSchema, request.body);
    return guilds.invite(account(request), id, name);
  });
  app.post('/:id/guild/invites/:guildId/accept', async (request) => {
    const { id, guildId } = parse(inviteParams, request.params);
    return guilds.answer(account(request), id, guildId, true);
  });
  app.post('/:id/guild/invites/:guildId/decline', async (request) => {
    const { id, guildId } = parse(inviteParams, request.params);
    return guilds.answer(account(request), id, guildId, false);
  });
  app.post('/:id/guild/kick', async (request) => {
    const { id } = parse(params, request.params);
    const { characterId } = parse(guildMemberSchema, request.body);
    return guilds.kick(account(request), id, characterId);
  });
  app.post('/:id/guild/leader', async (request) => {
    const { id } = parse(params, request.params);
    const { characterId } = parse(guildMemberSchema, request.body);
    return guilds.transfer(account(request), id, characterId);
  });
  app.post('/:id/guild/leave', async (request) => {
    const { id } = parse(params, request.params);
    return guilds.leave(account(request), id);
  });
  app.post('/:id/guild/bank/deposit', async (request) => {
    const { id } = parse(params, request.params);
    const { amount } = parse(guildGoldSchema, request.body);
    return guilds.depositGold(account(request), id, amount);
  });
  app.post('/:id/guild/land', async (request) => {
    const { id } = parse(params, request.params);
    return guilds.buyLand(account(request), id);
  });
  app.post('/:id/guild/storage/deposit', async (request) => {
    const { id } = parse(params, request.params);
    const { itemId } = parse(guildItemSchema, request.body);
    return guilds.depositItem(account(request), id, itemId);
  });
  app.post('/:id/guild/storage/withdraw', async (request) => {
    const { id } = parse(params, request.params);
    const { itemId } = parse(guildItemSchema, request.body);
    return guilds.withdrawItem(account(request), id, itemId);
  });
}
