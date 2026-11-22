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

describe('bag and storage grids (request #59)', () => {
  const move = (h: H, itemId: string, to: 'bag' | 'storage', slot: number, qty?: number) =>
    t.app.inject({
      method: 'POST',
      url: `/api/characters/${h.id}/items/move`,
      headers: { cookie: h.cookie },
      payload: { itemId, to, slot, ...(qty ? { qty } : {}) },
    });
  const sort = (h: H, place: 'bag' | 'storage') =>
    t.app.inject({
      method: 'POST',
      url: `/api/characters/${h.id}/items/sort`,
      headers: { cookie: h.cookie },
      payload: { place },
    });
  const at = (c: CityDto, slot: number) => c.sheet.inventory.find((i) => i.slot === slot);

  it('every item has a place; moving keeps it there; dropping on another item swaps', async () => {
    const h = await hero();
    const city = (await get(h)).json() as CityDto;
    expect(city.storageSlots).toBe(INVENTORY_RULES.storageSlots);
    const slots = city.sheet.inventory.map((i) => i.slot);
    expect(new Set(slots).size).toBe(slots.length);
    const rod = city.sheet.inventory.find((i) => i.defId === 'fishing_rod')!;
    let c = (await move(h, rod.id, 'bag', 15)).json() as CityDto;
    expect(at(c, 15)!.defId).toBe('fishing_rod');
    // Swap with the pickaxe.
    const pick = c.sheet.inventory.find((i) => i.defId === 'pickaxe')!;
    c = (await move(h, pick.id, 'bag', 15)).json() as CityDto;
    expect(at(c, 15)!.defId).toBe('pickaxe');
    expect(at(c, pick.slot!)!.defId).toBe('fishing_rod');
    // Outside the bag: refused.
    expect((await move(h, pick.id, 'bag', INVENTORY_RULES.bagSlots)).statusCode).toBe(400);
  });

  it('stacks split onto an empty slot and merge back', async () => {
    const h = await hero();
    const herb = await give(h, 'herb', 10);
    let c = (await get(h)).json() as CityDto;
    c = (await move(h, herb, 'bag', 18, 4)).json() as CityDto;
    expect(at(c, 18)).toMatchObject({ defId: 'herb', quantity: 4 });
    expect(c.sheet.inventory.find((i) => i.id === herb)!.quantity).toBe(6);
    c = (
      await move(h, at(c, 18)!.id, 'bag', c.sheet.inventory.find((i) => i.id === herb)!.slot!)
    ).json() as CityDto;
    expect(c.sheet.inventory.filter((i) => i.defId === 'herb')).toHaveLength(1);
    expect(c.sheet.inventory.find((i) => i.defId === 'herb')!.quantity).toBe(10);
  });

  it('moves between bag and storage slots in a capital; sort merges and orders', async () => {
    const h = await hero();
    const rod = ((await get(h)).json() as CityDto).sheet.inventory.find(
      (i) => i.defId === 'fishing_rod',
    )!;
    let c = (await move(h, rod.id, 'storage', 42)).json() as CityDto;
    expect(c.storage.find((i) => i.slot === 42)!.defId).toBe('fishing_rod');
    // Two stacks of the same herb and a sword: sorting merges and orders them.
    await give(h, 'herb', 2);
    await give(h, 'herb', 3);
    await give(h, 'training_sword');
    c = (await sort(h, 'bag')).json() as CityDto;
    const herbs = c.sheet.inventory.filter((i) => i.defId === 'herb');
    expect(herbs).toHaveLength(1);
    expect(herbs[0]!.quantity).toBe(5);
    expect(at(c, 0)!.defId).toBe('training_sword'); // weapons first
    const order = [...c.sheet.inventory].sort((a, b) => a.slot! - b.slot!).map((i) => i.slot);
    expect(order).toEqual(order.map((_, i) => i));
    // Away from a capital: bag only.
    await placeCharacter(t, h.id, {
      q: REGIONS.west.capital!.hex.q + 3,
      r: REGIONS.west.capital!.hex.r,
    });
    expect((await move(h, rod.id, 'bag', 19)).json().error.code).toBe('NOT_HERE');
    expect((await sort(h, 'bag')).statusCode).toBe(200);
  });

  it('the storage holds 80 items', async () => {
    const h = await hero();
    await t.dbHandle.sql`update characters set storage_slots = 1 where id = ${h.id}`;
    const rod = ((await get(h)).json() as CityDto).sheet.inventory.find(
      (i) => i.defId === 'fishing_rod',
    )!;
    await post(h, 'storage/deposit', { itemId: rod.id });
    const axe = ((await get(h)).json() as CityDto).sheet.inventory.find(
      (i) => i.defId === 'felling_axe',
    )!;
    const full = await post(h, 'storage/deposit', { itemId: axe.id });
    expect(full.json().error.message).toContain('storage is full');
  });
});
