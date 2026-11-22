import type { DerivedStatsDto, PlanActionInput } from '@realms/shared';
import { describe, expect, it } from 'vitest';
import {
  AFFIX_RULES,
  AFFIXES,
  affixValueRange,
  describeAffix,
  DUAL_WIELD_RULES,
  GEAR_SLOTS,
  ITEMS,
  poolFor,
  rollItemAffixes,
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
  type EnemyId,
  type OwnedItem,
  type PartyMemberInput,
} from '../src/index.js';

const base = { might: 5, agility: 5, precision: 5, endurance: 5, intellect: 5, will: 5 };

describe('bonus effects (request #37)', () => {
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

  it('rolls different effects from the pool of the slot, deterministically (request #64)', () => {
    const a = rollAffixes(new Rng(7), 'weapon', 5, 3, { weaponType: 'sword' });
    expect(a).toEqual(rollAffixes(new Rng(7), 'weapon', 5, 3, { weaponType: 'sword' }));
    expect(new Set(a.map((x) => x.id)).size).toBe(5);
    for (const x of a) {
      const def = AFFIXES[x.id]!;
      expect(def.slots).toContain('weapon');
      expect(x.value).toBeGreaterThanOrEqual(def.min);
      expect(x.value).toBeLessThanOrEqual(def.max);
    }
    for (const slot of GEAR_SLOTS)
      for (let s = 0; s < 30; s++)
        for (const x of rollAffixes(new Rng(s), slot, 5))
          expect(AFFIXES[x.id]!.slots).toContain(slot);
    const counts = new Set(Array.from({ length: 2000 }, (_, i) => rollAffixCount(new Rng(i))));
    expect([...counts].every((c) => c >= 0 && c <= 5)).toBe(true);
  });

  it('every slot has its own pool; family defences and economy bonuses are gone (D122)', () => {
    for (const slot of GEAR_SLOTS) expect(poolFor(slot).length).toBeGreaterThanOrEqual(10);
    expect(poolFor('offhand').map((a) => a.id)).toContain('block_chance');
    expect(poolFor('ring').map((a) => a.id)).not.toContain('block_chance');
    for (const id of ['def_blades', 'gold_find', 'item_find', 'travel_ap', 'ranged_defence'])
      expect(AFFIXES[id]).toBeUndefined();
    // Weapons only roll their own primary / secondary attribute.
    const sword = poolFor('weapon', { weaponType: 'sword' }).filter(
      (a) => a.effect.kind === 'attribute',
    );
    expect(sword.length).toBeGreaterThan(0);
    expect(sword.length).toBeLessThanOrEqual(2);
  });

  it('values come from the Rift tier: harder Rifts give better bonuses', () => {
    const def = AFFIXES.crit_chance!;
    expect(affixValueRange(def, 1)).toEqual({ min: 1, max: 1 });
    expect(affixValueRange(def, 5)).toEqual({ min: 6, max: 8 });
    const avg = (tier: number) => {
      let sum = 0;
      let n = 0;
      for (let s = 0; s < 400; s++)
        for (const x of rollAffixes(new Rng(s), 'face', 5, tier)) {
          sum += x.value! / AFFIXES[x.id]!.tiers[4];
          n++;
        }
      return sum / n;
    };
    expect(avg(5)).toBeGreaterThan(avg(1));
    // Focus only rolls at T4 or better.
    for (let s = 0; s < 200; s++)
      for (const x of rollAffixes(new Rng(s), 'pendant', 5, 1))
        if (x.id === 'focus') expect(x.value).toBe(1);
  });

  it('two-handed weapons roll attack bonuses ×1.5', () => {
    const great = getItemDef(
      Object.keys(ITEMS).find(
        (id) => getItemDef(id)?.twoHanded && getItemDef(id)?.kind === 'weapon',
      )!,
    )!;
    let seen = false;
    for (let s = 0; s < 200; s++) {
      const one = rollAffixes(new Rng(s), 'weapon', 5, 5, { weaponType: great.weaponType });
      const two = rollItemAffixes(new Rng(s), great, 5, 5);
      one.forEach((x, i) => {
        expect(two[i]!.id).toBe(x.id);
        if (AFFIXES[x.id]!.category === 'attack') {
          expect(two[i]!.value).toBe(Math.round(x.value! * AFFIX_RULES.twoHandedMultiplier));
          seen = true;
        } else expect(two[i]!.value).toBe(x.value);
      });
    }
    expect(seen).toBe(true);
  });

  it('describes bonuses for the item card', () => {
    expect(describeAffix({ id: 'crit_chance', value: 3 })!.display).toBe('+3%');
    expect(describeAffix({ id: 'stun_on_hit', value: 3 })!.display).toBe('3%');
    expect(describeAffix({ id: 'added_damage', value: 6 })!.display).toBe('3–6');
    expect(describeAffix({ id: 'health', value: 8 })!.display).toBe('+8');
    expect(describeAffix({ id: 'vs_beast', value: 4 })!.label).toBe('Strong against Beasts');
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

describe('requirements (request #37): BASE attributes', () => {
  it('weapons need their primary attribute; upgrades never change it (request #38)', () => {
    const sword = getItemDef('training_sword')!;
    expect(itemRequirements(sword)).toEqual({ might: 5 });
    expect(itemRequirements({ ...sword, requirements: { might: 8, will: 6 } })).toEqual({
      might: 8,
      will: 6,
    });
    expect(checkRequirements({ might: 7 }, base)).toEqual([
      { attribute: 'might', value: 7, met: false },
    ]);
  });

  it('blocks equipping when the base attributes are too low, whatever the upgrade level', () => {
    const items: OwnedItem[] = [
      { id: 's', defId: 'training_sword', quality: 100, equippedSlot: null, upgradeLevel: 10 },
    ];
    expect(planEquip(items, 's', 'mainHand', base).ok).toBe(true);
    expect(planEquip(items, 's', 'mainHand', { ...base, might: 4 })).toMatchObject({
      ok: false,
    });
  });
});

describe('gear effects in combat (request #37)', () => {
  const appearance = { version: 1, color: '#c0392b', emblem: 'circle' } as const;
  const stats = computeStats(base).stats;
  const member = (gear = noGearEffects(), over: Partial<DerivedStatsDto> = {}) =>
    ({
      characterId: 'a',
      name: 'a',
      appearance,
      attributes: base,
      stats: { ...stats, ...over, critChance: 0 },
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
    for (const c of s.combatants) c.stats = { ...c.stats, critChance: 0 };
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

  // ---- request #64 ----
  const startVs = (m: PartyMemberInput, enemy: EnemyId = 'rift_warden', seed = 1): CombatState => {
    const s = createEncounter({
      party: [m],
      room: { name: 'T', enemies: [{ enemy, slot: 0 }] },
      roomIndex: 0,
      isLastRoom: false,
      seed,
    });
    for (const c of s.combatants) c.stats = { ...c.stats, critChance: 0 };
    return s;
  };
  const foe = (s: CombatState) => s.combatants.find((c) => c.side === 'enemies')!;
  const dealt = (gear: ReturnType<typeof noGearEffects>, enemy: EnemyId = 'rift_warden') => {
    const s0 = startVs(member(gear), enemy);
    const before = foe(s0).hp;
    return before - foe(stab(s0)).hp;
  };

  it('every enemy has a family (D121)', () => {
    const s = startVs(member());
    expect(foe(s).family).toBe('construct');
    expect(
      startVs(member(), 'hollow_hound').combatants.find((c) => c.side === 'enemies')!.family,
    ).toBe('beast');
  });

  it('"strong against" a family, piercing and weapon damage raise the damage', () => {
    const plain = dealt(noGearEffects());
    expect(dealt({ ...noGearEffects(), vsFamily: { construct: 100 } })).toBeGreaterThan(plain);
    expect(dealt({ ...noGearEffects(), vsFamily: { beast: 100 } })).toBe(plain);
    expect(dealt({ ...noGearEffects(), pierceChance: 100 })).toBeGreaterThan(plain);
    expect(dealt({ ...noGearEffects(), basicDamagePct: 100 })).toBeGreaterThan(plain);
    expect(dealt({ ...noGearEffects(), skillDamagePct: 100 })).toBe(plain);
  });

  it('Culling Strike kills a weakened non-boss, never a boss', () => {
    const s = stab(startVs(member({ ...noGearEffects(), cullingPct: 100 }), 'hollow_hound'));
    expect(foe(s).downed).toBe(true);
    const b = stab(startVs(member({ ...noGearEffects(), cullingPct: 100 })));
    expect(foe(b).downed).toBe(false);
  });

  it('new on-hit statuses stick, and gear can resist them', () => {
    const s = stab(
      startVs(member({ ...noGearEffects(), onHit: [{ status: 'chill', chance: 100 }] })),
    );
    expect(foe(s).statuses.some((x) => x.id === 'chill')).toBe(true);
    const s0 = startVs(member({ ...noGearEffects(), onHit: [{ status: 'bleed', chance: 100 }] }));
    foe(s0).gear = { ...noGearEffects(), statusResist: { bleed: 100 } };
    expect(foe(stab(s0)).statuses.some((x) => x.id === 'bleed')).toBe(false);
  });

  it('a chance to block stops a melee hit completely', () => {
    const s0 = startVs(member());
    foe(s0).gear = { ...noGearEffects(), blockChance: 100 };
    const before = foe(s0).hp;
    expect(foe(stab(s0)).hp).toBe(before);
  });

  it('physical defence lowers physical damage taken', () => {
    const s0 = startVs(member());
    const plain = foe(s0).hp - foe(stab(s0)).hp;
    const s1 = startVs(member());
    foe(s1).gear = { ...noGearEffects(), physicalDefencePct: 50 };
    expect(foe(s1).hp - foe(stab(s1)).hp).toBeLessThan(plain);
  });

  it('a one-handed weapon in each hand gives more basic attack damage', () => {
    const daggers: OwnedItem[] = [
      { id: 'a', defId: 'rusty_dagger', quality: 100, equippedSlot: 'mainHand' },
      { id: 'b', defId: 'rusty_dagger', quality: 100, equippedSlot: 'offHand' },
    ];
    expect(computeStats(base, daggers).gear.basicDamagePct).toBe(DUAL_WIELD_RULES.basicDamagePct);
    expect(computeStats(base, daggers.slice(0, 1)).gear.basicDamagePct).toBeUndefined();
  });

  it('gear sums new bonuses: families, resistances, regen and Mana regen', () => {
    const t = gearTotals([
      { id: 'vs_void', value: 4 },
      { id: 'burn_resist', value: 6 },
      { id: 'hp_regen', value: 2 },
      { id: 'mana_regen', value: 1 },
      { id: 'skill_levels', value: 1 },
    ]);
    expect(t.combat.vsFamily).toEqual({ void: 4 });
    expect(t.combat.statusResist).toEqual({ burn: 6 });
    expect(t.combat.hpRegen).toBe(2);
    expect(t.combat.skillLevels).toBe(1);
    expect(t.stats.manaRegen).toBe(1);
  });
});
