import { describe, expect, it } from 'vitest';
import {
  activityChance,
  addMastery,
  attributeBonus,
  BASE_ATTRIBUTES,
  complexityFactor,
  getItemDef,
  getProfession,
  isStackable,
  MASTERY_RULES,
  masteryPoints,
  MAX_RANK,
  pointsToNext,
  PROFESSION_ATTRIBUTE_RULES,
  PROFESSIONS,
  RENAMED_PROFESSIONS,
  rankName,
  resolveActivity,
  SHOP_STOCK,
  STARTER_TOOLS,
  toolBonus,
} from '../src/index.js';

const GATHERING = ['hunting', 'fishing', 'herbalism', 'woodcutting', 'mining'];
const CRAFTING = [
  'crafter',
  'blacksmith',
  'runecrafter',
  'carpentry',
  'leatherworking',
  'tailoring',
  'jewelcrafting',
  'alchemy',
  'cooking',
  'scribing',
];

describe('professions (request #51)', () => {
  it('has the 15 professions of the spec: 5 gathering and 10 crafting', () => {
    const all = Object.values(PROFESSIONS);
    expect(all).toHaveLength(15);
    expect(all.filter((p) => p.category === 'gathering').map((p) => p.id)).toEqual(GATHERING);
    expect(all.filter((p) => p.category === 'crafting').map((p) => p.id)).toEqual(CRAFTING);
  });

  it('old profession ids map to existing ones', () => {
    for (const to of Object.values(RENAMED_PROFESSIONS)) expect(getProfession(to)).toBeDefined();
  });

  it('every activity uses and makes items that exist; inputs stack', () => {
    for (const p of Object.values(PROFESSIONS))
      for (const a of p.activities) {
        for (const i of a.inputs) expect(isStackable(getItemDef(i.item))).toBe(true);
        for (const o of a.outputs) expect(getItemDef(o.item)).toBeDefined();
        expect(a.complexity).toBeGreaterThanOrEqual(1);
        expect(a.complexity).toBeLessThanOrEqual(6);
      }
  });

  it('attribute weights are BASE attributes and add up to 1', () => {
    for (const p of Object.values(PROFESSIONS)) {
      const sum = Object.values(p.attributes).reduce((s, w) => s + (w ?? 0), 0);
      expect(sum).toBeCloseTo(1);
    }
  });
});

describe('Mastery', () => {
  it('has 6 ranks, Novice to Grandmaster', () => {
    expect(MAX_RANK).toBe(5);
    expect(rankName(0)).toBe('Novice');
    expect(rankName(5)).toBe('Grandmaster');
    expect(pointsToNext(0)).toBe(MASTERY_RULES.pointsToNext[0]);
    expect(pointsToNext(5)).toBe(0);
  });

  it('points carry over between ranks and stop at Grandmaster', () => {
    expect(addMastery(0, 90, 15)).toEqual({ rank: 1, points: 5, ranksGained: 1 });
    expect(addMastery(4, 0, 1_000_000)).toEqual({ rank: 5, points: 0, ranksGained: 1 });
  });

  it('simple work teaches less and less, then nothing', () => {
    const novice = { complexity: 1 };
    expect(complexityFactor(novice, 0)).toBe(1);
    expect(complexityFactor(novice, 1)).toBe(0.5);
    expect(complexityFactor(novice, 2)).toBe(0.15);
    expect(complexityFactor(novice, 3)).toBe(0);
    // Harder work keeps teaching.
    expect(complexityFactor({ complexity: 4 }, 3)).toBe(1);
  });

  it('farming a cheap activity can never reach Grandmaster (not even Master)', () => {
    const fish = getProfession('fishing')!.activities[0]!;
    let rank = 0;
    let points = 0;
    for (let i = 0; i < 100_000; i++) {
      const next = addMastery(rank, points, masteryPoints(fish, rank, true));
      rank = next.rank;
      points = next.points;
    }
    expect(rank).toBeLessThan(4);
  });
});

describe('success chance', () => {
  const fish = getProfession('fishing')!.activities[0]!;

  it('ranks above the requirement raise it (capped)', () => {
    expect(activityChance(fish, { rank: 0 })).toBe(fish.baseChance);
    expect(activityChance(fish, { rank: 2 })).toBe(
      fish.baseChance + 2 * MASTERY_RULES.successPerRank,
    );
    expect(activityChance(fish, { rank: 5 })).toBe(MASTERY_RULES.maxChance);
  });

  it('tools add a little, but less than a rank', () => {
    expect(toolBonus(1)).toBe(0);
    expect(toolBonus(2)).toBeGreaterThan(0);
    expect(toolBonus(2)).toBeLessThan(MASTERY_RULES.successPerRank);
  });

  it('BASE attributes help, capped below one rank (§21)', () => {
    const mining = getProfession('mining')!;
    expect(attributeBonus(mining, BASE_ATTRIBUTES)).toBe(0);
    expect(attributeBonus(mining, { ...BASE_ATTRIBUTES, might: 9, endurance: 9 })).toBe(4);
    // Attributes that do not matter for mining give nothing.
    expect(attributeBonus(mining, { ...BASE_ATTRIBUTES, intellect: 30 })).toBe(0);
    expect(attributeBonus(mining, { ...BASE_ATTRIBUTES, might: 99, endurance: 99 })).toBe(
      PROFESSION_ATTRIBUTE_RULES.cap,
    );
    expect(PROFESSION_ATTRIBUTE_RULES.cap).toBeLessThan(MASTERY_RULES.successPerRank);
  });
});

describe('results', () => {
  it('are deterministic per seed; repairs grow with rank', () => {
    const repair = getProfession('blacksmith')!.activities.find((a) => a.effect === 'repair')!;
    expect(resolveActivity(repair, { rank: 2 }, 9)).toEqual(resolveActivity(repair, { rank: 2 }, 9));
    let low = 0;
    let high = 0;
    for (let seed = 1; seed < 200; seed++) {
      low += resolveActivity(repair, { rank: 0 }, seed).repaired;
      high += resolveActivity(repair, { rank: 4 }, seed).repaired;
    }
    expect(high).toBeGreaterThan(low);
  });
});

describe('tools', () => {
  it('every gathering profession except Herbalism needs a tool; starter tools cover them', () => {
    const needs = Object.values(PROFESSIONS)
      .filter((p) => p.tool)
      .map((p) => p.tool!);
    expect(needs.sort()).toEqual(['axe', 'fishing_rod', 'hunting_knife', 'pickaxe']);
    const starter = STARTER_TOOLS.map((id) => getItemDef(id)!.tool!.type).sort();
    expect(starter).toEqual(needs.sort());
  });

  it('tools are items, not stackable; basic ones are sold, fine ones need a rank', () => {
    for (const id of STARTER_TOOLS) {
      const def = getItemDef(id)!;
      expect(def.kind).toBe('tool');
      expect(isStackable(def)).toBe(false);
      expect(SHOP_STOCK.some((s) => s.item === id)).toBe(true);
    }
    expect(getItemDef('fine_pickaxe')!.tool).toEqual({ type: 'pickaxe', tier: 2, minRank: 1 });
  });
});
