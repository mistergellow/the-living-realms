import { describe, expect, it } from 'vitest';
import {
  COMBAT_RULES,
  markFactor,
  SKILL_RULES,
  SKILLS,
  skillAtLevel,
  skillExtraTurns,
  skillLevelLabel,
  skillLevelMultiplier,
  weakenFactor,
} from '../src/index.js';

describe('skill levels (request #53)', () => {
  it('has 21 levels: 1 … 10, M1 … M10, P', () => {
    expect(SKILL_RULES.maxLevel).toBe(21);
    expect(skillLevelLabel(1)).toBe('1');
    expect(skillLevelLabel(10)).toBe('10');
    expect(skillLevelLabel(11)).toBe('M1');
    expect(skillLevelLabel(20)).toBe('M10');
    expect(skillLevelLabel(21)).toBe('P');
  });

  it('every level is stronger than the one before', () => {
    expect(skillLevelMultiplier(1)).toBe(1);
    for (let l = 2; l <= 21; l++)
      expect(skillLevelMultiplier(l)).toBeGreaterThan(skillLevelMultiplier(l - 1));
    expect(skillLevelMultiplier(10)).toBeCloseTo(1.9);
    expect(skillLevelMultiplier(21)).toBeCloseTo(3);
  });

  it('every skill gets better at every level (nothing stays flat)', () => {
    const power = (lvl: number, s: (typeof SKILLS)[keyof typeof SKILLS]) =>
      skillAtLevel(s, lvl).effects.reduce(
        (n, e) =>
          n +
          (e.kind === 'damage' || e.kind === 'heal' || e.kind === 'block'
            ? e.min + e.max
            : e.kind === 'status'
              ? (e.value ?? 0) + e.turns
              : 0),
        0,
      );
    for (const s of Object.values(SKILLS))
      for (let l = 2; l <= SKILL_RULES.maxLevel; l++)
        expect(power(l, s), `${s.id} ${skillLevelLabel(l)}`).toBeGreaterThan(power(l - 1, s));
  });

  it('Expose Weakness grows: Mark and Weaken get stronger and last longer', () => {
    const at = (l: number) => skillAtLevel(SKILLS.expose_weakness, l).effects;
    const mark = (l: number) => at(l).find((e) => e.kind === 'status' && e.status === 'mark')!;
    expect(mark(1)).toMatchObject({ value: 25, turns: 2 });
    expect((mark(2) as { value: number }).value).toBeGreaterThan(25);
    expect(mark(21)).toMatchObject({ turns: 4 });
    expect(markFactor(50)).toBe(1.5);
    expect(weakenFactor(40)).toBeCloseTo(0.6);
    expect(markFactor(0)).toBe(COMBAT_RULES.markMultiplier);
    expect(weakenFactor(500)).toBeCloseTo(1 - COMBAT_RULES.maxWeakenPct / 100);
  });

  it('Stun never lasts longer; other statuses do from M1', () => {
    expect(skillExtraTurns(10)).toBe(0);
    expect(skillExtraTurns(11)).toBe(1);
    expect(skillExtraTurns(21)).toBe(2);
    const stun = skillAtLevel(SKILLS.pinning_shot, 21).effects.find(
      (e) => e.kind === 'status' && e.status === 'stun',
    )!;
    expect(stun).toMatchObject({ turns: 1 });
  });
});
