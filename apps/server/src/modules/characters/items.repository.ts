import { characterSkills, items, type DbOrTx, type Item } from '@realms/db';
import type { EquipSlot } from '@realms/shared';
import { and, asc, eq, inArray } from 'drizzle-orm';

export const itemsRepository = {
  listByCharacter(db: DbOrTx, characterId: string): Promise<Item[]> {
    return (
      db
        .select()
        .from(items)
        // Request #50: items in the city storage are not carried.
        .where(and(eq(items.characterId, characterId), eq(items.inStorage, false)))
        .orderBy(asc(items.createdAt))
    );
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

  /** Learned skills (oldest first) with their loadout slot (null = not prepared). */
  learnedSkills(
    db: DbOrTx,
    characterId: string,
  ): Promise<Array<{ id: string; loadoutSlot: number | null; level: number }>> {
    return db
      .select({
        id: characterSkills.skillId,
        loadoutSlot: characterSkills.loadoutSlot,
        level: characterSkills.level,
      })
      .from(characterSkills)
      .where(eq(characterSkills.characterId, characterId))
      .orderBy(asc(characterSkills.learnedAt), asc(characterSkills.skillId));
  },

  /** Replace the prepared skills (clear all slots first: unique slot index). */
  async setLoadout(db: DbOrTx, characterId: string, slots: Array<string | null>): Promise<void> {
    await db
      .update(characterSkills)
      .set({ loadoutSlot: null })
      .where(eq(characterSkills.characterId, characterId));
    for (const [slot, skillId] of slots.entries()) {
      if (!skillId) continue;
      await db
        .update(characterSkills)
        .set({ loadoutSlot: slot })
        .where(
          and(eq(characterSkills.characterId, characterId), eq(characterSkills.skillId, skillId)),
        );
    }
  },
};
