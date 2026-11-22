import { describe, expect, it } from 'vitest';
import {
  activityChance,
  addProfessionXp,
  getItemDef,
  getProfession,
  isStackable,
  PROFESSION_RULES,
  PROFESSIONS,
  resolveActivity,
  xpToNext,
} from '../src/index.js';

describe('professions', () => {
  it('has gathering, crafting and service professions, including Blacksmith and Runesmith', () => {
    const ids = Object.keys(PROFESSIONS);
    for (const id of ['blacksmithing', 'runesmithing', 'fishing', 'mining', 'alchemy', 'cooking'])
      expect(ids).toContain(id);
    expect(new Set(Object.values(PROFESSIONS).map((p) => p.category))).toEqual(
      new Set(['gathering', 'crafting', 'service']),
    );
  });

  it('every activity uses and makes items that exist; materials stack', () => {
    for (const p of Object.values(PROFESSIONS))
      for (const a of p.activities) {
        for (const i of a.inputs) expect(isStackable(getItemDef(i.item))).toBe(true);
        for (const o of a.outputs) expect(getItemDef(o.item)).toBeDefined();
      }
  });

  it('levels raise the success chance (capped)', () => {
    const fish = getProfession('fishing')!.activities[0]!;
    expect(activityChance(fish, 0)).toBe(fish.baseChance);
    expect(activityChance(fish, 4)).toBe(fish.baseChance + 4 * PROFESSION_RULES.successPerLevel);
    expect(activityChance(fish, 10)).toBe(PROFESSION_RULES.maxChance);
  });

  it('XP levels up; the cost grows per level; max level 10', () => {
    expect(xpToNext(0)).toBe(PROFESSION_RULES.xpBase);
    expect(xpToNext(3)).toBeGreaterThan(xpToNext(0));
    expect(addProfessionXp(0, 30, 15)).toEqual({ level: 1, xp: 5, levelsGained: 1 });
    expect(addProfessionXp(9, 0, 10_000)).toEqual({ level: 10, xp: 0, levelsGained: 1 });
  });

  it('results are deterministic per seed; repairs grow with level', () => {
    const repair = getProfession('blacksmithing')!.activities.find((a) => a.effect === 'repair')!;
    expect(resolveActivity(repair, 3, 9)).toEqual(resolveActivity(repair, 3, 9));
    let low = 0;
    let high = 0;
    for (let seed = 1; seed < 200; seed++) {
      low += resolveActivity(repair, 0, seed).repaired;
      high += resolveActivity(repair, 8, seed).repaired;
    }
    expect(high).toBeGreaterThan(low);
  });
});
