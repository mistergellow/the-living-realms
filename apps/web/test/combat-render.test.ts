import type { CombatLogEntry } from '@realms/shared';
import { describe, expect, it } from 'vitest';
import { combatLayout, unitRect } from '../src/features/rifts/combat-layout';
import { abilityFxKind, applyStep, buildTimeline } from '../src/features/rifts/combat-timeline';

describe('combat layout', () => {
  const l = combatLayout(1050, 440);

  it('puts the party on the left, enemies mirrored on the right', () => {
    for (let slot = 0; slot < 6; slot++) {
      const p = l.place('party', slot);
      const e = l.place('enemies', slot);
      expect(p.x).toBeLessThan(l.width / 2);
      expect(e.x).toBeGreaterThan(l.width / 2);
      expect(p.x + e.x).toBeCloseTo(l.width);
      expect(p.y).toBeCloseTo(e.y);
    }
  });

  it('keeps the front row nearer the centre than the back row', () => {
    expect(l.place('party', 0).x).toBeGreaterThan(l.place('party', 3).x);
    expect(l.place('enemies', 0).x).toBeLessThan(l.place('enemies', 3).x);
  });

  it('draws nearer slots lower and larger', () => {
    const far = l.place('party', 0);
    const near = l.place('party', 2);
    expect(near.y).toBeGreaterThan(far.y);
    expect(near.scale).toBeGreaterThan(far.scale);
  });

  it('gives every unit an on-screen click box, larger for bosses', () => {
    for (const w of [380, 800, 1600]) {
      const lay = combatLayout(w, 420);
      for (let slot = 0; slot < 6; slot++) {
        const r = unitRect(lay, 'enemies', slot, false);
        expect(r.left).toBeGreaterThanOrEqual(0);
        expect(r.left + r.width).toBeLessThanOrEqual(w);
        expect(r.top).toBeGreaterThanOrEqual(0);
      }
    }
    expect(unitRect(l, 'enemies', 1, true).height).toBeGreaterThan(
      unitRect(l, 'enemies', 1, false).height,
    );
  });
});

describe('combat timeline', () => {
  it('maps abilities to how they look', () => {
    expect(abilityFxKind('slash')).toBe('melee');
    expect(abilityFxKind('aimed_shot')).toBe('ranged');
    expect(abilityFxKind('arcane_bolt')).toBe('magic');
  });

  it('makes one step per ability, with its results attached', () => {
    const log: CombatLogEntry[] = [
      { t: 'round', round: 2 },
      { t: 'turn', actorId: 'e:1' },
      { t: 'ability', actorId: 'e:1', abilityId: 'slash', targetIds: ['p:a'] },
      { t: 'damage', targetId: 'p:a', amount: 5, crit: false },
      { t: 'ability', actorId: 'e:2', abilityId: 'aimed_shot', targetIds: ['p:a'] },
      { t: 'dodge', targetId: 'p:a' },
      { t: 'ability', actorId: 'e:3', abilityId: 'slash', targetIds: ['p:a'] },
      { t: 'damage', targetId: 'p:a', amount: 9, crit: true },
      { t: 'downed', targetId: 'p:a' },
    ];
    const steps = buildTimeline(log);
    expect(steps.map((s) => s.actorId)).toEqual(['e:1', 'e:2', 'e:3']);
    expect(steps[1]!.kind).toBe('ranged');
    expect(steps[2]!.events).toEqual([
      { t: 'damage', targetId: 'p:a', amount: 9, crit: true },
      { t: 'downed', targetId: 'p:a' },
    ]);
  });

  it('records the last log seq of each step (so the text log can keep pace)', () => {
    const steps = buildTimeline([
      { t: 'ability', actorId: 'e:1', abilityId: 'slash', targetIds: ['p:a'], seq: 5 },
      { t: 'damage', targetId: 'p:a', amount: 2, crit: false, seq: 6 },
      { t: 'turn', actorId: 'e:2', seq: 7 },
      { t: 'ability', actorId: 'e:2', abilityId: 'slash', targetIds: ['p:a'], seq: 8 },
      { t: 'dodge', targetId: 'p:a', seq: 9 },
    ]);
    expect(steps.map((s) => s.seq)).toEqual([7, 9]);
  });

  it('keeps results that arrive without an ability (e.g. revives)', () => {
    const steps = buildTimeline([
      { t: 'room', outcome: 'cleared' },
      { t: 'revived', targetId: 'p:a', hp: 1 },
    ]);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.actorId).toBeNull();
  });

  it('merges a swap ability with its swap entry', () => {
    const steps = buildTimeline([
      { t: 'ability', actorId: 'p:a', abilityId: 'swap_position', targetIds: [] },
      { t: 'swap', actorId: 'p:a', fromSlot: 0, toSlot: 3, withId: null },
    ]);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.kind).toBe('swap');
  });

  it('replays HP step by step', () => {
    const start = { 'p:a': { hp: 10, maxHp: 12, downed: false } };
    const [hit, heal, fall] = buildTimeline([
      { t: 'ability', actorId: 'e:1', abilityId: 'slash', targetIds: ['p:a'] },
      { t: 'damage', targetId: 'p:a', amount: 6, crit: false },
      { t: 'ability', actorId: 'p:b', abilityId: 'mend', targetIds: ['p:a'] },
      { t: 'heal', targetId: 'p:a', amount: 20 },
      { t: 'ability', actorId: 'e:1', abilityId: 'slash', targetIds: ['p:a'] },
      { t: 'damage', targetId: 'p:a', amount: 30, crit: true },
      { t: 'downed', targetId: 'p:a' },
    ]);
    const a = applyStep(start, hit!);
    expect(a['p:a']!.hp).toBe(4);
    expect(start['p:a'].hp).toBe(10);
    const b = applyStep(a, heal!);
    expect(b['p:a']!.hp).toBe(12);
    const c = applyStep(b, fall!);
    expect(c['p:a']).toEqual({ hp: 0, maxHp: 12, downed: true });
  });
});
