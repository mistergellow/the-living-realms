import { GUILD_RULES, REGIONS, worldMapHexes, checkGuildLand } from '@realms/game-core';
import type { GuildViewDto } from '@realms/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { awardGuildReputation } from '../src/modules/guilds/guilds.service.js';
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

async function hero(name: string, gold = 0) {
  const user = await registerUser(t.app);
  const res = await createCharacter(t.app, user.cookie, name);
  const id = res.json().character.id as string;
  if (gold) await t.dbHandle.sql`update characters set gold = ${gold} where id = ${id}`;
  return { ...user, id, name };
}
type H = Awaited<ReturnType<typeof hero>>;

const call = (h: H, method: 'GET' | 'POST' | 'PATCH', path: string, payload?: object) =>
  t.app.inject({
    method,
    url: `/api/characters/${h.id}/guild${path}`,
    headers: { cookie: h.cookie },
    ...(payload ? { payload } : {}),
  });
const view = async (h: H) => (await call(h, 'GET', '')).json() as GuildViewDto;
const found = (h: H, name = 'Iron Wolves') =>
  call(h, 'POST', '', { name, icon: 'wolf', color: '#c9a227' });

describe('guilds (request #57)', () => {
  it('founding costs gold; name, icon and colour are checked', async () => {
    const poor = await hero('Poor');
    expect((await found(poor)).json().error.code).toBe('NOT_ENOUGH_GOLD');
    const leader = await hero('Leader', 1000);
    const bad = await call(leader, 'POST', '', {
      name: 'Iron Wolves',
      icon: 'cow',
      color: '#c9a227',
    });
    expect(bad.statusCode).toBe(400);
    const v = (await found(leader)).json() as GuildViewDto;
    expect(v.guild).toMatchObject({ name: 'Iron Wolves', icon: 'wolf', reputation: 0 });
    expect(v.role).toBe('leader');
    expect(v.gold).toBe(1000 - GUILD_RULES.createCost);
    const other = await hero('Other', 1000);
    expect((await found(other, 'iron wolves')).json().error.code).toBe('GUILD_NAME_TAKEN');
    // The leader changes the emblem.
    const upd = (await call(leader, 'PATCH', '', { color: '#1565c0' })).json() as GuildViewDto;
    expect(upd.guild!.color).toBe('#1565c0');
  });

  it('the leader invites and kicks; members accept, leave; the lead passes on', async () => {
    const leader = await hero('Leader', 1000);
    await found(leader);
    const bob = await hero('Bob');
    const eve = await hero('Eve');
    expect((await call(bob, 'POST', '/invites', { name: 'Leader' })).json().error.code).toBe(
      'NOT_IN_GUILD',
    );
    await call(leader, 'POST', '/invites', { name: 'bob' });
    await call(leader, 'POST', '/invites', { name: 'Eve' });
    const inv = await view(bob);
    expect(inv.invites).toHaveLength(1);
    const gid = inv.invites[0]!.guildId;
    const joined = (await call(bob, 'POST', `/invites/${gid}/accept`)).json() as GuildViewDto;
    expect(joined.guild!.members.map((m) => m.name)).toEqual(['Leader', 'Bob']);
    await call(eve, 'POST', `/invites/${gid}/decline`);
    expect((await view(eve)).invites).toHaveLength(0);
    // Members cannot kick; the leader can.
    expect((await call(bob, 'POST', '/kick', { characterId: leader.id })).statusCode).toBe(403);
    await call(leader, 'POST', '/invites', { name: 'Eve' });
    await call(eve, 'POST', `/invites/${gid}/accept`);
    const kicked = (await call(leader, 'POST', '/kick', { characterId: eve.id })).json();
    expect(kicked.guild.members).toHaveLength(2);
    // The leader leaves: Bob leads.
    await call(leader, 'POST', '/leave');
    const bobView = await view(bob);
    expect(bobView.role).toBe('leader');
    // Bob leaves too: the guild is gone.
    await call(bob, 'POST', '/leave');
    expect((await view(bob)).guild).toBeNull();
  });

  it(`holds at most ${GUILD_RULES.maxMembers} members`, async () => {
    const leader = await hero('Leader', 1000);
    const v = (await found(leader)).json() as GuildViewDto;
    const gid = v.guild!.id;
    for (let i = 1; i < GUILD_RULES.maxMembers; i++) {
      const m = await hero(`Member${'abcdefghijklmnopq'[i]}`);
      await t.dbHandle
        .sql`insert into guild_members (guild_id, character_id) values (${gid}, ${m.id})`;
    }
    await hero('Late');
    const r = await call(leader, 'POST', '/invites', { name: 'Late' });
    expect(r.json().error.code).toBe('GUILD_FULL');
  });

  it('bank, land and storage', async () => {
    const leader = await hero('Leader', 10_000);
    await found(leader);
    const bank = (await call(leader, 'POST', '/bank/deposit', { amount: 3000 })).json();
    expect(bank.guild.gold).toBe(3000);
    // Storage works in a capital (new characters start in theirs).
    let v = await view(leader);
    expect(v.storageHere).toBe(true);
    const rod = v.bag.find((i) => i.defId === 'fishing_rod')!;
    v = (await call(leader, 'POST', '/storage/deposit', { itemId: rod.id })).json();
    expect(v.guild!.storage.map((i) => i.defId)).toEqual(['fishing_rod']);
    expect(v.bag.some((i) => i.id === rod.id)).toBe(false);
    v = (
      await call(leader, 'POST', '/storage/withdraw', { itemId: v.guild!.storage[0]!.id })
    ).json();
    expect(v.bag.some((i) => i.defId === 'fishing_rod')).toBe(true);
    // Land: not in a capital; somewhere valid it costs bank gold.
    expect((await call(leader, 'POST', '/land')).statusCode).toBe(400);
    const plot = worldMapHexes().find((h) => !checkGuildLand(h))!;
    await placeCharacter(t, leader.id, { q: plot.q, r: plot.r });
    v = (await call(leader, 'POST', '/land')).json();
    expect(v.guild!.land).toEqual({ q: plot.q, r: plot.r });
    expect(v.guild!.gold).toBe(3000 - GUILD_RULES.landCost);
    // On the guild's land, the storage works too.
    expect(v.storageHere).toBe(true);
    expect(REGIONS).toBeDefined();
  });

  it('earns reputation when members win a Rift together', async () => {
    const leader = await hero('Leader', 1000);
    const v = (await found(leader)).json() as GuildViewDto;
    const bob = await hero('Bob');
    await t.dbHandle
      .sql`insert into guild_members (guild_id, character_id) values (${v.guild!.id}, ${bob.id})`;
    await awardGuildReputation(t.dbHandle.db, [{ characterId: leader.id, reputation: 30 }]);
    expect((await view(leader)).guild!.reputation).toBe(0);
    const solo = await hero('Solo');
    await awardGuildReputation(t.dbHandle.db, [
      { characterId: leader.id, reputation: 30 },
      { characterId: solo.id, reputation: 30 },
    ]);
    expect((await view(leader)).guild!.reputation).toBe(0);
    await awardGuildReputation(t.dbHandle.db, [
      { characterId: leader.id, reputation: 30 },
      { characterId: bob.id, reputation: 20 },
    ]);
    expect((await view(leader)).guild!.reputation).toBe(50);
  });
});
