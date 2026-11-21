import { worldBossAttempts, worldBosses, type Character, type DbOrTx } from '@realms/db';
import {
  CURRENT_WORLD_BOSS_SEASON,
  nextBossHex,
  partyKeyOf,
  WORLD_BOSS_RULES,
  worldBossSeason,
} from '@realms/game-core';
import { ErrorCode, type WorldBossDto } from '@realms/shared';
import { and, desc, eq, gte, isNotNull, lt, sql } from 'drizzle-orm';
import { randomInt } from 'node:crypto';
import type { AppContext } from '../../context.js';
import { AppError } from '../../lib/errors.js';
import type { CharacterSheetService } from '../characters/sheet.service.js';
import { assertFreeForRift, type RiftsService } from '../rifts/rifts.service.js';

type Boss = typeof worldBosses.$inferSelect;

const HOUR_MS = 3_600_000;
const LEADERBOARD_SIZE = 20;
/** At most this many roaming steps are caught up at once (a boss read after a long pause). */
const MAX_CATCH_UP = 48;

const startOfUtcDay = (now: Date) =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

/**
 * World boss (request #43): one per season, roaming the Riftlands. Its HP is a
 * shared pool; every fight is an attempt by a party, and the damage dealt
 * comes off the pool and counts on the leaderboard. Roaming is applied lazily
 * whenever the boss is read (one step per `moveEveryHours`).
 */
export class WorldBossService {
  constructor(
    private readonly ctx: AppContext,
    private readonly sheets: CharacterSheetService,
    private readonly rifts: RiftsService,
  ) {}

  /** The current season's boss, created on first use and moved if it is time. */
  async current(db: DbOrTx, lock = false): Promise<Boss> {
    const season = CURRENT_WORLD_BOSS_SEASON;
    const worldId = this.ctx.world.id;
    await db
      .insert(worldBosses)
      .values({
        worldId,
        season: season.season,
        hp: season.maxHp,
        maxHp: season.maxHp,
        hexQ: WORLD_BOSS_RULES.spawn.q,
        hexR: WORLD_BOSS_RULES.spawn.r,
        nextMoveAt: new Date(Date.now() + WORLD_BOSS_RULES.moveEveryHours * HOUR_MS),
      })
      .onConflictDoNothing();
    const q = db
      .select()
      .from(worldBosses)
      .where(and(eq(worldBosses.worldId, worldId), eq(worldBosses.season, season.season)));
    const [boss] = lock ? await q.for('update') : await q;
    return this.roam(db, boss!);
  }

  private async roam(db: DbOrTx, boss: Boss): Promise<Boss> {
    const now = Date.now();
    if (boss.defeatedAt || boss.nextMoveAt.getTime() > now) return boss;
    const period = WORLD_BOSS_RULES.moveEveryHours * HOUR_MS;
    const steps = Math.min(
      MAX_CATCH_UP,
      Math.floor((now - boss.nextMoveAt.getTime()) / period) + 1,
    );
    let pos = { q: boss.hexQ, r: boss.hexR };
    for (let i = 0; i < steps; i++) pos = nextBossHex(pos, randomInt(1_000_000) / 1_000_000);
    const nextMoveAt = new Date(boss.nextMoveAt.getTime() + steps * period);
    // Only the first reader moves it.
    const [moved] = await db
      .update(worldBosses)
      .set({ hexQ: pos.q, hexR: pos.r, nextMoveAt })
      // Not yet advanced by another reader (timestamps compare safely this way).
      .where(and(eq(worldBosses.id, boss.id), lt(worldBosses.nextMoveAt, nextMoveAt)))
      .returning();
    if (moved) return moved;
    const [fresh] = await db.select().from(worldBosses).where(eq(worldBosses.id, boss.id));
    return fresh!;
  }

  async attemptsToday(db: DbOrTx, bossId: string, characterId: string): Promise<number> {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(worldBossAttempts)
      .where(
        and(
          eq(worldBossAttempts.bossId, bossId),
          gte(worldBossAttempts.createdAt, startOfUtcDay(new Date())),
          sql`${worldBossAttempts.members} @> ${JSON.stringify([{ characterId }])}::jsonb`,
        ),
      );
    return row?.n ?? 0;
  }

  async view(accountId: string, characterId?: string): Promise<WorldBossDto> {
    const db = this.ctx.db;
    const boss = await this.current(db);
    const season = worldBossSeason(boss.season) ?? CURRENT_WORLD_BOSS_SEASON;
    let you: WorldBossDto['you'] = null;
    if (characterId) {
      const c = await this.sheets.getOwnedCharacter(db, accountId, characterId);
      const used = await this.attemptsToday(db, boss.id, c.id);
      you = {
        attemptsLeft: Math.max(0, WORLD_BOSS_RULES.attemptsPerDay - used),
        here: c.hexQ === boss.hexQ && c.hexR === boss.hexR,
      };
    }
    const rows = await db
      .select({
        partyKey: worldBossAttempts.partyKey,
        damage: sql<number>`sum(${worldBossAttempts.damage})::bigint`,
        attempts: sql<number>`count(*)::int`,
        members: sql<unknown>`(array_agg(${worldBossAttempts.members} order by ${worldBossAttempts.createdAt} desc))[1]`,
      })
      .from(worldBossAttempts)
      .where(and(eq(worldBossAttempts.bossId, boss.id), isNotNull(worldBossAttempts.finishedAt)))
      .groupBy(worldBossAttempts.partyKey)
      .orderBy(desc(sql`sum(${worldBossAttempts.damage})`))
      .limit(LEADERBOARD_SIZE);
    return {
      season: boss.season,
      theme: season.theme,
      name: season.name,
      description: season.description,
      hp: boss.hp,
      maxHp: boss.maxHp,
      position: { q: boss.hexQ, r: boss.hexR },
      nextMoveAt: boss.nextMoveAt.toISOString(),
      defeatedAt: boss.defeatedAt?.toISOString() ?? null,
      attemptsPerDay: WORLD_BOSS_RULES.attemptsPerDay,
      you,
      leaderboard: rows.map((r, i) => ({
        rank: i + 1,
        members: (r.members as Array<{ name: string }>).map((m) => m.name),
        damage: Number(r.damage),
        attempts: r.attempts,
      })),
    };
  }

  /**
   * Checks a party may fight now (boss alive, everyone on its hex with a fight
   * left today) and creates the run + the attempt. Used solo and by lobbies.
   */
  async startFight(
    tx: DbOrTx,
    members: Array<{ accountId: string; character: Character; slot?: number }>,
    leaderId: string,
  ): Promise<string> {
    const boss = await this.current(tx, true);
    if (boss.defeatedAt || boss.hp <= 0)
      throw new AppError(409, ErrorCode.CONFLICT, 'The world boss has fallen this season.');
    for (const { character: c } of members) {
      if (c.hexQ !== boss.hexQ || c.hexR !== boss.hexR)
        throw new AppError(
          409,
          ErrorCode.NOT_HERE,
          `${c.name} must be where the world boss is (hex ${boss.hexQ}, ${boss.hexR}).`,
        );
      if ((await this.attemptsToday(tx, boss.id, c.id)) >= WORLD_BOSS_RULES.attemptsPerDay)
        throw new AppError(
          409,
          ErrorCode.NO_ATTEMPTS_LEFT,
          `${c.name} already fought the world boss today.`,
        );
    }
    const runId = await this.rifts.createWorldBossRun(tx, members, leaderId, {
      season: boss.season,
      hp: boss.hp,
    });
    await tx.insert(worldBossAttempts).values({
      bossId: boss.id,
      runId,
      partyKey: partyKeyOf(members.map((m) => m.character.id)),
      members: members.map((m) => ({ characterId: m.character.id, name: m.character.name })),
    });
    return runId;
  }

  /** Solo fight. */
  async fight(accountId: string, characterId: string): Promise<string> {
    return this.ctx.db.transaction(async (tx) => {
      const c = await this.sheets.getOwnedCharacter(tx, accountId, characterId, true);
      await assertFreeForRift(tx, c.id);
      return this.startFight(tx, [{ accountId, character: c }], c.id);
    });
  }
}
