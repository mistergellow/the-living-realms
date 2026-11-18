import {
  characters,
  items,
  riftLobbies,
  riftLobbyMembers,
  riftRunParticipants,
  riftRuns,
  worldEvents,
  type Character,
  type Database,
  type DbOrTx,
  type RiftRun,
} from '@realms/db';
import {
  applyAction,
  COMBAT_RULES,
  createEncounter,
  enterNextRoom,
  getItemDef,
  getRift,
  leaveParty,
  partyId,
  qualityAfterDefeat,
  Rng,
  RIFTS,
  seedFrom,
  timeoutTurn,
  toCombatView,
  type CombatState,
  type PartyMemberInput,
  type RiftDef,
} from '@realms/game-core';
import {
  ErrorCode,
  type CombatAction,
  type RiftDto,
  type RunDto,
  type RunPenaltyDto,
  type RunRewardsDto,
  type RunStatus,
} from '@realms/shared';
import { and, eq, isNotNull, sql } from 'drizzle-orm';
import { randomInt } from 'node:crypto';
import type { AppContext } from '../../context.js';
import { AppError, errors } from '../../lib/errors.js';
import type { CharacterSheetService } from '../characters/sheet.service.js';
import { riftsRepository as repo } from './rifts.repository.js';

type ParticipantResult = { rewards?: RunRewardsDto; penalty?: RunPenaltyDto };

const TURN_MS = COMBAT_RULES.turnSeconds * 1000;
const MAX_CATCH_UP_TURNS = 50;

export const toRiftDto = (r: RiftDef): RiftDto => ({
  id: r.id,
  name: r.name,
  description: r.description,
  rooms: r.rooms.map((room) => ({ name: room.name, isBoss: !!room.isBoss })),
});

/** Ranged and caster weapons start in the back column; everything else in front (A31). */
export function startingSlot(abilityIds: string[]): number {
  const backline = ['aimed_shot', 'arcane_bolt', 'spark'].some((a) => abilityIds.includes(a));
  return backline ? 4 : 0;
}

/** A character can only be in one active Rift run and one open lobby at a time. */
export async function assertFreeForRift(
  tx: DbOrTx,
  characterId: string,
  exceptLobbyId?: string,
): Promise<void> {
  if (await repo.activeRunIdFor(tx, characterId))
    throw new AppError(409, ErrorCode.IN_RIFT, 'This character is already inside a Rift.');
  const [lobby] = await tx
    .select({ id: riftLobbies.id })
    .from(riftLobbyMembers)
    .innerJoin(riftLobbies, eq(riftLobbies.id, riftLobbyMembers.lobbyId))
    .where(and(eq(riftLobbyMembers.characterId, characterId), eq(riftLobbies.status, 'open')));
  if (lobby && lobby.id !== exceptLobbyId)
    throw new AppError(
      409,
      ErrorCode.IN_LOBBY,
      'This character is already in a lobby. Leave it first.',
    );
}

const statusOf = (state: CombatState): RunStatus =>
  state.phase === 'ended' ? (state.outcome === 'victory' ? 'victory' : 'defeat') : 'active';

export class RiftsService {
  private readonly db: Database;
  constructor(
    private readonly ctx: AppContext,
    private readonly sheets: CharacterSheetService,
  ) {
    this.db = ctx.db;
  }

  list(): RiftDto[] {
    return Object.values(RIFTS).map(toRiftDto);
  }

  async active(accountId: string, characterId: string): Promise<RunDto | null> {
    await this.sheets.getOwnedCharacter(this.db, accountId, characterId);
    const runId = await repo.activeRunIdFor(this.db, characterId);
    return runId ? this.get(accountId, runId, characterId) : null;
  }

  /** Start a solo run. Groups start from a lobby (LobbiesService). */
  async start(accountId: string, riftId: string, characterId: string): Promise<RunDto> {
    const rift = getRift(riftId);
    if (!rift) throw errors.notFound('Rift');
    const runId = await this.db.transaction(async (tx) => {
      const c = await this.sheets.getOwnedCharacter(tx, accountId, characterId, true);
      await assertFreeForRift(tx, c.id);
      return this.createRun(tx, rift, [{ accountId, character: c }]);
    });
    return this.get(accountId, runId, characterId);
  }

  /**
   * Create a run for one or more characters (locked and checked by the caller).
   * Slots: the lobby's choice, otherwise by weapon (A20).
   */
  async createRun(
    tx: DbOrTx,
    rift: RiftDef,
    members: Array<{ accountId: string; character: Character; slot?: number }>,
  ): Promise<string> {
    const party: PartyMemberInput[] = [];
    const used = new Set<number>();
    for (const m of members) {
      const profile = await this.sheets.combatProfile(tx, m.character);
      let slot = m.slot ?? startingSlot(profile.abilityIds);
      if (used.has(slot)) slot = [0, 1, 2, 3, 4, 5].find((s) => !used.has(s))!;
      used.add(slot);
      party.push({
        characterId: m.character.id,
        name: m.character.name,
        appearance: profile.appearance,
        attributes: profile.attributes,
        stats: profile.stats,
        abilityIds: profile.abilityIds,
        hp: profile.stats.maxHp,
        mana: profile.stats.maxMana,
        slot,
      });
    }
    const state = createEncounter({
      party,
      room: rift.rooms[0]!,
      roomIndex: 0,
      isLastRoom: rift.rooms.length === 1,
      seed: randomInt(2 ** 31),
    });
    const [run] = await tx
      .insert(riftRuns)
      .values({
        worldId: this.ctx.world.id,
        riftId: rift.id,
        state,
        turnDeadline: new Date(Date.now() + TURN_MS),
      })
      .returning({ id: riftRuns.id });
    for (const m of members) {
      await tx
        .insert(riftRunParticipants)
        .values({ runId: run!.id, characterId: m.character.id, accountId: m.accountId });
      await tx.insert(worldEvents).values({
        worldId: this.ctx.world.id,
        type: 'rift.entered',
        actorAccountId: m.accountId,
        actorCharacterId: m.character.id,
        payload: { riftId: rift.id, runId: run!.id, partySize: members.length },
      });
    }
    return run!.id;
  }

  async get(accountId: string, runId: string, characterId: string): Promise<RunDto> {
    // Reading may apply expired turn timers, which writes: use a transaction.
    return this.db.transaction(async (tx) => {
      const run = await this.loadForParticipant(tx, accountId, runId, characterId, true);
      const updated = await this.catchUpTimers(tx, run);
      return this.toRunDto(tx, updated, characterId);
    });
  }

  async act(
    accountId: string,
    runId: string,
    characterId: string,
    action: CombatAction,
  ): Promise<RunDto> {
    return this.db.transaction(async (tx) => {
      let run = await this.loadForParticipant(tx, accountId, runId, characterId, true);
      run = await this.catchUpTimers(tx, run);
      if (run.status !== 'active')
        throw new AppError(409, ErrorCode.INVALID_ACTION, 'This Rift run has ended.');
      if ((await repo.participant(tx, run.id, characterId))?.leftAt)
        throw new AppError(409, ErrorCode.INVALID_ACTION, 'You left this Rift.');
      const rift = getRift(run.riftId)!;
      let state = run.state as CombatState;
      let roomIndex = run.roomIndex;

      if (action.type === 'abandon') {
        // A28: the leaver is penalised now; the others keep fighting.
        await this.penalise(tx, run, characterId, true);
        state = leaveParty(state, partyId(characterId));
        return this.saveAndFinish(tx, run, state, roomIndex, characterId, statusOf(state));
      }
      if (action.type === 'advance') {
        if (state.phase !== 'room_cleared')
          throw new AppError(400, ErrorCode.INVALID_ACTION, 'Clear the room first.');
        roomIndex += 1;
        state = enterNextRoom(
          state,
          rift.rooms[roomIndex]!,
          roomIndex,
          roomIndex === rift.rooms.length - 1,
        );
      } else {
        const result = applyAction(state, partyId(characterId), action);
        if (!result.ok)
          throw new AppError(
            result.code === 'NOT_YOUR_TURN' ? 409 : 400,
            ErrorCode[result.code],
            result.reason,
          );
        state = result.state;
      }
      return this.saveAndFinish(tx, run, state, roomIndex, characterId, statusOf(state));
    });
  }

  // ---------------------------------------------------------------------------
  private async loadForParticipant(
    tx: DbOrTx,
    accountId: string,
    runId: string,
    characterId: string,
    lock: boolean,
  ) {
    await this.sheets.getOwnedCharacter(tx, accountId, characterId);
    const run = await repo.findRun(tx, runId, lock);
    if (!run || !(await repo.participant(tx, runId, characterId)))
      throw errors.notFound('Rift run');
    return run;
  }

  /** Apply turn timeouts that expired while nobody was looking (D16). */
  private async catchUpTimers(tx: DbOrTx, run: RiftRun): Promise<RiftRun> {
    if (run.status !== 'active' || !run.turnDeadline) return run;
    let state = run.state as CombatState;
    let deadline = run.turnDeadline.getTime();
    const now = Date.now();
    let changed = false;
    for (let i = 0; i < MAX_CATCH_UP_TURNS && state.phase === 'party' && deadline <= now; i++) {
      state = timeoutTurn(state);
      deadline += TURN_MS;
      changed = true;
    }
    if (!changed) return run;
    const status = statusOf(state);
    if (status !== 'active') await this.finish(tx, run, status);
    const [updated] = await tx
      .update(riftRuns)
      .set({
        state,
        status,
        version: sql`${riftRuns.version} + 1`,
        turnDeadline: state.phase === 'party' ? new Date(deadline) : null,
        endedAt: status === 'active' ? null : new Date(),
      })
      .where(eq(riftRuns.id, run.id))
      .returning();
    return updated!;
  }

  private async saveAndFinish(
    tx: DbOrTx,
    run: RiftRun,
    state: CombatState,
    roomIndex: number,
    characterId: string,
    status: RunStatus,
  ): Promise<RunDto> {
    const prev = run.state as CombatState;
    // A new turn starts a fresh 60 s timer; otherwise the current one keeps running.
    const turnChanged =
      prev.activeId !== state.activeId || prev.round !== state.round || roomIndex !== run.roomIndex;
    const turnDeadline =
      state.phase !== 'party'
        ? null
        : turnChanged || !run.turnDeadline
          ? new Date(Date.now() + TURN_MS)
          : run.turnDeadline;
    if (status !== 'active') await this.finish(tx, { ...run, roomIndex }, status);
    const [updated] = await tx
      .update(riftRuns)
      .set({
        state,
        roomIndex,
        status,
        version: sql`${riftRuns.version} + 1`,
        turnDeadline,
        endedAt: status === 'active' ? null : new Date(),
      })
      .where(eq(riftRuns.id, run.id))
      .returning();
    return this.toRunDto(tx, updated!, characterId);
  }

  /** Rewards on victory (D20), equipment quality loss on defeat (D19/D30). */
  private async finish(tx: DbOrTx, run: RiftRun, status: RunStatus): Promise<void> {
    const rift = getRift(run.riftId)!;
    for (const p of await repo.participants(tx, run.id)) {
      if (p.leftAt) continue; // already penalised when they left
      if (status !== 'victory') {
        await this.penalise(tx, run, p.characterId, false);
        continue;
      }
      const rng = new Rng(seedFrom(`${run.id}:${p.characterId}`));
      const dropped: RunRewardsDto['items'] = [];
      const totalWeight = rift.rewards.loot.reduce((s, l) => s + l.weight, 0);
      for (let i = 0; i < rift.rewards.drops; i++) {
        let roll = rng.next() * totalWeight;
        const entry =
          rift.rewards.loot.find((l) => (roll -= l.weight) < 0) ?? rift.rewards.loot[0]!;
        const [row] = await tx
          .insert(items)
          .values({ characterId: p.characterId, itemDefId: entry.item, source: 'drop' })
          .returning({ id: items.id });
        dropped.push({ id: row!.id, name: getItemDef(entry.item)?.name ?? entry.item });
      }
      await tx
        .update(characters)
        .set({ reputation: sql`${characters.reputation} + ${rift.rewards.reputation}` })
        .where(eq(characters.id, p.characterId));
      await this.recordResult(
        tx,
        run,
        p.characterId,
        p.accountId,
        { rewards: { reputation: rift.rewards.reputation, items: dropped } },
        'victory',
      );
    }
  }

  /** Equipped items lose quality (D30); `left` marks an early leaver (A28). */
  private async penalise(
    tx: DbOrTx,
    run: RiftRun,
    characterId: string,
    left: boolean,
  ): Promise<void> {
    const p = await repo.participant(tx, run.id, characterId);
    if (!p || p.leftAt) return;
    const equipped = await tx
      .select()
      .from(items)
      .where(and(eq(items.characterId, characterId), isNotNull(items.equippedSlot)));
    const damaged: RunPenaltyDto['damaged'] = [];
    for (const it of equipped) {
      const quality = qualityAfterDefeat(it.quality);
      await tx.update(items).set({ quality }).where(eq(items.id, it.id));
      damaged.push({
        id: it.id,
        name: getItemDef(it.itemDefId)?.name ?? it.itemDefId,
        quality,
        broken: quality <= 0,
      });
    }
    if (left)
      await tx
        .update(riftRunParticipants)
        .set({ leftAt: new Date() })
        .where(
          and(
            eq(riftRunParticipants.runId, run.id),
            eq(riftRunParticipants.characterId, characterId),
          ),
        );
    await this.recordResult(
      tx,
      run,
      characterId,
      p.accountId,
      { penalty: { damaged } },
      left ? 'abandoned' : 'defeat',
    );
  }

  private async recordResult(
    tx: DbOrTx,
    run: RiftRun,
    characterId: string,
    accountId: string,
    result: ParticipantResult,
    status: RunStatus,
  ): Promise<void> {
    await tx
      .update(riftRunParticipants)
      .set({ result })
      .where(
        and(
          eq(riftRunParticipants.runId, run.id),
          eq(riftRunParticipants.characterId, characterId),
        ),
      );
    await tx.insert(worldEvents).values({
      worldId: run.worldId,
      type:
        status === 'victory'
          ? 'rift.completed'
          : status === 'abandoned'
            ? 'rift.left'
            : 'rift.failed',
      actorAccountId: accountId,
      actorCharacterId: characterId,
      payload: { riftId: run.riftId, runId: run.id, status, roomIndex: run.roomIndex },
    });
  }

  private async toRunDto(tx: DbOrTx, run: RiftRun, characterId: string): Promise<RunDto> {
    const rift = getRift(run.riftId)!;
    const me = await repo.participant(tx, run.id, characterId);
    const result = (me?.result ?? null) as ParticipantResult | null;
    // A player who left sees the run as over for them.
    const status: RunStatus = me?.leftAt ? 'abandoned' : (run.status as RunStatus);
    return {
      id: run.id,
      riftId: run.riftId,
      riftName: rift.name,
      status,
      roomIndex: run.roomIndex,
      rooms: toRiftDto(rift).rooms,
      combat: toCombatView(run.state as CombatState),
      turnDeadline: run.turnDeadline?.toISOString() ?? null,
      rewards: status === 'active' ? null : (result?.rewards ?? null),
      penalty: status === 'active' ? null : (result?.penalty ?? null),
    };
  }
}
