import { items, type DbOrTx } from '@realms/db';
import { defaultGrade, getItemDef, INVENTORY_RULES, isStackable } from '@realms/game-core';
import { ErrorCode } from '@realms/shared';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
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
const inStore = (characterId: string) =>
  and(eq(items.characterId, characterId), isNull(items.equippedSlot), eq(items.inStorage, true));

export type Place = 'bag' | 'storage';
export const placeWhere = (characterId: string, place: Place) =>
  place === 'bag' ? inBag(characterId) : inStore(characterId);

/** Request #59: the first free position of the bag or the storage (may pass the size when full). */
export async function firstFreeSlot(db: DbOrTx, characterId: string, place: Place): Promise<number> {
  const rows = await db
    .select({ slot: items.slot })
    .from(items)
    .where(placeWhere(characterId, place));
  const used = new Set(rows.map((r) => r.slot).filter((s): s is number => s !== null));
  let n = 0;
  while (used.has(n)) n++;
  return n;
}

/**
 * Request #59: give every unplaced item (no slot, or a slot another item
 * already uses) the first free position. Cheap when nothing is missing.
 */
export async function ensureSlots(db: DbOrTx, characterId: string): Promise<void> {
  const rows = await db
    .select({ id: items.id, slot: items.slot, inStorage: items.inStorage })
    .from(items)
    .where(and(eq(items.characterId, characterId), isNull(items.equippedSlot)))
    .orderBy(asc(items.createdAt));
  for (const place of [false, true]) {
    const here = rows.filter((r) => r.inStorage === place);
    const used = new Set<number>();
    const todo: string[] = [];
    for (const r of here) {
      if (r.slot === null || r.slot < 0 || used.has(r.slot)) todo.push(r.id);
      else used.add(r.slot);
    }
    let n = 0;
    for (const id of todo) {
      while (used.has(n)) n++;
      used.add(n);
      await db.update(items).set({ slot: n }).where(eq(items.id, id));
    }
  }
}

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
    // Join the first stack of the same item and grade (request #59: there can be several).
    const [first] = await tx
      .select({ id: items.id })
      .from(items)
      .where(and(inBag(characterId), eq(items.itemDefId, defId), sameGrade(grade)))
      .orderBy(asc(items.slot))
      .limit(1);
    if (first) {
      const [stack] = await tx
        .update(items)
        .set({ quantity: sql`${items.quantity} + ${qty}` })
        .where(eq(items.id, first.id))
        .returning({ id: items.id, specials: items.specials });
      return { id: stack!.id, inStorage: false, specials: stack!.specials };
    }
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
      slot: await firstFreeSlot(tx, characterId, full ? 'storage' : 'bag'),
      grade,
      ...(opts.specials !== undefined ? { specials: opts.specials } : {}),
      ...(opts.upgradeLevel !== undefined ? { upgradeLevel: opts.upgradeLevel } : {}),
      ...(opts.quality !== undefined ? { quality: opts.quality } : {}),
    })
    .returning({ id: items.id, specials: items.specials });
  return { id: row!.id, inStorage: full, specials: row!.specials };
}
