import { CURRENT_WORLD_BOSS_SEASON, WORLD_BOSS_ID, WORLD_BOSS_RULES } from '@realms/game-core';
import type { RunDto, WorldBossDto } from '@realms/shared';
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

let seq = 0;
async function fighter(atBoss = true) {
  const user = await registerUser(t.app);
  const name = `Slayer${String.fromCharCode(97 + (seq++ % 26))}`;
  const id = (await createCharacter(t.app, user.cookie, name)).json().character.id as string;
  if (atBoss) await placeCharacter(t, id, WORLD_BOSS_RULES.spawn);
  return { ...user, id, name };
}
type F = Awaited<ReturnType<typeof fighter>>;
const view = (f: F) =>
  t.app.inject({ url: `/api/world-boss?characterId=${f.id}`, headers: { cookie: f.cookie } });
const fight = (f: F) =>
  t.app.inject({
    method: 'POST',
    url: '/api/world-boss/fight',
    headers: { cookie: f.cookie },
    payload: { characterId: f.id },
  });
const act = (f: F, runId: string, action: Record<string, unknown>) =>
  t.app.inject({
    method: 'POST',
    url: `/api/rifts/runs/${runId}/actions`,
    headers: { cookie: f.cookie },
    payload: { characterId: f.id, action },
  });

describe('world boss (request #43)', () => {
  it('exists for the season, with a huge shared HP pool, in the Riftlands', async () => {
    const f = await fighter();
    const boss = (await view(f)).json() as WorldBossDto;
    expect(boss).toMatchObject({
      season: CURRENT_WORLD_BOSS_SEASON.season,
      name: CURRENT_WORLD_BOSS_SEASON.name,
      hp: CURRENT_WORLD_BOSS_SEASON.maxHp,
      position: WORLD_BOSS_RULES.spawn,
      you: { attemptsLeft: 1, here: true },
      leaderboard: [],
    });
  });

  it('must be fought where it stands', async () => {
    const f = await fighter(false);
    expect((await fight(f)).json().error.code).toBe('NOT_HERE');
  });

  it('a fight until the party falls: damage comes off the pool and goes on the leaderboard', async () => {
    const f = await fighter();
    const res = await fight(f);
    expect(res.statusCode).toBe(201);
    let run = res.json().run as RunDto;
    expect(run).toMatchObject({ mode: 'worldboss', riftId: WORLD_BOSS_ID });
    expect(run.combat!.combatants.find((c) => c.side === 'enemies')!.hp).toBe(
      CURRENT_WORLD_BOSS_SEASON.maxHp,
    );
    // Hit it once, then leave (the party "falls"): the fight ends and counts.
    run = (
      await act(f, run.id, { type: 'plan', abilityId: 'slash', targetColumn: 'front' })
    ).json();
    const dealt = run.worldBoss!.damage;
    expect(dealt).toBeGreaterThan(0);
    run = (await act(f, run.id, { type: 'abandon' })).json();
    expect(run.status).not.toBe('active');
    expect(run.penalty?.damaged ?? []).toEqual([]); // no gear damage at the world boss

    const boss = (await view(f)).json() as WorldBossDto;
    expect(boss.hp).toBe(CURRENT_WORLD_BOSS_SEASON.maxHp - dealt);
    expect(boss.leaderboard).toEqual([{ rank: 1, members: [f.name], damage: dealt, attempts: 1 }]);
    // One fight per day.
    expect(boss.you!.attemptsLeft).toBe(0);
    expect((await fight(f)).json().error.code).toBe('NO_ATTEMPTS_LEFT');
  });

  it('roams to a neighbouring Riftlands hex when it is time', async () => {
    const f = await fighter();
    await view(f);
    await t.dbHandle.sql`update world_bosses set next_move_at = now() - interval '1 minute'`;
    const boss = (await view(f)).json() as WorldBossDto;
    expect(boss.position).not.toEqual(WORLD_BOSS_RULES.spawn);
    expect(new Date(boss.nextMoveAt).getTime()).toBeGreaterThan(Date.now());
  });
});
