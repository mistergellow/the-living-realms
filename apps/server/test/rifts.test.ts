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

/** Make the current fight trivially winnable (test-only DB manipulation). */
async function rig(runId: string) {
  const [row] = await t.dbHandle.sql`select state from rift_runs where id = ${runId}`;
  const state = row!.state as { combat: RunDto['combat'] };
  if (!state.combat) return;
  for (const c of state.combat.combatants) {
    if (c.side === 'enemies')
      Object.assign(c, { hp: 1, stats: { ...c.stats, dodgeChance: 0, armor: 0 } });
    else Object.assign(c, { stats: { ...c.stats, critChance: 0 } });
  }
  await t.dbHandle
    .sql`update rift_runs set state = ${JSON.stringify(state)}::jsonb where id = ${runId}`;
}

type Hero = { cookie: string; characterId: string };

/** Win the current fight: plan an attack, confirm, repeat. */
async function winFight(h: Hero, runId: string): Promise<RunDto> {
  await rig(runId);
  let run: RunDto | undefined;
  for (let i = 0; i < 20; i++) {
    await act(h, runId, { type: 'plan', abilityId: 'cleave' });
    const res = await act(h, runId, { type: 'ready' });
    expect(res.statusCode).toBe(200);
    run = res.json();
    if (run!.combat?.phase !== 'planning') break;
  }
  return run!;
}

/** Walk the map to the boss, always taking the first room offered. */
async function clearRift(h: Hero, runId: string): Promise<{ run: RunDto; types: string[] }> {
  let run = (
    await t.app.inject({
      url: `/api/rifts/runs/${runId}?characterId=${h.characterId}`,
      headers: { cookie: h.cookie },
    })
  ).json() as RunDto;
  const types: string[] = [];
  for (let step = 0; step < 40 && run.status === 'active'; step++) {
    if (run.phase === 'map') {
      const next = run.map.nodes.find((n) => n.available)!;
      types.push(next.type);
      run = (await act(h, runId, { type: 'vote', optionId: next.id })).json();
    } else if (run.phase === 'combat') {
      if (run.combat!.phase === 'planning') run = await winFight(h, runId);
      else run = (await act(h, runId, { type: 'continue' })).json();
    } else if (run.phase === 'event' && !run.event!.result) {
      const safe = run.event!.approaches.find((a) => !a.attribute) ?? run.event!.approaches[0]!;
      run = (await act(h, runId, { type: 'vote', optionId: safe.id })).json();
    } else run = (await act(h, runId, { type: 'continue' })).json();
  }
  return { run, types };
}

describe('Rifts', () => {
  it('lists Rifts', async () => {
    const h = await hero();
    const res = await t.app.inject({ url: '/api/rifts', headers: { cookie: h.cookie } });
    expect(res.json().rifts[0]).toMatchObject({
      id: 'shattered_breach',
      depth: 8,
      bossName: 'Rift Warden',
    });
  });

  it('starts a solo run on the map: choose the first room; one run per character', async () => {
    const h = await hero();
    const res = await startRun(h);
    expect(res.statusCode).toBe(201);
    const run = res.json() as RunDto;
    expect(run).toMatchObject({ status: 'active', phase: 'map', roomsVisited: 0, combat: null });
    expect(run.map.nodes.length).toBeGreaterThanOrEqual(10);
    expect(run.map.nodes.filter((n) => n.available).length).toBeGreaterThanOrEqual(2);
    expect(run.map.nodes.some((n) => n.type === 'secret')).toBe(false); // hidden until found
    expect(run.party[0]).toMatchObject({ characterId: h.characterId, conditions: [] });
    const left = new Date(run.deadline!).getTime() - Date.now();
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

  it('first room: a fight in the planning phase; ranged characters start in the back', async () => {
    const h = await hero('hunting_bow');
    const run = (await startRun(h)).json() as RunDto;
    const first = run.map.nodes.find((n) => n.available)!;
    const fight = (await act(h, run.id, { type: 'vote', optionId: first.id })).json() as RunDto;
    expect(fight.phase).toBe('combat');
    expect(fight.combat!.phase).toBe('planning');
    const me = fight.combat!.combatants.find((c) => c.characterId === h.characterId)!;
    expect(me).toMatchObject({ slot: 4, focus: me.focusPerRound });
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

  it('validates actions; confirming the plan resolves the round', async () => {
    const h = await hero();
    const run = (await startRun(h)).json() as RunDto;
    const bad = await act(h, run.id, { type: 'vote', optionId: 'nowhere' });
    expect(bad.statusCode).toBe(400);
    const notYet = await act(h, run.id, { type: 'ready' });
    expect(notYet.statusCode).toBe(400);
    const first = run.map.nodes.find((n) => n.available)!;
    await act(h, run.id, { type: 'vote', optionId: first.id });
    const wrong = await act(h, run.id, { type: 'plan', abilityId: 'arcane_bolt' });
    expect(wrong.json().error.code).toBe('INVALID_ACTION');
    const planned = (await act(h, run.id, { type: 'plan', abilityId: 'block' })).json() as RunDto;
    expect(planned.combat!.plan).toHaveLength(1);
    const next = (await act(h, run.id, { type: 'ready' })).json() as RunDto;
    expect(next.combat!.round).toBe(2);
    expect(next.combat!.log.some((l) => l.t === 'resolve')).toBe(true);
    expect(next.combat!.log.some((l) => l.t === 'ability' && l.actorId.startsWith('e:'))).toBe(
      true,
    );
  });

  it('full run: through the map to the boss, reputation and drops; then a new run is allowed', async () => {
    const h = await hero();
    const { id } = (await startRun(h)).json() as RunDto;
    const { run, types } = await clearRift(h, id);
    expect(run.status).toBe('victory');
    expect(types.at(-1)).toBe('boss');
    expect(types.length).toBe(8);
    expect(run.rewards!.reputation).toBe(40);
    // 2 boss drops + anything found on the way (Loot rooms, events).
    expect(run.rewards!.items.length).toBeGreaterThanOrEqual(2);

    const sheet = (
      await t.app.inject({ url: `/api/characters/${h.characterId}`, headers: { cookie: h.cookie } })
    ).json();
    expect(sheet.reputation).toBe(40);
    const ids = sheet.inventory.map((i: { id: string }) => i.id);
    for (const it of run.rewards!.items) expect(ids).toContain(it.id);

    const events = await t.dbHandle
      .sql`select type from world_events where type in ('rift.entered', 'rift.completed') order by created_at`;
    expect(events.map((e) => e.type)).toEqual(['rift.entered', 'rift.completed']);
    expect((await startRun(h)).statusCode).toBe(201);
  });

  it('items found in Loot rooms are kept only if the party beats the Rift', async () => {
    const lootRun = async (h: Hero) => {
      const { id } = (await startRun(h)).json() as RunDto;
      // Force Loot Rooms in front of the party (test-only).
      const [row] = await t.dbHandle.sql`select state from rift_runs where id = ${id}`;
      const state = row!.state as { map: { nodes: Array<{ row: number; type: string }> } };
      for (const n of state.map.nodes) if (n.row === 0) n.type = 'loot';
      await t.dbHandle
        .sql`update rift_runs set state = ${JSON.stringify(state)}::jsonb where id = ${id}`;
      const run = (
        await t.app.inject({
          url: `/api/rifts/runs/${id}?characterId=${h.characterId}`,
          headers: { cookie: h.cookie },
        })
      ).json() as RunDto;
      const loot = run.map.nodes.find((n) => n.available)!;
      const after = (await act(h, id, { type: 'vote', optionId: loot.id })).json() as RunDto;
      expect(after.phase).toBe('room');
      expect(after.outcome!.items).toHaveLength(1);
      return { id, found: after.outcome!.items[0]!.name };
    };
    const inventory = async (h: Hero) =>
      (
        await t.app.inject({
          url: `/api/characters/${h.characterId}`,
          headers: { cookie: h.cookie },
        })
      ).json().inventory as Array<{ name: string }>;

    // Leaving (or a wipe) loses what was found.
    const quitter = await hero();
    const q = await lootRun(quitter);
    expect(await inventory(quitter)).toEqual([]);
    await act(quitter, q.id, { type: 'abandon' });
    expect(await inventory(quitter)).toEqual([]);

    // Beating the Rift hands it out with the boss rewards.
    const winner = await hero();
    const w = await lootRun(winner);
    await act(winner, w.id, { type: 'continue' });
    const { run } = await clearRift(winner, w.id);
    expect(run.status).toBe('victory');
    expect(run.rewards!.items.map((i) => i.name)).toContain(w.found);
    expect((await inventory(winner)).map((i) => i.name)).toContain(w.found);
  });

  it('shows the Dungeon Threat; a timed-out vote raises it', async () => {
    const h = await hero();
    const { id, threat } = (await startRun(h)).json() as RunDto;
    expect(threat).toMatchObject({ value: 0, tier: null });
    await t.dbHandle
      .sql`update rift_runs set turn_deadline = now() - interval '5 seconds' where id = ${id}`;
    const run = (
      await t.app.inject({
        url: `/api/rifts/runs/${id}?characterId=${h.characterId}`,
        headers: { cookie: h.cookie },
      })
    ).json() as RunDto;
    expect(run.threat.value).toBe(1);
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
    const after = await act(h, id, { type: 'continue' });
    expect(after.statusCode).toBe(409);
  });

  it('applies expired timers when the run is read (map vote, then planning)', async () => {
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
    expect(run.roomsVisited).toBe(1);
    expect(new Date(run.deadline!).getTime()).toBeGreaterThan(Date.now());
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
