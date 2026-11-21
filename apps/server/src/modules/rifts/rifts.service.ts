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
  combatAction,
  COMBAT_RULES,
  continueRun,
  createPvpRun,
  createRun,
  PVP_ARENA_ID,
  PVP_ARENA_NAME,
  currentRoomType,
  getEnemy,
  getEvent,
  getItemDef,
  getRift,
  hasDeadline,
  leaveRun,
  qualityAfterDefeat,
  riftDepth,
  Rng,
  RIFTS,
  RUN_STATE_VERSION,
  seedFrom,
  timeoutRun,
  toCombatView,
  toMapDto,
  toRunMembers,
  toThreatView,
  vote,
  type RiftDef,
  type RunMember,
  type RunResult,
  type RunState,
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

/** Combat planning and group decisions both use the 60 s timer (D16). */
const TURN_MS = COMBAT_RULES.turnSeconds * 1000;
const MAX_CATCH_UP_TURNS = 50;

const bossName = (r: RiftDef) =>
  r.encounters.boss.enemies.map((e) => getEnemy(e.enemy)).find((e) => e?.isBoss)?.name ??
  r.encounters.boss.name;

export const toRiftDto = (r: RiftDef): RiftDto => ({
  id: r.id,
  name: r.name,
  description: r.description,
  depth: riftDepth(r),
  bossName: bossName(r),
});

/** Ranged and caster weapons start in the back column; everything else in front (A31). */
export function startingSlot(abilityIds: string[]): number {
  const backline = ['aimed_shot', 'arcane_bolt', 'spark', 'wand_bolt', 'staff_strike'].some((a) =>
    abilityIds.includes(a),
  );
  return backline ? 4 : 0;
}

/** Runs created before request #31 have no `version`; they were closed by migration 0008. */
const runStateOf = (run: RiftRun): RunState => {
  const state = run.state as RunState;
  if (state.version !== RUN_STATE_VERSION)
    throw new AppError(409, ErrorCode.INVALID_ACTION, 'This Rift run is from an older version.');
  return state;
};

/** Identifies the current timed decision: a new one starts a fresh 60 s timer. */
const decisionKey = (s: RunState) =>
  `${s.phase}:${s.roomsVisited}:${s.combat?.round ?? 0}:${s.event?.result ? 'r' : ''}`;

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

const statusOf = (state: RunState): RunStatus => state.status;

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

  /** PvP arena match (request #33, test mode) for two teams from a lobby. */
  async createPvpRun(
    tx: DbOrTx,
    teamA: Array<{ accountId: string; character: Character; slot: number }>,
    teamB: Array<{ accountId: string; character: Character; slot: number }>,
    leaderId: string,
  ): Promise<string> {
    const toMember = async (m: { character: Character; slot: number }) => {
      const profile = await this.sheets.combatProfile(tx, m.character);
      return {
        characterId: m.character.id,
        name: m.character.name,
        appearance: profile.appearance,
        baseAttributes: profile.baseAttributes,
        attributes: profile.attributes,
        stats: profile.stats,
        abilityIds: profile.abilityIds,
        abilityMultipliers: profile.abilityMultipliers,
        hp: profile.stats.maxHp,
        mana: profile.stats.maxMana,
        slot: m.slot,
      };
    };
    const state = createPvpRun({
      teamA: await Promise.all(teamA.map(toMember)),
      teamB: await Promise.all(teamB.map(toMember)),
      leaderId,
      seed: randomInt(2 ** 31),
    });
    const [run] = await tx
      .insert(riftRuns)
      .values({
        worldId: this.ctx.world.id,
        riftId: PVP_ARENA_ID,
        state,
        roomIndex: 1,
        turnDeadline: new Date(Date.now() + TURN_MS),
      })
      .returning({ id: riftRuns.id });
    for (const m of [...teamA, ...teamB]) {
      await tx
        .insert(riftRunParticipants)
        .values({ runId: run!.id, characterId: m.character.id, accountId: m.accountId });
      await tx.insert(worldEvents).values({
        worldId: this.ctx.world.id,
        type: 'pvp.entered',
        actorAccountId: m.accountId,
        actorCharacterId: m.character.id,
        payload: { runId: run!.id, teamA: teamA.length, teamB: teamB.length },
      });
    }
    return run!.id;
  }

  /**
   * Create a run for one or more characters (locked and checked by the caller).
   * Slots: the lobby's choice, otherwise by weapon (A20).
   */
  async createRun(
    tx: DbOrTx,
    rift: RiftDef,
    members: Array<{ accountId: string; character: Character; slot?: number }>,
    leaderId?: string,
  ): Promise<string> {
    const party: Array<Omit<RunMember, 'conditions' | 'left'>> = [];
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
        baseAttributes: profile.baseAttributes,
        attributes: profile.attributes,
        stats: profile.stats,
        abilityIds: profile.abilityIds,
        abilityMultipliers: profile.abilityMultipliers,
        hp: profile.stats.maxHp,
        mana: profile.stats.maxMana,
        slot,
      });
    }
    const state = createRun({
      rift,
      party,
      leaderId: leaderId ?? members[0]!.character.id,
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
      let state = runStateOf(run);

      if (action.type === 'abandon') {
        // A28: the leaver is penalised now; the others keep going.
        await this.penalise(tx, run, characterId, true);
        state = leaveRun(state, characterId);
        return this.saveAndFinish(tx, run, state, characterId);
      }
      let result: RunResult;
      switch (action.type) {
        case 'plan':
        case 'unplan':
        case 'ready':
          result = combatAction(state, characterId, action);
          break;
        case 'vote':
          result = vote(state, characterId, action.optionId, action.testerId);
          break;
        case 'continue':
          result = continueRun(state);
          break;
      }
      if (!result.ok)
        throw new AppError(
          result.code === 'NOT_YOUR_TURN' ? 409 : 400,
          ErrorCode[result.code],
          result.reason,
        );
      return this.saveAndFinish(tx, run, result.state, characterId);
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

  /** Apply decision/planning timeouts that expired while nobody was looking (D16). */
  private async catchUpTimers(tx: DbOrTx, run: RiftRun): Promise<RiftRun> {
    if (run.status !== 'active' || !run.turnDeadline) return run;
    let state = runStateOf(run);
    let deadline = run.turnDeadline.getTime();
    const now = Date.now();
    let changed = false;
    for (let i = 0; i < MAX_CATCH_UP_TURNS && hasDeadline(state) && deadline <= now; i++) {
      state = timeoutRun(state);
      deadline += TURN_MS;
      changed = true;
    }
    if (!changed) return run;
    const status = statusOf(state);
    if (status !== 'active') await this.finish(tx, { ...run, state }, status);
    const [updated] = await tx
      .update(riftRuns)
      .set({
        state,
        status,
        roomIndex: state.roomsVisited,
        version: sql`${riftRuns.version} + 1`,
        turnDeadline: hasDeadline(state) ? new Date(Math.max(deadline, now + 1000)) : null,
        endedAt: status === 'active' ? null : new Date(),
      })
      .where(eq(riftRuns.id, run.id))
      .returning();
    return updated!;
  }

  private async saveAndFinish(
    tx: DbOrTx,
    run: RiftRun,
    state: RunState,
    characterId: string,
  ): Promise<RunDto> {
    const prev = run.state as RunState;
    const status = statusOf(state);
    // A new decision starts a fresh 60 s timer; otherwise the current one keeps running.
    const turnDeadline = !hasDeadline(state)
      ? null
      : decisionKey(prev) !== decisionKey(state) || !run.turnDeadline
        ? new Date(Date.now() + TURN_MS)
        : run.turnDeadline;
    if (status !== 'active')
      await this.finish(tx, { ...run, state, roomIndex: state.roomsVisited }, status);
    const [updated] = await tx
      .update(riftRuns)
      .set({
        state,
        roomIndex: state.roomsVisited,
        status,
        version: sql`${riftRuns.version} + 1`,
        turnDeadline,
        endedAt: status === 'active' ? null : new Date(),
      })
      .where(eq(riftRuns.id, run.id))
      .returning();
    return this.toRunDto(tx, updated!, characterId);
  }

  /**
   * Rewards on victory (D20): reputation, boss drops and the items found on the
   * way; equipment quality loss on defeat (D19/D30) — a wiped party keeps nothing.
   */
  private async finish(tx: DbOrTx, run: RiftRun, status: RunStatus): Promise<void> {
    if (run.riftId === PVP_ARENA_ID) {
      // PvP test mode: no rewards, no equipment damage — just the result.
      const state = run.state as RunState;
      for (const p of await repo.participants(tx, run.id)) {
        if (p.leftAt) continue;
        const team = state.party.find((m) => m.characterId === p.characterId)?.team;
        await this.recordResult(
          tx,
          run,
          p.characterId,
          p.accountId,
          {},
          team === state.winner ? 'victory' : 'defeat',
        );
      }
      return;
    }
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
      // Items found on the way (Loot/Secret rooms, events) are only kept on
      // victory, by those still in the party (request #33).
      const state = run.state as RunState;
      const stayed = state.party.some((m) => m.characterId === p.characterId && !m.left);
      for (const g of stayed ? state.grants.filter((x) => x.characterId === p.characterId) : []) {
        const [row] = await tx
          .insert(items)
          .values({ characterId: g.characterId, itemDefId: g.itemDefId, source: g.source })
          .returning({ id: items.id });
        dropped.push({ id: row!.id, name: getItemDef(g.itemDefId)?.name ?? g.itemDefId });
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
    // PvP test mode: leaving or losing never damages equipment.
    const equipped =
      run.riftId === PVP_ARENA_ID
        ? []
        : await tx
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
        run.riftId === PVP_ARENA_ID
          ? 'pvp.finished'
          : status === 'victory'
            ? 'rift.completed'
            : status === 'abandoned'
              ? 'rift.left'
              : 'rift.failed',
      actorAccountId: accountId,
      actorCharacterId: characterId,
      payload: { riftId: run.riftId, runId: run.id, status, roomsVisited: run.roomIndex },
    });
  }

  private async toRunDto(tx: DbOrTx, run: RiftRun, characterId: string): Promise<RunDto> {
    const state = runStateOf(run);
    const pvp = state.mode === 'pvp';
    const me = await repo.participant(tx, run.id, characterId);
    const result = (me?.result ?? null) as ParticipantResult | null;
    const myTeam = state.party.find((m) => m.characterId === characterId)?.team ?? 'party';
    // A player who left sees the run as over for them; in PvP the result is per team.
    const status: RunStatus = me?.leftAt
      ? 'abandoned'
      : pvp && run.status !== 'active'
        ? state.winner === myTeam
          ? 'victory'
          : 'defeat'
        : (run.status as RunStatus);
    const combat = state.combat ? toCombatView(state.combat) : null;
    // PvP: the other team's plan stays secret until it resolves.
    if (combat && pvp)
      combat.plan = combat.plan.filter(
        (p) => combat.combatants.find((c) => c.id === p.actorId)?.side === myTeam,
      );
    const event = state.event ? getEvent(state.event.eventId) : undefined;
    return {
      id: run.id,
      riftId: run.riftId,
      riftName: pvp ? PVP_ARENA_NAME : (getRift(run.riftId)?.name ?? run.riftId),
      mode: pvp ? 'pvp' : 'rift',
      status,
      phase: state.phase,
      roomsVisited: state.roomsVisited,
      map: toMapDto(state),
      roomType: currentRoomType(state),
      party: toRunMembers(state),
      leaderId: state.leaderId,
      combat,
      event:
        state.event && event
          ? {
              eventId: event.id,
              title: event.title,
              text: event.text,
              approaches: event.approaches.map((a) => ({
                id: a.id,
                label: a.label,
                description: a.description,
                attribute: a.attribute,
                difficulty: a.difficulty,
              })),
              result: state.event.result,
            }
          : null,
      outcome: state.outcome,
      threat: toThreatView(state),
      votes: state.votes,
      deadline: run.turnDeadline?.toISOString() ?? null,
      rewards: status === 'active' ? null : (result?.rewards ?? null),
      penalty: status === 'active' ? null : (result?.penalty ?? null),
    };
  }
}
