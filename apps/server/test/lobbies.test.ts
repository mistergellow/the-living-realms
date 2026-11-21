import type { LobbyDto, LobbyOverviewDto, RunDto } from '@realms/shared';
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
const letters = (n: number) =>
  String.fromCharCode(97 + (n % 26)) + String.fromCharCode(97 + (Math.floor(n / 26) % 26));
async function player(weapon = 'training_sword') {
  const user = await registerUser(t.app);
  const name = `Lob${letters(seq++)}`;
  const res = await createCharacter(t.app, user.cookie, name, { startingWeapon: weapon });
  return { ...user, id: res.json().character.id as string, name };
}
type P = Awaited<ReturnType<typeof player>>;

const call = (p: P, method: 'GET' | 'POST', url: string, payload: Record<string, unknown> = {}) =>
  t.app.inject({
    method,
    url: method === 'GET' ? `${url}${url.includes('?') ? '&' : '?'}characterId=${p.id}` : url,
    headers: { cookie: p.cookie },
    ...(method === 'POST' ? { payload: { characterId: p.id, ...payload } } : {}),
  });
const create = (p: P, visibility: 'public' | 'private' = 'public') =>
  call(p, 'POST', '/api/rifts/lobbies', { riftId: 'shattered_breach', visibility });

async function befriend(a: P, b: P) {
  await call(a, 'POST', '/api/social/friends/requests', { name: b.name });
  await call(b, 'POST', `/api/social/friends/requests/${a.id}/accept`);
}

describe('Rift lobbies', () => {
  it('create, list publicly, join, choose slots, ready, start a group run', async () => {
    const leader = await player('training_sword');
    const archer = await player('hunting_bow');
    const res = await create(leader);
    expect(res.statusCode).toBe(201);
    const lobby = res.json() as LobbyDto;
    expect(lobby.members).toEqual([
      expect.objectContaining({ name: leader.name, isLeader: true, slot: 0 }),
    ]);

    const overview = (await call(archer, 'GET', '/api/rifts/lobbies')).json() as LobbyOverviewDto;
    expect(overview.publicLobbies.map((l) => l.id)).toEqual([lobby.id]);

    const joined = (
      await call(archer, 'POST', `/api/rifts/lobbies/${lobby.id}/join`)
    ).json() as LobbyDto;
    expect(joined.members.find((m) => m.name === archer.name)).toMatchObject({
      slot: 3,
      isLeader: false,
    });

    // Swap slots: archer moves to slot 0 (taken by the leader) → they swap.
    const swapped = (
      await call(archer, 'POST', `/api/rifts/lobbies/${lobby.id}/slot`, { slot: 0 })
    ).json() as LobbyDto;
    expect(swapped.members.find((m) => m.name === leader.name)!.slot).toBe(3);

    const notReady = await call(leader, 'POST', `/api/rifts/lobbies/${lobby.id}/start`);
    expect(notReady.statusCode).toBe(409);
    expect(notReady.json().error.code).toBe('NOT_READY');
    const notLeader = await call(archer, 'POST', `/api/rifts/lobbies/${lobby.id}/start`);
    expect(notLeader.json().error.code).toBe('NOT_LEADER');

    await call(archer, 'POST', `/api/rifts/lobbies/${lobby.id}/ready`, { ready: true });
    const started = (
      await call(leader, 'POST', `/api/rifts/lobbies/${lobby.id}/start`)
    ).json() as LobbyDto;
    expect(started.status).toBe('started');
    expect(started.runId).toBeTruthy();

    // The other member finds the run through the lobby.
    const seen = (await call(archer, 'GET', `/api/rifts/lobbies/${lobby.id}`)).json() as LobbyDto;
    expect(seen.runId).toBe(started.runId);
    const run = (await call(archer, 'GET', `/api/rifts/runs/${started.runId}`)).json() as RunDto;
    expect(run.leaderId).toBe(started.leaderCharacterId);
    // Both vote for the same first room: the fight starts with the lobby formation.
    const first = run.map.nodes.find((n) => n.available)!;
    for (const p of [leader, archer])
      await call(p, 'POST', `/api/rifts/runs/${started.runId}/actions`, {
        action: { type: 'vote', optionId: first.id },
      });
    const fight = (await call(archer, 'GET', `/api/rifts/runs/${started.runId}`)).json() as RunDto;
    const party = fight.combat!.combatants.filter((c) => c.side === 'party');
    expect(party.map((p) => [p.name, p.slot]).sort()).toEqual(
      [
        [archer.name, 0],
        [leader.name, 3],
      ].sort(),
    );
  });

  it('private lobbies need an invite from a member, only to friends', async () => {
    const a = await player();
    const b = await player();
    const lobby = (await create(a, 'private')).json() as LobbyDto;
    expect((await call(b, 'GET', '/api/rifts/lobbies')).json().publicLobbies).toEqual([]);
    expect((await call(b, 'POST', `/api/rifts/lobbies/${lobby.id}/join`)).statusCode).toBe(403);

    const notFriend = await call(a, 'POST', `/api/rifts/lobbies/${lobby.id}/invite`, {
      friendCharacterId: b.id,
    });
    expect(notFriend.statusCode).toBe(400);
    await befriend(a, b);
    await call(a, 'POST', `/api/rifts/lobbies/${lobby.id}/invite`, { friendCharacterId: b.id });
    const overview = (await call(b, 'GET', '/api/rifts/lobbies')).json() as LobbyOverviewDto;
    expect(overview.invites).toEqual([
      expect.objectContaining({ lobbyId: lobby.id, from: a.name }),
    ]);
    const joined = await call(b, 'POST', `/api/rifts/lobbies/${lobby.id}/join`);
    expect(joined.statusCode).toBe(200);
    expect((await call(b, 'GET', '/api/rifts/lobbies')).json().invites).toEqual([]);
  });

  it('holds at most 4; one lobby per character; no solo run while in a lobby', async () => {
    const leader = await player();
    const lobby = (await create(leader)).json() as LobbyDto;
    for (let i = 0; i < 3; i++) {
      const p = await player();
      expect((await call(p, 'POST', `/api/rifts/lobbies/${lobby.id}/join`)).statusCode).toBe(200);
    }
    const seventh = await player();
    const full = await call(seventh, 'POST', `/api/rifts/lobbies/${lobby.id}/join`);
    expect(full.json().error.code).toBe('LOBBY_FULL');

    expect((await create(leader)).json().error.code).toBe('IN_LOBBY');
    const solo = await call(leader, 'POST', '/api/rifts/shattered_breach/runs');
    expect(solo.json().error.code).toBe('IN_LOBBY');
  });

  it('leader leaving hands over leadership; last one out closes it; leader can kick', async () => {
    const a = await player();
    const b = await player();
    const c = await player();
    const lobby = (await create(a)).json() as LobbyDto;
    await call(b, 'POST', `/api/rifts/lobbies/${lobby.id}/join`);
    await call(c, 'POST', `/api/rifts/lobbies/${lobby.id}/join`);
    await call(a, 'POST', `/api/rifts/lobbies/${lobby.id}/leave`);
    const after = (await call(b, 'GET', `/api/rifts/lobbies/${lobby.id}`)).json() as LobbyDto;
    expect(after.leaderCharacterId).toBe(b.id);
    const kicked = (
      await call(b, 'POST', `/api/rifts/lobbies/${lobby.id}/kick`, { targetCharacterId: c.id })
    ).json() as LobbyDto;
    expect(kicked.members.map((m) => m.name)).toEqual([b.name]);
    await call(b, 'POST', `/api/rifts/lobbies/${lobby.id}/leave`);
    const [row] = await t.dbHandle.sql`select status from rift_lobbies where id = ${lobby.id}`;
    expect(row!.status).toBe('closed');
  });
});

describe('group combat', () => {
  async function groupRun() {
    const a = await player();
    const b = await player();
    const lobby = (await create(a)).json() as LobbyDto;
    await call(b, 'POST', `/api/rifts/lobbies/${lobby.id}/join`);
    await call(b, 'POST', `/api/rifts/lobbies/${lobby.id}/ready`, { ready: true });
    const { runId } = (
      await call(a, 'POST', `/api/rifts/lobbies/${lobby.id}/start`)
    ).json() as LobbyDto;
    return { a, b, runId: runId! };
  }
  const act = (p: P, runId: string, action: Record<string, unknown>) =>
    call(p, 'POST', `/api/rifts/runs/${runId}/actions`, { action });

  it('the group votes the path (majority, leader breaks ties) and plans together', async () => {
    const { a, b, runId } = await groupRun();
    const run = (await call(a, 'GET', `/api/rifts/runs/${runId}`)).json() as RunDto;
    const [x, y] = run.map.nodes.filter((n) => n.available);
    const one = (await act(b, runId, { type: 'vote', optionId: y!.id })).json() as RunDto;
    expect(one.phase).toBe('map');
    expect(one.votes).toEqual([{ characterId: b.id, optionId: y!.id, testerId: null }]);
    const both = (await act(a, runId, { type: 'vote', optionId: x!.id })).json() as RunDto;
    // 1–1: the leader (a) breaks the tie.
    expect(both.map.nodes.find((n) => n.current)!.id).toBe(x!.id);
    expect(both.phase).toBe('combat');

    // Both plan; the round resolves only when both are ready.
    await act(a, runId, { type: 'plan', abilityId: 'block' });
    const waiting = (await act(a, runId, { type: 'ready' })).json() as RunDto;
    expect(waiting.combat!.round).toBe(1);
    expect(waiting.combat!.ready).toEqual([`p:${a.id}`]);
    const done = (await act(b, runId, { type: 'ready' })).json() as RunDto;
    expect(done.combat!.round).toBe(2);
  });

  it('a player leaving is penalised alone; the others keep fighting', async () => {
    const { a, b, runId } = await groupRun();
    const left = (await act(a, runId, { type: 'abandon' })).json() as RunDto;
    expect(left.status).toBe('abandoned');
    expect(left.penalty!.damaged.every((d) => d.quality === 75)).toBe(true);

    const forB = (await call(b, 'GET', `/api/rifts/runs/${runId}`)).json() as RunDto;
    expect(forB.status).toBe('active');
    expect(forB.party.find((m) => m.characterId === a.id)).toMatchObject({ left: true });
    expect(forB.leaderId).toBe(b.id);
    const bSheet = (
      await t.app.inject({ url: `/api/characters/${b.id}`, headers: { cookie: b.cookie } })
    ).json();
    expect(bSheet.equipment.mainHand.quality).toBe(100);

    // a is free again; b still in the run.
    expect((await create(a)).statusCode).toBe(201);
    expect((await act(a, runId, { type: 'continue' })).statusCode).toBe(409);
  });
});

describe('PvP arena (test mode)', () => {
  it('a PvP lobby splits players in two teams; the match is one fight with hidden plans', async () => {
    const a = await player();
    const b = await player();
    const lobby = (
      await call(a, 'POST', '/api/rifts/lobbies', { riftId: 'pvp_arena', visibility: 'public' })
    ).json() as LobbyDto;
    expect(lobby).toMatchObject({ mode: 'pvp', maxMembers: 8 });
    const joined = (
      await call(b, 'POST', `/api/rifts/lobbies/${lobby.id}/join`)
    ).json() as LobbyDto;
    // The second player joins the smaller team (B = slots 4–7).
    expect(joined.members.find((m) => m.name === b.name)!.slot).toBeGreaterThanOrEqual(4);
    await call(b, 'POST', `/api/rifts/lobbies/${lobby.id}/ready`, { ready: true });
    const { runId } = (
      await call(a, 'POST', `/api/rifts/lobbies/${lobby.id}/start`)
    ).json() as LobbyDto;

    const act = (p: P, action: Record<string, unknown>) =>
      call(p, 'POST', `/api/rifts/runs/${runId}/actions`, { action });
    const run = (await call(a, 'GET', `/api/rifts/runs/${runId}`)).json() as RunDto;
    expect(run).toMatchObject({ mode: 'pvp', phase: 'combat' });
    expect(run.combat!.combatants.find((c) => c.characterId === b.id)!.side).toBe('enemies');

    await act(a, { type: 'plan', abilityId: 'block' });
    const seenByB = (await call(b, 'GET', `/api/rifts/runs/${runId}`)).json() as RunDto;
    expect(seenByB.combat!.plan).toEqual([]); // A's plan is secret
    await act(a, { type: 'ready' });
    const done = (await act(b, { type: 'ready' })).json() as RunDto;
    expect(done.combat!.round).toBe(2);

    // Leaving ends it for the leaver's team; no equipment damage in PvP.
    const left = (await act(b, { type: 'abandon' })).json() as RunDto;
    expect(left.penalty!.damaged).toEqual([]);
    const forA = (await call(a, 'GET', `/api/rifts/runs/${runId}`)).json() as RunDto;
    expect(forA.status).toBe('victory');
  });
});
