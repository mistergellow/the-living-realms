import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  createCharacter,
  createTestApp,
  registerUser,
  resetState,
  VALID_ATTRIBUTES,
  type TestApp,
} from './helpers.js';

let t: TestApp;
beforeAll(async () => (t = await createTestApp()));
beforeEach(() => resetState(t));
afterAll(() => t.close());

describe('characters', () => {
  it('requires authentication', async () => {
    expect((await t.app.inject('/api/characters')).statusCode).toBe(401);
  });

  it('creates a character at the world spawn hex and lists it', async () => {
    const { cookie } = await registerUser(t.app);
    const res = await createCharacter(t.app, cookie, '  Aria   Vell ');
    expect(res.statusCode).toBe(201);
    const { character } = res.json();
    expect(character).toMatchObject({ name: 'Aria Vell', position: { q: 0, r: 0 } });

    const list = await t.app.inject({ url: '/api/characters', headers: { cookie } });
    expect(list.json()).toMatchObject({ limit: 3, characters: [{ id: character.id }] });
  });

  it('records a world event for creation', async () => {
    const { cookie } = await registerUser(t.app);
    const { character } = (await createCharacter(t.app, cookie, 'Chronicle')).json();
    const rows = await t.dbHandle.sql`select type, actor_character_id from world_events`;
    expect(rows).toEqual([{ type: 'character.created', actor_character_id: character.id }]);
  });

  it('enforces case-insensitive unique names across the world', async () => {
    const a = await registerUser(t.app);
    const b = await registerUser(t.app);
    expect((await createCharacter(t.app, a.cookie, 'Thorn')).statusCode).toBe(201);
    const dup = await createCharacter(t.app, b.cookie, 'THORN');
    expect(dup.statusCode).toBe(409);
    expect(dup.json().error.code).toBe('CHARACTER_NAME_TAKEN');
  });

  it('rejects invalid names and appearances', async () => {
    const { cookie } = await registerUser(t.app);
    const badName = await createCharacter(t.app, cookie, 'R2D2');
    expect(badName.statusCode).toBe(400);
    const badLook = await t.app.inject({
      method: 'POST',
      url: '/api/characters',
      headers: { cookie },
      payload: {
        name: 'Valid',
        appearance: { version: 1, color: 'pink', emblem: 'star' },
        attributes: VALID_ATTRIBUTES,
        startingWeapon: 'training_sword',
        origin: 'valdmark',
      },
    });
    expect(badLook.statusCode).toBe(400);
  });

  it('enforces the per-account limit, even under concurrency', async () => {
    const { cookie } = await registerUser(t.app);
    const results = await Promise.all(
      ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo'].map((n) => createCharacter(t.app, cookie, n)),
    );
    const codes = results.map((r) => r.statusCode).sort();
    expect(codes).toEqual([201, 201, 201, 409, 409]);
    expect(results.find((r) => r.statusCode === 409)!.json().error.code).toBe(
      'CHARACTER_LIMIT_REACHED',
    );
  });

  it('only lets owners delete, and frees the name', async () => {
    const owner = await registerUser(t.app);
    const other = await registerUser(t.app);
    const { character } = (await createCharacter(t.app, owner.cookie, 'Ephemeral')).json();

    const forbidden = await t.app.inject({
      method: 'DELETE',
      url: `/api/characters/${character.id}`,
      headers: { cookie: other.cookie },
    });
    expect(forbidden.statusCode).toBe(404);

    const del = await t.app.inject({
      method: 'DELETE',
      url: `/api/characters/${character.id}`,
      headers: { cookie: owner.cookie },
    });
    expect(del.statusCode).toBe(204);
    const list = await t.app.inject({ url: '/api/characters', headers: { cookie: owner.cookie } });
    expect(list.json().characters).toEqual([]);
    expect((await createCharacter(t.app, other.cookie, 'Ephemeral')).statusCode).toBe(201);
  });
});

describe('world', () => {
  it('exposes the shared world', async () => {
    const { cookie } = await registerUser(t.app);
    const res = await t.app.inject({ url: '/api/world', headers: { cookie } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ slug: 'main', tick: expect.any(Number) });
  });
});
