import type { AdminCharacterDto, CustomContentDto } from '@realms/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  createCharacter,
  createTestApp,
  registerUser,
  resetState,
  type TestApp,
} from './helpers.js';

const ADMIN = 'owner@example.com';

let t: TestApp;
beforeAll(async () => (t = await createTestApp({ ADMIN_EMAILS: ` ${ADMIN.toUpperCase()} ` })));
beforeEach(() => resetState(t));
afterAll(() => t.close());

const req = (
  cookie: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  payload?: Record<string, unknown>,
) => t.app.inject({ method, url, headers: { cookie }, ...(payload ? { payload } : {}) });

async function setup() {
  const admin = await registerUser(t.app, ADMIN);
  const player = await registerUser(t.app);
  const res = await createCharacter(t.app, player.cookie, 'Tester');
  expect(res.statusCode).toBe(201);
  return { admin, player, characterId: res.json().character.id as string };
}

const blade = {
  name: 'Admin Blade',
  description: 'For testing.',
  kind: 'weapon',
  slots: ['mainHand'],
  weaponType: 'sword',
  abilities: ['cleave'],
  bonuses: { might: 3 },
};
const nova = {
  name: 'Test Nova',
  source: 'skill',
  focusCost: 1,
  manaCost: 0,
  targeting: { side: 'enemy', reach: 'any', area: 'all' },
  effects: [{ kind: 'damage', damageType: 'magic', min: 9, max: 12 }],
  scaling: { intellect: 1 },
};

describe('admin tools (request #32)', () => {
  it('only accounts in ADMIN_EMAILS are admins', async () => {
    const { admin, player } = await setup();
    const me = await req(admin.cookie, 'GET', '/api/auth/me');
    expect(me.json().account.isAdmin).toBe(true);
    expect((await req(player.cookie, 'GET', '/api/auth/me')).json().account.isAdmin).toBe(false);

    expect((await req(player.cookie, 'GET', '/api/admin/characters')).statusCode).toBe(403);
    expect((await t.app.inject({ url: '/api/admin/characters' })).statusCode).toBe(401);
    expect((await req(player.cookie, 'POST', '/api/admin/content/items', blade)).statusCode).toBe(
      403,
    );
    const list = await req(admin.cookie, 'GET', '/api/admin/characters');
    expect(list.statusCode).toBe(200);
    expect(list.json().characters).toEqual([
      expect.objectContaining({ name: 'Tester', inRift: false }),
    ]);
  });

  it('creates a custom weapon and ability; every player can load them', async () => {
    const { admin, player, characterId } = await setup();
    const a = await req(admin.cookie, 'POST', '/api/admin/content/abilities', nova);
    expect(a.statusCode).toBe(201);
    const abilityId = a.json().id as string;
    expect(abilityId).toMatch(/^custom_test_nova_/);

    const w = await req(admin.cookie, 'POST', '/api/admin/content/items', {
      ...blade,
      abilities: ['cleave', abilityId],
    });
    expect(w.statusCode).toBe(201);
    const itemId = w.json().id as string;
    // The sword's basic attack is always first.
    expect(w.json().abilities).toEqual(['slash', 'cleave', abilityId]);

    const content = (
      await req(player.cookie, 'GET', '/api/content/custom')
    ).json() as CustomContentDto;
    expect(content.items.map((i) => i.id)).toEqual([itemId]);
    expect(content.abilities.map((i) => i.id)).toEqual([abilityId]);

    // Grant it and equip it as the player: the new ability shows on the sheet.
    const granted = await req(admin.cookie, 'POST', `/api/admin/characters/${characterId}/items`, {
      defId: itemId,
      upgradeLevel: 3,
    });
    expect(granted.statusCode).toBe(200);
    const dto = granted.json() as AdminCharacterDto;
    const owned = dto.sheet.inventory.find((i) => i.defId === itemId)!;
    expect(owned.name).toBe('Admin Blade +3');
    expect(owned.weapon?.upgradeLevel).toBe(3);

    const eq = await req(player.cookie, 'POST', `/api/characters/${characterId}/equip`, {
      itemId: owned.id,
      slot: 'mainHand',
    });
    expect(eq.statusCode).toBe(200);
    const sheet = eq.json();
    expect(sheet.abilities.map((x: { id: string }) => x.id)).toContain(abilityId);
    expect(sheet.attributes.might).toBe(sheet.baseAttributes.might + 3);
  });

  it('rejects content that breaks the rules', async () => {
    const { admin } = await setup();
    const bad = await req(admin.cookie, 'POST', '/api/admin/content/items', {
      ...blade,
      weaponType: 'bow',
      slots: ['offHand'],
    });
    expect(bad.statusCode).toBe(400);
    const unknown = await req(admin.cookie, 'POST', '/api/admin/content/items', {
      ...blade,
      abilities: ['does_not_exist'],
    });
    expect(unknown.statusCode).toBe(400);
  });

  it('updates a custom item; copies in slots it no longer allows are unequipped', async () => {
    const { admin, player, characterId } = await setup();
    const dagger = await req(admin.cookie, 'POST', '/api/admin/content/items', {
      ...blade,
      weaponType: 'dagger',
      slots: ['mainHand', 'offHand'],
      abilities: [],
    });
    const id = dagger.json().id as string;
    const granted = (
      await req(admin.cookie, 'POST', `/api/admin/characters/${characterId}/items`, { defId: id })
    ).json() as AdminCharacterDto;
    const copy = granted.sheet.inventory.find((i) => i.defId === id)!;
    await req(player.cookie, 'POST', `/api/characters/${characterId}/equip`, {
      itemId: copy.id,
      slot: 'offHand',
    });

    const upd = await req(admin.cookie, 'PUT', `/api/admin/content/items/${id}`, {
      ...blade,
      name: 'Renamed',
      weaponType: 'dagger',
      slots: ['mainHand'],
      abilities: [],
    });
    expect(upd.statusCode).toBe(200);
    const after = (
      await req(admin.cookie, 'GET', `/api/admin/characters/${characterId}`)
    ).json() as AdminCharacterDto;
    const moved = after.sheet.inventory.find((i) => i.id === copy.id)!;
    expect(moved.name).toBe('Renamed');
    expect(moved.equippedSlot).toBeNull();
    expect(
      (await req(admin.cookie, 'PUT', '/api/admin/content/items/custom_nope', blade)).statusCode,
    ).toBe(404);
  });

  it('teaches, forgets, changes items and overwrites attributes, with an audit trail', async () => {
    const { admin, characterId } = await setup();
    const base = `/api/admin/characters/${characterId}`;

    const taught = await req(admin.cookie, 'POST', `${base}/skills`, { abilityId: 'firebolt' });
    expect(taught.statusCode).toBe(200);
    expect(taught.json().learnedSkillIds).toEqual(['firebolt']);
    expect(taught.json().sheet.abilities.map((a: { id: string }) => a.id)).toContain('firebolt');
    expect(
      (await req(admin.cookie, 'POST', `${base}/skills`, { abilityId: 'block' })).statusCode,
    ).toBe(400);
    const forgot = await req(admin.cookie, 'DELETE', `${base}/skills/firebolt`);
    expect(forgot.json().learnedSkillIds).toEqual([]);

    const sword = ((await req(admin.cookie, 'GET', base)).json() as AdminCharacterDto).sheet
      .equipment.mainHand!;
    const broken = await req(admin.cookie, 'PATCH', `${base}/items/${sword.id}`, { quality: 0 });
    expect(
      broken.json().sheet.inventory.find((i: { id: string }) => i.id === sword.id).broken,
    ).toBe(true);
    const removed = await req(admin.cookie, 'DELETE', `${base}/items/${sword.id}`);
    expect(removed.json().sheet.inventory.some((i: { id: string }) => i.id === sword.id)).toBe(
      false,
    );

    const upd = await req(admin.cookie, 'PATCH', base, {
      attributes: { might: 30, agility: 5, precision: 5, endurance: 5, intellect: 5, will: 5 },
      attributePoints: 7,
      reputation: 1234,
    });
    expect(upd.statusCode).toBe(200);
    expect(upd.json().sheet.baseAttributes.might).toBe(30);
    expect(upd.json().sheet.attributePoints).toBe(7);
    expect(upd.json().sheet.reputation).toBe(1234);

    const events = await t.dbHandle
      .sql`select type from world_events where type like 'admin.%' order by created_at`;
    expect(events.map((e) => e.type)).toEqual([
      'admin.skill_taught',
      'admin.skill_forgotten',
      'admin.item_updated',
      'admin.item_removed',
      'admin.character_updated',
    ]);
  });
});
