import { eq } from 'drizzle-orm';
import type { Database } from './client.js';
import { worlds, type World } from './schema.js';

/** Idempotently ensures the shared world exists. Name is a placeholder until decided. */
export async function ensureWorld(
  db: Database,
  slug: string,
  name = 'The Living Realms',
): Promise<World> {
  await db.insert(worlds).values({ slug, name }).onConflictDoNothing({ target: worlds.slug });
  const [world] = await db.select().from(worlds).where(eq(worlds.slug, slug));
  if (!world) throw new Error(`World '${slug}' could not be created`);
  return world;
}
