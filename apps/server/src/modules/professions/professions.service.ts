import {
  characterProfessions,
  characters,
  professionJobs,
  resourceNodes,
  items,
  worldEvents,
  type Character,
  type Database,
  type DbOrTx,
  type Item,
} from '@realms/db';
import {
  activityChance,
  AP_RULES,
  currentAp,
  jobApCost,
  jobSeconds,
  gradeName,
  NODE_RICHNESS,
  NODE_RICHNESS_NAMES,
  nodeAmount,
  nodeReadyAt,
  resourceNodeAt,
  type ResourceNodeDef,
  addMastery,
  attributeBonus,
  getItemDef,
  getProfession,
  isStackable,
  mapHexAt,
  masteryPoints,
  MAX_RANK,
  pointsToNext,
  professionResources,
  professionTerrains,
  PROFESSIONS,
  rankName,
  resolveActivity,
  TERRAIN_NAMES,
  TOOL_TYPE_NAMES,
  type ActivityDef,
  type ProfessionDef,
  type Terrain,
} from '@realms/game-core';
import {
  ATTRIBUTE_KEYS,
  ErrorCode,
  type ActivityResultDto,
  type Attributes,
  type ProfessionDto,
  type ProfessionProfileDto,
  type ProfessionsDto,
  type JobResponseDto,
  type JobResultDto,
  type ProfessionJobDto,
} from '@realms/shared';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { randomInt } from 'node:crypto';
import type { AppContext } from '../../context.js';
import { AppError, errors } from '../../lib/errors.js';
import { spendAp } from '../characters/ap.js';
import { giveItem } from '../characters/bag.js';
import {
  assertNotInRift,
  baseAttributesOf,
  type CharacterSheetService,
} from '../characters/sheet.service.js';

type Row = {
  rank: number;
  points: number;
  readyAt: Date | null;
  attempts: number;
  successes: number;
  itemsMade: number;
};
const NEW: Row = { rank: 0, points: 0, readyAt: null, attempts: 0, successes: 0, itemsMade: 0 };
const RANK_UP = 'profession.rank_up';

/** A resource node on a hex with its current charges (request #52). */
type NodeState = { def: ResourceNodeDef; amount: number };
const itemName = (id: string) => getItemDef(id)?.name ?? id;

/** Quantity of an unequipped item definition a character carries. */
function have(rows: Item[], defId: string): number {
  return rows
    .filter((r) => r.itemDefId === defId && !r.equippedSlot)
    .reduce((n, r) => n + r.quantity, 0);
}

/** Terrain of the hex a character stands on ('plains' off the map, for safety). */
const terrainAt = (c: { hexQ: number; hexR: number }): Terrain =>
  mapHexAt({ q: c.hexQ, r: c.hexR })?.terrain ?? 'plains';

/** Best tool of the profession's type the character can use (carried, not broken, rank met). */
function bestTool(p: ProfessionDef, rank: number, owned: Item[]) {
  if (!p.tool) return null;
  let best: { item: Item; tier: number } | null = null;
  for (const i of owned) {
    const t = getItemDef(i.itemDefId)?.tool;
    if (!t || t.type !== p.tool || i.quality <= 0 || t.minRank > rank) continue;
    if (!best || t.tier > best.tier) best = { item: i, tier: t.tier };
  }
  return best;
}

/**
 * Professions (request #33; Mastery, tools and BASE attributes from request
 * #51). Every character can practise all 15. Not available inside a Rift.
 * Gathering needs the right terrain and a tool. Each attempt has a time cost
 * (cooldown per profession) until gathering moves to AP in phase 2.
 */
export class ProfessionsService {
  private readonly db: Database;
  constructor(
    private readonly ctx: AppContext,
    private readonly sheets: CharacterSheetService,
  ) {
    this.db = ctx.db;
  }

  async list(accountId: string, characterId: string): Promise<ProfessionsDto> {
    // A finished real-time job hands out its items when it is next looked at.
    const job = await this.db.transaction(async (tx) => {
      const locked = await this.sheets.getOwnedCharacter(tx, accountId, characterId, true);
      return this.settleJob(tx, accountId, locked);
    });
    const c = await this.sheets.getOwnedCharacter(this.db, accountId, characterId);
    const [rows, owned, history, nodes] = await Promise.all([
      this.rows(this.db, characterId),
      this.items(this.db, characterId),
      this.history(this.db, characterId),
      this.nodesAt(this.db, c),
    ]);
    return {
      professions: Object.values(PROFESSIONS).map((p) =>
        this.toDto(p, rows.get(p.id) ?? NEW, owned, c, history.get(p.id) ?? [], nodes.get(p.id)),
      ),
      job,
    };
  }

  // ---------------------------------------------------------------------------
  // Jobs (request #56)
  // ---------------------------------------------------------------------------

  /**
   * Start a job of `count` attempts. `ap`: everything now, paid in AP.
   * `time`: no AP; inputs (and node charges) are taken now and the items
   * arrive when the job ends.
   */
  async startJob(
    accountId: string,
    characterId: string,
    professionId: string,
    activityId: string,
    mode: 'ap' | 'time',
    count: number,
  ): Promise<JobResponseDto> {
    const prof = getProfession(professionId);
    const activity = prof?.activities.find((a) => a.id === activityId);
    if (!prof || !activity) throw errors.notFound('Activity');
    if (activity.effect) throw this.invalid('Repairs are done one item at a time.');
    return this.db.transaction(async (tx) => {
      const c = await this.sheets.getOwnedCharacter(tx, accountId, characterId, true);
      await assertNotInRift(tx, c.id);
      await this.settleJob(tx, accountId, c);
      const running = await this.jobOf(tx, c.id);
      if (running?.status === 'running') throw this.busyWith(running);
      if (running) await tx.delete(professionJobs).where(eq(professionJobs.id, running.id));
      const row = (await this.rows(tx, c.id)).get(prof.id) ?? NEW;
      const { tool, owned } = await this.checkCanPractise(tx, c, prof, activity, row);
      for (const i of activity.inputs)
        if (have(owned, i.item) < i.qty * count)
          throw this.invalid(
            `You need ${i.qty * count} × ${itemName(i.item)} for ${count} attempts.`,
          );
      const gathering = prof.category === 'gathering';
      const node = gathering ? await this.usableNode(tx, c, prof) : undefined;
      const base = {
        toolTier: tool?.tier ?? 0,
        attributeBonus: attributeBonus(prof, baseAttributesOf(c)),
      };

      if (mode === 'ap') {
        const cost = jobApCost(prof.category, count, AP_RULES.gatherCost);
        const ap = currentAp(c.ap, c.apUpdatedAt);
        if (ap < cost)
          throw new AppError(
            409,
            ErrorCode.NOT_ENOUGH_AP,
            `${count} attempts cost ${cost} AP (you have ${Math.floor(ap)}). Use real time instead, or fewer attempts.`,
          );
        const run = await this.runAttempts(tx, accountId, c, prof, activity, row, count, {
          ...base,
          node,
          consumeInputs: true,
        });
        const apSpent = jobApCost(prof.category, run.result.attempts, AP_RULES.gatherCost);
        await spendAp(tx, c, apSpent, activity.name.toLowerCase());
        const result = { ...run.result, apSpent };
        return {
          result,
          job: null,
          profession: await this.dtoFor(tx, c, prof, run.saved, node),
        };
      }

      // Real time: take the inputs and reserve the node's charges now.
      for (const i of activity.inputs) await this.consume(tx, c.id, i.item, i.qty * count);
      if (node) {
        if (node.amount < count)
          throw this.invalid(
            `This spot only has ${Math.floor(node.amount)} left. Choose fewer attempts or another hex.`,
          );
        node.amount -= count;
        await this.saveNode(tx, node);
      }
      const now = new Date();
      const [job] = await tx
        .insert(professionJobs)
        .values({
          characterId: c.id,
          professionId: prof.id,
          activityId: activity.id,
          count,
          nodeQ: node?.def.hex.q ?? null,
          nodeR: node?.def.hex.r ?? null,
          nodeRichness: node?.def.richness ?? null,
          ...base,
          startedAt: now,
          finishesAt: new Date(now.getTime() + jobSeconds(prof.category, activity, count) * 1000),
        })
        .returning();
      return {
        result: null,
        job: this.jobDto(job!),
        profession: await this.dtoFor(tx, c, prof, row, node),
      };
    });
  }

  /** Forget a finished job's summary. */
  async dismissJob(accountId: string, characterId: string): Promise<ProfessionsDto> {
    await this.db.transaction(async (tx) => {
      const c = await this.sheets.getOwnedCharacter(tx, accountId, characterId, true);
      await tx
        .delete(professionJobs)
        .where(and(eq(professionJobs.characterId, c.id), eq(professionJobs.status, 'done')));
    });
    return this.list(accountId, characterId);
  }

  private async jobOf(db: DbOrTx, characterId: string) {
    const [job] = await db
      .select()
      .from(professionJobs)
      .where(eq(professionJobs.characterId, characterId));
    return job;
  }

  private busyWith(job: typeof professionJobs.$inferSelect) {
    const name = getProfession(job.professionId)?.activities.find(
      (a) => a.id === job.activityId,
    )?.name;
    return this.invalid(
      `You are busy (${name ?? 'a job'} × ${job.count}) until ${job.finishesAt.toISOString().slice(11, 16)} UTC.`,
    );
  }

  /** Resolve the character's real-time job if it has ended (character row locked). */
  private async settleJob(
    tx: DbOrTx,
    accountId: string,
    c: Character,
  ): Promise<ProfessionJobDto | null> {
    const job = await this.jobOf(tx, c.id);
    if (!job) return null;
    if (job.status !== 'running' || job.finishesAt.getTime() > Date.now()) return this.jobDto(job);
    const prof = getProfession(job.professionId);
    const activity = prof?.activities.find((a) => a.id === job.activityId);
    if (!prof || !activity) {
      await tx.delete(professionJobs).where(eq(professionJobs.id, job.id));
      return null;
    }
    const row = (await this.rows(tx, c.id)).get(prof.id) ?? NEW;
    const run = await this.runAttempts(tx, accountId, c, prof, activity, row, job.count, {
      toolTier: job.toolTier,
      attributeBonus: job.attributeBonus,
      ...(job.nodeRichness !== null ? { richness: job.nodeRichness } : {}),
      consumeInputs: false,
    });
    // Charges reserved for attempts that failed go back to the node.
    if (job.nodeQ !== null && job.nodeR !== null) {
      const def = resourceNodeAt({ q: job.nodeQ, r: job.nodeR }, prof.id);
      const unused = job.count - run.result.successes;
      if (def && unused > 0) {
        const [n] = await tx.select().from(resourceNodes).where(this.nodeWhere(def)).for('update');
        if (n)
          await this.saveNode(tx, {
            def,
            amount: Math.min(def.max, nodeAmount(def, n.amount, n.updatedAt) + unused),
          });
      }
    }
    const [done] = await tx
      .update(professionJobs)
      .set({ status: 'done', result: run.result })
      .where(eq(professionJobs.id, job.id))
      .returning();
    return this.jobDto(done!);
  }

  private jobDto(job: typeof professionJobs.$inferSelect): ProfessionJobDto {
    const prof = getProfession(job.professionId);
    return {
      id: job.id,
      professionId: job.professionId,
      professionName: prof?.name ?? job.professionId,
      activityId: job.activityId,
      activityName: prof?.activities.find((a) => a.id === job.activityId)?.name ?? job.activityId,
      count: job.count,
      startedAt: job.startedAt.toISOString(),
      finishesAt: job.finishesAt.toISOString(),
      status: job.status === 'done' ? 'done' : 'running',
      result: (job.result as JobResultDto | null) ?? null,
    };
  }

  /** Terrain, rank and tool checks shared by single attempts and jobs. */
  private async checkCanPractise(
    tx: DbOrTx,
    c: Character,
    prof: ProfessionDef,
    activity: ActivityDef,
    row: Row,
  ) {
    const needs = professionTerrains(prof.id);
    if (needs && !needs.includes(terrainAt(c)))
      throw this.invalid(
        `${prof.name} needs a ${needs.map((t) => TERRAIN_NAMES[t].toLowerCase()).join(' or ')} hex. Travel to one first.`,
      );
    if (row.rank < activity.rank)
      throw this.invalid(`${activity.name} needs ${rankName(activity.rank)} ${prof.title}.`);
    const owned = await this.items(tx, c.id);
    const tool = bestTool(prof, row.rank, owned);
    if (prof.tool && !tool)
      throw this.invalid(
        `${prof.name} needs a ${TOOL_TYPE_NAMES[prof.tool]} in your bag. The city store sells them.`,
      );
    return { tool, owned };
  }

  /** The node on the character's hex, locked, with at least one charge. */
  private async usableNode(tx: DbOrTx, c: Character, prof: ProfessionDef) {
    const node = await this.lockNode(tx, c, prof.id);
    if (!node) throw this.invalid(`There is nothing to gather for ${prof.name} here.`);
    if (node.amount < 1) {
      const at = nodeReadyAt(node.amount)!;
      const min = Math.max(1, Math.ceil((at.getTime() - Date.now()) / 60_000));
      throw this.invalid(
        `This spot is exhausted. It regrows in about ${min} min — or try another hex.`,
      );
    }
    return node;
  }

  private async saveNode(tx: DbOrTx, node: NodeState) {
    await tx
      .update(resourceNodes)
      .set({ amount: node.amount, updatedAt: new Date() })
      .where(this.nodeWhere(node.def));
  }

  /**
   * Resolve `count` attempts in a row (Mastery grows between them), hand out
   * the items, save the profession row and record rank-ups. With a `node`,
   * each success takes a charge and the run stops when it is empty.
   */
  private async runAttempts(
    tx: DbOrTx,
    accountId: string,
    c: Character,
    prof: ProfessionDef,
    activity: ActivityDef,
    row: Row,
    count: number,
    opts: {
      toolTier: number;
      attributeBonus: number;
      node?: NodeState;
      richness?: number;
      consumeInputs: boolean;
    },
  ): Promise<{ saved: Row; result: JobResultDto }> {
    let rank = row.rank;
    let points = row.points;
    let successes = 0;
    let pointsGained = 0;
    let ranksGained = 0;
    let attempts = 0;
    const made = new Map<string, { item: string; grade: number | null; qty: number }>();
    const richness = opts.node ? opts.node.def.richness : opts.richness;
    for (; attempts < count; attempts++) {
      if (opts.node && opts.node.amount < 1) break;
      const outcome = resolveActivity(
        activity,
        {
          rank,
          toolTier: opts.toolTier,
          attributeBonus: opts.attributeBonus,
          ...(richness !== undefined ? { nodeRichness: richness } : {}),
        },
        randomInt(2 ** 31),
      );
      if (outcome.success) {
        successes++;
        if (opts.node) opts.node.amount -= 1;
      }
      for (const o of outcome.outputs) {
        const key = `${o.item}|${o.grade}`;
        const m = made.get(key) ?? { item: o.item, grade: o.grade, qty: 0 };
        m.qty += o.qty;
        made.set(key, m);
      }
      const next = addMastery(rank, points, outcome.points);
      pointsGained += outcome.points;
      ranksGained += next.ranksGained;
      rank = next.rank;
      points = next.points;
    }
    if (opts.consumeInputs)
      for (const i of activity.inputs) await this.consume(tx, c.id, i.item, i.qty * attempts);
    for (const m of made.values()) await this.give(tx, c.id, m.item, m.qty, m.grade);
    if (opts.node) await this.saveNode(tx, opts.node);
    const total = [...made.values()].reduce((n, m) => n + m.qty, 0);
    const saved: Row = {
      rank,
      points,
      readyAt: row.readyAt,
      attempts: row.attempts + attempts,
      successes: row.successes + successes,
      itemsMade: row.itemsMade + total,
    };
    await tx
      .insert(characterProfessions)
      .values({ characterId: c.id, professionId: prof.id, ...saved })
      .onConflictDoUpdate({
        target: [characterProfessions.characterId, characterProfessions.professionId],
        set: saved,
      });
    if (ranksGained)
      await tx.insert(worldEvents).values({
        worldId: this.ctx.world.id,
        type: RANK_UP,
        actorAccountId: accountId,
        actorCharacterId: c.id,
        payload: { professionId: prof.id, rank },
      });
    const stopped = attempts < count ? ' The spot ran out.' : '';
    return {
      saved,
      result: {
        attempts,
        successes,
        pointsGained,
        ranksGained,
        produced: [...made.values()].map((m) => ({
          name: itemName(m.item),
          qty: m.qty,
          grade: m.grade === null ? null : gradeName(m.grade),
        })),
        consumed: activity.inputs.map((i) => ({ name: itemName(i.item), qty: i.qty * attempts })),
        apSpent: 0,
        message:
          `${activity.name} × ${attempts}: ${successes} succeeded.${stopped}` +
          (ranksGained ? ` You are now ${rankName(rank)} ${prof.title}!` : ''),
      },
    };
  }

  private async dtoFor(
    tx: DbOrTx,
    c: Character,
    prof: ProfessionDef,
    row: Row,
    node?: NodeState,
  ): Promise<ProfessionDto> {
    return this.toDto(
      prof,
      row,
      await this.items(tx, c.id),
      c,
      (await this.history(tx, c.id)).get(prof.id) ?? [],
      node,
    );
  }

  /** Another character's professional profile (request #51): ranks and statistics only. */
  async profile(target: { id?: string; name?: string }): Promise<ProfessionProfileDto> {
    const [c] = await this.db
      .select({ id: characters.id, name: characters.name })
      .from(characters)
      .where(
        and(
          eq(characters.worldId, this.ctx.world.id),
          isNull(characters.deletedAt),
          target.id
            ? eq(characters.id, target.id)
            : sql`lower(${characters.name}) = lower(${target.name ?? ''})`,
        ),
      );
    if (!c) throw errors.notFound('Character');
    const rows = await this.rows(this.db, c.id);
    return {
      character: c,
      professions: Object.values(PROFESSIONS).map((p) => {
        const r = rows.get(p.id) ?? NEW;
        const need = pointsToNext(r.rank);
        return {
          id: p.id,
          name: p.name,
          title: p.title,
          category: p.category,
          rank: r.rank,
          rankName: rankName(r.rank),
          progress: need ? Math.min(1, r.points / need) : 1,
          stats: { attempts: r.attempts, successes: r.successes, itemsMade: r.itemsMade },
        };
      }),
    };
  }

  async perform(
    accountId: string,
    characterId: string,
    professionId: string,
    activityId: string,
    targetItemId?: string,
  ): Promise<ActivityResultDto> {
    const prof = getProfession(professionId);
    const activity = prof?.activities.find((a) => a.id === activityId);
    if (!prof || !activity) throw errors.notFound('Activity');
    return this.db.transaction(async (tx) => {
      const c = await this.sheets.getOwnedCharacter(tx, accountId, characterId, true);
      await assertNotInRift(tx, c.id);
      // Request #56: a real-time job keeps you busy.
      const job = await this.settleJob(tx, accountId, c);
      if (job?.status === 'running') throw this.busyWith((await this.jobOf(tx, c.id))!);
      const row = (await this.rows(tx, c.id)).get(prof.id) ?? NEW;
      // Gathering needs the right terrain under your feet (request #43).
      const needs = professionTerrains(prof.id);
      if (needs && !needs.includes(terrainAt(c)))
        throw this.invalid(
          `${prof.name} needs a ${needs.map((t) => TERRAIN_NAMES[t].toLowerCase()).join(' or ')} hex. Travel to one first.`,
        );
      if (row.rank < activity.rank)
        throw this.invalid(`${activity.name} needs ${rankName(activity.rank)} ${prof.title}.`);
      const gathering = prof.category === 'gathering';
      if (!gathering && row.readyAt && row.readyAt.getTime() > Date.now()) {
        const s = Math.ceil((row.readyAt.getTime() - Date.now()) / 1000);
        throw this.invalid(`You are still busy (${s}s).`);
      }
      const owned = await this.items(tx, c.id);
      // Tools (request #51): carried in the bag; they never replace Mastery.
      const tool = bestTool(prof, row.rank, owned);
      if (prof.tool && !tool)
        throw this.invalid(
          `${prof.name} needs a ${TOOL_TYPE_NAMES[prof.tool]} in your bag. The city store sells them.`,
        );
      for (const i of activity.inputs)
        if (have(owned, i.item) < i.qty)
          throw this.invalid(`You need ${i.qty} × ${itemName(i.item)}.`);

      // Gathering (request #52): a resource node with charges, and AP.
      let node: NodeState | undefined;
      if (gathering) {
        node = await this.lockNode(tx, c, prof.id);
        if (!node) throw this.invalid(`There is nothing to gather for ${prof.name} here.`);
        if (node.amount < 1) {
          const at = nodeReadyAt(node.amount)!;
          const min = Math.max(1, Math.ceil((at.getTime() - Date.now()) / 60_000));
          throw this.invalid(
            `This spot is exhausted. It regrows in about ${min} min — or try another hex.`,
          );
        }
        await spendAp(tx, c, AP_RULES.gatherCost, activity.name.toLowerCase());
      }

      // Repairs work on one of your items.
      let target: Item | undefined;
      if (activity.effect === 'repair') {
        target = owned.find((i) => i.id === targetItemId);
        if (!target) throw this.invalid('Choose an item to work on.');
        if (target.quality >= 100) throw this.invalid('That item is already in perfect condition.');
      }

      const outcome = resolveActivity(
        activity,
        {
          rank: row.rank,
          toolTier: tool?.tier ?? 0,
          attributeBonus: attributeBonus(prof, baseAttributesOf(c)),
          ...(node ? { nodeRichness: node.def.richness } : {}),
        },
        randomInt(2 ** 31),
      );
      if (node && outcome.success) {
        node.amount -= 1;
        await tx
          .update(resourceNodes)
          .set({ amount: node.amount, updatedAt: new Date() })
          .where(this.nodeWhere(node.def));
      }
      for (const i of activity.inputs) await this.consume(tx, c.id, i.item, i.qty);
      for (const o of outcome.outputs) await this.give(tx, c.id, o.item, o.qty, o.grade);
      if (target && outcome.repaired)
        await tx
          .update(items)
          .set({ quality: Math.min(100, target.quality + outcome.repaired) })
          .where(eq(items.id, target.id));

      const next = addMastery(row.rank, row.points, outcome.points);
      // Crafting costs time; gathering costs AP instead (request #52).
      const readyAt = gathering ? null : new Date(Date.now() + activity.cooldownSeconds * 1000);
      const made = outcome.outputs.reduce((n, o) => n + o.qty, 0);
      const saved: Row = {
        rank: next.rank,
        points: next.points,
        readyAt,
        attempts: row.attempts + 1,
        successes: row.successes + (outcome.success ? 1 : 0),
        itemsMade: row.itemsMade + made,
      };
      await tx
        .insert(characterProfessions)
        .values({ characterId: c.id, professionId: prof.id, ...saved })
        .onConflictDoUpdate({
          target: [characterProfessions.characterId, characterProfessions.professionId],
          set: saved,
        });
      if (next.ranksGained)
        await tx.insert(worldEvents).values({
          worldId: this.ctx.world.id,
          type: RANK_UP,
          actorAccountId: accountId,
          actorCharacterId: c.id,
          payload: { professionId: prof.id, rank: next.rank },
        });

      const message = !outcome.success
        ? `${activity.name} failed.`
        : outcome.repaired
          ? `${itemName(target!.itemDefId)} repaired (+${outcome.repaired} quality).`
          : `${activity.name}: success.`;
      return {
        success: outcome.success,
        chance: outcome.chance,
        message: next.ranksGained
          ? `${message} You are now ${rankName(next.rank)} ${prof.title}!`
          : message,
        pointsGained: outcome.points,
        ranksGained: next.ranksGained,
        produced: outcome.outputs.map((o) => ({
          name: itemName(o.item),
          qty: o.qty,
          grade: o.grade === null ? null : gradeName(o.grade),
        })),
        apSpent: gathering ? AP_RULES.gatherCost : 0,
        consumed: activity.inputs.map((i) => ({ name: itemName(i.item), qty: i.qty })),
        profession: this.toDto(
          prof,
          saved,
          await this.items(tx, c.id),
          c,
          (await this.history(tx, c.id)).get(prof.id) ?? [],
          node,
        ),
      };
    });
  }

  // ---------------------------------------------------------------------------
  private invalid(message: string) {
    return new AppError(400, ErrorCode.INVALID_ACTION, message);
  }

  private async rows(db: DbOrTx, characterId: string): Promise<Map<string, Row>> {
    const rows = await db
      .select()
      .from(characterProfessions)
      .where(eq(characterProfessions.characterId, characterId));
    return new Map(rows.map((r) => [r.professionId, r]));
  }

  private nodeWhere(def: ResourceNodeDef) {
    return and(
      eq(resourceNodes.worldId, this.ctx.world.id),
      eq(resourceNodes.hexQ, def.hex.q),
      eq(resourceNodes.hexR, def.hex.r),
      eq(resourceNodes.professionId, def.professionId),
    );
  }

  /** Current state of every node on the character's hex (no row = full). */
  private async nodesAt(db: DbOrTx, c: Character): Promise<Map<string, NodeState>> {
    const hex = { q: c.hexQ, r: c.hexR };
    const defs = Object.values(PROFESSIONS)
      .map((p) => resourceNodeAt(hex, p.id))
      .filter((d): d is ResourceNodeDef => !!d);
    const out = new Map<string, NodeState>();
    if (!defs.length) return out;
    const rows = await db
      .select()
      .from(resourceNodes)
      .where(
        and(
          eq(resourceNodes.worldId, this.ctx.world.id),
          eq(resourceNodes.hexQ, hex.q),
          eq(resourceNodes.hexR, hex.r),
        ),
      );
    for (const def of defs) {
      const row = rows.find((r) => r.professionId === def.professionId);
      out.set(def.professionId, {
        def,
        amount: row ? nodeAmount(def, row.amount, row.updatedAt) : def.max,
      });
    }
    return out;
  }

  /**
   * The node for a profession on the character's hex, row-locked (players share
   * it). Creates the row the first time; the amount includes regrowth.
   */
  private async lockNode(tx: DbOrTx, c: Character, professionId: string) {
    const def = resourceNodeAt({ q: c.hexQ, r: c.hexR }, professionId);
    if (!def) return undefined;
    await tx
      .insert(resourceNodes)
      .values({
        worldId: this.ctx.world.id,
        hexQ: def.hex.q,
        hexR: def.hex.r,
        professionId,
        amount: def.max,
      })
      .onConflictDoNothing();
    const [row] = await tx.select().from(resourceNodes).where(this.nodeWhere(def)).for('update');
    return { def, amount: nodeAmount(def, row!.amount, row!.updatedAt) };
  }

  /** Rank-ups per profession, newest first (the last 50 events). */
  private async history(db: DbOrTx, characterId: string) {
    const rows = await db
      .select({ payload: worldEvents.payload, at: worldEvents.createdAt })
      .from(worldEvents)
      .where(and(eq(worldEvents.type, RANK_UP), eq(worldEvents.actorCharacterId, characterId)))
      .orderBy(desc(worldEvents.createdAt))
      .limit(50);
    const out = new Map<string, ProfessionDto['history']>();
    for (const r of rows) {
      const p = r.payload as { professionId?: string; rank?: number };
      if (!p.professionId || typeof p.rank !== 'number') continue;
      const list = out.get(p.professionId) ?? [];
      list.push({ at: r.at.toISOString(), rank: p.rank, rankName: rankName(p.rank) });
      out.set(p.professionId, list);
    }
    return out;
  }

  private items(db: DbOrTx, characterId: string): Promise<Item[]> {
    // Request #50: only what you carry (not the city storage).
    return db
      .select()
      .from(items)
      .where(and(eq(items.characterId, characterId), eq(items.inStorage, false)));
  }

  /** Add items: stackables join an existing stack; what does not fit goes to storage. */
  private async give(
    tx: DbOrTx,
    characterId: string,
    defId: string,
    qty: number,
    grade: number | null,
  ): Promise<void> {
    if (qty <= 0) return;
    if (isStackable(getItemDef(defId))) {
      await giveItem(tx, characterId, defId, {
        qty,
        source: grade === null ? 'crafted' : 'gathered',
        ...(grade === null ? {} : { grade }),
      });
      return;
    }
    for (let i = 0; i < qty; i++) await giveItem(tx, characterId, defId, { source: 'crafted' });
  }

  private async consume(
    tx: DbOrTx,
    characterId: string,
    defId: string,
    qty: number,
  ): Promise<void> {
    let left = qty;
    // The poorest grade goes first (request #52), keeping the better materials.
    const rows = (await this.items(tx, characterId))
      .filter((r) => r.itemDefId === defId && !r.equippedSlot)
      .sort((a, b) => (a.grade ?? 1) - (b.grade ?? 1));
    for (const r of rows) {
      if (left <= 0) break;
      const take = Math.min(left, r.quantity);
      left -= take;
      if (take === r.quantity) await tx.delete(items).where(eq(items.id, r.id));
      else
        await tx
          .update(items)
          .set({ quantity: r.quantity - take })
          .where(eq(items.id, r.id));
    }
  }

  private toDto(
    p: ProfessionDef,
    row: Row,
    owned: Item[],
    c: Character,
    history: ProfessionDto['history'],
    node?: NodeState,
  ): ProfessionDto {
    const gathering = p.category === 'gathering';
    const needs = professionTerrains(p.id);
    const ready =
      row.readyAt && row.readyAt.getTime() > Date.now() ? row.readyAt.toISOString() : null;
    const base: Attributes = baseAttributesOf(c);
    const bonus = attributeBonus(p, base);
    const tool = bestTool(p, row.rank, owned);
    return {
      id: p.id,
      name: p.name,
      title: p.title,
      category: p.category,
      description: p.description,
      rank: row.rank,
      rankName: rankName(row.rank),
      maxRank: MAX_RANK,
      points: row.points,
      pointsToNext: pointsToNext(row.rank),
      readyAt: gathering ? null : ready,
      activities: p.activities.map((a: ActivityDef) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        rank: a.rank,
        rankName: rankName(a.rank),
        complexity: a.complexity,
        chance: activityChance(a, {
          rank: row.rank,
          toolTier: tool?.tier ?? 0,
          attributeBonus: bonus,
        }),
        cooldownSeconds: gathering ? 0 : a.cooldownSeconds,
        apCost: gathering ? AP_RULES.gatherCost : 0,
        locked: row.rank < a.rank,
        points: masteryPoints(a, row.rank, true),
        inputs: a.inputs.map((i) => ({
          itemDefId: i.item,
          name: itemName(i.item),
          qty: i.qty,
          have: have(owned, i.item),
        })),
        outputs: a.outputs.map((o) => ({
          itemDefId: o.item,
          name: itemName(o.item),
          min: o.min,
          max: o.max,
        })),
        effect: a.effect ?? null,
      })),
      terrains: needs ? needs.map((t) => TERRAIN_NAMES[t]) : null,
      availableHere: !needs || needs.includes(terrainAt(c)),
      node: node
        ? {
            richness: NODE_RICHNESS_NAMES[NODE_RICHNESS[node.def.richness]!],
            amount: Math.floor(node.amount),
            max: node.def.max,
            readyAt: nodeReadyAt(node.amount)?.toISOString() ?? null,
          }
        : null,
      tool: p.tool
        ? {
            type: p.tool,
            name: TOOL_TYPE_NAMES[p.tool],
            best: tool ? { name: itemName(tool.item.itemDefId), tier: tool.tier } : null,
          }
        : null,
      attributes: ATTRIBUTE_KEYS.filter((k) => p.attributes[k]).map((k) => ({
        attribute: k,
        weight: p.attributes[k]!,
      })),
      attributeBonus: bonus,
      resources: professionResources(p).map((id) => ({ itemDefId: id, name: itemName(id) })),
      stats: { attempts: row.attempts, successes: row.successes, itemsMade: row.itemsMade },
      history,
    };
  }
}
