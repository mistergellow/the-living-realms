import type {
  ActivityResultDto,
  JobResponseDto,
  ProfessionProfileDto,
  ProfessionsDto,
} from '@realms/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AP_RULES, worldMapHexes } from '@realms/game-core';
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

async function hero(name = 'Crafter') {
  const user = await registerUser(t.app);
  const res = await createCharacter(t.app, user.cookie, name, {
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
  it('lists the 15 professions at Novice, with tools, attributes and stats', async () => {
    const h = await hero();
    const res = (await list(h)).json() as ProfessionsDto;
    expect(res.professions).toHaveLength(15);
    const ids = res.professions.map((p) => p.id);
    expect(ids).toEqual(
      expect.arrayContaining(['blacksmith', 'runecrafter', 'scribing', 'crafter']),
    );
    expect(res.professions.every((p) => p.rank === 0 && p.rankName === 'Novice')).toBe(true);
    const fishing = res.professions.find((p) => p.id === 'fishing')!;
    // New characters carry the basic tools (request #51).
    expect(fishing.tool).toMatchObject({
      type: 'fishing_rod',
      best: { name: 'Fishing Rod', tier: 1 },
    });
    expect(fishing.attributes.length).toBeGreaterThan(0);
    expect(fishing.stats).toEqual({ attempts: 0, successes: 0, itemsMade: 0 });
    expect(fishing.resources.map((r) => r.itemDefId)).toContain('raw_fish');
  });

  it('gathering needs the tool in the bag', async () => {
    const h = await hero();
    await t.dbHandle
      .sql`update items set in_storage = true where character_id = ${h.id} and item_def_id = 'fishing_rod'`;
    const r = await perform(h, 'fishing', 'fish');
    expect(r.statusCode).toBe(400);
    expect(r.json().error.message).toContain('Fishing Rod');
  });

  it('recipes unlock by rank; rank-ups are recorded in the history', async () => {
    const h = await hero();
    await give(h, 'plank', 10);
    const locked = await perform(h, 'carpentry', 'craft_shield');
    expect(locked.json().error.message).toContain('Apprentice');
    // One point short of Apprentice: the next success ranks up.
    await t.dbHandle
      .sql`insert into character_professions (character_id, profession_id, level, xp) values (${h.id}, 'carpentry', 0, 99)`;
    await give(h, 'log', 20);
    let rankedUp = false;
    for (let i = 0; i < 10 && !rankedUp; i++) {
      const r = (await perform(h, 'carpentry', 'saw_planks')).json() as ActivityResultDto;
      rankedUp = r.ranksGained > 0;
      if (rankedUp) {
        expect(r.profession.rankName).toBe('Apprentice');
        expect(r.profession.history[0]).toMatchObject({ rank: 1, rankName: 'Apprentice' });
        expect(r.message).toContain('Apprentice Carpenter');
      }
      await ready(h);
    }
    expect(rankedUp).toBe(true);
    const shield = await perform(h, 'carpentry', 'craft_shield');
    expect(shield.statusCode).toBe(200);
  });

  it('other players can inspect a professional profile (by id or name)', async () => {
    const h = await hero();
    await perform(h, 'fishing', 'fish');
    const other = await registerUser(t.app);
    const byId = await t.app.inject({
      url: `/api/characters/${h.id}/professions/profile`,
      headers: { cookie: other.cookie },
    });
    expect(byId.statusCode).toBe(200);
    const profile = byId.json() as ProfessionProfileDto;
    expect(profile.character.name).toBe('Crafter');
    expect(profile.professions).toHaveLength(15);
    expect(profile.professions.find((p) => p.id === 'fishing')!.stats.attempts).toBe(1);
    // Only the public summary: no inventory, activities or position.
    expect(Object.keys(profile.professions[0]!).sort()).toEqual(
      ['category', 'id', 'name', 'progress', 'rank', 'rankName', 'stats', 'title'].sort(),
    );
    const byName = await t.app.inject({
      url: `/api/characters/by-name/crafter/professions/profile`,
      headers: { cookie: other.cookie },
    });
    expect(byName.json().character.id).toBe(h.id);
    const missing = await t.app.inject({
      url: `/api/characters/by-name/nobody/professions/profile`,
      headers: { cookie: other.cookie },
    });
    expect(missing.statusCode).toBe(404);
  });

  it('gathering costs AP (no waiting), gives graded materials and stacks by grade', async () => {
    const h = await hero();
    let got = 0;
    const grades = new Map<string, number>();
    for (let i = 0; i < 6; i++) {
      const r = (await perform(h, 'fishing', 'fish')).json() as ActivityResultDto;
      expect(r.pointsGained).toBeGreaterThan(0);
      expect(r.apSpent).toBe(AP_RULES.gatherCost);
      for (const p of r.produced) {
        expect(p.grade).toBeTruthy();
        grades.set(p.grade!, (grades.get(p.grade!) ?? 0) + p.qty);
        got += p.qty;
      }
    }
    const fishing = ((await list(h)).json() as ProfessionsDto).professions.find(
      (p) => p.id === 'fishing',
    )!;
    expect(fishing.readyAt).toBeNull();
    expect(fishing.activities[0]!.apCost).toBe(AP_RULES.gatherCost);
    expect(fishing.stats.attempts).toBe(6);
    expect(fishing.stats.itemsMade).toBe(got);
    const [c] = await t.dbHandle.sql`select ap from characters where id = ${h.id}`;
    expect(Number(c!.ap)).toBeLessThanOrEqual(AP_RULES.max - 6 * AP_RULES.gatherCost + 0.1);
    const sheet = (
      await t.app.inject({ url: `/api/characters/${h.id}`, headers: { cookie: h.cookie } })
    ).json();
    const fish = sheet.inventory.filter((i: { defId: string }) => i.defId === 'raw_fish');
    // One stack per grade.
    expect(fish).toHaveLength(grades.size);
    for (const f of fish) expect(f.quantity).toBe(grades.get(f.grade.name));
  });

  it('gathering needs AP', async () => {
    const h = await hero();
    await t.dbHandle.sql`update characters set ap = 1, ap_updated_at = now() where id = ${h.id}`;
    const r = await perform(h, 'fishing', 'fish');
    expect(r.json().error.code).toBe('NOT_ENOUGH_AP');
  });

  it('resource nodes run out and regrow; players share them', async () => {
    const h = await hero();
    const node = ((await list(h)).json() as ProfessionsDto).professions.find(
      (p) => p.id === 'fishing',
    )!.node!;
    expect(node.amount).toBe(node.max);
    // Leave one charge, written now: a success empties it.
    await t.dbHandle
      .sql`insert into resource_nodes (world_id, hex_q, hex_r, profession_id, amount, updated_at)
      select world_id, hex_q, hex_r, 'fishing', 1, now() from characters where id = ${h.id}`;
    let emptied = false;
    for (let i = 0; i < 20 && !emptied; i++) {
      const r = (await perform(h, 'fishing', 'fish')).json() as ActivityResultDto;
      emptied = r.success;
    }
    expect(emptied).toBe(true);
    const other = await hero('Fisher');
    const blocked = await perform(other, 'fishing', 'fish');
    expect(blocked.statusCode).toBe(400);
    expect(blocked.json().error.message).toContain('exhausted');
    const state = ((await list(other)).json() as ProfessionsDto).professions.find(
      (p) => p.id === 'fishing',
    )!.node!;
    expect(state.amount).toBe(0);
    expect(state.readyAt).not.toBeNull();
    // Two hours later it has regrown.
    await t.dbHandle
      .sql`update resource_nodes set updated_at = now() - interval '2 hours' where profession_id = 'fishing'`;
    expect((await perform(other, 'fishing', 'fish')).statusCode).toBe(200);
  });

  it('jobs paid in AP give everything at once (request #56)', async () => {
    const h = await hero();
    const job = (count: number) =>
      t.app.inject({
        method: 'POST',
        url: `/api/characters/${h.id}/professions/fishing/activities/fish/jobs`,
        headers: { cookie: h.cookie },
        payload: { mode: 'ap', count },
      });
    const r = (await job(5)).json() as JobResponseDto;
    expect(r.result!.attempts).toBe(5);
    expect(r.result!.apSpent).toBe(5 * AP_RULES.gatherCost);
    expect(r.job).toBeNull();
    expect(r.profession.stats.attempts).toBe(5);
    // Not enough AP for 5 more attempts.
    await t.dbHandle.sql`update characters set ap = 3, ap_updated_at = now() where id = ${h.id}`;
    const tooMany = await job(5);
    expect(tooMany.json().error.code).toBe('NOT_ENOUGH_AP');
  });

  it('jobs in real time take the inputs now and give the items when they end (request #56)', async () => {
    const h = await hero();
    await give(h, 'log', 3);
    const start = await t.app.inject({
      method: 'POST',
      url: `/api/characters/${h.id}/professions/carpentry/activities/saw_planks/jobs`,
      headers: { cookie: h.cookie },
      payload: { mode: 'time', count: 3 },
    });
    expect(start.statusCode).toBe(200);
    const r = start.json() as JobResponseDto;
    expect(r.job).toMatchObject({ status: 'running', count: 3, activityName: 'Saw planks' });
    const logs = await t.dbHandle
      .sql`select count(*)::int as n from items where character_id = ${h.id} and item_def_id = 'log'`;
    expect(logs[0]!.n).toBe(0);
    // Busy until it ends: no other activity.
    expect((await perform(h, 'fishing', 'fish')).json().error.message).toContain('busy');
    let listed = (await list(h)).json() as ProfessionsDto;
    expect(listed.job!.status).toBe('running');
    // Time passes.
    await t.dbHandle
      .sql`update profession_jobs set finishes_at = now() - interval '1 second' where character_id = ${h.id}`;
    listed = (await list(h)).json() as ProfessionsDto;
    expect(listed.job!.status).toBe('done');
    expect(listed.job!.result!.attempts).toBe(3);
    const planks = await t.dbHandle
      .sql`select coalesce(sum(quantity), 0)::int as n from items where character_id = ${h.id} and item_def_id = 'plank'`;
    expect(planks[0]!.n).toBe(listed.job!.result!.produced.reduce((n, p) => n + p.qty, 0));
    expect(listed.professions.find((p) => p.id === 'carpentry')!.stats.attempts).toBe(3);
    // Dismiss the summary; free to work again.
    const dismissed = await t.app.inject({
      method: 'POST',
      url: `/api/characters/${h.id}/professions/jobs/dismiss`,
      headers: { cookie: h.cookie },
    });
    expect((dismissed.json() as ProfessionsDto).job).toBeNull();
    expect((await perform(h, 'fishing', 'fish')).statusCode).toBe(200);
  });

  it('real-time gathering reserves node charges and returns the unused ones', async () => {
    const h = await hero();
    const r = (
      await t.app.inject({
        method: 'POST',
        url: `/api/characters/${h.id}/professions/fishing/activities/fish/jobs`,
        headers: { cookie: h.cookie },
        payload: { mode: 'time', count: 4 },
      })
    ).json() as JobResponseDto;
    const max = r.profession.node!.max;
    expect(r.profession.node!.amount).toBe(max - 4);
    await t.dbHandle
      .sql`update profession_jobs set finishes_at = now() - interval '1 second' where character_id = ${h.id}`;
    const listed = (await list(h)).json() as ProfessionsDto;
    const node = listed.professions.find((p) => p.id === 'fishing')!.node!;
    expect(node.amount).toBe(max - listed.job!.result!.successes);
  });

  it('crafting needs materials and level; blacksmiths repair gear', async () => {
    const h = await hero();
    const noOre = await perform(h, 'blacksmith', 'smelt');
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
      const r = (await perform(h, 'blacksmith', 'repair', { targetItemId: sword })).json();
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
