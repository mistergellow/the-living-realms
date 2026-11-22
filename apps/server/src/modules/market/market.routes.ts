import { marketListingSchema, marketListSchema } from '@realms/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parse } from '../../lib/errors.js';
import { requireAuth } from '../../plugins/auth.js';
import type { MarketService } from './market.service.js';

const params = z.object({ id: z.uuid() });

/** Player market (request #63) under /api/characters/:id/market. */
export async function marketRoutes(app: FastifyInstance, { market }: { market: MarketService }) {
  app.addHook('preHandler', requireAuth);
  const account = (r: { auth?: { account: { id: string } } | null }) => r.auth!.account.id;

  app.get('/:id/market', async (request) => {
    const { id } = parse(params, request.params);
    return market.get(account(request), id);
  });
  app.post('/:id/market/list', async (request) => {
    const { id } = parse(params, request.params);
    const { itemId, price } = parse(marketListSchema, request.body);
    return market.list(account(request), id, itemId, price);
  });
  app.post('/:id/market/buy', async (request) => {
    const { id } = parse(params, request.params);
    const { listingId } = parse(marketListingSchema, request.body);
    return market.buy(account(request), id, listingId);
  });
  app.post('/:id/market/cancel', async (request) => {
    const { id } = parse(params, request.params);
    const { listingId } = parse(marketListingSchema, request.body);
    return market.cancel(account(request), id, listingId);
  });
}
