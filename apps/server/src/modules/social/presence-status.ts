import {
  riftLobbies,
  riftLobbyMembers,
  riftRunParticipants,
  riftRuns,
  type DbOrTx,
} from '@realms/db';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { AppContext } from '../../context.js';

/**
 * Which of these characters are "online": in the world (presence), in an
 * open lobby, or fighting in an active Rift run.
 */
export async function onlineCharacterIds(
  ctx: AppContext,
  db: DbOrTx,
  ids: string[],
): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const online = new Set((await ctx.presence.list(ctx.world.id)).map((e) => e.player.characterId));
  const inLobby = await db
    .select({ id: riftLobbyMembers.characterId })
    .from(riftLobbyMembers)
    .innerJoin(riftLobbies, eq(riftLobbies.id, riftLobbyMembers.lobbyId))
    .where(and(inArray(riftLobbyMembers.characterId, ids), eq(riftLobbies.status, 'open')));
  const inRun = await db
    .select({ id: riftRunParticipants.characterId })
    .from(riftRunParticipants)
    .innerJoin(riftRuns, eq(riftRuns.id, riftRunParticipants.runId))
    .where(
      and(
        inArray(riftRunParticipants.characterId, ids),
        eq(riftRuns.status, 'active'),
        isNull(riftRunParticipants.leftAt),
      ),
    );
  for (const r of [...inLobby, ...inRun]) online.add(r.id);
  return new Set(ids.filter((id) => online.has(id)));
}
