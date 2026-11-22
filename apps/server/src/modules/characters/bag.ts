import { items, type DbOrTx } from '@realms/db';
import { defaultGrade, getItemDef, INVENTORY_RULES, isStackable } from '@realms/game-core';
import { ErrorCode } from '@realms/shared';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { AppError } from '../../lib/errors.js';

/*
 * The bag (request #50): at most INVENTORY_RULES.bagSlots rows that are
 * neither equipped nor in storage (a stack is one slot). Loot that does not
 * fit goes to the city storage; things you buy or take out need room.
 */

/** Stacks join only stacks of the same material grade (request #52). */
export const sameGrade = (grade: number | null) =>
  grade === null ? isNull(items.grade) : eq(items.grade, grade);

const inBag = (characterId: string) =>
  and(eq(items.characterId, characterId), isNull(items.equippedSlot), eq(items.inStorage, false));

export async function bagUsed(db: DbOrTx, characterId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(items)
    .where(inBag(characterId));
  return row?.n ?? 0;
}

export const bagFull = () =>
  new AppError(
    409,
    ErrorCode.BAG_FULL,
    `Your bag is full (${INVENTORY_RULES.bagSlots} slots). Store or sell something first.`,
  );

export async function assertBagRoom(db: DbOrTx, characterId: string, slots = 1): Promise<void> {
  if ((await bagUsed(db, characterId)) + slots > INVENTORY_RULES.bagSlots) throw bagFull();
}

/**
 * Give an item. Stackables join a stack already in the bag. When a new slot is
 * needed and the bag is full: `strict` throws; otherwise the item goes to
 * storage. Returns where it went.
 */
export async function giveItem(
  tx: DbOrTx,
  characterId: string,
  defId: string,
  opts: {
    qty?: number;
    source: string;
    specials?: unknown;
    upgradeLevel?: number;
    quality?: number;
    /** Material grade (request #52); defaults to Common for gatherable materials. */
    grade?: number | null;
    strict?: boolean;
  },
): Promise<{ id: string; inStorage: boolean; specials: unknown }> {
  const qty = opts.qty ?? 1;
  const grade = opts.grade === undefined ? defaultGrade(defId) : opts.grade;
  if (isStackable(getItemDef(defId))) {
    const [stack] = await tx
      .update(items)
      .set({ quantity: sql`${items.quantity} + ${qty}` })
      .where(and(inBag(characterId), eq(items.itemDefId, defId), sameGrade(grade)))
      .returning({ id: items.id, specials: items.specials });
    if (stack) return { id: stack.id, inStorage: false, specials: stack.specials };
  }
  const full = (await bagUsed(tx, characterId)) >= INVENTORY_RULES.bagSlots;
  if (full && opts.strict) throw bagFull();
  const [row] = await tx
    .insert(items)
    .values({
      characterId,
      itemDefId: defId,
      quantity: isStackable(getItemDef(defId)) ? qty : 1,
      source: opts.source,
      inStorage: full,
      grade,
      ...(opts.specials !== undefined ? { specials: opts.specials } : {}),
      ...(opts.upgradeLevel !== undefined ? { upgradeLevel: opts.upgradeLevel } : {}),
      ...(opts.quality !== undefined ? { quality: opts.quality } : {}),
    })
    .returning({ id: items.id, specials: items.specials });
  return { id: row!.id, inStorage: full, specials: row!.specials };
}
