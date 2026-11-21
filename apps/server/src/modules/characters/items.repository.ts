import { characterSkills, items, type DbOrTx, type Item } from '@realms/db';
import { getItemDef, isStackable } from '@realms/game-core';
import type { EquipSlot } from '@realms/shared';
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';

export const itemsRepository = {
  listByCharacter(db: DbOrTx, characterId: string): Promise<Item[]> {
    return db
      .select()
      .from(items)
      .where(eq(items.characterId, characterId))
      .orderBy(asc(items.createdAt));
  },

  async insertMany(db: DbOrTx, values: Array<typeof items.$inferInsert>): Promise<void> {
    if (values.length) await db.insert(items).values(values);
  },

  /** Give one item; stackables (materials, consumables, books) join an existing stack. */
  async giveOne(db: DbOrTx, characterId: string, itemDefId: string, source: string) {
    if (isStackable(getItemDef(itemDefId))) {
      const [stack] = await db
        .update(items)
        .set({ quantity: sql`${items.quantity} + 1` })
        .where(
          and(
            eq(items.characterId, characterId),
            eq(items.itemDefId, itemDefId),
            isNull(items.equippedSlot),
          ),
        )
        .returning({ id: items.id });
      if (stack) return stack;
    }
    const [row] = await db
      .insert(items)
      .values({ characterId, itemDefId, source })
      .returning({ id: items.id });
    return row!;
  },

  async unequip(db: DbOrTx, ids: string[]): Promise<void> {
    if (ids.length)
      await db.update(items).set({ equippedSlot: null }).where(inArray(items.id, ids));
  },

  async setSlot(db: DbOrTx, id: string, slot: EquipSlot | null): Promise<void> {
    await db.update(items).set({ equippedSlot: slot }).where(eq(items.id, id));
  },

  async learnedSkillIds(db: DbOrTx, characterId: string): Promise<string[]> {
    return (await this.learnedSkills(db, characterId)).map((r) => r.skillId);
  },

  /** Learned skills with rank and progress (request #36), oldest first. */
  learnedSkills(
    db: DbOrTx,
    characterId: string,
  ): Promise<Array<{ skillId: string; rank: number; progress: number }>> {
    return db
      .select({
        skillId: characterSkills.skillId,
        rank: characterSkills.rank,
        progress: characterSkills.progress,
      })
      .from(characterSkills)
      .where(eq(characterSkills.characterId, characterId))
      .orderBy(asc(characterSkills.learnedAt));
  },
};
