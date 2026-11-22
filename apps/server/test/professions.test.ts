import type { ActivityResultDto, ProfessionsDto } from '@realms/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { worldMapHexes } from '@realms/game-core';
import {
  createCharacter,
  firstRiftSite,
  placeCharacter,
  createTestApp,
  registerUser,
  resetState,
  type TestApp,
} from './helpers.js';

const river = worldMapHexes().find((h) => h.terrain === 'river')!;
const RIVER = { q: river.q, r: river.r };

let t: TestApp;
beforeAll(async () => (t = await createTestApp()));
beforeEach(() => resetState(t));
afterAll(() => t.close());

async function hero() {
  const user = await registerUser(t.app);
  const res = await createCharacter(t.app, user.cookie, 'Crafter', {
    startingWeapon: 'training_sword',
  });
  const id = res.json().character.id as string;
  await placeCharacter(t, id, RIVER); // fishing needs a river (#43)
  return { ...user, id };
}
type H = Awaited<ReturnType<typeof hero>>;

const list = (h: H) =>
  t.app.inject({ url: `/api/characters/${h.id}/professions`, headers: { cookie: h.cookie } });
const perform = (h: H, prof: string, activity: string, body: Record<string, unknown> = {}) =>
  t.app.inject({
    method: 'POST',
    url: `/api/characters/${h.id}/professions/${prof}/activities/${activity}`,
    headers: { cookie: h.cookie },
    payload: body,
  });
const ready = (h: H) =>
  t.dbHandle.sql`update character_professions set ready_at = null where character_id = ${h.id}`;
const give = (h: H, def: string, qty: number) =>
  t.dbHandle
    .sql`insert into items (id, character_id, item_def_id, quantity, source) values (gen_random_uuid(), ${h.id}, ${def}, ${qty}, 'test')`;

describe('professions', () => {
  it('lists every profession at level 0 with its activities', async () => {
    const h = await hero();
    const res = (await list(h)).json() as ProfessionsDto;
    const ids = res.professions.map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining(['blacksmithing', 'runesmithing', 'fishing']));
    expect(res.professions.every((p) => p.level === 0)).toBe(true);
  });

  it('gathering gives XP and stacking materials; the profession is busy for a while', async () => {
    const h = await hero();
    let got = 0;
    for (let i = 0; i < 6; i++) {
      const r = (await perform(h, 'fishing', 'fish')).json() as ActivityResultDto;
      expect(r.xpGained).toBeGreaterThan(0);
      got += r.produced.reduce((n, p) => n + p.qty, 0);
      const busy = await perform(h, 'fishing', 'fish');
      expect(busy.statusCode).toBe(400);
      await ready(h);
    }
    const fishing = ((await list(h)).json() as ProfessionsDto).professions.find(
      (p) => p.id === 'fishing',
    )!;
    expect(fishing.level + fishing.xp).toBeGreaterThan(0);
    const sheet = (
      await t.app.inject({ url: `/api/characters/${h.id}`, headers: { cookie: h.cookie } })
    ).json();
    const fish = sheet.inventory.filter((i: { defId: string }) => i.defId === 'raw_fish');
    if (got) {
      expect(fish).toHaveLength(1); // one stack
      expect(fish[0].quantity).toBe(got);
    }
  });

  it('crafting needs materials and level; blacksmiths repair gear', async () => {
    const h = await hero();
    const noOre = await perform(h, 'blacksmithing', 'smelt');
    expect(noOre.json().error.message).toContain('Iron Ore');

    await give(h, 'iron_ingot', 20);
    await t.dbHandle
      .sql`update items set quality = 10 where character_id = ${h.id} and item_def_id = 'training_sword'`;
    const sheet = (
      await t.app.inject({ url: `/api/characters/${h.id}`, headers: { cookie: h.cookie } })
    ).json();
    const sword = sheet.equipment.mainHand.id as string;
    let repaired = false;
    for (let i = 0; i < 10 && !repaired; i++) {
      const r = (await perform(h, 'blacksmithing', 'repair', { targetItemId: sword })).json();
      repaired = r.success;
      await ready(h);
    }
    expect(repaired).toBe(true);
    const [row] = await t.dbHandle.sql`select quality from items where id = ${sword}`;
    expect(row!.quality).toBeGreaterThan(10);
  });

  it('is not possible inside a Rift', async () => {
    const h = await hero();
    await placeCharacter(t, h.id, firstRiftSite().hex);
    await t.app.inject({
      method: 'POST',
      url: `/api/rifts/${firstRiftSite().id}/runs`,
      headers: { cookie: h.cookie },
      payload: { characterId: h.id },
    });
    const r = await perform(h, 'fishing', 'fish');
    expect(r.json().error.code).toBe('IN_RIFT');
  });
});
