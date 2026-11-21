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
      attributes: { might: 10, agility: 10, precision: 10, endurance: 5, intellect: 5, will: 5 },
    });
    expect(over.statusCode).toBe(400);
    expect(over.json().error.details[0].path).toBe('attributes');
    const range = await createCharacter(t.app, cookie, 'Mighty', {
      attributes: { ...VALID_ATTRIBUTES, might: 11 },
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
    expect(sheet.stats.maxHp).toBe(40 + 6 * 9);
    expect(sheet.stats.armor).toBe(6); // padded tunic
    expect(sheet.attributePoints).toBe(0);
    expect(sheet.equipment.mainHand?.defId).toBe('hunting_bow');
    expect(sheet.equipment.body?.defId).toBe('padded_tunic');
    expect(sheet.inventory).toEqual([]);
    expect(sheet.abilities.map((a) => a.id)).toEqual([
      'aimed_shot',
      'volley',
      'marking_shot',
      'block',
      'swap_position',
    ]);
    expect(sheet.abilities[0]).toMatchObject({
      grantedBy: 'Hunting Bow',
      focusCost: 2,
      effects: ['8–10 ranged damage'],
      scaling: 'Precision 60% · Agility 40%',
    });
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
    expect(unarmed.abilities.map((a) => a.id)).toEqual([
      'unarmed_strike',
      'block',
      'swap_position',
    ]);

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
    expect(sheet.baseAttributes.endurance).toBe(9);
    expect(sheet.attributes.endurance).toBe(11);
    expect(sheet.stats.maxHp).toBe(40 + 6 * 11);
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

describe('creation off-hand and attribute points', () => {
  it('one-handed weapons may start with an off-hand; two-handed may not', async () => {
    const { cookie } = await registerUser(t.app);
    const ok = await createCharacter(t.app, cookie, 'Shieldbearer', {
      startingWeapon: 'training_sword',
      startingOffhand: 'wooden_shield',
    });
    expect(ok.statusCode).toBe(201);
    const sheet = await sheetOf(cookie, ok.json().character.id);
    expect(sheet.equipment.offHand?.defId).toBe('wooden_shield');
    expect(sheet.abilities.map((a) => a.id)).toContain('raise_shield');

    const bad = await createCharacter(t.app, cookie, 'Overloaded', {
      startingWeapon: 'hunting_bow',
      startingOffhand: 'wooden_shield',
    });
    expect(bad.statusCode).toBe(400);
    expect(bad.json().error.details[0].path).toBe('startingOffhand');
  });

  it('keeps unspent creation points and lets you spend them later', async () => {
    const { cookie } = await registerUser(t.app);
    const res = await createCharacter(t.app, cookie, 'Saver', {
      attributes: { might: 7, agility: 5, precision: 5, endurance: 5, intellect: 5, will: 5 },
    });
    const id = res.json().character.id;
    expect((await sheetOf(cookie, id)).attributePoints).toBe(10);
    const spend = await post(cookie, `/api/characters/${id}/attributes`, {
      add: { endurance: 4, will: 3 },
    });
    expect(spend.statusCode).toBe(200);
    const sheet = spend.json() as CharacterSheetDto;
    expect(sheet.attributePoints).toBe(3);
    expect(sheet.baseAttributes).toMatchObject({ endurance: 9, will: 8 });
    const tooMuch = await post(cookie, `/api/characters/${id}/attributes`, { add: { might: 4 } });
    expect(tooMuch.statusCode).toBe(400);
  });
});
