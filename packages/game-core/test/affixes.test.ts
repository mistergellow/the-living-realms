import type { DerivedStatsDto, PlanActionInput } from '@realms/shared';
import { describe, expect, it } from 'vitest';
import {
  AFFIX_RULES,
  AFFIXES,
  checkRequirements,
  computeStats,
  createEncounter,
  getItemDef,
  gearTotals,
  itemRequirements,
  noGearEffects,
  normalizeAffixes,
  planAction,
  planEquip,
  rarityOf,
  rollAffixCount,
  rollAffixes,
  Rng,
  type CombatState,
  type OwnedItem,
  type PartyMemberInput,
} from '../src/index.js';

const base = { might: 5, agility: 5, precision: 5, endurance: 5, intellect: 5, will: 5 };

describe('bonus effects (request #36)', () => {
  it('rarity is the number of effects', () => {
    expect([0, 1, 2, 3, 4, 5].map(rarityOf)).toEqual([
      'common',
      'uncommon',
      'rare',
      'epic',
      'legendary',
      'mythic',
    ]);
    expect(rarityOf(9)).toBe('mythic');
  });

  it('normalises stored effects: known ids only, no duplicates, clamped, max 5', () => {
    const raw = [
      { id: 'might', value: 99 },
      { id: 'might', value: 1 },
      { id: 'nope', value: 3 },
      { id: 'health', value: 1 },
      { id: 'agility' },
      { id: 'damage', value: 5 },
      { id: 'lifesteal', value: 4 },
      { id: 'thorns', value: 3 },
    ];
    const n = normalizeAffixes(raw);
    expect(n).toHaveLength(AFFIX_RULES.maxAffixes);
    expect(n[0]).toEqual({ id: 'might', value: AFFIXES.might!.max });
    expect(n[1]).toEqual({ id: 'health', value: AFFIXES.health!.min });
    expect(n.map((a) => a.id)).not.toContain('thorns');
    expect(normalizeAffixes('junk')).toEqual([]);
  });

  it('rolls different effects allowed on that kind of gear, deterministically', () => {
    const a = rollAffixes(new Rng(7), 'weapon', 5);
    expect(a).toEqual(rollAffixes(new Rng(7), 'weapon', 5));
    expect(new Set(a.map((x) => x.id)).size).toBe(5);
    for (const x of a) {
      const def = AFFIXES[x.id]!;
      expect(def.kinds).toContain('weapon');
      expect(x.value).toBeGreaterThanOrEqual(def.min);
      expect(x.value).toBeLessThanOrEqual(def.max);
    }
    for (let s = 0; s < 50; s++)
      for (const x of rollAffixes(new Rng(s), 'armor', 3))
        expect(AFFIXES[x.id]!.kinds).toContain('armor');
    const counts = new Set(Array.from({ length: 2000 }, (_, i) => rollAffixCount(new Rng(i))));
    expect([...counts].every((c) => c >= 0 && c <= 5)).toBe(true);
  });

  it('equipped effects change attributes, stats and combat bonuses', () => {
    const items: OwnedItem[] = [
      {
        id: 's',
        defId: 'training_sword',
        quality: 100,
        equippedSlot: 'mainHand',
        affixes: [
          { id: 'might', value: 2 },
          { id: 'health', value: 10 },
          { id: 'crit_chance', value: 4 },
          { id: 'lifesteal', value: 5 },
          { id: 'bleed_on_hit', value: 10 },
        ],
      },
    ];
    const plain = computeStats(base, [{ ...items[0]!, affixes: [] }]);
    const withFx = computeStats(base, items);
    expect(withFx.attributes.might).toBe(plain.attributes.might + 2);
    expect(withFx.stats.maxHp).toBe(plain.stats.maxHp + 10);
    expect(withFx.stats.critChance).toBe(plain.stats.critChance + 4);
    expect(withFx.gear.lifestealPct).toBe(5);
    expect(withFx.gear.onHit).toEqual([{ status: 'bleed', chance: 10 }]);
    // Unequipped or broken items give nothing.
    expect(computeStats(base, [{ ...items[0]!, equippedSlot: null }]).gear).toEqual(
      noGearEffects(),
    );
    expect(gearTotals([]).combat).toEqual(noGearEffects());
  });
});

describe('requirements (request #36): BASE attributes', () => {
  it('weapons need their primary attribute; the starter kit is always usable', () => {
    const sword = getItemDef('training_sword')!;
    expect(itemRequirements(sword, 0)).toEqual({ might: 5 });
    expect(itemRequirements(sword, 4)).toEqual({ might: 7 });
    expect(checkRequirements({ might: 7 }, base)).toEqual([
      { attribute: 'might', value: 7, met: false },
    ]);
  });

  it('blocks equipping when the base attributes are too low', () => {
    const items: OwnedItem[] = [
      { id: 's', defId: 'training_sword', quality: 100, equippedSlot: null, upgradeLevel: 4 },
    ];
    expect(planEquip(items, 's', 'mainHand', base)).toMatchObject({ ok: false });
    expect(planEquip(items, 's', 'mainHand', { ...base, might: 7 }).ok).toBe(true);
  });
});

describe('gear effects in combat (request #36)', () => {
  const appearance = { version: 1, color: '#c0392b', emblem: 'circle' } as const;
  const stats = computeStats(base).stats;
  const member = (gear = noGearEffects(), over: Partial<DerivedStatsDto> = {}) =>
    ({
      characterId: 'a',
      name: 'a',
      appearance,
      attributes: base,
      stats: { ...stats, ...over, dodgeChance: 0, critChance: 0 },
      abilityIds: ['stab'],
      gear,
      hp: 20,
      mana: 0,
      slot: 0,
    }) satisfies PartyMemberInput;
  const start = (m: PartyMemberInput): CombatState => {
    const s = createEncounter({
      party: [m],
      room: { name: 'T', enemies: [{ enemy: 'rift_warden', slot: 0 }] },
      roomIndex: 0,
      isLastRoom: false,
      seed: 1,
    });
    for (const c of s.combatants) c.stats = { ...c.stats, dodgeChance: 0, critChance: 0 };
    return s;
  };
  const stab = (s: CombatState) => {
    const r = planAction(s, 'p:a', { type: 'plan', abilityId: 'stab' } as PlanActionInput);
    if (!r.ok) throw new Error(r.reason);
    return r.state;
  };

  it('life steal heals the attacker', () => {
    const s = stab(start(member({ ...noGearEffects(), lifestealPct: 100 })));
    const me = s.combatants.find((c) => c.id === 'p:a')!;
    expect(me.hp).toBeGreaterThan(20);
  });

  it('thorns hurt whoever hits the wearer', () => {
    const s0 = start(member());
    s0.combatants.find((c) => c.side === 'enemies')!.gear = { ...noGearEffects(), thorns: 4 };
    const s = stab(s0);
    expect(s.combatants.find((c) => c.id === 'p:a')!.hp).toBe(16);
  });

  it('on-hit statuses can stick to the target', () => {
    const s = stab(
      start(member({ ...noGearEffects(), onHit: [{ status: 'bleed', chance: 100 }] })),
    );
    const enemy = s.combatants.find((c) => c.side === 'enemies')!;
    expect(enemy.statuses.some((x) => x.id === 'bleed')).toBe(true);
  });
});
