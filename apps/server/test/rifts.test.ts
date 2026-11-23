import { riftLength } from '@realms/game-core';
import type { RunDto, RiftDto } from '@realms/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  createCharacter,
  createTestApp,
  registerUser,
  resetState,
  type TestApp,
  firstRiftSite,
  placeCharacter,
} from './helpers.js';

let t: TestApp;
beforeAll(async () => (t = await createTestApp()));
beforeEach(() => resetState(t));
afterAll(() => t.close());

const SITE = firstRiftSite();

let seq = 0;
async function hero(weapon = 'training_sword') {
  const user = await registerUser(t.app);
  const name = `Hero${String.fromCharCode(97 + (seq % 26))}${String.fromCharCode(97 + Math.floor(seq++ / 26))}`;
  const res = await createCharacter(t.app, user.cookie, name, { startingWeapon: weapon });
  const characterId = res.json().character.id as string;
  await placeCharacter(t, characterId, SITE.hex); // Rifts are entered from their hex (#43)
  return { ...user, characterId };
}

const startRun = (h: { cookie: string; characterId: string }) =>
  t.app.inject({
    method: 'POST',
    url: `/api/rifts/${SITE.id}/runs`,
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
    if (c.side === 'enemies') Object.assign(c, { hp: 1, stats: { ...c.stats, armor: 0 } });
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
    // PvE: the attack happens at once; it may already win the fight.
    const hit = await act(h, runId, { type: 'plan', abilityId: 'cleave' });
    if (hit.statusCode === 200 && (hit.json() as RunDto).combat?.phase !== 'planning') {
      run = hit.json();
      break;
    }
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
      run = (await act(h, runId, { type: 'vote', optionId: next.id })).json();
      // Request #69: what a room holds is only known once you are in it.
      types.push(run.roomType ?? '?');
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
    // Request #43: the Rift entrances on the map, each with a tier and a hex.
    const rifts = res.json().rifts as RiftDto[];
    expect(rifts.length).toBeGreaterThan(5);
    expect(rifts.find((r) => r.id === SITE.id)).toMatchObject({
      depth: riftLength(1), // request #60: tier 1 routes have 10 rooms
      bossName: 'Rift Warden',
      site: SITE.hex,
    });
    expect(rifts.every((r) => r.tier! >= 1 && r.tier! <= 5)).toBe(true);
  });

  it('can only be entered from its hex', async () => {
    const h = await hero();
    await placeCharacter(t, h.characterId, { q: SITE.hex.q + 1, r: SITE.hex.r });
    const res = await startRun(h);
    expect(res.json().error.code).toBe('NOT_HERE');
    const template = await t.app.inject({
      method: 'POST',
      url: '/api/rifts/shattered_breach/runs',
      headers: { cookie: h.cookie },
      payload: { characterId: h.characterId },
    });
    expect(template.json().error.code).toBe('NOT_HERE');
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
    // Request #69: behind each door is unknown, except the boss lair.
    expect(run.map.nodes.filter((n) => n.type !== null).map((n) => n.type)).toEqual(['boss']);
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
    expect(me).toMatchObject({ slot: 3, focus: me.focusPerRound });
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
    // PvE (Slay the Spire): the action happens at once.
    const planned = (await act(h, run.id, { type: 'plan', abilityId: 'block' })).json() as RunDto;
    expect(planned.combat!.plan).toHaveLength(0);
    expect(planned.combat!.log.some((l) => l.t === 'block')).toBe(true);
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
    expect(types.length).toBe(riftLength(1));
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
    expect(run.rewards).toMatchObject({ clearNumber: 1, clearFactorPct: 100, gearBonusPct: 0 });

    // Request #49: the same Rift gives less the second time (50%)…
    const second = (await startRun(h)).json() as RunDto;
    expect(second.status).toBe('active');
    const again = (await clearRift(h, second.id)).run;
    expect(again.rewards).toMatchObject({ reputation: 20, clearNumber: 2, clearFactorPct: 50 });
    // …and nothing from the fourth time on.
    await t.dbHandle.sql`
      insert into rift_runs (id, world_id, rift_id, state, status)
      select gen_random_uuid(), world_id, rift_id, state, 'victory' from rift_runs where id = ${second.id}`;
    await t.dbHandle.sql`
      insert into rift_run_participants (run_id, character_id, account_id)
      select r.id, ${h.characterId}, p.account_id from rift_runs r, rift_run_participants p
      where p.run_id = ${second.id} and r.id not in (${id}, ${second.id})`;
    const fourth = (await startRun(h)).json() as RunDto;
    expect((await clearRift(h, fourth.id)).run.rewards).toMatchObject({
      reputation: 0,
      clearNumber: 4,
      clearFactorPct: 0,
    });
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
      )
        .json()
        .inventory.filter((i: { kind: string }) => i.kind !== 'tool') as Array<{
        name: string;
      }>;

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
    // Request #43: each equipped item loses 1–3% durability.
    const lost = run.penalty!.damaged.map((d) => d.quality);
    expect(lost).toHaveLength(2);
    for (const q of lost) {
      expect(q).toBeGreaterThanOrEqual(97);
      expect(q).toBeLessThanOrEqual(99);
    }
    const sheet = (
      await t.app.inject({ url: `/api/characters/${h.characterId}`, headers: { cookie: h.cookie } })
    ).json();
    expect(sheet.equipment.mainHand.quality).toBe(
      run.penalty!.damaged.find((d) => d.id === sheet.equipment.mainHand.id)!.quality,
    );
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
