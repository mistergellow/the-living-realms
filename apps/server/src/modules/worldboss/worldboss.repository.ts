import { worldBossAttempts, worldBosses, type DbOrTx } from '@realms/db';
import { eq, sql } from 'drizzle-orm';

/**
 * When a world boss fight ends: its damage comes off the shared pool and the
 * attempt is closed (called by RiftsService.finish). Uses no service state.
 */
export async function settleWorldBossFight(
  tx: DbOrTx,
  runId: string,
  damage: number,
): Promise<void> {
  const [attempt] = await tx
    .update(worldBossAttempts)
    .set({ damage, finishedAt: new Date() })
    .where(eq(worldBossAttempts.runId, runId))
    .returning({ bossId: worldBossAttempts.bossId });
  if (!attempt) return;
  await tx
    .update(worldBosses)
    .set({
      hp: sql`greatest(0, ${worldBosses.hp} - ${damage})`,
      defeatedAt: sql`case when ${worldBosses.hp} - ${damage} <= 0 then now() else ${worldBosses.defeatedAt} end`,
    })
    .where(eq(worldBosses.id, attempt.bossId));
}
