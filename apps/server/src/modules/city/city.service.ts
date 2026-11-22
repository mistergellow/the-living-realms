import { characters, items, worldEvents, type Character, type DbOrTx, type Item } from '@realms/db';
import {
  getItemDef,
  INVENTORY_RULES,
  isStackable,
  mapHexAt,
  normalizeAffixes,
  npcSellPrice,
  SHOP_STOCK,
  upgradeOutcome,
  upgradeQuote,
} from '@realms/game-core';
import { ErrorCode, type CityDto } from '@realms/shared';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { randomInt } from 'node:crypto';
import type { AppContext } from '../../context.js';
import { AppError, errors } from '../../lib/errors.js';
import { assertBagRoom, bagUsed, giveItem } from '../characters/bag.js';
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
      if (q.ok)
        upgrades[i.id] = {
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
      // Stacks join a stack already in storage.
      if (isStackable(getItemDef(item.itemDefId))) {
        const [stack] = await tx
          .update(items)
          .set({ quantity: sql`${items.quantity} + ${item.quantity}` })
          .where(
            and(
              eq(items.characterId, c.id),
              eq(items.itemDefId, item.itemDefId),
              eq(items.inStorage, true),
            ),
          )
          .returning({ id: items.id });
        if (stack) {
          await tx.delete(items).where(eq(items.id, item.id));
          return { message: `${name} stored.`, upgrade: null };
        }
      }
      await tx.update(items).set({ inStorage: true }).where(eq(items.id, item.id));
      return { message: `${name} stored.`, upgrade: null };
    });
  }

  withdraw(accountId: string, characterId: string, itemId: string) {
    return this.act(accountId, characterId, async (tx, c) => {
      const item = await this.owned(tx, c, itemId);
      if (!item.inStorage) throw errors.validation('That item is not in storage.');
      const name = getItemDef(item.itemDefId)?.name ?? item.itemDefId;
      if (isStackable(getItemDef(item.itemDefId))) {
        const [stack] = await tx
          .update(items)
          .set({ quantity: sql`${items.quantity} + ${item.quantity}` })
          .where(
            and(
              eq(items.characterId, c.id),
              eq(items.itemDefId, item.itemDefId),
              eq(items.inStorage, false),
              isNull(items.equippedSlot),
            ),
          )
          .returning({ id: items.id });
        if (stack) {
          await tx.delete(items).where(eq(items.id, item.id));
          return { message: `${name} taken out.`, upgrade: null };
        }
      }
      await assertBagRoom(tx, c.id);
      await tx.update(items).set({ inStorage: false }).where(eq(items.id, item.id));
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
