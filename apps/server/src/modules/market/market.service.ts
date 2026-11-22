import {
  characters,
  items,
  marketListings,
  worldEvents,
  type Character,
  type DbOrTx,
  type Item,
} from '@realms/db';
import { getItemDef, isStackable, mapHexAt, MARKET_RULES } from '@realms/game-core';
import { ErrorCode, type MarketDto, type MarketListingDto } from '@realms/shared';
import { and, asc, count, eq, isNull, sql } from 'drizzle-orm';
import type { AppContext } from '../../context.js';
import { AppError, errors } from '../../lib/errors.js';
import { assertBagRoom, firstFreeSlot, giveItem } from '../characters/bag.js';
import {
  assertNotInRift,
  baseAttributesOf,
  toItemDto,
  type CharacterSheetService,
} from '../characters/sheet.service.js';

type Listing = typeof marketListings.$inferSelect;

/**
 * Player market (request #63): in a city, a player puts an item from the bag
 * up for sale at a price. It is only on sale in that city's market and stays
 * until someone buys it (the gold goes to the seller, online or not) or the
 * seller takes it back there. At most MARKET_RULES.maxListings per player.
 */
export class MarketService {
  constructor(
    private readonly ctx: AppContext,
    private readonly sheets: CharacterSheetService,
  ) {}

  private city(c: { hexQ: number; hexR: number }) {
    return mapHexAt({ q: c.hexQ, r: c.hexR })?.capital ?? null;
  }

  private assertCity(c: Character): string {
    const city = this.city(c);
    if (!city) throw new AppError(409, ErrorCode.NOT_HERE, 'Markets are in the cities.');
    return city;
  }

  get(accountId: string, characterId: string): Promise<MarketDto> {
    return this.ctx.db.transaction(async (tx) => {
      const c = await this.sheets.getOwnedCharacter(tx, accountId, characterId);
      return this.view(tx, c, null);
    });
  }

  private asItem(l: Listing): Item {
    return {
      id: l.id,
      characterId: l.sellerCharacterId,
      itemDefId: l.itemDefId,
      quality: l.quality,
      quantity: l.quantity,
      equippedSlot: null,
      inStorage: false,
      slot: null,
      source: l.source,
      upgradeLevel: l.upgradeLevel,
      grade: l.grade,
      specials: l.specials,
      runeSlots: l.runeSlots,
      createdAt: l.createdAt,
      updatedAt: l.createdAt,
    };
  }

  private async view(db: DbOrTx, c: Character, message: string | null): Promise<MarketDto> {
    const base = baseAttributesOf(c);
    const fresh = (await db.select().from(characters).where(eq(characters.id, c.id)))[0] ?? c;
    const toDto = async (rows: Listing[]): Promise<MarketListingDto[]> => {
      const sellers = new Map<string, string>();
      for (const id of new Set(rows.map((r) => r.sellerCharacterId))) {
        const [s] = await db
          .select({ name: characters.name })
          .from(characters)
          .where(eq(characters.id, id));
        sellers.set(id, s?.name ?? '?');
      }
      return rows.map((l) => ({
        id: l.id,
        item: toItemDto(this.asItem(l), base),
        price: l.price,
        sellerName: sellers.get(l.sellerCharacterId) ?? '?',
        mine: l.sellerCharacterId === c.id,
        city: mapHexAt({ q: l.hexQ, r: l.hexR })?.capital ?? `(${l.hexQ}, ${l.hexR})`,
      }));
    };
    const here = this.city(c)
      ? await db
          .select()
          .from(marketListings)
          .where(
            and(
              eq(marketListings.worldId, c.worldId),
              eq(marketListings.hexQ, c.hexQ),
              eq(marketListings.hexR, c.hexR),
            ),
          )
          .orderBy(asc(marketListings.createdAt))
      : [];
    const mine = await db
      .select()
      .from(marketListings)
      .where(eq(marketListings.sellerCharacterId, c.id))
      .orderBy(asc(marketListings.createdAt));
    const bag = await db
      .select()
      .from(items)
      .where(
        and(eq(items.characterId, c.id), isNull(items.equippedSlot), eq(items.inStorage, false)),
      );
    return {
      capital: this.city(c),
      listings: await toDto(here),
      mine: await toDto(mine),
      maxListings: MARKET_RULES.maxListings,
      gold: fresh.gold,
      bag: bag.map((i) => toItemDto(i, base)),
      message,
    };
  }

  private act(
    accountId: string,
    characterId: string,
    fn: (tx: DbOrTx, c: Character) => Promise<string>,
  ): Promise<MarketDto> {
    return this.ctx.db.transaction(async (tx) => {
      const c = await this.sheets.getOwnedCharacter(tx, accountId, characterId, true);
      await assertNotInRift(tx, c.id);
      this.assertCity(c);
      const message = await fn(tx, c);
      return this.view(tx, c, message);
    });
  }

  private async event(tx: DbOrTx, c: Character, type: string, payload: Record<string, unknown>) {
    await tx.insert(worldEvents).values({
      worldId: c.worldId,
      type,
      actorAccountId: c.accountId,
      actorCharacterId: c.id,
      payload,
    });
  }

  /** Put a bag item up for sale here. */
  list(accountId: string, characterId: string, itemId: string, price: number) {
    return this.act(accountId, characterId, async (tx, c) => {
      const [item] = await tx
        .select()
        .from(items)
        .where(and(eq(items.id, itemId), eq(items.characterId, c.id)));
      if (!item) throw errors.notFound('Item');
      if (item.equippedSlot || item.inStorage)
        throw errors.validation('Only items in your bag can be put up for sale.');
      const [n] = await tx
        .select({ n: count() })
        .from(marketListings)
        .where(eq(marketListings.sellerCharacterId, c.id));
      if ((n?.n ?? 0) >= MARKET_RULES.maxListings)
        throw new AppError(
          409,
          ErrorCode.CONFLICT,
          `You can have at most ${MARKET_RULES.maxListings} items for sale.`,
        );
      await tx.insert(marketListings).values({
        worldId: c.worldId,
        hexQ: c.hexQ,
        hexR: c.hexR,
        sellerCharacterId: c.id,
        price,
        itemDefId: item.itemDefId,
        quality: item.quality,
        quantity: item.quantity,
        upgradeLevel: item.upgradeLevel,
        grade: item.grade,
        specials: item.specials,
        runeSlots: item.runeSlots,
        source: item.source,
      });
      await tx.delete(items).where(eq(items.id, item.id));
      const name = getItemDef(item.itemDefId)?.name ?? item.itemDefId;
      await this.event(tx, c, 'market.listed', { itemDefId: item.itemDefId, price });
      return `${name} is for sale for ${price} gold.`;
    });
  }

  private async lockListing(tx: DbOrTx, id: string): Promise<Listing> {
    const [l] = await tx
      .select()
      .from(marketListings)
      .where(eq(marketListings.id, id))
      .for('update');
    if (!l) throw errors.notFound('Listing');
    return l;
  }

  /** Give a listing's item to a character (bag; strict: it must fit). */
  private async receive(tx: DbOrTx, characterId: string, l: Listing) {
    if (isStackable(getItemDef(l.itemDefId))) {
      await giveItem(tx, characterId, l.itemDefId, {
        qty: l.quantity,
        source: l.source,
        grade: l.grade,
        strict: true,
      });
      return;
    }
    await assertBagRoom(tx, characterId);
    await tx.insert(items).values({
      characterId,
      itemDefId: l.itemDefId,
      quality: l.quality,
      quantity: 1,
      upgradeLevel: l.upgradeLevel,
      grade: l.grade,
      specials: l.specials,
      runeSlots: l.runeSlots,
      source: l.source,
      slot: await firstFreeSlot(tx, characterId, 'bag'),
    });
  }

  buy(accountId: string, characterId: string, listingId: string) {
    return this.act(accountId, characterId, async (tx, c) => {
      const l = await this.lockListing(tx, listingId);
      if (l.hexQ !== c.hexQ || l.hexR !== c.hexR)
        throw new AppError(409, ErrorCode.NOT_HERE, 'That item is on sale in another city.');
      if (l.sellerCharacterId === c.id) throw errors.validation('Take it back instead.');
      const [paid] = await tx
        .update(characters)
        .set({ gold: sql`${characters.gold} - ${l.price}` })
        .where(and(eq(characters.id, c.id), sql`${characters.gold} >= ${l.price}`))
        .returning({ id: characters.id });
      if (!paid) throw new AppError(409, ErrorCode.NOT_ENOUGH_GOLD, `It costs ${l.price} gold.`);
      const earned = Math.floor((l.price * (100 - MARKET_RULES.feePct)) / 100);
      await tx
        .update(characters)
        .set({ gold: sql`${characters.gold} + ${earned}` })
        .where(eq(characters.id, l.sellerCharacterId));
      await this.receive(tx, c.id, l);
      await tx.delete(marketListings).where(eq(marketListings.id, l.id));
      await this.event(tx, c, 'market.sold', {
        listingId: l.id,
        itemDefId: l.itemDefId,
        price: l.price,
        sellerCharacterId: l.sellerCharacterId,
      });
      return `Bought ${getItemDef(l.itemDefId)?.name ?? l.itemDefId} for ${l.price} gold.`;
    });
  }

  /** Take your item back (in the city where it is on sale). */
  cancel(accountId: string, characterId: string, listingId: string) {
    return this.act(accountId, characterId, async (tx, c) => {
      const l = await this.lockListing(tx, listingId);
      if (l.sellerCharacterId !== c.id) throw errors.notFound('Listing');
      if (l.hexQ !== c.hexQ || l.hexR !== c.hexR)
        throw new AppError(
          409,
          ErrorCode.NOT_HERE,
          'Go to the city where it is on sale to take it back.',
        );
      await this.receive(tx, c.id, l);
      await tx.delete(marketListings).where(eq(marketListings.id, l.id));
      return `${getItemDef(l.itemDefId)?.name ?? l.itemDefId} is back in your bag.`;
    });
  }
}
