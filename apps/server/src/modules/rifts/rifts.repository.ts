import { riftRunParticipants, riftRuns, type DbOrTx, type RiftRun } from '@realms/db';
import { and, eq } from 'drizzle-orm';

export const riftsRepository = {
  /** The active run a character is in, if any. */
  async activeRunIdFor(db: DbOrTx, characterId: string): Promise<string | null> {
    const [row] = await db
      .select({ id: riftRuns.id })
      .from(riftRunParticipants)
      .innerJoin(riftRuns, eq(riftRuns.id, riftRunParticipants.runId))
      .where(and(eq(riftRunParticipants.characterId, characterId), eq(riftRuns.status, 'active')));
    return row?.id ?? null;
  },

  async findRun(db: DbOrTx, runId: string, lock = false): Promise<RiftRun | undefined> {
    const q = db.select().from(riftRuns).where(eq(riftRuns.id, runId));
    const [row] = lock ? await q.for('update') : await q;
    return row;
  },

  async participant(db: DbOrTx, runId: string, characterId: string) {
    const [row] = await db
      .select()
      .from(riftRunParticipants)
      .where(
        and(eq(riftRunParticipants.runId, runId), eq(riftRunParticipants.characterId, characterId)),
      );
    return row;
  },

  participants(db: DbOrTx, runId: string) {
    return db.select().from(riftRunParticipants).where(eq(riftRunParticipants.runId, runId));
  },
};
