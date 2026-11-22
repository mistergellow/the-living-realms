import {
  characterProfessions,
  items,
  worldEvents,
  type Database,
  type DbOrTx,
  type Item,
} from '@realms/db';
import {
  mapHexAt,
  professionTerrains,
  TERRAIN_NAMES,
  type Terrain,
  activityChance,
  addProfessionXp,
  getItemDef,
  getProfession,
  getWeaponType,
  isStackable,
  PROFESSION_RULES,
  PROFESSIONS,
  resolveActivity,
  xpToNext,
  type ActivityDef,
  type ProfessionDef,
} from '@realms/game-core';
import {
  ErrorCode,
  type ActivityResultDto,
  type ProfessionDto,
  type ProfessionsDto,
} from '@realms/shared';
import { and, eq } from 'drizzle-orm';
import { randomInt } from 'node:crypto';
import { giveItem } from '../characters/bag.js';
import type { AppContext } from '../../context.js';
import { AppError, errors } from '../../lib/errors.js';
import { assertNotInRift, type CharacterSheetService } from '../characters/sheet.service.js';

type Row = { level: number; xp: number; readyAt: Date | null };
const NEW: Row = { level: 0, xp: 0, readyAt: null };
const itemName = (id: string) => getItemDef(id)?.name ?? id;

/** Quantity of an unequipped item definition a character owns. */
function have(rows: Item[], defId: string): number {
  return rows
    .filter((r) => r.itemDefId === defId && !r.equippedSlot)
    .reduce((n, r) => n + r.quantity, 0);
}

/**
 * Professions (request #33): every character can practise every profession;
 * levels raise the success chance and the results. Not available inside a
 * Rift. Each attempt has a time cost (cooldown per profession) until Action
 * Points exist.
 */
/** Terrain of the hex a character stands on ('plains' off the map, for safety). */
const terrainAt = (c: { hexQ: number; hexR: number }): Terrain =>
  mapHexAt({ q: c.hexQ, r: c.hexR })?.terrain ?? 'plains';

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
    const terrain = terrainAt(c);
    const [rows, owned] = await Promise.all([
      this.rows(this.db, characterId),
      this.items(this.db, characterId),
    ]);
    return {
      professions: Object.values(PROFESSIONS).map((p) =>
        this.toDto(p, rows.get(p.id) ?? NEW, owned, terrain),
      ),
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
      if (row.level < activity.minLevel)
        throw this.invalid(`${activity.name} needs ${prof.name} level ${activity.minLevel}.`);
      if (row.readyAt && row.readyAt.getTime() > Date.now()) {
        const s = Math.ceil((row.readyAt.getTime() - Date.now()) / 1000);
        throw this.invalid(`You are still busy (${s}s).`);
      }
      const owned = await this.items(tx, c.id);
      for (const i of activity.inputs)
        if (have(owned, i.item) < i.qty)
          throw this.invalid(`You need ${i.qty} × ${itemName(i.item)}.`);

      // Repair / upgrade work on one of your items.
      let target: Item | undefined;
      if (activity.effect) {
        target = owned.find((i) => i.id === targetItemId);
        if (!target) throw this.invalid('Choose an item to work on.');
        if (activity.effect === 'repair' && target.quality >= 100)
          throw this.invalid('That item is already in perfect condition.');
        if (activity.effect === 'upgrade') {
          if (!getWeaponType(getItemDef(target.itemDefId)?.weaponType))
            throw this.invalid('Only weapons can be improved.');
          if (target.upgradeLevel >= PROFESSION_RULES.maxWeaponUpgrade)
            throw this.invalid(
              `Weapons can be improved up to +${PROFESSION_RULES.maxWeaponUpgrade} for now.`,
            );
        }
      }

      const outcome = resolveActivity(
        activity,
        row.level,
        randomInt(2 ** 31),
        target?.upgradeLevel ?? 0,
      );
      for (const i of activity.inputs) await this.consume(tx, c.id, i.item, i.qty);
      for (const o of outcome.outputs) await this.give(tx, c.id, o.item, o.qty);
      if (target && outcome.repaired)
        await tx
          .update(items)
          .set({ quality: Math.min(100, target.quality + outcome.repaired) })
          .where(eq(items.id, target.id));
      if (target && outcome.upgraded)
        await tx
          .update(items)
          .set({ upgradeLevel: target.upgradeLevel + 1 })
          .where(eq(items.id, target.id));

      const next = addProfessionXp(row.level, row.xp, outcome.xp);
      const readyAt = new Date(Date.now() + activity.cooldownSeconds * 1000);
      await tx
        .insert(characterProfessions)
        .values({
          characterId: c.id,
          professionId: prof.id,
          level: next.level,
          xp: next.xp,
          readyAt,
        })
        .onConflictDoUpdate({
          target: [characterProfessions.characterId, characterProfessions.professionId],
          set: { level: next.level, xp: next.xp, readyAt },
        });
      if (next.levelsGained)
        await tx.insert(worldEvents).values({
          worldId: this.ctx.world.id,
          type: 'profession.level_up',
          actorAccountId: accountId,
          actorCharacterId: c.id,
          payload: { professionId: prof.id, level: next.level },
        });

      const targetName = target ? itemName(target.itemDefId) : '';
      const message = !outcome.success
        ? `${activity.name} failed.`
        : outcome.repaired
          ? `${targetName} repaired (+${outcome.repaired} quality).`
          : outcome.upgraded
            ? `${targetName} improved to +${target!.upgradeLevel + 1}!`
            : `${activity.name}: success.`;
      return {
        success: outcome.success,
        chance: outcome.chance,
        message: next.levelsGained
          ? `${message} ${prof.name} is now level ${next.level}!`
          : message,
        xpGained: outcome.xp,
        levelsGained: next.levelsGained,
        produced: outcome.outputs.map((o) => ({ name: itemName(o.item), qty: o.qty })),
        consumed: activity.inputs.map((i) => ({ name: itemName(i.item), qty: i.qty })),
        profession: this.toDto(
          prof,
          { level: next.level, xp: next.xp, readyAt },
          await this.items(tx, c.id),
          terrainAt(c),
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

  private items(db: DbOrTx, characterId: string): Promise<Item[]> {
    // Request #50: only what you carry (not the city storage).
    return db
      .select()
      .from(items)
      .where(and(eq(items.characterId, characterId), eq(items.inStorage, false)));
  }

  /** Add items: stackables join an existing stack. */
  private async give(tx: DbOrTx, characterId: string, defId: string, qty: number): Promise<void> {
    if (qty <= 0) return;
    // Request #50: stacks in the bag; what does not fit goes to storage.
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

  private toDto(p: ProfessionDef, row: Row, owned: Item[], terrain: Terrain): ProfessionDto {
    const needs = professionTerrains(p.id);
    const ready =
      row.readyAt && row.readyAt.getTime() > Date.now() ? row.readyAt.toISOString() : null;
    return {
      id: p.id,
      name: p.name,
      title: p.title,
      category: p.category,
      description: p.description,
      level: row.level,
      maxLevel: PROFESSION_RULES.maxLevel,
      xp: row.xp,
      xpToNext: xpToNext(row.level),
      readyAt: ready,
      activities: p.activities.map((a: ActivityDef) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        minLevel: a.minLevel,
        chance: activityChance(a, row.level),
        cooldownSeconds: a.cooldownSeconds,
        locked: row.level < a.minLevel,
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
      availableHere: !needs || needs.includes(terrain),
    };
  }
}
