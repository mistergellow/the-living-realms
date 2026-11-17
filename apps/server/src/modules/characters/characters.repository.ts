import { characters, type Character, type DbOrTx } from '@realms/db';
import { and, asc, count, eq, isNull } from 'drizzle-orm';

const alive = isNull(characters.deletedAt);

export const charactersRepository = {
  listByAccount(db: DbOrTx, accountId: string): Promise<Character[]> {
    return db
      .select()
      .from(characters)
      .where(and(eq(characters.accountId, accountId), alive))
      .orderBy(asc(characters.createdAt));
  },

  async countByAccount(db: DbOrTx, accountId: string): Promise<number> {
    const [row] = await db
      .select({ n: count() })
      .from(characters)
      .where(and(eq(characters.accountId, accountId), alive));
    return row?.n ?? 0;
  },

  async findOwned(db: DbOrTx, accountId: string, id: string): Promise<Character | undefined> {
    const [row] = await db
      .select()
      .from(characters)
      .where(and(eq(characters.id, id), eq(characters.accountId, accountId), alive));
    return row;
  },

  async insert(db: DbOrTx, values: typeof characters.$inferInsert): Promise<Character> {
    const [row] = await db.insert(characters).values(values).returning();
    return row!;
  },

  async softDelete(db: DbOrTx, id: string): Promise<void> {
    await db.update(characters).set({ deletedAt: new Date() }).where(eq(characters.id, id));
  },

  async markPlayed(db: DbOrTx, id: string): Promise<void> {
    await db.update(characters).set({ lastPlayedAt: new Date() }).where(eq(characters.id, id));
  },
};
