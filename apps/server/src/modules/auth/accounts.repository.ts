import { accounts, type Account, type DbOrTx } from '@realms/db';
import { eq } from 'drizzle-orm';

export const accountsRepository = {
  async findByEmail(db: DbOrTx, email: string): Promise<Account | undefined> {
    const [row] = await db.select().from(accounts).where(eq(accounts.email, email));
    return row;
  },
  async insert(db: DbOrTx, email: string, passwordHash: string): Promise<Account> {
    const [row] = await db.insert(accounts).values({ email, passwordHash }).returning();
    return row!;
  },
  async markLogin(db: DbOrTx, id: string): Promise<void> {
    await db.update(accounts).set({ lastLoginAt: new Date() }).where(eq(accounts.id, id));
  },
};
