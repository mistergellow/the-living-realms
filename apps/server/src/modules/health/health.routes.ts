import { sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../../context.js';

export async function healthRoutes(app: FastifyInstance, { ctx }: { ctx: AppContext }) {
  // Liveness: the process is up.
  app.get('/healthz', { config: { rateLimit: false } }, async () => ({ status: 'ok' }));

  // Readiness: dependencies reachable. Load balancers should route traffic only when ready.
  app.get('/readyz', { config: { rateLimit: false } }, async (_request, reply) => {
    const checks = { database: false, redis: false };
    await Promise.all([
      ctx.db.execute(sql`select 1`).then(
        () => (checks.database = true),
        () => {},
      ),
      ctx.redis.ping().then(
        () => (checks.redis = true),
        () => {},
      ),
    ]);
    const ok = checks.database && checks.redis;
    return reply.status(ok ? 200 : 503).send({ status: ok ? 'ready' : 'unavailable', checks });
  });
}
