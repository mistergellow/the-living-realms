import { AP_RULES, REGIONS } from '@realms/game-core';
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

  it('creates a character in the capital of its nation and lists it (request #43)', async () => {
    const { cookie } = await registerUser(t.app);
    const res = await createCharacter(t.app, cookie, '  Aria   Vell ', { nation: 'east' });
    expect(res.statusCode).toBe(201);
    const { character } = res.json();
    expect(character).toMatchObject({
      name: 'Aria Vell',
      nation: 'east',
      position: REGIONS.east.capital!.hex,
      ap: { current: AP_RULES.max, max: AP_RULES.max, perHour: AP_RULES.perHour, fullAt: null },
    });

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

  it('starter kits: the Fireball kit has a wand and the spell prepared (request #43)', async () => {
    const { cookie } = await registerUser(t.app);
    const res = await t.app.inject({
      method: 'POST',
      url: '/api/characters',
      headers: { cookie },
      payload: {
        name: 'Pyra',
        appearance: { version: 1, color: '#2e86c1', emblem: 'star' },
        nation: 'north',
        starterKit: 'fireball',
      },
    });
    expect(res.statusCode).toBe(201);
    const id = res.json().character.id as string;
    const sheet = (
      await t.app.inject({ url: `/api/characters/${id}`, headers: { cookie } })
    ).json();
    expect(sheet.equipment.mainHand.defId).toBe('birch_wand');
    expect(sheet.loadout[0]).toBe('fireball');
    expect(sheet.abilities.map((a: { id: string }) => a.id)).toContain('fireball');
    // No attributes sent: every creation point is left to spend on the sheet.
    expect(sheet.attributePoints).toBe(12);
    const noNation = await t.app.inject({
      method: 'POST',
      url: '/api/characters',
      headers: { cookie },
      payload: {
        name: 'Nobody',
        appearance: { version: 1, color: '#2e86c1', emblem: 'star' },
        starterKit: 'bow',
      },
    });
    expect(noNation.statusCode).toBe(400);
  });

  it('travels: AP per hex, not into the sea, not beyond your AP (request #43)', async () => {
    const { cookie } = await registerUser(t.app);
    const { character } = (await createCharacter(t.app, cookie, 'Walker')).json();
    const from = character.position as { q: number; r: number };
    const to = { q: from.q + 3, r: from.r };
    const move = (dest: { q: number; r: number }) =>
      t.app.inject({
        method: 'POST',
        url: `/api/characters/${character.id}/move`,
        headers: { cookie },
        payload: { to: dest },
      });
    const res = await move(to);
    expect(res.statusCode).toBe(200);
    expect(res.json().character.position).toEqual(to);
    expect(res.json().character.ap.current).toBe(AP_RULES.max - 3 * AP_RULES.moveCostPerHex);
    expect((await move({ q: 200, r: 0 })).statusCode).toBe(400);
    // Far beyond what is left.
    await t.dbHandle
      .sql`update characters set ap = 10, ap_updated_at = now() where id = ${character.id}`;
    const far = { q: 12, r: 2 }; // the East capital
    expect((await move(far)).json().error.message).toMatch(/costs \d+ AP/);
    // AP regenerate with time.
    await t.dbHandle
      .sql`update characters set ap = 0, ap_updated_at = now() - interval '2 hours' where id = ${character.id}`;
    const list = (await t.app.inject({ url: '/api/characters', headers: { cookie } })).json();
    expect(list.characters[0].ap.current).toBe(2 * AP_RULES.perHour);
  });
});
