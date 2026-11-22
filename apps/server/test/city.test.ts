import { INVENTORY_RULES, REGIONS, SHOP_STOCK, STARTER_TOOLS } from '@realms/game-core';
import type { CityDto } from '@realms/shared';
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

async function hero(gold = 0) {
  const user = await registerUser(t.app);
  const id = (await createCharacter(t.app, user.cookie, 'Shopper')).json().character.id as string;
  await t.dbHandle.sql`update characters set gold = ${gold} where id = ${id}`;
  return { ...user, id };
}
type H = Awaited<ReturnType<typeof hero>>;
const get = (h: H) =>
  t.app.inject({ url: `/api/characters/${h.id}/city`, headers: { cookie: h.cookie } });
const post = (h: H, path: string, payload: Record<string, unknown>) =>
  t.app.inject({
    method: 'POST',
    url: `/api/characters/${h.id}/city/${path}`,
    headers: { cookie: h.cookie },
    payload,
  });
const give = async (h: H, defId: string, qty = 1, upgrade = 0) => {
  const [row] = await t.dbHandle.sql`
    insert into items (id, character_id, item_def_id, quantity, upgrade_level, source)
    values (gen_random_uuid(), ${h.id}, ${defId}, ${qty}, ${upgrade}, 'drop') returning id`;
  return row!.id as string;
};

describe('city services (request #50)', () => {
  it('only in a capital', async () => {
    const h = await hero(100);
    expect(((await get(h)).json() as CityDto).capital).toBe(REGIONS.west.capital!.name);
    await placeCharacter(t, h.id, {
      q: REGIONS.west.capital!.hex.q + 2,
      r: REGIONS.west.capital!.hex.r,
    });
    expect((await post(h, 'shop/buy', { defId: 'bandage' })).json().error.code).toBe('NOT_HERE');
  });

  it('the store sells basics for gold and buys gear cheaply, never materials', async () => {
    const h = await hero(100);
    const price = SHOP_STOCK.find((s) => s.item === 'bandage')!.price;
    const res = (await post(h, 'shop/buy', { defId: 'bandage', qty: 3 })).json() as CityDto;
    expect(res.sheet.gold).toBe(100 - 3 * price);
    expect(res.sheet.inventory.find((i) => i.defId === 'bandage')!.quantity).toBe(3);
    expect((await post(h, 'shop/buy', { defId: 'blessing_scroll' })).json().error.code).toBe(
      'NOT_ENOUGH_GOLD',
    );
    const axe = await give(h, 'woodcutter_axe');
    const ore = await give(h, 'iron_ore', 5);
    const city = (await get(h)).json() as CityDto;
    expect(city.sellPrices[axe]).toBeGreaterThan(0);
    expect(city.sellPrices[ore]).toBeUndefined();
    const sold = (await post(h, 'shop/sell', { itemId: axe })).json() as CityDto;
    expect(sold.sheet.gold).toBe(100 - 3 * price + city.sellPrices[axe]!);
    expect((await post(h, 'shop/sell', { itemId: ore })).statusCode).toBe(400);
  });

  it('storage keeps items out of the bag; the bag holds 20 slots', async () => {
    const h = await hero();
    const axe = await give(h, 'woodcutter_axe');
    let city = (await post(h, 'storage/deposit', { itemId: axe })).json() as CityDto;
    expect(city.storage.map((i) => i.id)).toEqual([axe]);
    expect(city.sheet.inventory.some((i) => i.id === axe)).toBe(false);
    // Fill the bag (it starts with the 4 basic tools, request #51).
    for (let i = 0; i < INVENTORY_RULES.bagSlots - STARTER_TOOLS.length; i++)
      await give(h, 'leather_cap');
    expect((await post(h, 'storage/withdraw', { itemId: axe })).json().error.code).toBe('BAG_FULL');
    city = (await get(h)).json() as CityDto;
    expect(city.bag).toEqual({ used: INVENTORY_RULES.bagSlots, slots: INVENTORY_RULES.bagSlots });
  });

  it('blacksmith: +1 costs gold; failure without a scroll destroys, with a scroll drops a level', async () => {
    const h = await hero(100_000);
    const sword = await give(h, 'iron_greatsword');
    const city = (await get(h)).json() as CityDto;
    expect(city.upgrades[sword]).toMatchObject({ toLevel: 1, material: null });
    // Request #54: the comparison (now vs after a successful upgrade).
    const cmp = city.upgrades[sword]!.compare;
    expect(cmp.now.power).toBe(0);
    expect(cmp.next.power).toBeGreaterThan(0);
    expect(cmp.next.damage.max).toBeGreaterThanOrEqual(cmp.now.damage.max);
    expect(city.upgrades[sword]!.preview.name).toContain('+1');
    // +4 needs the family material.
    const blade = await give(h, 'training_sword', 1, 3);
    const quote = ((await get(h)).json() as CityDto).upgrades[blade]!;
    expect(quote.material).toMatchObject({ defId: 'blade_shard', qty: 1, have: 0 });
    expect((await post(h, 'blacksmith/upgrade', { itemId: blade })).statusCode).toBe(400);
    // Keep trying until something happens to the greatsword (it can only succeed or break).
    let res: CityDto;
    let level = 0;
    for (;;) {
      res = (await post(h, 'blacksmith/upgrade', { itemId: sword })).json() as CityDto;
      if (res.upgrade!.result === 'destroyed') break;
      level = res.upgrade!.level;
      if (level >= 3) break;
    }
    expect(res.upgrade!.result === 'destroyed' || level === 3).toBe(true);
    // With a Blessing Scroll a failure only takes 1 level off.
    await give(h, 'blessing_scroll', 50);
    await give(h, 'blade_shard', 100);
    for (let i = 0; i < 30; i++) {
      const r = (
        await post(h, 'blacksmith/upgrade', { itemId: blade, blessing: true })
      ).json() as CityDto & { error?: { message: string } };
      // It can reach the highest level (+10) before 30 tries: then it stops.
      if (!r.upgrade) {
        expect(r.error!.message).toContain('already +10');
        break;
      }
      expect(r.upgrade.result).not.toBe('destroyed');
    }
  });
});
