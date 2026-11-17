import { describe, expect, it } from 'vitest';
import {
  attributeModifier,
  availableAbilities,
  BASE_ATTRIBUTES,
  computeStats,
  planEquip,
  pointBuySpent,
  qualityAfterDefeat,
  validatePointBuy,
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

describe('point-buy (D&D 5e)', () => {
  it('costs 27 points for 15/15/15/8/8/8 and accepts it', () => {
    const a = attrs({ str: 15, dex: 15, con: 15 });
    expect(pointBuySpent(a)).toBe(27);
    expect(validatePointBuy(a)).toEqual({ ok: true, spent: 27 });
  });
  it('allows unspent points but rejects overspending and out-of-range scores', () => {
    expect(validatePointBuy(BASE_ATTRIBUTES)).toEqual({ ok: true, spent: 0 });
    expect(validatePointBuy(attrs({ str: 15, dex: 15, con: 15, int: 9 })).ok).toBe(false);
    expect(validatePointBuy(attrs({ str: 16 })).ok).toBe(false);
    expect(validatePointBuy(attrs({ str: 7 })).ok).toBe(false);
  });
  it('uses D&D modifiers', () => {
    expect([8, 9, 10, 11, 12, 15, 20].map(attributeModifier)).toEqual([-1, -1, 0, 0, 1, 2, 5]);
  });
});

describe('derived stats', () => {
  it('derives HP from CON and mana from INT', () => {
    const { stats } = computeStats(attrs({ con: 14, int: 12 }));
    expect(stats.maxHp).toBe(20 + 2 * 14);
    expect(stats.maxMana).toBe(10 + 2 * 12);
  });
  it('adds equipment bonuses and armor, ignoring broken items', () => {
    const items = [owned('r', 'ring_of_vigor', 'accessory1'), owned('t', 'padded_tunic', 'body')];
    const { attributes, stats } = computeStats(attrs({ con: 13 }), items);
    expect(attributes.con).toBe(14);
    expect(stats.defense).toBe(1 + 2);
    const broken = computeStats(attrs({ con: 13 }), [owned('r', 'ring_of_vigor', 'accessory1', 0)]);
    expect(broken.attributes.con).toBe(13);
  });
});

describe('equipment', () => {
  it('weapons define attacks; unarmed without a weapon', () => {
    const names = (items: OwnedItem[]) => availableAbilities(items).map((a) => a.ability.id);
    expect(names([owned('s', 'training_sword', 'mainHand')])).toEqual([
      'slash',
      'cleave',
      'swap_position',
    ]);
    expect(names([])).toEqual(['unarmed_strike', 'swap_position']);
    expect(names([owned('s', 'training_sword', 'mainHand', 0)])).toEqual([
      'unarmed_strike',
      'swap_position',
    ]);
  });
  it('swaps the occupant of a slot', () => {
    const items = [owned('a', 'training_sword', 'mainHand'), owned('b', 'hunting_bow')];
    expect(planEquip(items, 'b', 'mainHand')).toEqual({
      ok: true,
      equip: { itemId: 'b', slot: 'mainHand' },
      unequip: ['a'],
    });
  });
  it('two-handed weapons free the off-hand and vice versa', () => {
    const items = [owned('sh', 'wooden_shield', 'offHand'), owned('bow', 'hunting_bow')];
    expect(planEquip(items, 'bow', 'mainHand')).toMatchObject({ ok: true, unequip: ['sh'] });
    const items2 = [owned('bow', 'hunting_bow', 'mainHand'), owned('sh', 'wooden_shield')];
    expect(planEquip(items2, 'sh', 'offHand')).toMatchObject({ ok: true, unequip: ['bow'] });
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
