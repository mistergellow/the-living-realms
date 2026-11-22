import type { PlanActionInput } from '@realms/shared';
import { describe, expect, it } from 'vitest';
import {
  AFFIXES,
  BASE_ATTRIBUTES,
  computeStats,
  createEncounter,
  getItemDef,
  NAMED_ITEMS,
  namedEffects,
  noGearEffects,
  planAction,
  rollAffixes,
  type CombatState,
  type PartyMemberInput,
  type OwnedItem,
} from '../src/index.js';
import { Rng } from '../src/combat/rng.js';

const worn = (defId: string, slot: OwnedItem['equippedSlot'], upgradeLevel = 0): OwnedItem => ({
  id: defId,
  defId,
  quality: 100,
  equippedSlot: slot,
  upgradeLevel,
  affixes: [],
});

describe('named items (request #62)', () => {
  it('every named item sits on an existing base and uses known effects', () => {
    expect(NAMED_ITEMS.filter((n) => n.base === 'training_sword')).toHaveLength(10);
    for (const nd of NAMED_ITEMS) {
      const def = getItemDef(nd.id)!;
      const base = getItemDef(nd.base)!;
      expect(def, nd.id).toBeDefined();
      expect(def.kind).toBe(base.kind);
      expect(def.slots).toEqual(base.slots);
      expect(def.named!.base).toBe(nd.base);
      for (const id of Object.keys(nd.fixed)) expect(AFFIXES[id], `${nd.id}: ${id}`).toBeDefined();
    }
  });

  it('base items have no fixed bonus; named ones do, growing with the upgrade level', () => {
    expect(namedEffects(getItemDef('training_sword'))).toEqual([]);
    const dawn = getItemDef('dawnblade');
    expect(namedEffects(dawn, 0)).toEqual([
      { id: 'damage', value: 6 },
      { id: 'crit_chance', value: 3 },
    ]);
    const at10 = namedEffects(dawn, 10);
    expect(at10[0]!.value).toBeGreaterThan(6);
  });

  it('Dragon Heavy Armor: more armor, −3 Agility, ignites melee attackers', () => {
    const plain = computeStats(BASE_ATTRIBUTES, [worn('plate_cuirass', 'body')]);
    const dragon = computeStats(BASE_ATTRIBUTES, [worn('dragon_heavy_armor', 'body')]);
    expect(dragon.stats.armor).toBe(plain.stats.armor + 5);
    expect(dragon.attributes.agility).toBe(plain.attributes.agility - 3);
    expect(dragon.gear.whenHit).toEqual([{ status: 'burn', chance: 25 }]);
  });

  it('armor comes in Light, Medium and Heavy', () => {
    expect(getItemDef('cloth_robe')!.armorClass).toBe('light');
    expect(getItemDef('padded_tunic')!.armorClass).toBe('medium');
    expect(getItemDef('plate_cuirass')!.armorClass).toBe('heavy');
    expect(getItemDef('plate_cuirass')!.armor!).toBeGreaterThan(getItemDef('cloth_robe')!.armor!);
  });

  it('named-only effects never roll on random drops', () => {
    for (let seed = 1; seed < 200; seed++)
      for (const a of rollAffixes(new Rng(seed), 'body', 5))
        expect(['ignite_attackers', 'bleed_attackers']).not.toContain(a.id);
  });

  it('a melee attacker who hits a wearer of "ignite attackers" catches fire', () => {
    const stats = computeStats(BASE_ATTRIBUTES).stats;
    const me: PartyMemberInput = {
      characterId: 'a',
      name: 'a',
      appearance: { version: 1, color: '#c0392b', emblem: 'circle' },
      attributes: BASE_ATTRIBUTES,
      stats: { ...stats, critChance: 0 },
      abilityIds: ['stab'],
      gear: noGearEffects(),
      hp: 40,
      mana: 0,
      slot: 0,
    };
    const s: CombatState = createEncounter({
      party: [me],
      room: { name: 'T', enemies: [{ enemy: 'rift_warden', slot: 0 }] },
      roomIndex: 0,
      isLastRoom: false,
      seed: 1,
    });
    s.combatants.find((c) => c.side === 'enemies')!.gear = {
      ...noGearEffects(),
      whenHit: [{ status: 'burn', chance: 100 }],
    };
    const r = planAction(s, 'p:a', { type: 'plan', abilityId: 'stab' } as PlanActionInput);
    if (!r.ok) throw new Error(r.reason);
    const attacker = r.state.combatants.find((c) => c.id === 'p:a')!;
    expect(attacker.statuses.some((x) => x.id === 'burn')).toBe(true);
  });
});
