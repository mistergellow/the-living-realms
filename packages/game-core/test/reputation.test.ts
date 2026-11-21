import { describe, expect, it } from 'vitest';
import { gearReputationBonusPct, riftClearFactor, riftReputation } from '../src/index.js';

describe('reputation (request #49)', () => {
  it('each clear of the same Rift gives less, then nothing', () => {
    expect([0, 1, 2, 3, 9].map(riftClearFactor)).toEqual([1, 0.5, 0.25, 0, 0]);
    expect([0, 1, 2, 3].map((n) => riftReputation(40, n, 0))).toEqual([40, 20, 10, 0]);
  });

  it('better equipped gear gives more: bonus effects and upgrade levels', () => {
    expect(gearReputationBonusPct([])).toBe(0);
    expect(gearReputationBonusPct([{ affixCount: 2, upgradeLevel: 3 }])).toBe(2 * 3 + 3 * 2);
    expect(riftReputation(40, 0, 12)).toBe(45);
    expect(gearReputationBonusPct(Array(20).fill({ affixCount: 5, upgradeLevel: 10 }))).toBe(100);
  });
});
