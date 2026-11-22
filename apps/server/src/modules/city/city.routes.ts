import { buySchema, itemActionSchema, upgradeSchema } from '@realms/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parse } from '../../lib/errors.js';
import { requireAuth } from '../../plugins/auth.js';
import type { CityService } from './city.service.js';

const params = z.object({ id: z.uuid() });

/** City services (request #50) under /api/characters/:id/city. */
export async function cityRoutes(app: FastifyInstance, { city }: { city: CityService }) {
  app.addHook('preHandler', requireAuth);
  const account = (r: { auth?: { account: { id: string } } | null }) => r.auth!.account.id;

  app.get('/:id/city', async (request) => {
    const { id } = parse(params, request.params);
    return city.get(account(request), id);
  });

  app.post('/:id/city/storage/deposit', async (request) => {
    const { id } = parse(params, request.params);
    const { itemId } = parse(itemActionSchema, request.body);
    return city.deposit(account(request), id, itemId);
  });

  app.post('/:id/city/storage/withdraw', async (request) => {
    const { id } = parse(params, request.params);
    const { itemId } = parse(itemActionSchema, request.body);
    return city.withdraw(account(request), id, itemId);
  });

  app.post('/:id/city/shop/buy', async (request) => {
    const { id } = parse(params, request.params);
    const { defId, qty } = parse(buySchema, request.body);
    return city.buy(account(request), id, defId, qty);
  });

  app.post('/:id/city/shop/sell', async (request) => {
    const { id } = parse(params, request.params);
    const { itemId } = parse(itemActionSchema, request.body);
    return city.sell(account(request), id, itemId);
  });

  app.post('/:id/city/blacksmith/upgrade', async (request) => {
    const { id } = parse(params, request.params);
    const { itemId, blessing } = parse(upgradeSchema, request.body);
    return city.upgrade(account(request), id, itemId, blessing);
  });
}
