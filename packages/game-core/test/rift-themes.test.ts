import type { DerivedStatsDto } from '@realms/shared';
import { describe, expect, it } from 'vitest';
import {
  CHAMPION_AFFIXES,
  championRulesForTier,
  computeStats,
  createEncounter,
  ENEMIES,
  getAbility,
  getEnemy,
  getRift,
  planAction,
  RIFT_THEMES,
  riftLayout,
  setReady,
  themeFor,
  themesForTier,
  validTargets,
  type CombatState,
  type EngineResult,
  type PartyMemberInput,
} from '../src/index.js';

/* Request #71: Rift themes, Champions, Taunt and boss phases. */

const appearance = { version: 1, color: '#c0392b', emblem: 'circle' } as const;
const attrs = { might: 9, agility: 6, precision: 5, endurance: 9, intellect: 5, will: 5 };
const stats: DerivedStatsDto = computeStats(attrs).stats;
const hero = (id: string, slot = 0): PartyMemberInput => ({
  characterId: id,
  name: id,
  appearance,
  attributes: attrs,
  stats,
  abilityIds: ['slash', 'cleave', 'block', 'swap_position'],
  hp: stats.maxHp,
  mana: stats.maxMana,
  slot,
});
const ok = (r: EngineResult) => {
  if (!r.ok) throw new Error(r.reason);
  return r.state;
};

describe('Rift themes', () => {
  it('every theme has fights, Elite rooms with a mini-boss and a boss with phases', () => {
    for (const theme of Object.values(RIFT_THEMES)) {
      expect(theme.combat.length).toBeGreaterThanOrEqual(4);
      expect(theme.elite.some((r) => r.enemies.some((e) => getEnemy(e.enemy)?.isMiniBoss))).toBe(
        true,
      );
      const boss = getEnemy(theme.boss.enemies[0]!.enemy)!;
      expect(boss.isBoss).toBe(true);
      expect(boss.phases?.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('every enemy and every ability it uses exists', () => {
    for (const e of Object.values(ENEMIES)) {
      for (const a of e.abilities) expect(getAbility(a), `${e.id}: ${a}`).toBeDefined();
      for (const p of e.phases ?? []) {
        for (const a of p.abilities ?? []) expect(getAbility(a), `${e.id}: ${a}`).toBeDefined();
        for (const s of p.summon ?? []) expect(getEnemy(s), `${e.id}: ${s}`).toBeDefined();
      }
    }
  });

  it('harder themes only open at higher tiers; every Rift on the map has a theme', () => {
    expect(themesForTier(1).map((t) => t.id)).toEqual(['hollow', 'crystal']);
    expect(themesForTier(5)).toHaveLength(5);
    const seen = new Set<string>();
    for (const { id, tier } of riftLayout(100).values()) {
      const r = getRift(id)!;
      expect(r.theme).toBeDefined();
      expect(getRift(id)!.theme!.id).toBe(r.theme!.id); // stable
      expect(RIFT_THEMES[r.theme!.id as keyof typeof RIFT_THEMES].minTier).toBeLessThanOrEqual(
        tier,
      );
      seen.add(r.theme!.id);
    }
    expect(seen.size).toBeGreaterThanOrEqual(3);
    expect(themeFor(3, 4, 1).id).toBe(themeFor(3, 4, 1).id);
  });
});

describe('Champions', () => {
  it('turn up more often, with more affixes, at higher tiers', () => {
    expect(championRulesForTier(1).chance).toBeLessThan(championRulesForTier(5).chance);
    expect(championRulesForTier(5).affixes).toBeGreaterThan(championRulesForTier(1).affixes);
  });

  it('get named, visible affixes and their effects', () => {
    const s = createEncounter({
      party: [hero('a')],
      room: { name: 'T', enemies: [{ enemy: 'rift_husk', slot: 0 }] },
      roomIndex: 0,
      isLastRoom: false,
      seed: 7,
      enemyModifiers: { champions: { chance: 100, affixes: 2, elite: true } },
    });
    const husk = s.combatants.find((c) => c.kind === 'enemy')!;
    expect(husk.affixes).toHaveLength(2);
    const first = CHAMPION_AFFIXES[husk.affixes![0] as keyof typeof CHAMPION_AFFIXES];
    expect(husk.name).toBe(`${first.name} Rift Husk`);
  });

  it('never makes a boss or mini-boss a Champion', () => {
    const s = createEncounter({
      party: [hero('a')],
      room: { name: 'T', enemies: [{ enemy: 'husk_abomination', slot: 0, elite: true }] },
      roomIndex: 0,
      isLastRoom: false,
      seed: 7,
      enemyModifiers: { champions: { chance: 100, affixes: 2, elite: true } },
    });
    expect(s.combatants.find((c) => c.kind === 'enemy')!.affixes ?? []).toEqual([]);
  });
});

describe('Taunt', () => {
  it('forces single and column attacks onto the taunting enemy', () => {
    const s = createEncounter({
      party: [hero('a')],
      room: {
        name: 'T',
        enemies: [
          { enemy: 'rift_husk', slot: 0 },
          { enemy: 'shard_spitter', slot: 2 },
        ],
      },
      roomIndex: 0,
      isLastRoom: false,
      seed: 3,
    });
    const me = s.combatants.find((c) => c.kind === 'player')!;
    const spitter = s.combatants.find((c) => c.enemyDefId === 'shard_spitter')!;
    const anyTarget = {
      ...getAbility('slash')!,
      targeting: { side: 'enemy', reach: 'any', area: 'single' },
    } as const;
    expect(validTargets(s, me, anyTarget as never)).toHaveLength(2);
    spitter.statuses.push({ id: 'taunt', value: 0, turns: 2 });
    expect(validTargets(s, me, anyTarget as never).map((u) => u.id)).toEqual([spitter.id]);
  });
});

describe('Boss phases', () => {
  it('trigger once when health falls below the mark: new abilities, statuses, summons', () => {
    let s: CombatState = createEncounter({
      party: [hero('a')],
      room: { name: 'T', enemies: [{ enemy: 'rift_warden', slot: 0 }], isBoss: true },
      roomIndex: 0,
      isLastRoom: true,
      seed: 5,
    });
    const warden = s.combatants.find((c) => c.enemyDefId === 'rift_warden')!;
    // Down to 25%: both phases (60% and 30%) trigger in order.
    warden.hp = Math.round(warden.maxHp * 0.25) + 5;
    for (const c of s.combatants) if (c.side === 'enemies') c.intents = [];
    s = ok(planAction(s, 'p:a', { type: 'plan', abilityId: 'slash', targetColumn: 'front' }));
    s = ok(setReady(s, 'p:a'));
    const w = s.combatants.find((c) => c.enemyDefId === 'rift_warden')!;
    const phases = s.log.filter((l) => l.t === 'phase');
    expect(phases).toHaveLength(2);
    expect(w.phase).toBe(2);
    expect(w.abilityIds).toContain('warden_quake');
    expect(w.statuses.some((x) => x.id === 'strength')).toBe(true);
    expect(s.combatants.some((c) => c.enemyDefId === 'rift_husk')).toBe(true);
  });
});
