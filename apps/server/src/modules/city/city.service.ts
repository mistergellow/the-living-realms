import { characters, items, worldEvents, type Character, type DbOrTx, type Item } from '@realms/db';
import {
  compareItemsForSort,
  getItemDef,
  INVENTORY_RULES,
  isStackable,
  mapHexAt,
  normalizeAffixes,
  npcSellPrice,
  SHOP_STOCK,
  upgradeMultiplier,
  upgradeOutcome,
  upgradeQuote,
  weaponInfo,
} from '@realms/game-core';
import { ErrorCode, type CityDto } from '@realms/shared';
import { and, asc, eq, isNull, ne, sql } from 'drizzle-orm';
import { randomInt } from 'node:crypto';
import type { AppContext } from '../../context.js';
import { AppError, errors } from '../../lib/errors.js';
import {
  assertBagRoom,
  bagUsed,
  ensureSlots,
  firstFreeSlot,
  giveItem,
  placeWhere,
  sameGrade,
  type Place,
} from '../characters/bag.js';

const storageFull = (slots: number) =>
  new AppError(
    409,
    ErrorCode.BAG_FULL,
    `Your storage is full (${slots} slots). More slots will be available later.`,
  );
import {
  assertNotInRift,
  baseAttributesOf,
  toItemDto,
  type CharacterSheetService,
} from '../characters/sheet.service.js';

type Outcome = Pick<CityDto, 'message' | 'upgrade'>;

/**
 * City services (request #50), available in every capital: the character's
 * storage, the general store (buy basics, sell gear cheaply) and the
 * blacksmith (Metin2-style upgrades, +1 … +10).
 */
export class CityService {
  constructor(
    private readonly ctx: AppContext,
    private readonly sheets: CharacterSheetService,
  ) {}

  private capitalOf(c: Character): string | null {
    return mapHexAt({ q: c.hexQ, r: c.hexR })?.capital ?? null;
  }

  private assertInCapital(c: Character): void {
    if (!this.capitalOf(c))
      throw new AppError(409, ErrorCode.NOT_HERE, 'You must be in a capital to do that.');
  }

  private async owned(tx: DbOrTx, c: Character, itemId: string): Promise<Item> {
    const [item] = await tx
      .select()
      .from(items)
      .where(and(eq(items.id, itemId), eq(items.characterId, c.id)));
    if (!item) throw errors.notFound('Item');
    return item;
  }

  private async spendGold(tx: DbOrTx, c: Character, amount: number): Promise<void> {
    const [row] = await tx
      .update(characters)
      .set({ gold: sql`${characters.gold} - ${amount}` })
      .where(and(eq(characters.id, c.id), sql`${characters.gold} >= ${amount}`))
      .returning({ id: characters.id });
    if (!row) throw new AppError(409, ErrorCode.NOT_ENOUGH_GOLD, `You need ${amount} gold.`);
  }

  /** Take `qty` of a stackable from the bag; throws if there is not enough. */
  private async consume(tx: DbOrTx, c: Character, defId: string, qty: number): Promise<void> {
    const rows = await tx
      .select()
      .from(items)
      .where(
        and(
          eq(items.characterId, c.id),
          eq(items.itemDefId, defId),
          isNull(items.equippedSlot),
          eq(items.inStorage, false),
        ),
      );
    const have = rows.reduce((s, r) => s + r.quantity, 0);
    if (have < qty)
      throw errors.validation(`You need ${qty} × ${getItemDef(defId)?.name ?? defId}.`);
    let left = qty;
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

  /** Adds `item` to the first stack of the same item and grade in `place`; returns it, if any. */
  private async joinStack(tx: DbOrTx, c: Character, item: Item, place: Place) {
    const [first] = await tx
      .select({ id: items.id })
      .from(items)
      .where(
        and(
          placeWhere(c.id, place),
          eq(items.itemDefId, item.itemDefId),
          sameGrade(item.grade),
          ne(items.id, item.id),
        ),
      )
      .orderBy(asc(items.slot))
      .limit(1);
    if (!first) return undefined;
    await tx
      .update(items)
      .set({ quantity: sql`${items.quantity} + ${item.quantity}` })
      .where(eq(items.id, first.id));
    return first;
  }

  // ---------------------------------------------------------------------------
  // Request #59: arrange the bag and the storage like a grid of slots.
  // ---------------------------------------------------------------------------

  /**
   * Move an item (or `qty` of a stack) to a position of the bag or the
   * storage. Empty target: move (or split). Same stack: merge. Another item:
   * swap. Equipped items dropped on the bag come off. Bag ↔ storage only in
   * a capital.
   */
  move(
    accountId: string,
    characterId: string,
    itemId: string,
    to: Place,
    slot: number,
    qty?: number,
  ) {
    return this.ctx.db.transaction(async (tx) => {
      const c = await this.sheets.getOwnedCharacter(tx, accountId, characterId, true);
      await assertNotInRift(tx, c.id);
      await ensureSlots(tx, c.id);
      const item = await this.owned(tx, c, itemId);
      const from: Place | null = item.equippedSlot ? null : item.inStorage ? 'storage' : 'bag';
      if (from === null && to === 'storage') throw errors.validation('Unequip it first.');
      if ((from === 'storage' || to === 'storage') && from !== to) this.assertInCapital(c);
      if (to === 'storage' && from === 'storage') this.assertInCapital(c);
      const cap = to === 'bag' ? INVENTORY_RULES.bagSlots : c.storageSlots;
      if (slot < 0 || slot >= cap)
        throw errors.validation(
          to === 'bag' ? 'That is not a bag slot.' : 'That is not a storage slot.',
        );
      const n = Math.min(item.quantity, Math.max(1, qty ?? item.quantity));
      const [target] = await tx
        .select()
        .from(items)
        .where(and(placeWhere(c.id, to), eq(items.slot, slot)));
      const toStorage = to === 'storage';
      if (target?.id === item.id) return this.view(tx, accountId, characterId);

      if (!target) {
        if (from === null) {
          // Unequip onto this bag slot.
          await tx
            .update(items)
            .set({ equippedSlot: null, inStorage: false, slot })
            .where(eq(items.id, item.id));
        } else if (n < item.quantity) {
          // Split the stack.
          await tx
            .update(items)
            .set({ quantity: item.quantity - n })
            .where(eq(items.id, item.id));
          await tx.insert(items).values({
            characterId: c.id,
            itemDefId: item.itemDefId,
            quantity: n,
            quality: item.quality,
            grade: item.grade,
            source: item.source,
            inStorage: toStorage,
            slot,
          });
        } else {
          await tx.update(items).set({ inStorage: toStorage, slot }).where(eq(items.id, item.id));
        }
        return this.view(tx, accountId, characterId);
      }

      const sameStack =
        target.itemDefId === item.itemDefId &&
        target.grade === item.grade &&
        isStackable(getItemDef(item.itemDefId));
      if (sameStack && from !== null) {
        await tx
          .update(items)
          .set({ quantity: target.quantity + n })
          .where(eq(items.id, target.id));
        if (n >= item.quantity) await tx.delete(items).where(eq(items.id, item.id));
        else
          await tx
            .update(items)
            .set({ quantity: item.quantity - n })
            .where(eq(items.id, item.id));
        return this.view(tx, accountId, characterId);
      }
      if (from === null) {
        // Unequip onto an occupied slot: the item goes to the first free bag slot.
        await assertBagRoom(tx, c.id);
        await tx
          .update(items)
          .set({ equippedSlot: null, inStorage: false, slot: await firstFreeSlot(tx, c.id, 'bag') })
          .where(eq(items.id, item.id));
        return this.view(tx, accountId, characterId);
      }
      if (n < item.quantity)
        throw errors.validation('Split a stack onto an empty slot or onto the same item.');
      // Swap the two items.
      await tx
        .update(items)
        .set({ inStorage: from === 'storage', slot: item.slot })
        .where(eq(items.id, target.id));
      await tx.update(items).set({ inStorage: toStorage, slot }).where(eq(items.id, item.id));
      return this.view(tx, accountId, characterId);
    });
  }

  /** Sort (request #59): merge equal stacks, then order by kind, best first, then name. */
  sort(accountId: string, characterId: string, place: Place) {
    return this.ctx.db.transaction(async (tx) => {
      const c = await this.sheets.getOwnedCharacter(tx, accountId, characterId, true);
      if (place === 'storage') this.assertInCapital(c);
      const rows = await tx.select().from(items).where(placeWhere(c.id, place));
      const keep: Item[] = [];
      for (const r of rows) {
        const same = isStackable(getItemDef(r.itemDefId))
          ? keep.find((k) => k.itemDefId === r.itemDefId && k.grade === r.grade)
          : undefined;
        if (same) {
          same.quantity += r.quantity;
          await tx.update(items).set({ quantity: same.quantity }).where(eq(items.id, same.id));
          await tx.delete(items).where(eq(items.id, r.id));
        } else keep.push({ ...r });
      }
      keep.sort((a, b) =>
        compareItemsForSort(
          {
            itemDefId: a.itemDefId,
            affixCount: normalizeAffixes(a.specials).length,
            upgradeLevel: a.upgradeLevel,
            grade: a.grade,
          },
          {
            itemDefId: b.itemDefId,
            affixCount: normalizeAffixes(b.specials).length,
            upgradeLevel: b.upgradeLevel,
            grade: b.grade,
          },
        ),
      );
      // Two passes avoid clashing positions while renumbering.
      for (const [i, r] of keep.entries())
        await tx
          .update(items)
          .set({ slot: 10_000 + i })
          .where(eq(items.id, r.id));
      for (const [i, r] of keep.entries())
        await tx.update(items).set({ slot: i }).where(eq(items.id, r.id));
      return this.view(tx, accountId, characterId, {
        message: place === 'bag' ? 'Bag sorted.' : 'Storage sorted.',
        upgrade: null,
      });
    });
  }

  get(accountId: string, characterId: string): Promise<CityDto> {
    return this.view(this.ctx.db, accountId, characterId);
  }

  async view(
    db: DbOrTx,
    accountId: string,
    characterId: string,
    outcome: Outcome = { message: null, upgrade: null },
  ): Promise<CityDto> {
    const c = await this.sheets.getOwnedCharacter(db, accountId, characterId);
    await ensureSlots(db, c.id);
    const base = baseAttributesOf(c);
    const all = await db.select().from(items).where(eq(items.characterId, c.id));
    const carried = all.filter((i) => !i.inStorage);
    const sellPrices: CityDto['sellPrices'] = {};
    const upgrades: CityDto['upgrades'] = {};
    const have = (defId: string) =>
      carried
        .filter((i) => i.itemDefId === defId && !i.equippedSlot)
        .reduce((s, i) => s + i.quantity, 0);
    for (const i of carried) {
      if (!i.equippedSlot) {
        const price = npcSellPrice(
          i.itemDefId,
          normalizeAffixes(i.specials).length,
          i.upgradeLevel,
          i.quality,
        );
        if (price !== null) sellPrices[i.id] = price;
      }
      const q = upgradeQuote(i.itemDefId, i.upgradeLevel);
      const type = getItemDef(i.itemDefId)?.weaponType;
      const at = (level: number) => ({
        damage: weaponInfo(type, { upgradeLevel: level })?.baseDamage ?? { min: 0, max: 0 },
        power: Math.round((upgradeMultiplier(level) - 1) * 100),
      });
      if (q.ok)
        upgrades[i.id] = {
          compare: { now: at(i.upgradeLevel), next: at(q.quote.toLevel) },
          preview: toItemDto({ ...i, upgradeLevel: q.quote.toLevel }, base),
          toLevel: q.quote.toLevel,
          gold: q.quote.gold,
          chance: q.quote.chance,
          material: q.quote.material
            ? {
                defId: q.quote.material.item,
                name: getItemDef(q.quote.material.item)?.name ?? q.quote.material.item,
                qty: q.quote.material.qty,
                have: have(q.quote.material.item),
              }
            : null,
        };
    }
    return {
      capital: this.capitalOf(c),
      sheet: await this.sheets.buildSheet(db, c),
      storage: all.filter((i) => i.inStorage).map((i) => toItemDto(i, base)),
      bag: { used: await bagUsed(db, c.id), slots: INVENTORY_RULES.bagSlots },
      storageSlots: c.storageSlots,
      shop: SHOP_STOCK.map((s) => ({
        defId: s.item,
        name: getItemDef(s.item)?.name ?? s.item,
        price: s.price,
      })),
      sellPrices,
      upgrades,
      blessingScrolls: have('blessing_scroll'),
      ...outcome,
    };
  }

  /** Runs a city action in a transaction (character locked, in a capital, not in a Rift). */
  private act(
    accountId: string,
    characterId: string,
    fn: (tx: DbOrTx, c: Character) => Promise<Outcome>,
  ): Promise<CityDto> {
    return this.ctx.db.transaction(async (tx) => {
      const c = await this.sheets.getOwnedCharacter(tx, accountId, characterId, true);
      await assertNotInRift(tx, c.id);
      this.assertInCapital(c);
      const outcome = await fn(tx, c);
      return this.view(tx, accountId, characterId, outcome);
    });
  }

  deposit(accountId: string, characterId: string, itemId: string) {
    return this.act(accountId, characterId, async (tx, c) => {
      const item = await this.owned(tx, c, itemId);
      if (item.equippedSlot) throw errors.validation('Unequip it first.');
      if (item.inStorage) throw errors.validation('It is already in storage.');
      const name = getItemDef(item.itemDefId)?.name ?? item.itemDefId;
      const slot = await firstFreeSlot(tx, c.id, 'storage');
      // Stacks join a stack already in storage.
      if (isStackable(getItemDef(item.itemDefId))) {
        const stack = await this.joinStack(tx, c, item, 'storage');
        if (stack) {
          await tx.delete(items).where(eq(items.id, item.id));
          return { message: `${name} stored.`, upgrade: null };
        }
      }
      if (slot >= c.storageSlots) throw storageFull(c.storageSlots);
      await tx.update(items).set({ inStorage: true, slot }).where(eq(items.id, item.id));
      return { message: `${name} stored.`, upgrade: null };
    });
  }

  withdraw(accountId: string, characterId: string, itemId: string) {
    return this.act(accountId, characterId, async (tx, c) => {
      const item = await this.owned(tx, c, itemId);
      if (!item.inStorage) throw errors.validation('That item is not in storage.');
      const name = getItemDef(item.itemDefId)?.name ?? item.itemDefId;
      if (isStackable(getItemDef(item.itemDefId))) {
        const stack = await this.joinStack(tx, c, item, 'bag');
        if (stack) {
          await tx.delete(items).where(eq(items.id, item.id));
          return { message: `${name} taken out.`, upgrade: null };
        }
      }
      await assertBagRoom(tx, c.id);
      await tx
        .update(items)
        .set({ inStorage: false, slot: await firstFreeSlot(tx, c.id, 'bag') })
        .where(eq(items.id, item.id));
      return { message: `${name} taken out.`, upgrade: null };
    });
  }

  buy(accountId: string, characterId: string, defId: string, qty: number) {
    return this.act(accountId, characterId, async (tx, c) => {
      const entry = SHOP_STOCK.find((s) => s.item === defId);
      if (!entry) throw errors.validation('The store does not sell that.');
      const stackable = isStackable(getItemDef(defId));
      const n = stackable ? qty : 1;
      await this.spendGold(tx, c, entry.price * n);
      await giveItem(tx, c.id, defId, { qty: n, source: 'shop', strict: true });
      const name = getItemDef(defId)?.name ?? defId;
      return { message: `Bought ${n > 1 ? `${n} × ` : ''}${name}.`, upgrade: null };
    });
  }

  sell(accountId: string, characterId: string, itemId: string) {
    return this.act(accountId, characterId, async (tx, c) => {
      const item = await this.owned(tx, c, itemId);
      if (item.equippedSlot || item.inStorage)
        throw errors.validation('Only items in your bag can be sold.');
      const price = npcSellPrice(
        item.itemDefId,
        normalizeAffixes(item.specials).length,
        item.upgradeLevel,
        item.quality,
      );
      if (price === null)
        throw errors.validation('The store does not buy that. Trade it with other players.');
      await tx.delete(items).where(eq(items.id, item.id));
      await tx
        .update(characters)
        .set({ gold: sql`${characters.gold} + ${price}` })
        .where(eq(characters.id, c.id));
      const name = getItemDef(item.itemDefId)?.name ?? item.itemDefId;
      return { message: `Sold ${name} for ${price} gold.`, upgrade: null };
    });
  }

  /**
   * Blacksmith (request #50, Metin2 style): pay gold (+4 and up also the
   * family material) and try. Failure destroys the weapon — or, with a
   * Blessing Scroll, takes 1 level off instead.
   */
  upgrade(accountId: string, characterId: string, itemId: string, blessing: boolean) {
    return this.act(accountId, characterId, async (tx, c) => {
      const item = await this.owned(tx, c, itemId);
      if (item.inStorage) throw errors.validation('Take it out of storage first.');
      const q = upgradeQuote(item.itemDefId, item.upgradeLevel);
      if (!q.ok) throw errors.validation(q.reason);
      const { quote } = q;
      if (quote.material) await this.consume(tx, c, quote.material.item, quote.material.qty);
      if (blessing) await this.consume(tx, c, 'blessing_scroll', 1);
      await this.spendGold(tx, c, quote.gold);
      const out = upgradeOutcome(
        item.upgradeLevel,
        quote.chance,
        randomInt(1_000_000) / 1_000_000,
        blessing,
      );
      const name = getItemDef(item.itemDefId)?.name ?? item.itemDefId;
      if (out.result === 'destroyed') await tx.delete(items).where(eq(items.id, item.id));
      else await tx.update(items).set({ upgradeLevel: out.level }).where(eq(items.id, item.id));
      await tx.insert(worldEvents).values({
        worldId: c.worldId,
        type: 'blacksmith.upgrade',
        actorAccountId: accountId,
        actorCharacterId: c.id,
        payload: { itemDefId: item.itemDefId, from: item.upgradeLevel, ...out, blessing },
      });
      const message =
        out.result === 'success'
          ? `Success! ${name} is now +${out.level}.`
          : out.result === 'downgraded'
            ? `The upgrade failed. The Blessing Scroll saved ${name}: it is now +${out.level}.`
            : `The upgrade failed and ${name} broke apart.`;
      return { message, upgrade: out };
    });
  }
}
