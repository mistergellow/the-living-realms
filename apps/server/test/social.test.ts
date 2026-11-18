import type { FriendsDto } from '@realms/shared';
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

async function player(name: string) {
  const user = await registerUser(t.app);
  const res = await createCharacter(t.app, user.cookie, name);
  return { ...user, id: res.json().character.id as string, name };
}
type P = Awaited<ReturnType<typeof player>>;
const friends = async (p: P) =>
  (
    await t.app.inject({
      url: `/api/social/friends?characterId=${p.id}`,
      headers: { cookie: p.cookie },
    })
  ).json() as FriendsDto;
const request = (p: P, name: string) =>
  t.app.inject({
    method: 'POST',
    url: '/api/social/friends/requests',
    headers: { cookie: p.cookie },
    payload: { characterId: p.id, name },
  });

describe('friends', () => {
  it('request by name (case-insensitive), accept, list, remove', async () => {
    const a = await player('Amara');
    const b = await player('Bastian');
    const res = await request(a, 'bastian');
    expect(res.statusCode).toBe(200);
    expect((res.json() as FriendsDto).outgoing.map((f) => f.name)).toEqual(['Bastian']);
    expect((await friends(b)).incoming.map((f) => f.name)).toEqual(['Amara']);

    const accepted = await t.app.inject({
      method: 'POST',
      url: `/api/social/friends/requests/${a.id}/accept`,
      headers: { cookie: b.cookie },
      payload: { characterId: b.id },
    });
    expect((accepted.json() as FriendsDto).friends.map((f) => f.name)).toEqual(['Amara']);
    expect((await friends(a)).friends).toEqual([
      expect.objectContaining({ name: 'Bastian', online: false }),
    ]);

    const again = await request(a, 'Bastian');
    expect(again.statusCode).toBe(409);
    expect(again.json().error.code).toBe('ALREADY_FRIENDS');

    await t.app.inject({
      method: 'DELETE',
      url: `/api/social/friends/${b.id}?characterId=${a.id}`,
      headers: { cookie: a.cookie },
    });
    expect((await friends(b)).friends).toEqual([]);
  });

  it('crossed requests become a friendship', async () => {
    const a = await player('Corin');
    const b = await player('Dalia');
    await request(a, 'Dalia');
    const res = await request(b, 'Corin');
    expect((res.json() as FriendsDto).friends.map((f) => f.name)).toEqual(['Corin']);
  });

  it('rejects unknown names, yourself and your own characters', async () => {
    const a = await player('Elowen');
    expect((await request(a, 'Nobody')).statusCode).toBe(404);
    expect((await request(a, 'Elowen')).statusCode).toBe(400);
    await createCharacter(t.app, a.cookie, 'Elowensalt');
    expect((await request(a, 'Elowensalt')).statusCode).toBe(400);
  });

  it("cannot act for someone else's character", async () => {
    const a = await player('Fenwick');
    const b = await player('Gwyn');
    const res = await t.app.inject({
      method: 'POST',
      url: '/api/social/friends/requests',
      headers: { cookie: a.cookie },
      payload: { characterId: b.id, name: 'Fenwick' },
    });
    expect(res.statusCode).toBe(404);
  });
});
