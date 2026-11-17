import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  createCharacter,
  createTestApp,
  registerUser,
  resetState,
  VALID_ATTRIBUTES,
  type TestApp,
} from './helpers.js';
import type { CharacterSheetDto } from '@realms/shared';

let t: TestApp;
beforeAll(async () => (t = await createTestApp()));
beforeEach(() => resetState(t));
afterAll(() => t.close());

let seq = 0;
const letters = (n: number) =>
  String.fromCharCode(97 + (n % 26)) + String.fromCharCode(97 + Math.floor(n / 26));

async function newCharacter(
  weapon = 'training_sword',
  attributes: Record<string, number> = VALID_ATTRIBUTES,
) {
  const user = await registerUser(t.app);
  const res = await createCharacter(t.app, user.cookie, `Sheet${letters(seq++)}`, {
    startingWeapon: weapon,
    attributes,
  });
  expect(res.statusCode).toBe(201);
  return { ...user, id: res.json().character.id as string };
}

const sheetOf = async (cookie: string, id: string) =>
  (
    await t.app.inject({ url: `/api/characters/${id}`, headers: { cookie } })
  ).json() as CharacterSheetDto;

const post = (cookie: string, url: string, payload: Record<string, unknown>) =>
  t.app.inject({ method: 'POST', url, headers: { cookie }, payload });

describe('character creation (attributes + starter kit)', () => {
  it('rejects overspent or out-of-range point-buy', async () => {
    const { cookie } = await registerUser(t.app);
    const over = await createCharacter(t.app, cookie, 'Greedy', {
      attributes: { str: 15, dex: 15, con: 15, int: 15, wis: 8, cha: 8 },
    });
    expect(over.statusCode).toBe(400);
    expect(over.json().error.details[0].path).toBe('attributes');
    const range = await createCharacter(t.app, cookie, 'Mighty', {
      attributes: { ...VALID_ATTRIBUTES, str: 18 },
    });
    expect(range.statusCode).toBe(400);
  });

  it('rejects weapons that are not starter weapons', async () => {
    const { cookie } = await registerUser(t.app);
    const res = await createCharacter(t.app, cookie, 'Cheater', {
      startingWeapon: 'ring_of_vigor',
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.details[0].path).toBe('startingWeapon');
  });

  it('builds the sheet: attributes, derived stats, starter kit and weapon abilities', async () => {
    const { cookie, id } = await newCharacter('hunting_bow');
    const sheet = await sheetOf(cookie, id);
    expect(sheet.baseAttributes).toEqual(VALID_ATTRIBUTES);
    expect(sheet.stats.maxHp).toBe(20 + 2 * 13);
    expect(sheet.stats.defense).toBe(1 + 1); // tunic + CON 13 modifier
    expect(sheet.equipment.mainHand?.defId).toBe('hunting_bow');
    expect(sheet.equipment.body?.defId).toBe('padded_tunic');
    expect(sheet.inventory).toEqual([]);
    expect(sheet.abilities.map((a) => a.id)).toEqual(['aimed_shot', 'volley', 'swap_position']);
    expect(sheet.abilities[0]).toMatchObject({ grantedBy: 'Hunting Bow', focusCost: 1 });
    expect(sheet.reputation).toBe(0);
  });

  it("does not expose other accounts' sheets", async () => {
    const { id } = await newCharacter();
    const other = await registerUser(t.app);
    const res = await t.app.inject({
      url: `/api/characters/${id}`,
      headers: { cookie: other.cookie },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('equipment', () => {
  it('unequips and re-equips, changing the abilities granted', async () => {
    const { cookie, id } = await newCharacter('training_sword');
    const sheet = await sheetOf(cookie, id);
    const sword = sheet.equipment.mainHand!;

    const off = await post(cookie, `/api/characters/${id}/unequip`, { slot: 'mainHand' });
    expect(off.statusCode).toBe(200);
    const unarmed = off.json() as CharacterSheetDto;
    expect(unarmed.equipment.mainHand).toBeNull();
    expect(unarmed.inventory.map((i) => i.id)).toEqual([sword.id]);
    expect(unarmed.abilities.map((a) => a.id)).toEqual(['unarmed_strike', 'swap_position']);

    const on = await post(cookie, `/api/characters/${id}/equip`, {
      itemId: sword.id,
      slot: 'mainHand',
    });
    expect((on.json() as CharacterSheetDto).abilities.map((a) => a.id)).toContain('slash');
  });

  it('rejects invalid slots and broken items', async () => {
    const { cookie, id } = await newCharacter();
    const tunic = (await sheetOf(cookie, id)).equipment.body!;
    const wrong = await post(cookie, `/api/characters/${id}/equip`, {
      itemId: tunic.id,
      slot: 'head',
    });
    expect(wrong.statusCode).toBe(400);
    expect(wrong.json().error.code).toBe('INVALID_EQUIPMENT');

    await t.dbHandle.sql`update items set quality = 0, equipped_slot = null where id = ${tunic.id}`;
    const broken = await post(cookie, `/api/characters/${id}/equip`, {
      itemId: tunic.id,
      slot: 'body',
    });
    expect(broken.statusCode).toBe(400);
    expect(broken.json().error.message).toMatch(/broken/);
  });

  it("cannot equip another character's item", async () => {
    const a = await newCharacter();
    const b = await newCharacter();
    const foreign = (await sheetOf(a.cookie, a.id)).equipment.body!;
    const res = await post(b.cookie, `/api/characters/${b.id}/equip`, {
      itemId: foreign.id,
      slot: 'body',
    });
    expect(res.statusCode).toBe(400);
  });

  it('equipment bonuses raise attributes and derived stats', async () => {
    const { cookie, id } = await newCharacter();
    const [ring] = await t.dbHandle.sql`
      insert into items (id, character_id, item_def_id, source)
      values (gen_random_uuid(), ${id}, 'ring_of_vigor', 'drop') returning id`;
    const res = await post(cookie, `/api/characters/${id}/equip`, {
      itemId: ring!.id,
      slot: 'accessory2',
    });
    const sheet = res.json() as CharacterSheetDto;
    expect(sheet.baseAttributes.con).toBe(13);
    expect(sheet.attributes.con).toBe(14);
    expect(sheet.stats.maxHp).toBe(20 + 2 * 14);
  });

  it('keeps one item per slot under concurrent equips', async () => {
    const { cookie, id } = await newCharacter();
    const rings = await t.dbHandle.sql`
      insert into items (id, character_id, item_def_id, source)
      select gen_random_uuid(), ${id}, 'ring_of_vigor', 'drop' from generate_series(1, 4)
      returning id`;
    const results = await Promise.all(
      rings.map((r) =>
        post(cookie, `/api/characters/${id}/equip`, { itemId: r.id, slot: 'accessory1' }),
      ),
    );
    expect(results.every((r) => r.statusCode === 200)).toBe(true);
    const [{ n }] = (await t.dbHandle.sql`
      select count(*)::int as n from items where character_id = ${id} and equipped_slot = 'accessory1'`) as unknown as [
      { n: number },
    ];
    expect(n).toBe(1);
  });
});
