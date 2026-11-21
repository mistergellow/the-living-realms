import { describe, expect, it } from 'vitest';
import {
  ABILITIES,
  abilityMultipliers,
  applyRead,
  BOOK_ITEMS,
  bookOfItem,
  booksForRank,
  getItemDef,
  isStackable,
  rankLabel,
  readCheck,
  RIFTS,
  SKILL_BOOKS,
  skillRankMultiplier,
  totalBooksTo,
  validateCreationAttributes,
  ORIGINS,
  getOrigin,
} from '../src/index.js';

const base = (over: Partial<Record<string, number>> = {}) => ({
  might: 5,
  agility: 5,
  precision: 5,
  endurance: 5,
  intellect: 5,
  will: 5,
  ...over,
});

describe('skill ranks (request #36)', () => {
  it('labels 1–10, M1–M9 and P', () => {
    expect([1, 2, 10, 11, 19, 20].map(rankLabel)).toEqual(['1', '2', '10', 'M1', 'M9', 'P']);
  });

  it('needs n books for rank n, then 10 × k for Mk', () => {
    expect([1, 2, 3, 10].map(booksForRank)).toEqual([1, 2, 3, 10]);
    expect([11, 12, 13, 20].map(booksForRank)).toEqual([10, 20, 30, 100]);
    expect(totalBooksTo(10)).toBe(55);
    expect(totalBooksTo(20)).toBe(605);
  });

  it('gets a little stronger every rank', () => {
    let last = 0;
    for (let r = 1; r <= 20; r++) {
      const m = skillRankMultiplier(r);
      expect(m).toBeGreaterThan(last);
      last = m;
    }
    expect(skillRankMultiplier(1)).toBe(1);
    expect(skillRankMultiplier(10)).toBeCloseTo(1.45);
    expect(skillRankMultiplier(20)).toBeCloseTo(1.75);
  });

  it('a failed read gives no progress; enough successes rank up', () => {
    expect(applyRead({ rank: 1, progress: 0 }, 50, 80)).toMatchObject({
      success: false,
      rank: 1,
      progress: 0,
    });
    const one = applyRead({ rank: 1, progress: 0 }, 50, 10);
    expect(one).toMatchObject({ success: true, rank: 1, progress: 1, rankedUp: false });
    expect(applyRead(one, 50, 10)).toMatchObject({ rank: 2, progress: 0, rankedUp: true });
    expect(applyRead({ rank: 0, progress: 0 }, 50, 10)).toMatchObject({ rank: 1, rankedUp: true });
  });

  it('weapon upgrades and skill ranks both feed the ability multipliers', () => {
    const m = abilityMultipliers([], { fireball: 10, cure_wounds: 1 });
    expect(m.fireball).toBeCloseTo(1.45);
    expect(m.cure_wounds).toBeUndefined();
  });
});

describe('skill books (request #36)', () => {
  it('every book teaches a learned skill and is a stackable item', () => {
    for (const b of Object.values(SKILL_BOOKS)) {
      expect(ABILITIES[b.skillId].source).toBe('skill');
      const def = getItemDef(`book_${b.skillId}`);
      expect(def?.kind).toBe('book');
      expect(isStackable(def)).toBe(true);
      expect(bookOfItem(`book_${b.skillId}`)).toBe(b);
    }
    expect(Object.keys(BOOK_ITEMS).length).toBe(Object.keys(SKILL_BOOKS).length);
  });

  it('a tank cannot read Fireball, a hybrid can', () => {
    const tank = base({ might: 10, endurance: 10, agility: 7 });
    expect(readCheck(SKILL_BOOKS.fireball, tank, 0)).toMatchObject({ ok: false });
    const spellblade = base({ might: 9, intellect: 8, endurance: 8, agility: 7 });
    expect(validateCreationAttributes(spellblade).ok).toBe(true);
    expect(readCheck(SKILL_BOOKS.fireball, spellblade, 0)).toEqual({ ok: true, chance: 70 });
  });

  it('chance grows with the base attribute and drops for Mastery ranks', () => {
    const mage = base({ intellect: 10 });
    expect(readCheck(SKILL_BOOKS.fireball, mage, 1)).toEqual({ ok: true, chance: 82 });
    expect(readCheck(SKILL_BOOKS.fireball, mage, 10)).toEqual({ ok: true, chance: 62 });
    expect(readCheck(SKILL_BOOKS.fireball, mage, 20)).toMatchObject({ ok: false });
    // No requirement: anyone can read it.
    expect(readCheck(SKILL_BOOKS.second_wind, base(), 0)).toEqual({ ok: true, chance: 70 });
  });

  it('books drop in Rifts', () => {
    const rift = Object.values(RIFTS)[0]!;
    expect(rift.rewards.loot.some((l) => l.item.startsWith('book_'))).toBe(true);
    expect(rift.lootRoom.loot.some((l) => l.item.startsWith('book_'))).toBe(true);
  });
});

describe('creation choices (request #36)', () => {
  it('all creation points must be spent', () => {
    expect(validateCreationAttributes(base({ might: 10 })).ok).toBe(false);
    expect(validateCreationAttributes(base({ might: 10, agility: 10, will: 7 })).ok).toBe(true);
  });

  it('every origin has a language', () => {
    for (const o of Object.values(ORIGINS)) expect(o.language).toBeTruthy();
    expect(getOrigin('nowhere')).toBeUndefined();
  });
});
