import { describe, expect, it } from 'vitest';
import {
  getItemDef,
  healAmount,
  healthFullAt,
  HEALTH_RULES,
  hpLostNow,
  hpNow,
} from '../src/index.js';

const HOUR = 3_600_000;

describe('health between Rifts (request #85)', () => {
  const t0 = new Date('2026-11-25T10:00:00Z');

  it('heals a share of the maximum per real hour, never above full', () => {
    const max = 100;
    expect(hpLostNow(60, t0, max, t0)).toBe(60);
    const perHour = HEALTH_RULES.regenPctPerHour;
    expect(hpLostNow(60, t0, max, new Date(t0.getTime() + 2 * HOUR))).toBeCloseTo(60 - 2 * perHour);
    expect(hpLostNow(60, t0, max, new Date(t0.getTime() + 100 * HOUR))).toBe(0);
    expect(hpNow(max, 37.5)).toBe(62);
  });

  it('knows when it is full again', () => {
    expect(healthFullAt(0, 100, t0)).toBeNull();
    const at = healthFullAt(50, 100, t0)!;
    expect((at.getTime() - t0.getTime()) / HOUR).toBeCloseTo(50 / HEALTH_RULES.regenPctPerHour);
  });

  it('potions and food heal a share of the maximum', () => {
    expect(getItemDef('healing_draught')!.heal).toBeGreaterThan(getItemDef('bandage')!.heal!);
    expect(healAmount(getItemDef('healing_draught')!.heal!, 200)).toBe(80);
  });
});
