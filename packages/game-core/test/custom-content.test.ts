import {
  customAbilityInputSchema,
  customItemInputSchema,
  type CustomAbilityInput,
  type CustomItemInput,
} from '@realms/shared';
import { afterEach, describe, expect, it } from 'vitest';
import {
  availableAbilities,
  computeStats,
  createEncounter,
  customIdFor,
  getAbility,
  getItemDef,
  planAction,
  setCustomContent,
  validateCustomAbility,
  validateCustomItem,
} from '../src/index.js';

const item = (over: Partial<CustomItemInput> = {}) =>
  customItemInputSchema.parse({
    name: 'Test Blade',
    kind: 'weapon',
    slots: ['mainHand'],
    weaponType: 'sword',
    abilities: [],
    ...over,
  });
const ability = (over: Partial<CustomAbilityInput> = {}) =>
  customAbilityInputSchema.parse({
    name: 'Test Nova',
    focusCost: 1,
    manaCost: 0,
    targeting: { side: 'enemy', reach: 'any', area: 'all' },
    effects: [{ kind: 'damage', damageType: 'magic', min: 50, max: 50 }],
    ...over,
  });

afterEach(() => setCustomContent({ items: [], abilities: [] }));

describe('custom content (admin tools, request #41)', () => {
  it('ids are prefixed and slugged', () => {
    expect(customIdFor('Blade of Óz!', 'a1b2c3')).toBe('custom_blade_of_z_a1b2c3');
  });

  it('a custom weapon always starts with its type basic attack', () => {
    const res = validateCustomItem(item({ abilities: ['cleave', 'slash'] }));
    expect(res.ok && res.value.abilities).toEqual(['slash', 'cleave']);
  });

  it('rejects items that break the equipment rules', () => {
    expect(validateCustomItem(item({ weaponType: 'bow', slots: ['mainHand', 'offHand'] })).ok).toBe(
      false,
    );
    expect(validateCustomItem(item({ kind: 'armor', slots: ['mainHand'] })).ok).toBe(false);
    expect(validateCustomItem(item({ weaponType: undefined })).ok).toBe(false);
    expect(validateCustomItem(item({ abilities: ['nope'] })).ok).toBe(false);
    expect(validateCustomItem(item({ abilities: ['block'] })).ok).toBe(false);
    expect(
      validateCustomItem(
        item({ kind: 'offhand', slots: ['offHand'], weaponType: 'shield', abilities: [] }),
      ).ok,
    ).toBe(true);
  });

  it('rejects inverted ranges and self abilities with an area', () => {
    expect(
      validateCustomAbility(
        ability({ effects: [{ kind: 'heal', min: 5, max: 2 }] as CustomAbilityInput['effects'] }),
      ).ok,
    ).toBe(false);
    expect(
      validateCustomAbility(ability({ targeting: { side: 'self', reach: 'any', area: 'all' } })).ok,
    ).toBe(false);
  });

  it('registered content is found by getItemDef/getAbility, built-ins always win', () => {
    setCustomContent({
      items: [{ ...item({ abilities: ['slash', 'custom_nova_1'] }), id: 'custom_blade_1' }],
      abilities: [
        { ...ability(), id: 'custom_nova_1' },
        { ...ability(), id: 'slash' },
      ],
    });
    expect(getItemDef('custom_blade_1')?.name).toBe('Test Blade');
    expect(getAbility('custom_nova_1')?.name).toBe('Test Nova');
    expect(getAbility('slash')?.name).toBe('Slash');
    expect(getItemDef('toString')).toBeUndefined();
  });

  it('custom weapons grant custom abilities that work in combat', () => {
    setCustomContent({
      items: [{ ...item({ abilities: ['slash', 'custom_nova_1'] }), id: 'custom_blade_1' }],
      abilities: [{ ...ability(), id: 'custom_nova_1' }],
    });
    const owned = [{ id: 'i1', defId: 'custom_blade_1', quality: 100, equippedSlot: 'mainHand' }];
    const abilityIds = availableAbilities(owned as never).map((a) => a.ability.id);
    expect(abilityIds).toContain('custom_nova_1');

    const attributes = { might: 5, agility: 5, precision: 5, endurance: 5, intellect: 5, will: 5 };
    const { stats } = computeStats(attributes);
    let s = createEncounter({
      party: [
        {
          characterId: 'a',
          name: 'a',
          appearance: { version: 1, color: '#c0392b', emblem: 'circle' },
          attributes,
          stats,
          abilityIds,
          hp: stats.maxHp,
          mana: stats.maxMana,
          slot: 0,
        },
      ],
      room: { name: 'Test', enemies: [{ enemy: 'rift_husk', slot: 0 }] },
      roomIndex: 0,
      isLastRoom: false,
      seed: 7,
    });
    for (const c of s.combatants) c.stats = { ...c.stats, dodgeChance: 0 };
    const planned = planAction(s, 'p:a', { type: 'plan', abilityId: 'custom_nova_1' });
    expect(planned.ok).toBe(true);
    if (!planned.ok) return;
    // PvE (D59): a player's action resolves at once.
    s = planned.state;
    expect(s.log.some((l) => l.t === 'ability' && l.abilityId === 'custom_nova_1')).toBe(true);
  });
});
