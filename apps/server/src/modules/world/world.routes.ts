import { worlds, type World } from '@realms/db';
import type { WorldDto } from '@realms/shared';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../../context.js';
import { requireAuth } from '../../plugins/auth.js';

export const toWorldDto = (w: World): WorldDto => ({
  id: w.id,
  slug: w.slug,
  name: w.name,
  tick: w.tick,
  lastTickAt: w.lastTickAt?.toISOString() ?? null,
});

/** Reads the current world state (tick is advanced by the worker, so always read fresh). */
export async function loadWorld(ctx: AppContext): Promise<World> {
  const [w] = await ctx.db.select().from(worlds).where(eq(worlds.id, ctx.world.id));
  return w ?? ctx.world;
}

export async function worldRoutes(app: FastifyInstance, { ctx }: { ctx: AppContext }) {
  app.get('/', { preHandler: requireAuth }, async () => toWorldDto(await loadWorld(ctx)));
}
