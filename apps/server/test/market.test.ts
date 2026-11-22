import { MARKET_RULES, REGIONS } from '@realms/game-core';
import type { MarketDto } from '@realms/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  createCharacter,
  createTestApp,
  placeCharacter,
  registerUser,
  resetState,
  type TestApp,
} from './helpers.js';

let t: TestApp;
beforeAll(async () => (t = await createTestApp()));
beforeEach(() => resetState(t));
afterAll(() => t.close());

async function hero(name: string, gold = 0) {
  const user = await registerUser(t.app);
  const id = (await createCharacter(t.app, user.cookie, name)).json().character.id as string;
  await t.dbHandle.sql`update characters set gold = ${gold} where id = ${id}`;
  return { ...user, id };
}
type H = Awaited<ReturnType<typeof hero>>;
const get = async (h: H) =>
  (
    await t.app.inject({ url: `/api/characters/${h.id}/market`, headers: { cookie: h.cookie } })
  ).json() as MarketDto;
const post = (h: H, path: string, payload: Record<string, unknown>) =>
  t.app.inject({
    method: 'POST',
    url: `/api/characters/${h.id}/market/${path}`,
    headers: { cookie: h.cookie },
    payload,
  });
const goldOf = async (h: H) =>
  Number((await t.dbHandle.sql`select gold from characters where id = ${h.id}`)[0]!.gold);

describe('player market (request #63)', () => {
  it('list in a city, buy there: the item moves and the seller gets the gold', async () => {
    const seller = await hero('Seller');
    const buyer = await hero('Buyer', 100);
    const rod = (await get(seller)).bag.find((i) => i.defId === 'fishing_rod')!;
    const listed = (await post(seller, 'list', { itemId: rod.id, price: 40 })).json() as MarketDto;
    expect(listed.mine).toHaveLength(1);
    expect(listed.bag.some((i) => i.id === rod.id)).toBe(false);
    // Visible in this city's market.
    const market = await get(buyer);
    const listing = market.listings.find((l) => l.item.defId === 'fishing_rod' && !l.mine)!;
    expect(listing).toMatchObject({
      price: 40,
      sellerName: 'Seller',
      city: REGIONS.west.capital!.name,
    });
    const bought = (await post(buyer, 'buy', { listingId: listing.id })).json() as MarketDto;
    expect(bought.gold).toBe(60);
    expect(bought.bag.filter((i) => i.defId === 'fishing_rod')).toHaveLength(2);
    expect(await goldOf(seller)).toBe(40);
    expect((await get(seller)).mine).toHaveLength(0);
  });

  it('only on sale in its own city; cities only', async () => {
    const seller = await hero('Seller');
    const buyer = await hero('Buyer', 100);
    const rod = (await get(seller)).bag.find((i) => i.defId === 'fishing_rod')!;
    await post(seller, 'list', { itemId: rod.id, price: 10 });
    const id = (await get(seller)).mine[0]!.id;
    // The buyer goes to another capital: not on sale there.
    await placeCharacter(t, buyer.id, REGIONS.east.capital!.hex);
    expect((await get(buyer)).listings).toHaveLength(0);
    expect((await post(buyer, 'buy', { listingId: id })).json().error.code).toBe('NOT_HERE');
    // Outside a city there is no market.
    await placeCharacter(t, buyer.id, {
      q: REGIONS.west.capital!.hex.q + 3,
      r: REGIONS.west.capital!.hex.r,
    });
    expect((await get(buyer)).capital).toBeNull();
    expect((await post(buyer, 'buy', { listingId: id })).json().error.code).toBe('NOT_HERE');
  });

  it(`at most ${MARKET_RULES.maxListings} items for sale; the seller can take one back`, async () => {
    const seller = await hero('Seller');
    for (let i = 0; i < MARKET_RULES.maxListings; i++)
      await t.dbHandle
        .sql`insert into market_listings (id, world_id, hex_q, hex_r, seller_character_id, price, item_def_id)
        select gen_random_uuid(), world_id, hex_q, hex_r, id, 5, 'herb' from characters where id = ${seller.id}`;
    const rod = (await get(seller)).bag.find((i) => i.defId === 'fishing_rod')!;
    const full = await post(seller, 'list', { itemId: rod.id, price: 10 });
    expect(full.json().error.message).toContain(`${MARKET_RULES.maxListings}`);
    const one = (await get(seller)).mine[0]!;
    const back = (await post(seller, 'cancel', { listingId: one.id })).json() as MarketDto;
    expect(back.mine).toHaveLength(MARKET_RULES.maxListings - 1);
    expect(back.bag.some((i) => i.defId === 'herb')).toBe(true);
  });

  it('needs the gold; cannot buy your own', async () => {
    const seller = await hero('Seller');
    const poor = await hero('Poor', 5);
    const rod = (await get(seller)).bag.find((i) => i.defId === 'fishing_rod')!;
    await post(seller, 'list', { itemId: rod.id, price: 50 });
    const id = (await get(seller)).mine[0]!.id;
    expect((await post(poor, 'buy', { listingId: id })).json().error.code).toBe('NOT_ENOUGH_GOLD');
    expect((await post(seller, 'buy', { listingId: id })).statusCode).toBe(400);
  });
});
