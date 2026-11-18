import type { RunDto } from '@realms/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  createCharacter,
  createTestApp,
  registerUser,
  resetState,
  type TestApp,
} from './helpers.js';

let t: TestApp;
beforeAll(async () => (t = await createTestApp()));
beforeEach(() => resetState(t));
afterAll(() => t.close());

let seq = 0;
async function hero(weapon = 'training_sword') {
  const user = await registerUser(t.app);
  const name = `Hero${String.fromCharCode(97 + (seq % 26))}${String.fromCharCode(97 + Math.floor(seq++ / 26))}`;
  const res = await createCharacter(t.app, user.cookie, name, { startingWeapon: weapon });
  return { ...user, characterId: res.json().character.id as string };
}

const startRun = (h: { cookie: string; characterId: string }) =>
  t.app.inject({
    method: 'POST',
    url: '/api/rifts/shattered_breach/runs',
    headers: { cookie: h.cookie },
    payload: { characterId: h.characterId },
  });

const act = (
  h: { cookie: string; characterId: string },
  runId: string,
  action: Record<string, unknown>,
) =>
  t.app.inject({
    method: 'POST',
    url: `/api/rifts/runs/${runId}/actions`,
    headers: { cookie: h.cookie },
    payload: { characterId: h.characterId, action },
  });

/** Make the current room trivially winnable (test-only DB manipulation). */
async function rig(runId: string) {
  const [row] = await t.dbHandle.sql`select state from rift_runs where id = ${runId}`;
  const state = row!.state as RunDto['combat'];
  for (const c of state.combatants) {
    if (c.side === 'enemies')
      Object.assign(c, { hp: 1, stats: { ...c.stats, dodgeChance: 0, defense: 0 } });
    else Object.assign(c, { stats: { ...c.stats, critChance: 0 } });
  }
  await t.dbHandle
    .sql`update rift_runs set state = ${JSON.stringify(state)}::jsonb where id = ${runId}`;
}

async function clearRoom(
  h: { cookie: string; characterId: string },
  runId: string,
): Promise<RunDto> {
  await rig(runId);
  let run: RunDto | undefined;
  for (let i = 0; i < 20; i++) {
    let res = await act(h, runId, { type: 'ability', abilityId: 'cleave' });
    if (res.statusCode !== 200) res = await act(h, runId, { type: 'ability', abilityId: 'slash' });
    if (res.statusCode !== 200) res = await act(h, runId, { type: 'end_turn' });
    expect(res.statusCode).toBe(200);
    run = res.json();
    if (run!.combat.phase !== 'party') break;
  }
  return run!;
}

describe('Rifts', () => {
  it('lists Rifts', async () => {
    const h = await hero();
    const res = await t.app.inject({ url: '/api/rifts', headers: { cookie: h.cookie } });
    expect(res.json().rifts[0]).toMatchObject({ id: 'shattered_breach', rooms: expect.any(Array) });
    expect(res.json().rifts[0].rooms.at(-1).isBoss).toBe(true);
  });

  it('starts a solo run: my turn, 3 Focus, 60 s timer; one run per character', async () => {
    const h = await hero();
    const res = await startRun(h);
    expect(res.statusCode).toBe(201);
    const run = res.json() as RunDto;
    expect(run).toMatchObject({ status: 'active', roomIndex: 0, riftName: 'Shattered Breach' });
    expect(run.combat.activeId).toBe(`p:${h.characterId}`);
    const me = run.combat.combatants.find((c) => c.characterId === h.characterId)!;
    expect(me).toMatchObject({ focus: 3, slot: 0, hp: me.maxHp });
    const left = new Date(run.turnDeadline!).getTime() - Date.now();
    expect(left).toBeGreaterThan(55_000);
    expect(left).toBeLessThanOrEqual(60_000);

    const again = await startRun(h);
    expect(again.statusCode).toBe(409);
    expect(again.json().error.code).toBe('IN_RIFT');

    const active = await t.app.inject({
      url: `/api/rifts/active?characterId=${h.characterId}`,
      headers: { cookie: h.cookie },
    });
    expect(active.json().run.id).toBe(run.id);
  });

  it('places ranged characters in the back column', async () => {
    const h = await hero('hunting_bow');
    const run = (await startRun(h)).json() as RunDto;
    expect(run.combat.combatants.find((c) => c.characterId === h.characterId)!.slot).toBe(4);
  });

  it('locks equipment and deletion while inside a Rift', async () => {
    const h = await hero();
    await startRun(h);
    const unequip = await t.app.inject({
      method: 'POST',
      url: `/api/characters/${h.characterId}/unequip`,
      headers: { cookie: h.cookie },
      payload: { slot: 'mainHand' },
    });
    expect(unequip.statusCode).toBe(409);
    expect(unequip.json().error.code).toBe('IN_RIFT');
    const del = await t.app.inject({
      method: 'DELETE',
      url: `/api/characters/${h.characterId}`,
      headers: { cookie: h.cookie },
    });
    expect(del.statusCode).toBe(409);
  });

  it('validates actions; ending the turn lets the enemies act', async () => {
    const h = await hero();
    const run = (await startRun(h)).json() as RunDto;
    const bad = await act(h, run.id, { type: 'ability', abilityId: 'arcane_bolt' });
    expect(bad.statusCode).toBe(400);
    expect(bad.json().error.code).toBe('INVALID_ACTION');
    const advance = await act(h, run.id, { type: 'advance' });
    expect(advance.statusCode).toBe(400);

    const next = (await act(h, run.id, { type: 'end_turn' })).json() as RunDto;
    expect(next.combat.round).toBe(2);
    expect(next.combat.log.some((l) => l.t === 'ability' && l.actorId.startsWith('e:'))).toBe(true);
    expect(next.combat.activeId).toBe(`p:${h.characterId}`);
  });

  it('full clear: rooms, boss, reputation and a drop; then a new run is allowed', async () => {
    const h = await hero();
    const { id } = (await startRun(h)).json() as RunDto;
    let run = await clearRoom(h, id);
    expect(run.combat.phase).toBe('room_cleared');
    run = (await act(h, id, { type: 'advance' })).json();
    expect(run.roomIndex).toBe(1);
    run = await clearRoom(h, id);
    run = (await act(h, id, { type: 'advance' })).json();
    expect(run.rooms[run.roomIndex]!.isBoss).toBe(true);
    run = await clearRoom(h, id);

    expect(run.status).toBe('victory');
    expect(run.rewards!.reputation).toBe(25);
    expect(run.rewards!.items).toHaveLength(1);

    const sheet = (
      await t.app.inject({ url: `/api/characters/${h.characterId}`, headers: { cookie: h.cookie } })
    ).json();
    expect(sheet.reputation).toBe(25);
    expect(sheet.inventory.map((i: { id: string }) => i.id)).toEqual([run.rewards!.items[0]!.id]);

    const events = await t.dbHandle
      .sql`select type from world_events where type like 'rift.%' order by created_at`;
    expect(events.map((e) => e.type)).toEqual(['rift.entered', 'rift.completed']);
    expect((await startRun(h)).statusCode).toBe(201);
  });

  it('abandoning counts as a defeat: equipped items lose 25% quality', async () => {
    const h = await hero();
    const { id } = (await startRun(h)).json() as RunDto;
    const run = (await act(h, id, { type: 'abandon' })).json() as RunDto;
    expect(run.status).toBe('abandoned');
    expect(run.rewards).toBeNull();
    expect(run.penalty!.damaged.map((d) => d.quality)).toEqual([75, 75]);
    const sheet = (
      await t.app.inject({ url: `/api/characters/${h.characterId}`, headers: { cookie: h.cookie } })
    ).json();
    expect(sheet.equipment.mainHand.quality).toBe(75);
    const after = await act(h, id, { type: 'end_turn' });
    expect(after.statusCode).toBe(409);
  });

  it('applies expired turn timers when the run is read', async () => {
    const h = await hero();
    const { id } = (await startRun(h)).json() as RunDto;
    await t.dbHandle
      .sql`update rift_runs set turn_deadline = now() - interval '5 seconds' where id = ${id}`;
    const run = (
      await t.app.inject({
        url: `/api/rifts/runs/${id}?characterId=${h.characterId}`,
        headers: { cookie: h.cookie },
      })
    ).json() as RunDto;
    expect(run.combat.log.some((l) => l.t === 'timeout')).toBe(true);
    expect(run.combat.round).toBe(2);
    expect(new Date(run.turnDeadline!).getTime()).toBeGreaterThan(Date.now());
  });

  it("hides other players' runs", async () => {
    const h = await hero();
    const other = await hero();
    const { id } = (await startRun(h)).json() as RunDto;
    const res = await t.app.inject({
      url: `/api/rifts/runs/${id}?characterId=${other.characterId}`,
      headers: { cookie: other.cookie },
    });
    expect(res.statusCode).toBe(404);
  });
});
