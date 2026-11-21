import {
  adminGrantItemSchema,
  adminTeachSkillSchema,
  adminUpdateCharacterSchema,
  adminUpdateItemSchema,
  customAbilityInputSchema,
  customItemInputSchema,
  type AdminCharacterListResponse,
  type CustomContentDto,
} from '@realms/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parse } from '../../lib/errors.js';
import { requireAdmin, requireAuth } from '../../plugins/auth.js';
import type { AdminService } from './admin.service.js';
import type { CustomContentService } from './custom-content.service.js';

const idParams = z.object({ id: z.uuid() });
const itemParams = z.object({ id: z.uuid(), itemId: z.uuid() });
const skillParams = z.object({ id: z.uuid(), abilityId: z.string().min(1).max(64) });
const contentParams = z.object({ id: z.string().min(1).max(64) });

/** Admin tools (request #32), under /api/admin. Only accounts in ADMIN_EMAILS. */
export async function adminRoutes(
  app: FastifyInstance,
  {
    admin,
    content,
    adminEmails,
  }: { admin: AdminService; content: CustomContentService; adminEmails: readonly string[] },
) {
  app.addHook('preHandler', requireAdmin(adminEmails));
  const adminId = (r: { auth: { account: { id: string } } | null }) => r.auth!.account.id;

  // ---- characters ----
  app.get('/characters', async (): Promise<AdminCharacterListResponse> => ({
    characters: await admin.listCharacters(),
  }));

  app.get('/characters/:id', async (request) => {
    const { id } = parse(idParams, request.params);
    return admin.getCharacter(id);
  });

  app.patch('/characters/:id', async (request) => {
    const { id } = parse(idParams, request.params);
    return admin.updateCharacter(
      adminId(request),
      id,
      parse(adminUpdateCharacterSchema, request.body),
    );
  });

  app.post('/characters/:id/items', async (request) => {
    const { id } = parse(idParams, request.params);
    return admin.grantItem(adminId(request), id, parse(adminGrantItemSchema, request.body));
  });

  app.patch('/characters/:id/items/:itemId', async (request) => {
    const { id, itemId } = parse(itemParams, request.params);
    return admin.updateItem(
      adminId(request),
      id,
      itemId,
      parse(adminUpdateItemSchema, request.body),
    );
  });

  app.delete('/characters/:id/items/:itemId', async (request) => {
    const { id, itemId } = parse(itemParams, request.params);
    return admin.removeItem(adminId(request), id, itemId);
  });

  app.post('/characters/:id/skills', async (request) => {
    const { id } = parse(idParams, request.params);
    const { abilityId } = parse(adminTeachSkillSchema, request.body);
    return admin.teachSkill(adminId(request), id, abilityId);
  });

  app.delete('/characters/:id/skills/:abilityId', async (request) => {
    const { id, abilityId } = parse(skillParams, request.params);
    return admin.forgetSkill(adminId(request), id, abilityId);
  });

  // ---- custom content ----
  app.post('/content/items', async (request, reply) => {
    const item = await content.createItem(
      adminId(request),
      parse(customItemInputSchema, request.body),
    );
    return reply.status(201).send(item);
  });

  app.put('/content/items/:id', async (request) => {
    const { id } = parse(contentParams, request.params);
    return content.updateItem(adminId(request), id, parse(customItemInputSchema, request.body));
  });

  app.post('/content/abilities', async (request, reply) => {
    const ability = await content.createAbility(
      adminId(request),
      parse(customAbilityInputSchema, request.body),
    );
    return reply.status(201).send(ability);
  });

  app.put('/content/abilities/:id', async (request) => {
    const { id } = parse(contentParams, request.params);
    return content.updateAbility(
      adminId(request),
      id,
      parse(customAbilityInputSchema, request.body),
    );
  });
}

/** GET /api/content/custom: every player's client needs the admin-made definitions. */
export async function contentRoutes(
  app: FastifyInstance,
  { content }: { content: CustomContentService },
) {
  app.addHook('preHandler', requireAuth);
  app.get('/custom', async (): Promise<CustomContentDto> => content.snapshot());
}
