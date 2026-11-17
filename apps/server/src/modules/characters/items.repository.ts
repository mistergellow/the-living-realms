import { characterSkills, items, type DbOrTx, type Item } from '@realms/db';
import type { EquipSlot } from '@realms/shared';
import { asc, eq, inArray } from 'drizzle-orm';

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

  async unequip(db: DbOrTx, ids: string[]): Promise<void> {
    if (ids.length)
      await db.update(items).set({ equippedSlot: null }).where(inArray(items.id, ids));
  },

  async setSlot(db: DbOrTx, id: string, slot: EquipSlot | null): Promise<void> {
    await db.update(items).set({ equippedSlot: slot }).where(eq(items.id, id));
  },

  async learnedSkillIds(db: DbOrTx, characterId: string): Promise<string[]> {
    const rows = await db
      .select({ id: characterSkills.skillId })
      .from(characterSkills)
      .where(eq(characterSkills.characterId, characterId));
    return rows.map((r) => r.id);
  },
};
