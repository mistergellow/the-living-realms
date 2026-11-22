import { STARTER_TOOLS } from '@realms/game-core';
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
    expect(res.json().error.details[0].path).toBe('starterKit');
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
    // The bag holds only the basic profession tools (request #51).
    expect(sheet.inventory.map((i) => i.defId).sort()).toEqual([...STARTER_TOOLS].sort());
    expect(sheet.inventory.every((i) => i.kind === 'tool' && i.tool)).toBe(true);
    expect(sheet.abilities.map((a) => a.id)).toEqual([
      'aimed_shot',
      'marking_shot',
      'block',
      'swap_position',
    ]);
    expect(sheet.abilities[0]).toMatchObject({
      grantedBy: 'Hunting Bow',
      focusCost: 2,
      effects: ['7–9 ranged damage'],
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
    expect(unarmed.inventory.filter((i) => i.kind !== 'tool').map((i) => i.id)).toEqual([sword.id]);
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
      slot: 'ring2',
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
        post(cookie, `/api/characters/${id}/equip`, { itemId: r.id, slot: 'ring1' }),
      ),
    );
    expect(results.every((r) => r.statusCode === 200)).toBe(true);
    const [{ n }] = (await t.dbHandle.sql`
      select count(*)::int as n from items where character_id = ${id} and equipped_slot = 'ring1'`) as unknown as [
      { n: number },
    ];
    expect(n).toBe(1);
  });
});

describe('skill loadout (8 prepared skills)', () => {
  const put = (cookie: string, id: string, slots: Array<string | null>) =>
    t.app.inject({
      method: 'PUT',
      url: `/api/characters/${id}/loadout`,
      headers: { cookie },
      payload: { slots },
    });
  const empty = () => Array.from({ length: 8 }, () => null as string | null);

  it('only prepared skills are available in combat', async () => {
    const { cookie, id } = await newCharacter();
    await t.dbHandle.sql`
      insert into character_skills (character_id, skill_id) values (${id}, 'firebolt'), (${id}, 'mend')`;
    let sheet = await sheetOf(cookie, id);
    expect(sheet.learnedSkills.map((a) => a.id)).toEqual(['firebolt', 'mend']);
    expect(sheet.loadout).toEqual(empty());
    expect(sheet.abilities.map((a) => a.id)).not.toContain('firebolt');

    const slots = empty();
    slots[3] = 'firebolt';
    const res = await put(cookie, id, slots);
    expect(res.statusCode).toBe(200);
    sheet = res.json() as CharacterSheetDto;
    expect(sheet.loadout[3]).toBe('firebolt');
    expect(sheet.abilities.map((a) => a.id)).toContain('firebolt');
    expect(sheet.abilities.map((a) => a.id)).not.toContain('mend');
  });

  it('rejects unknown, unlearned or repeated skills and wrong sizes', async () => {
    const { cookie, id } = await newCharacter();
    await t.dbHandle.sql`
      insert into character_skills (character_id, skill_id) values (${id}, 'firebolt')`;
    expect((await put(cookie, id, ['mend', ...empty().slice(1)])).statusCode).toBe(400);
    expect((await put(cookie, id, ['firebolt', 'firebolt', ...empty().slice(2)])).statusCode).toBe(
      400,
    );
    expect((await put(cookie, id, empty().slice(1))).statusCode).toBe(400);
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

describe('item cards (request #37): bonus effects, rarity, requirements, runes', () => {
  it('shows rolled effects and rarity, and they change the stats when equipped', async () => {
    const { cookie, id } = await newCharacter();
    const [ring] = await t.dbHandle.sql`
      insert into items (id, character_id, item_def_id, source, specials, rune_slots)
      values (gen_random_uuid(), ${id}, 'ring_of_vigor', 'drop',
        ${JSON.stringify([
          { id: 'health', value: 10 },
          { id: 'agility', value: 2 },
        ])}::jsonb,
        ${JSON.stringify([
          { unlocked: true, runeId: null },
          { unlocked: false, runeId: null },
        ])}::jsonb)
      returning id`;
    const before = await sheetOf(cookie, id);
    const card = before.inventory.find((i) => i.id === ring!.id)!;
    expect(card.rarity).toBe('rare');
    expect(card.affixes.map((a) => [a.label, a.display])).toEqual([
      ['Max. HP', '+10'],
      ['Agility', '+2'],
    ]);
    expect(card.runeSlots).toEqual({ used: 0, total: 1 });
    expect(before.equipment.body?.runeSlots).toBeNull(); // no unlocked slots: hidden
    const res = await post(cookie, `/api/characters/${id}/equip`, {
      itemId: ring!.id,
      slot: 'ring2',
    });
    const after = res.json() as CharacterSheetDto;
    expect(after.stats.maxHp).toBe(before.stats.maxHp + 6 * 2 + 10);
    expect(after.attributes.agility).toBe(before.attributes.agility + 2);
  });

  it('lists the BASE attributes needed; upgrades do not change them', async () => {
    const { cookie, id } = await newCharacter();
    const [dagger] = await t.dbHandle.sql`
      insert into items (id, character_id, item_def_id, source, upgrade_level)
      values (gen_random_uuid(), ${id}, 'rusty_dagger', 'drop', 8) returning id`;
    const card = (await sheetOf(cookie, id)).inventory.find((i) => i.id === dagger!.id)!;
    expect(card.requirements).toEqual([{ attribute: 'agility', value: 5, met: true }]);
    const res = await post(cookie, `/api/characters/${id}/equip`, {
      itemId: dagger!.id,
      slot: 'mainHand',
    });
    expect(res.statusCode).toBe(200);
  });
});

describe('Skill Books (request #47)', () => {
  const useItem = (cookie: string, id: string, itemId: string) =>
    t.app.inject({
      method: 'POST',
      url: `/api/characters/${id}/items/${itemId}/use`,
      headers: { cookie },
    });
  const give = async (id: string, defId: string) => {
    const [row] = await t.dbHandle.sql`
      insert into items (id, character_id, item_def_id, source)
      values (gen_random_uuid(), ${id}, ${defId}, 'drop') returning id`;
    return row!.id as string;
  };

  it('reading a book teaches and prepares its skill, and uses the book up', async () => {
    const { cookie, id } = await newCharacter();
    const book = await give(id, 'book_second_wind');
    const res = await useItem(cookie, id, book);
    expect(res.statusCode).toBe(200);
    const sheet = res.json() as CharacterSheetDto;
    expect(sheet.learnedSkills.map((s) => s.id)).toEqual(['second_wind']);
    expect(sheet.loadout[0]).toBe('second_wind');
    expect(sheet.inventory.some((i) => i.id === book)).toBe(false);
    // Request #50: a second copy raises the skill's level; its numbers grow.
    const healAt = (sh: CharacterSheetDto) => sh.learnedSkills.find((s) => s.id === 'second_wind')!;
    expect(healAt(sheet).levelLabel).toBe('1');
    const copy = await give(id, 'book_second_wind');
    const res2 = (await useItem(cookie, id, copy)).json() as CharacterSheetDto;
    expect(healAt(res2).level).toBe(2);
    const third = await give(id, 'book_second_wind');
    const res3 = (await useItem(cookie, id, third)).json() as CharacterSheetDto;
    expect(healAt(res3).level).toBe(3);
    // Whole numbers, rounded down (request #59): Heal 6–8 → 7–9 at level 3.
    expect(healAt(res3).effects[0]).toBe('Heal 7–9');
    // Request #53: 21 levels, 1 … 10, M1 … M10, P.
    await t.dbHandle
      .sql`update character_skills set level = 20 where character_id = ${id} and skill_id = 'second_wind'`;
    const last = await give(id, 'book_second_wind');
    const atP = (await useItem(cookie, id, last)).json() as CharacterSheetDto;
    expect(healAt(atP).levelLabel).toBe('P');
    const more = await give(id, 'book_second_wind');
    expect((await useItem(cookie, id, more)).json().error.message).toMatch(/highest level \(P\)/);
  });

  it('needs the BASE attributes the skill requires', async () => {
    const { cookie, id } = await newCharacter();
    const book = await give(id, 'book_chain_lightning'); // Intellect 9
    const res = await useItem(cookie, id, book);
    expect(res.statusCode).toBe(400);
    expect(res.json().error.message).toMatch(/Intellect 9/);
    const sword = (await sheetOf(cookie, id)).equipment.mainHand!.id;
    expect((await useItem(cookie, id, sword)).statusCode).toBe(400);
  });
});

describe('dropping items (request #65)', () => {
  const put = async (id: string, defId: string, quantity = 1) => {
    const [row] = await t.dbHandle.sql`
      insert into items (id, character_id, item_def_id, source, quantity, slot)
      values (gen_random_uuid(), ${id}, ${defId}, 'drop', ${quantity}, 10) returning id`;
    return row!.id as string;
  };
  const drop = (cookie: string, id: string, itemId: string, qty?: number) =>
    post(cookie, `/api/characters/${id}/items/${itemId}/drop`, qty ? { qty } : {});

  it('throws a bag item away for good; part of a stack or all of it', async () => {
    const { cookie, id } = await newCharacter();
    const ring = await put(id, 'ring_of_vigor');
    const res = await drop(cookie, id, ring);
    expect(res.statusCode).toBe(200);
    expect((res.json() as CharacterSheetDto).inventory.some((i) => i.id === ring)).toBe(false);
    const ore = await put(id, 'copper_ore', 5);
    const part = (await drop(cookie, id, ore, 2)).json() as CharacterSheetDto;
    expect(part.inventory.find((i) => i.id === ore)!.quantity).toBe(3);
    const all = (await drop(cookie, id, ore)).json() as CharacterSheetDto;
    expect(all.inventory.some((i) => i.id === ore)).toBe(false);
  });

  it('refuses equipped items and items of other characters', async () => {
    const { cookie, id } = await newCharacter();
    const sword = (await sheetOf(cookie, id)).equipment.mainHand!.id;
    const res = await drop(cookie, id, sword);
    expect(res.statusCode).toBe(400);
    expect(res.json().error.message).toMatch(/Unequip/);
    const other = await newCharacter();
    const theirs = await put(other.id, 'ring_of_vigor');
    expect((await drop(cookie, id, theirs)).statusCode).toBe(404);
  });
});
