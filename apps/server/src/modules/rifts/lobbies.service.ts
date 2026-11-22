import {
  characters,
  items,
  riftLobbies,
  riftLobbyInvites,
  riftLobbyMembers,
  type Character,
  type Database,
  type DbOrTx,
  type RiftLobby,
} from '@realms/db';
import {
  AP_RULES,
  CURRENT_WORLD_BOSS_SEASON,
  getItemDef,
  getRift,
  PVP_ARENA_NAME,
  WORLD_BOSS_ID,
} from '@realms/game-core';
import {
  ErrorCode,
  LOBBY_MAX_MEMBERS,
  PVP_ARENA_ID,
  PVP_MAX_MEMBERS,
  PVP_TEAM_B_OFFSET,
  type CharacterAppearance,
  type LobbyDto,
  type LobbyOverviewDto,
  type LobbyVisibility,
} from '@realms/shared';
import { and, asc, eq, inArray, isNotNull, ne } from 'drizzle-orm';
import type { AppContext } from '../../context.js';
import { AppError, errors } from '../../lib/errors.js';
import type { CharacterSheetService } from '../characters/sheet.service.js';
import type { FriendsService } from '../social/friends.service.js';
import { spendAp } from '../characters/ap.js';
import type { WorldBossService } from '../worldboss/worldboss.service.js';
import {
  assertAtRift,
  assertFreeForRift,
  startingSlot,
  toRiftDto,
  type RiftsService,
} from './rifts.service.js';

/** PvP arena lobbies (request #33) use the same tables, with riftId = 'pvp_arena'. */
const isPvp = (riftId: string) => riftId === PVP_ARENA_ID;
/** World boss lobbies (request #43): riftId = 'world_boss'. */
const isBoss = (riftId: string) => riftId === WORLD_BOSS_ID;
const lobbyName = (riftId: string) =>
  isPvp(riftId)
    ? PVP_ARENA_NAME
    : isBoss(riftId)
      ? CURRENT_WORLD_BOSS_SEASON.name
      : (getRift(riftId)?.name ?? riftId);
const maxMembers = (riftId: string) => (isPvp(riftId) ? PVP_MAX_MEMBERS : LOBBY_MAX_MEMBERS);

const notLeader = () =>
  new AppError(403, ErrorCode.NOT_LEADER, 'Only the lobby leader can do that.');

/**
 * Rift lobbies (M3): up to 6 characters gather, choose formation slots and get
 * ready; the leader starts the run for everyone. Public lobbies can be joined
 * by anyone (A26); private ones by invitation from a member.
 */
export class LobbiesService {
  private readonly db: Database;
  constructor(
    private readonly ctx: AppContext,
    private readonly sheets: CharacterSheetService,
    private readonly rifts: RiftsService,
    private readonly friends: FriendsService,
    private readonly worldBoss: WorldBossService,
  ) {
    this.db = ctx.db;
  }

  // ---------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------
  async overview(accountId: string, characterId: string): Promise<LobbyOverviewDto> {
    await this.sheets.getOwnedCharacter(this.db, accountId, characterId);
    const mineId = await this.currentLobbyId(this.db, characterId);
    const invites = await this.db
      .select({
        lobbyId: riftLobbyInvites.lobbyId,
        riftId: riftLobbies.riftId,
        from: characters.name,
      })
      .from(riftLobbyInvites)
      .innerJoin(riftLobbies, eq(riftLobbies.id, riftLobbyInvites.lobbyId))
      .innerJoin(characters, eq(characters.id, riftLobbyInvites.invitedBy))
      .where(and(eq(riftLobbyInvites.characterId, characterId), eq(riftLobbies.status, 'open')));
    const open = await this.db
      .select({ id: riftLobbies.id, riftId: riftLobbies.riftId, leader: characters.name })
      .from(riftLobbies)
      .innerJoin(characters, eq(characters.id, riftLobbies.leaderCharacterId))
      .where(and(eq(riftLobbies.status, 'open'), eq(riftLobbies.visibility, 'public')))
      .orderBy(asc(riftLobbies.createdAt))
      .limit(50);
    const counts = await this.memberCounts([
      ...open.map((l) => l.id),
      ...invites.map((i) => i.lobbyId),
    ]);
    return {
      mine: mineId ? await this.toDto(this.db, mineId) : null,
      invites: invites.map((i) => ({
        lobbyId: i.lobbyId,
        riftName: lobbyName(i.riftId),
        from: i.from,
        memberCount: counts.get(i.lobbyId) ?? 0,
      })),
      publicLobbies: open
        .filter((l) => l.id !== mineId && (counts.get(l.id) ?? 0) < maxMembers(l.riftId))
        .map((l) => ({
          id: l.id,
          riftName: lobbyName(l.riftId),
          leaderName: l.leader,
          memberCount: counts.get(l.id) ?? 0,
          maxMembers: maxMembers(l.riftId),
        })),
    };
  }

  async get(accountId: string, characterId: string, lobbyId: string): Promise<LobbyDto> {
    await this.sheets.getOwnedCharacter(this.db, accountId, characterId);
    await this.membership(this.db, lobbyId, characterId);
    return this.toDto(this.db, lobbyId);
  }

  // ---------------------------------------------------------------------------
  // Writes (each locks the lobby row; joins/creates also lock the character)
  // ---------------------------------------------------------------------------
  async create(
    accountId: string,
    characterId: string,
    riftId: string,
    visibility: LobbyVisibility,
  ) {
    const rift = isPvp(riftId) || isBoss(riftId) ? undefined : getRift(riftId);
    if (!isPvp(riftId) && !isBoss(riftId) && !rift) throw errors.notFound('Rift');
    const lobbyId = await this.db.transaction(async (tx) => {
      const c = await this.sheets.getOwnedCharacter(tx, accountId, characterId, true);
      await assertFreeForRift(tx, c.id);
      if (rift) assertAtRift(rift, [c]);
      const [lobby] = await tx
        .insert(riftLobbies)
        .values({ worldId: this.ctx.world.id, riftId, leaderCharacterId: c.id, visibility })
        .returning({ id: riftLobbies.id });
      await tx.insert(riftLobbyMembers).values({
        lobbyId: lobby!.id,
        characterId: c.id,
        accountId,
        slot: await this.preferredSlot(tx, c, [], riftId),
      });
      return lobby!.id;
    });
    return this.toDto(this.db, lobbyId);
  }

  async join(accountId: string, characterId: string, lobbyId: string) {
    await this.db.transaction(async (tx) => {
      const c = await this.sheets.getOwnedCharacter(tx, accountId, characterId, true);
      const lobby = await this.lockOpenLobby(tx, lobbyId);
      await assertFreeForRift(tx, c.id, lobby.id);
      const members = await this.members(tx, lobby.id);
      if (members.some((m) => m.characterId === c.id)) return;
      const [invite] = await tx
        .select()
        .from(riftLobbyInvites)
        .where(and(eq(riftLobbyInvites.lobbyId, lobby.id), eq(riftLobbyInvites.characterId, c.id)));
      if (lobby.visibility === 'private' && !invite)
        throw errors.forbidden('This lobby is invite only.');
      if (members.length >= maxMembers(lobby.riftId))
        throw new AppError(409, ErrorCode.LOBBY_FULL, 'The lobby is full.');
      const slot = await this.preferredSlot(
        tx,
        c,
        members.map((m) => m.slot),
        lobby.riftId,
      );
      await tx
        .insert(riftLobbyMembers)
        .values({ lobbyId: lobby.id, characterId: c.id, accountId, slot });
      await tx
        .delete(riftLobbyInvites)
        .where(and(eq(riftLobbyInvites.lobbyId, lobby.id), eq(riftLobbyInvites.characterId, c.id)));
    });
    return this.toDto(this.db, lobbyId);
  }

  /** Leave (or decline an invite). The next member becomes leader; an empty lobby closes. */
  async leave(accountId: string, characterId: string, lobbyId: string): Promise<void> {
    await this.sheets.getOwnedCharacter(this.db, accountId, characterId);
    await this.db.transaction(async (tx) => {
      await tx
        .delete(riftLobbyInvites)
        .where(
          and(eq(riftLobbyInvites.lobbyId, lobbyId), eq(riftLobbyInvites.characterId, characterId)),
        );
      const [lobby] = await tx
        .select()
        .from(riftLobbies)
        .where(eq(riftLobbies.id, lobbyId))
        .for('update');
      if (!lobby || lobby.status !== 'open') return;
      await this.removeMember(tx, lobby, characterId);
    });
  }

  async kick(accountId: string, characterId: string, lobbyId: string, targetId: string) {
    await this.db.transaction(async (tx) => {
      await this.sheets.getOwnedCharacter(tx, accountId, characterId);
      const lobby = await this.lockOpenLobby(tx, lobbyId);
      if (lobby.leaderCharacterId !== characterId) throw notLeader();
      if (targetId === characterId) throw errors.validation('Use Leave to leave your own lobby.');
      await this.removeMember(tx, lobby, targetId);
    });
    return this.toDto(this.db, lobbyId);
  }

  /** Move to a slot; if someone is there, swap places. */
  async setSlot(accountId: string, characterId: string, lobbyId: string, slot: number) {
    await this.db.transaction(async (tx) => {
      await this.sheets.getOwnedCharacter(tx, accountId, characterId);
      const lobby = await this.lockOpenLobby(tx, lobbyId);
      if (slot >= maxMembers(lobby.riftId)) throw errors.validation('That slot does not exist.');
      const members = await this.members(tx, lobby.id);
      const me = members.find((m) => m.characterId === characterId);
      if (!me) throw errors.notFound('Lobby');
      const other = members.find((m) => m.slot === slot);
      if (other?.characterId === characterId) return;
      const where = (cid: string) =>
        and(eq(riftLobbyMembers.lobbyId, lobby.id), eq(riftLobbyMembers.characterId, cid));
      if (other) {
        // Park the other member on a temporary slot to respect the unique index.
        await tx.update(riftLobbyMembers).set({ slot: -1 }).where(where(other.characterId));
        await tx.update(riftLobbyMembers).set({ slot }).where(where(characterId));
        await tx.update(riftLobbyMembers).set({ slot: me.slot }).where(where(other.characterId));
      } else {
        await tx.update(riftLobbyMembers).set({ slot }).where(where(characterId));
      }
    });
    return this.toDto(this.db, lobbyId);
  }

  async setReady(accountId: string, characterId: string, lobbyId: string, ready: boolean) {
    await this.db.transaction(async (tx) => {
      await this.sheets.getOwnedCharacter(tx, accountId, characterId);
      const lobby = await this.lockOpenLobby(tx, lobbyId);
      await this.membership(tx, lobby.id, characterId);
      await tx
        .update(riftLobbyMembers)
        .set({ ready })
        .where(
          and(
            eq(riftLobbyMembers.lobbyId, lobby.id),
            eq(riftLobbyMembers.characterId, characterId),
          ),
        );
    });
    return this.toDto(this.db, lobbyId);
  }

  async invite(accountId: string, characterId: string, lobbyId: string, friendId: string) {
    await this.db.transaction(async (tx) => {
      await this.sheets.getOwnedCharacter(tx, accountId, characterId);
      const lobby = await this.lockOpenLobby(tx, lobbyId);
      await this.membership(tx, lobby.id, characterId);
      if (!(await this.friends.areFriends(characterId, friendId)))
        throw errors.validation('You can only invite friends.');
      await tx
        .insert(riftLobbyInvites)
        .values({ lobbyId: lobby.id, characterId: friendId, invitedBy: characterId })
        .onConflictDoNothing();
    });
    return this.toDto(this.db, lobbyId);
  }

  /** Leader starts: everyone else must be ready; nobody may be in another run. */
  async start(accountId: string, characterId: string, lobbyId: string) {
    const runId = await this.db.transaction(async (tx) => {
      await this.sheets.getOwnedCharacter(tx, accountId, characterId);
      const lobby = await this.lockOpenLobby(tx, lobbyId);
      if (lobby.leaderCharacterId !== characterId) throw notLeader();
      const members = await this.members(tx, lobby.id);
      if (members.some((m) => !m.ready && m.characterId !== lobby.leaderCharacterId))
        throw new AppError(409, ErrorCode.NOT_READY, 'Everyone must be ready before starting.');
      // Lock member characters in a fixed order (avoids deadlocks).
      const locked = await tx
        .select()
        .from(characters)
        .where(
          inArray(
            characters.id,
            members.map((m) => m.characterId),
          ),
        )
        .orderBy(asc(characters.id))
        .for('update');
      for (const m of members) await assertFreeForRift(tx, m.characterId, lobby.id);
      const toMember = (m: (typeof members)[number]) => ({
        accountId: m.accountId,
        character: locked.find((c) => c.id === m.characterId)!,
        slot: m.slot % PVP_TEAM_B_OFFSET,
      });
      if (isPvp(lobby.riftId)) {
        const teamA = members.filter((m) => m.slot < PVP_TEAM_B_OFFSET);
        const teamB = members.filter((m) => m.slot >= PVP_TEAM_B_OFFSET);
        if (!teamA.length || !teamB.length)
          throw new AppError(409, ErrorCode.NOT_READY, 'Both teams need at least one player.');
        const pvpId = await this.rifts.createPvpRun(
          tx,
          teamA.map(toMember),
          teamB.map(toMember),
          lobby.leaderCharacterId,
        );
        await tx
          .update(riftLobbies)
          .set({ status: 'started', runId: pvpId })
          .where(eq(riftLobbies.id, lobby.id));
        await tx.delete(riftLobbyInvites).where(eq(riftLobbyInvites.lobbyId, lobby.id));
        return pvpId;
      }
      if (isBoss(lobby.riftId)) {
        const bossRunId = await this.worldBoss.startFight(
          tx,
          members.map((m) => ({
            accountId: m.accountId,
            character: locked.find((c) => c.id === m.characterId)!,
            slot: m.slot,
          })),
          lobby.leaderCharacterId,
        );
        await tx
          .update(riftLobbies)
          .set({ status: 'started', runId: bossRunId })
          .where(eq(riftLobbies.id, lobby.id));
        await tx.delete(riftLobbyInvites).where(eq(riftLobbyInvites.lobbyId, lobby.id));
        return bossRunId;
      }
      const rift = getRift(lobby.riftId)!;
      assertAtRift(rift, locked);
      for (const c of locked) await spendAp(tx, c, AP_RULES.riftEntryCost, 'enter a Rift');
      const runId = await this.rifts.createRun(
        tx,
        rift,
        members.map((m) => ({
          accountId: m.accountId,
          character: locked.find((c) => c.id === m.characterId)!,
          slot: m.slot,
        })),
        lobby.leaderCharacterId,
      );
      await tx
        .update(riftLobbies)
        .set({ status: 'started', runId })
        .where(eq(riftLobbies.id, lobby.id));
      await tx.delete(riftLobbyInvites).where(eq(riftLobbyInvites.lobbyId, lobby.id));
      return runId;
    });
    return { ...(await this.toDto(this.db, lobbyId)), runId };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  /** Open lobby the character is in, or a started one whose run they are still in. */
  private async currentLobbyId(db: DbOrTx, characterId: string): Promise<string | null> {
    const rows = await db
      .select({ id: riftLobbies.id, status: riftLobbies.status })
      .from(riftLobbyMembers)
      .innerJoin(riftLobbies, eq(riftLobbies.id, riftLobbyMembers.lobbyId))
      .where(and(eq(riftLobbyMembers.characterId, characterId), ne(riftLobbies.status, 'closed')));
    return rows.find((r) => r.status === 'open')?.id ?? null;
  }

  private async lockOpenLobby(tx: DbOrTx, lobbyId: string): Promise<RiftLobby> {
    const [lobby] = await tx
      .select()
      .from(riftLobbies)
      .where(eq(riftLobbies.id, lobbyId))
      .for('update');
    if (!lobby) throw errors.notFound('Lobby');
    if (lobby.status !== 'open')
      throw new AppError(409, ErrorCode.INVALID_ACTION, 'This lobby is no longer open.');
    return lobby;
  }

  private members(db: DbOrTx, lobbyId: string) {
    return db
      .select()
      .from(riftLobbyMembers)
      .where(eq(riftLobbyMembers.lobbyId, lobbyId))
      .orderBy(asc(riftLobbyMembers.joinedAt));
  }

  private async membership(db: DbOrTx, lobbyId: string, characterId: string) {
    const [m] = await db
      .select()
      .from(riftLobbyMembers)
      .where(
        and(eq(riftLobbyMembers.lobbyId, lobbyId), eq(riftLobbyMembers.characterId, characterId)),
      );
    if (!m) throw errors.notFound('Lobby');
    return m;
  }

  private async removeMember(tx: DbOrTx, lobby: RiftLobby, characterId: string): Promise<void> {
    await tx
      .delete(riftLobbyMembers)
      .where(
        and(eq(riftLobbyMembers.lobbyId, lobby.id), eq(riftLobbyMembers.characterId, characterId)),
      );
    const rest = await this.members(tx, lobby.id);
    if (rest.length === 0) {
      await tx.update(riftLobbies).set({ status: 'closed' }).where(eq(riftLobbies.id, lobby.id));
    } else if (lobby.leaderCharacterId === characterId) {
      await tx
        .update(riftLobbies)
        .set({ leaderCharacterId: rest[0]!.characterId })
        .where(eq(riftLobbies.id, lobby.id));
    }
  }

  /** Weapon-based preferred slot, or the first free one. */
  private async preferredSlot(
    db: DbOrTx,
    c: Character,
    taken: number[],
    riftId: string,
  ): Promise<number> {
    const profile = await this.sheets.combatProfile(db, c);
    const preferred = startingSlot(profile.abilityIds);
    if (isPvp(riftId)) {
      // PvP: join the smaller team, at the weapon's preferred column.
      const inA = taken.filter((s) => s < PVP_TEAM_B_OFFSET).length;
      const inB = taken.length - inA;
      const base = inB < inA ? PVP_TEAM_B_OFFSET : 0;
      const order = (preferred === 0 ? [0, 1, 2, 3] : [3, 2, 1, 0]).map((s) => s + base);
      const other = order.map((s) => (s + PVP_TEAM_B_OFFSET) % PVP_MAX_MEMBERS);
      return [...order, ...other].find((s) => !taken.includes(s)) ?? base;
    }
    // One line of 4 (request #35): fighters fill from the front, ranged/casters from the back.
    const row = preferred === 0 ? [0, 1, 2, 3] : [3, 2, 1, 0];
    return row.find((s) => !taken.includes(s)) ?? preferred;
  }

  private async memberCounts(ids: string[]): Promise<Map<string, number>> {
    const out = new Map<string, number>();
    if (ids.length === 0) return out;
    const rows = await this.db
      .select({ id: riftLobbyMembers.lobbyId })
      .from(riftLobbyMembers)
      .where(inArray(riftLobbyMembers.lobbyId, ids));
    for (const r of rows) out.set(r.id, (out.get(r.id) ?? 0) + 1);
    return out;
  }

  private async toDto(db: DbOrTx, lobbyId: string): Promise<LobbyDto> {
    const [lobby] = await db.select().from(riftLobbies).where(eq(riftLobbies.id, lobbyId));
    if (!lobby) throw errors.notFound('Lobby');
    const rift = getRift(lobby.riftId);
    const members = await this.members(db, lobby.id);
    const ids = members.map((m) => m.characterId);
    const chars = ids.length
      ? await db
          .select({ id: characters.id, name: characters.name, appearance: characters.appearance })
          .from(characters)
          .where(inArray(characters.id, ids))
      : [];
    const gear = ids.length
      ? await db
          .select({
            characterId: items.characterId,
            defId: items.itemDefId,
            slot: items.equippedSlot,
          })
          .from(items)
          .where(and(inArray(items.characterId, ids), isNotNull(items.equippedSlot)))
      : [];
    const build = (cid: string) =>
      ['mainHand', 'offHand']
        .map((slot) => gear.find((g) => g.characterId === cid && g.slot === slot))
        .filter(Boolean)
        .map((g) => getItemDef(g!.defId)?.name ?? g!.defId)
        .join(' + ') || 'Unarmed';
    return {
      id: lobby.id,
      riftId: lobby.riftId,
      mode: isPvp(lobby.riftId) ? 'pvp' : 'rift',
      riftName: lobbyName(lobby.riftId),
      depth: rift ? toRiftDto(rift).depth : 1,
      visibility: lobby.visibility as LobbyVisibility,
      status: lobby.status as LobbyDto['status'],
      leaderCharacterId: lobby.leaderCharacterId,
      maxMembers: maxMembers(lobby.riftId),
      runId: lobby.runId,
      members: members.map((m) => {
        const c = chars.find((x) => x.id === m.characterId)!;
        return {
          characterId: m.characterId,
          name: c.name,
          appearance: c.appearance as CharacterAppearance,
          slot: m.slot,
          ready: m.ready,
          isLeader: m.characterId === lobby.leaderCharacterId,
          build: build(m.characterId),
        };
      }),
    };
  }
}
