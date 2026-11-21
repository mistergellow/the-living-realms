import {
  accounts,
  characters,
  characterSkills,
  items,
  worldEvents,
  type Character,
  type DbOrTx,
} from '@realms/db';
import { getAbility, getItemDef } from '@realms/game-core';
import type {
  AdminCharacterDto,
  AdminCharacterSummaryDto,
  AdminGrantItemRequest,
  AdminUpdateCharacterRequest,
  AdminUpdateItemRequest,
} from '@realms/shared';
import { and, asc, eq, isNull } from 'drizzle-orm';
import type { AppContext } from '../../context.js';
import { errors } from '../../lib/errors.js';
import { itemsRepository } from '../characters/items.repository.js';
import type { CharacterSheetService } from '../characters/sheet.service.js';
import { riftsRepository } from '../rifts/rifts.repository.js';

/**
 * Admin character tools (request #41): give and change items, teach and forget
 * abilities, overwrite attributes and reputation. Works on any living
 * character. Every change is written to world_events (`admin.*`) in the same
 * transaction. Changes made during a Rift apply to the next fight/run (the
 * run keeps the combat profile it started with).
 */
export class AdminService {
  constructor(
    private readonly ctx: AppContext,
    private readonly sheets: CharacterSheetService,
  ) {}

  async listCharacters(): Promise<AdminCharacterSummaryDto[]> {
    const rows = await this.ctx.db
      .select({
        id: characters.id,
        name: characters.name,
        reputation: characters.reputation,
        accountEmail: accounts.email,
      })
      .from(characters)
      .innerJoin(accounts, eq(accounts.id, characters.accountId))
      .where(and(eq(characters.worldId, this.ctx.world.id), isNull(characters.deletedAt)))
      .orderBy(asc(characters.name))
      .limit(500);
    return Promise.all(
      rows.map(async (r) => ({
        ...r,
        inRift: !!(await riftsRepository.activeRunIdFor(this.ctx.db, r.id)),
      })),
    );
  }

  getCharacter(id: string): Promise<AdminCharacterDto> {
    return this.ctx.db.transaction(async (tx) => this.view(tx, await this.load(tx, id)));
  }

  grantItem(adminId: string, characterId: string, input: AdminGrantItemRequest) {
    return this.change(adminId, characterId, async (tx, c) => {
      const def = getItemDef(input.defId);
      if (!def) throw errors.validation(`Unknown item: ${input.defId}.`);
      const [row] = await tx
        .insert(items)
        .values({
          characterId: c.id,
          itemDefId: input.defId,
          quality: input.quality ?? 100,
          upgradeLevel: input.upgradeLevel ?? 0,
          source: 'admin',
        })
        .returning({ id: items.id });
      return {
        type: 'admin.item_granted',
        payload: { itemId: row!.id, defId: input.defId, upgradeLevel: input.upgradeLevel ?? 0 },
      };
    });
  }

  updateItem(adminId: string, characterId: string, itemId: string, input: AdminUpdateItemRequest) {
    return this.change(adminId, characterId, async (tx, c) => {
      await this.ownedItem(tx, c.id, itemId);
      const set: Partial<typeof items.$inferInsert> = {};
      if (input.quality !== undefined) set.quality = input.quality;
      if (input.upgradeLevel !== undefined) set.upgradeLevel = input.upgradeLevel;
      // A broken item cannot stay equipped (D19).
      if (input.quality === 0) set.equippedSlot = null;
      if (Object.keys(set).length) await tx.update(items).set(set).where(eq(items.id, itemId));
      return { type: 'admin.item_updated', payload: { itemId, ...input } };
    });
  }

  removeItem(adminId: string, characterId: string, itemId: string) {
    return this.change(adminId, characterId, async (tx, c) => {
      const item = await this.ownedItem(tx, c.id, itemId);
      await tx.delete(items).where(eq(items.id, itemId));
      return { type: 'admin.item_removed', payload: { itemId, defId: item.itemDefId } };
    });
  }

  teachSkill(adminId: string, characterId: string, abilityId: string) {
    return this.change(adminId, characterId, async (tx, c) => {
      const a = getAbility(abilityId);
      if (!a) throw errors.validation(`Unknown ability: ${abilityId}.`);
      if (a.source === 'universal')
        throw errors.validation(`${a.name} is universal: everyone has it.`);
      await tx
        .insert(characterSkills)
        .values({ characterId: c.id, skillId: abilityId })
        .onConflictDoNothing();
      return { type: 'admin.skill_taught', payload: { abilityId } };
    });
  }

  forgetSkill(adminId: string, characterId: string, abilityId: string) {
    return this.change(adminId, characterId, async (tx, c) => {
      await tx
        .delete(characterSkills)
        .where(and(eq(characterSkills.characterId, c.id), eq(characterSkills.skillId, abilityId)));
      return { type: 'admin.skill_forgotten', payload: { abilityId } };
    });
  }

  updateCharacter(adminId: string, characterId: string, input: AdminUpdateCharacterRequest) {
    return this.change(adminId, characterId, async (tx, c) => {
      const a = input.attributes;
      const set: Partial<typeof characters.$inferInsert> = {
        ...(a
          ? {
              attrMight: a.might,
              attrAgility: a.agility,
              attrPrecision: a.precision,
              attrEndurance: a.endurance,
              attrIntellect: a.intellect,
              attrWill: a.will,
            }
          : {}),
        ...(input.attributePoints !== undefined ? { attributePoints: input.attributePoints } : {}),
        ...(input.reputation !== undefined ? { reputation: input.reputation } : {}),
      };
      if (Object.keys(set).length)
        await tx.update(characters).set(set).where(eq(characters.id, c.id));
      return { type: 'admin.character_updated', payload: { ...input } };
    });
  }

  // ---- helpers ----

  private async change(
    adminId: string,
    characterId: string,
    fn: (tx: DbOrTx, c: Character) => Promise<{ type: string; payload: Record<string, unknown> }>,
  ): Promise<AdminCharacterDto> {
    return this.ctx.db.transaction(async (tx) => {
      const c = await this.load(tx, characterId, true);
      const event = await fn(tx, c);
      await tx.insert(worldEvents).values({
        worldId: c.worldId,
        type: event.type,
        actorAccountId: adminId,
        actorCharacterId: c.id,
        payload: event.payload,
      });
      return this.view(tx, await this.load(tx, characterId));
    });
  }

  private async load(db: DbOrTx, id: string, lock = false): Promise<Character> {
    const q = db
      .select()
      .from(characters)
      .where(and(eq(characters.id, id), isNull(characters.deletedAt)));
    const [c] = lock ? await q.for('update') : await q;
    if (!c) throw errors.notFound('Character');
    return c;
  }

  private async ownedItem(db: DbOrTx, characterId: string, itemId: string) {
    const item = (await itemsRepository.listByCharacter(db, characterId)).find(
      (i) => i.id === itemId,
    );
    if (!item) throw errors.notFound('Item');
    return item;
  }

  private async view(db: DbOrTx, c: Character): Promise<AdminCharacterDto> {
    const [sheet, learnedSkillIds, [owner]] = await Promise.all([
      this.sheets.sheetOf(db, c),
      itemsRepository.learnedSkillIds(db, c.id),
      db.select({ email: accounts.email }).from(accounts).where(eq(accounts.id, c.accountId)),
    ]);
    return { sheet, learnedSkillIds, accountEmail: owner?.email ?? '' };
  }
}
