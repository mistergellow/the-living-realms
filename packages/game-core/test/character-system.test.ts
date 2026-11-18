import { describe, expect, it } from 'vitest';
import {
  ATTRIBUTE_RULES,
  availableAbilities,
  BASE_ATTRIBUTES,
  computeStats,
  planEquip,
  pointsSpent,
  qualityAfterDefeat,
  reductionFromRating,
  scalingMultiplier,
  validateAllocation,
  validateCreationAttributes,
  type OwnedItem,
} from '../src/index.js';

const attrs = (o: Partial<typeof BASE_ATTRIBUTES> = {}) => ({ ...BASE_ATTRIBUTES, ...o });
const owned = (
  id: string,
  defId: string,
  slot: OwnedItem['equippedSlot'] = null,
  quality = 100,
): OwnedItem => ({
  id,
  defId,
  quality,
  equippedSlot: slot,
});

describe('attributes (6 linear attributes, 12 creation points)', () => {
  it('everyone starts at 5; up to 12 points, max 10 each', () => {
    expect(ATTRIBUTE_RULES).toMatchObject({ base: 5, creationPoints: 12, creationMax: 10 });
    const a = attrs({ might: 10, agility: 8, vitality: 9 });
    expect(pointsSpent(a)).toBe(12);
    expect(validateCreationAttributes(a)).toEqual({ ok: true, spent: 12, unspent: 0 });
    expect(validateCreationAttributes(BASE_ATTRIBUTES)).toEqual({
      ok: true,
      spent: 0,
      unspent: 12,
    });
  });
  it('rejects overspending and out-of-range scores', () => {
    expect(validateCreationAttributes(attrs({ might: 10, agility: 10, vitality: 8 })).ok).toBe(
      false,
    );
    expect(validateCreationAttributes(attrs({ might: 11 })).ok).toBe(false);
    expect(validateCreationAttributes(attrs({ might: 4 })).ok).toBe(false);
  });
  it('allocates unspent points later, within limits', () => {
    expect(validateAllocation(BASE_ATTRIBUTES, { might: 3 }, 12)).toMatchObject({
      ok: true,
      used: 3,
    });
    expect(validateAllocation(BASE_ATTRIBUTES, { might: 6 }, 12).ok).toBe(false);
    expect(validateAllocation(BASE_ATTRIBUTES, { might: 2, spirit: 2 }, 3).ok).toBe(false);
    expect(validateAllocation(BASE_ATTRIBUTES, {}, 3).ok).toBe(false);
  });
});

describe('derived stats', () => {
  it('are linear in attributes', () => {
    const { stats } = computeStats(attrs({ vitality: 10, arcana: 8, agility: 9, precision: 7 }));
    expect(stats.maxHp).toBe(40 + 6 * 10);
    expect(stats.maxMana).toBe(10 + 4 * 8);
    expect(stats.initiative).toBe(9);
    expect(stats.dodgeChance).toBe(18);
    expect(stats.critChance).toBe(5 + 2 * 7);
    expect(stats.critDamage).toBe(150 + 4 * 7);
  });
  it('mitigation has diminishing returns and never reaches 100%', () => {
    expect(reductionFromRating(0)).toBe(0);
    expect(reductionFromRating(50)).toBe(0.5);
    expect(reductionFromRating(150)).toBe(0.75);
    expect(reductionFromRating(100000)).toBeLessThan(1);
  });
  it('equipment adds attributes and armor; broken items do nothing', () => {
    const items = [owned('r', 'ring_of_vigor', 'accessory1'), owned('t', 'padded_tunic', 'body')];
    const { attributes, stats } = computeStats(attrs(), items);
    expect(attributes.vitality).toBe(7);
    expect(stats.armor).toBe(6);
    expect(stats.physicalReduction).toBe(Math.round((6 / 56) * 100));
    expect(
      computeStats(attrs(), [owned('r', 'ring_of_vigor', 'accessory1', 0)]).attributes.vitality,
    ).toBe(5);
  });
  it('abilities scale with two attributes (+8% per weighted point)', () => {
    expect(
      scalingMultiplier(attrs({ might: 10, agility: 5 }), { might: 0.6, agility: 0.4 }),
    ).toBeCloseTo(1 + 0.08 * (6 + 2));
  });
});

describe('equipment and abilities', () => {
  const ids = (items: OwnedItem[]) => availableAbilities(items).map((a) => a.ability.id);
  it('main hand + off hand abilities combine', () => {
    expect(
      ids([owned('s', 'training_sword', 'mainHand'), owned('sh', 'wooden_shield', 'offHand')]),
    ).toEqual(['slash', 'cleave', 'rend', 'raise_shield', 'shield_wall', 'swap_position']);
  });
  it('an off-hand alone still leaves you unarmed for attacks', () => {
    expect(ids([owned('sh', 'wooden_shield', 'offHand')])).toEqual([
      'raise_shield',
      'shield_wall',
      'unarmed_strike',
      'swap_position',
    ]);
    expect(ids([owned('s', 'training_sword', 'mainHand', 0)])).toEqual([
      'unarmed_strike',
      'swap_position',
    ]);
  });
  it('daggers fit either hand; two-handed weapons free the off-hand', () => {
    const items = [owned('d1', 'rusty_dagger', 'mainHand'), owned('d2', 'rusty_dagger')];
    expect(planEquip(items, 'd2', 'offHand')).toMatchObject({ ok: true, unequip: [] });
    const bow = [owned('sh', 'wooden_shield', 'offHand'), owned('bow', 'hunting_bow')];
    expect(planEquip(bow, 'bow', 'mainHand')).toMatchObject({ ok: true, unequip: ['sh'] });
  });
  it('rejects wrong slots, broken and unknown items', () => {
    const items = [owned('t', 'padded_tunic'), owned('x', 'ring_of_vigor', null, 0)];
    expect(planEquip(items, 't', 'head').ok).toBe(false);
    expect(planEquip(items, 'x', 'accessory1').ok).toBe(false);
    expect(planEquip(items, 'nope', 'body').ok).toBe(false);
  });
  it('loses 25% quality per defeat and breaks at 0', () => {
    expect([100, 75, 50, 25, 10].map(qualityAfterDefeat)).toEqual([75, 50, 25, 0, 0]);
  });
});
