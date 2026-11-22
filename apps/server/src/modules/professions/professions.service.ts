import {
  characterProfessions,
  characters,
  items,
  worldEvents,
  type Character,
  type Database,
  type DbOrTx,
  type Item,
} from '@realms/db';
import {
  activityChance,
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
} from '@realms/shared';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { randomInt } from 'node:crypto';
import type { AppContext } from '../../context.js';
import { AppError, errors } from '../../lib/errors.js';
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
    const c = await this.sheets.getOwnedCharacter(this.db, accountId, characterId);
    const [rows, owned, history] = await Promise.all([
      this.rows(this.db, characterId),
      this.items(this.db, characterId),
      this.history(this.db, characterId),
    ]);
    return {
      professions: Object.values(PROFESSIONS).map((p) =>
        this.toDto(p, rows.get(p.id) ?? NEW, owned, c, history.get(p.id) ?? []),
      ),
    };
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
      const row = (await this.rows(tx, c.id)).get(prof.id) ?? NEW;
      // Gathering needs the right terrain under your feet (request #43).
      const needs = professionTerrains(prof.id);
      if (needs && !needs.includes(terrainAt(c)))
        throw this.invalid(
          `${prof.name} needs a ${needs.map((t) => TERRAIN_NAMES[t].toLowerCase()).join(' or ')} hex. Travel to one first.`,
        );
      if (row.rank < activity.rank)
        throw this.invalid(`${activity.name} needs ${rankName(activity.rank)} ${prof.title}.`);
      if (row.readyAt && row.readyAt.getTime() > Date.now()) {
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
        },
        randomInt(2 ** 31),
      );
      for (const i of activity.inputs) await this.consume(tx, c.id, i.item, i.qty);
      for (const o of outcome.outputs) await this.give(tx, c.id, o.item, o.qty);
      if (target && outcome.repaired)
        await tx
          .update(items)
          .set({ quality: Math.min(100, target.quality + outcome.repaired) })
          .where(eq(items.id, target.id));

      const next = addMastery(row.rank, row.points, outcome.points);
      const readyAt = new Date(Date.now() + activity.cooldownSeconds * 1000);
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
        produced: outcome.outputs.map((o) => ({ name: itemName(o.item), qty: o.qty })),
        consumed: activity.inputs.map((i) => ({ name: itemName(i.item), qty: i.qty })),
        profession: this.toDto(
          prof,
          saved,
          await this.items(tx, c.id),
          c,
          (await this.history(tx, c.id)).get(prof.id) ?? [],
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
  private async give(tx: DbOrTx, characterId: string, defId: string, qty: number): Promise<void> {
    if (qty <= 0) return;
    if (isStackable(getItemDef(defId))) {
      await giveItem(tx, characterId, defId, { qty, source: 'crafted' });
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
    const rows = (await this.items(tx, characterId)).filter(
      (r) => r.itemDefId === defId && !r.equippedSlot,
    );
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
  ): ProfessionDto {
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
      readyAt: ready,
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
        cooldownSeconds: a.cooldownSeconds,
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
