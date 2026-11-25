import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/combat/rng.js';
import {
  boomRegion,
  defaultGrade,
  dropChances,
  gatheringRumours,
  getItemDef,
  hexDistance,
  HOTZONE_RULES,
  isDepositHex,
  mapHexAt,
  motherlodeHex,
  REGION_IDS,
  siteConditions,
  type SiteConditions,
  getProfession,
  gradeName,
  gradeRarity,
  nodeAmount,
  nodeReadyAt,
  resolveActivity,
  RESOURCE_NODE_RULES,
  resourceNodeAt,
  rollGrade,
  worldMapHexes,
} from '../src/index.js';

const river = worldMapHexes().find((h) => h.terrain === 'river')!;
const mountain = worldMapHexes().find((h) => h.terrain === 'mountain')!;

describe('resource nodes (request #52)', () => {
  it('exist only where the terrain suits the profession; richness is fixed per hex', () => {
    expect(resourceNodeAt(river, 'fishing')).not.toBeNull();
    expect(resourceNodeAt(river, 'mining')).toBeNull();
    expect(resourceNodeAt(mountain, 'mining')).not.toBeNull();
    expect(resourceNodeAt(river, 'blacksmith')).toBeNull();
    expect(resourceNodeAt(river, 'fishing')).toEqual(resourceNodeAt(river, 'fishing'));
    const node = resourceNodeAt(river, 'fishing')!;
    expect(node.max).toBe(RESOURCE_NODE_RULES.maxByRichness[node.richness]);
  });

  it('has poor, normal and rich nodes across the map', () => {
    const seen = new Set<number>();
    for (const h of worldMapHexes()) {
      const n = resourceNodeAt(h, 'herbalism');
      if (n) seen.add(n.richness);
    }
    expect([...seen].sort()).toEqual([0, 1, 2]);
  });

  it('regrows over time, up to its maximum', () => {
    const node = { max: 20 };
    const t0 = new Date('2026-01-01T00:00:00Z');
    const later = (h: number) => new Date(t0.getTime() + h * 3_600_000);
    expect(nodeAmount(node, 0, t0, t0)).toBe(0);
    expect(nodeAmount(node, 0, t0, later(1))).toBe(RESOURCE_NODE_RULES.regenPerHour);
    expect(nodeAmount(node, 0, t0, later(100))).toBe(20);
    expect(nodeReadyAt(1, t0)).toBeNull();
    expect(nodeReadyAt(0, t0)!.getTime()).toBeGreaterThan(t0.getTime());
  });
});

describe('material grades (request #52)', () => {
  it('more Mastery and richer nodes give better grades', () => {
    const avg = (rank: number, richness: number) => {
      let sum = 0;
      for (let seed = 1; seed <= 2000; seed++) sum += rollGrade(new Rng(seed), rank, richness);
      return sum / 2000;
    };
    expect(avg(3, 1)).toBeGreaterThan(avg(0, 1));
    expect(avg(0, 2)).toBeGreaterThan(avg(0, 0));
    expect(gradeName(0)).toBe('Poor');
    expect(gradeName(4)).toBe('Exceptional');
  });

  it('a Novice on a normal node never finds Exceptional materials', () => {
    for (let seed = 1; seed <= 2000; seed++) expect(rollGrade(new Rng(seed), 0, 1)).toBeLessThan(4);
  });

  it('gathering outputs carry a grade; crafting outputs do not', () => {
    const fish = getProfession('fishing')!.activities[0]!;
    const smelt = getProfession('blacksmith')!.activities[0]!;
    const g = resolveActivity(fish, { rank: 5, nodeRichness: 1 }, 3);
    expect(g.outputs.every((o) => typeof o.grade === 'number')).toBe(true);
    const c = resolveActivity(smelt, { rank: 5 }, 3);
    expect(c.outputs.every((o) => o.grade === null)).toBe(true);
  });

  it('gathered materials default to Common; other items have no grade', () => {
    expect(defaultGrade('raw_fish')).toBe(1);
    expect(defaultGrade('iron_ingot')).toBeNull();
    expect(defaultGrade('training_sword')).toBeNull();
  });
});

describe('item folders and grade rarity (request #78)', () => {
  it('a better grade is a rarer material', () => {
    expect([0, 1, 2, 3, 4].map(gradeRarity)).toEqual([
      'common',
      'uncommon',
      'rare',
      'epic',
      'legendary',
    ]);
    expect(gradeRarity(9)).toBe('legendary');
  });

  it('every material and tool folder defines the item named after it', () => {
    const dir = fileURLToPath(new URL('../src/content/items', import.meta.url));
    for (const group of ['materials', 'consumables', 'tools']) {
      for (const id of readdirSync(join(dir, group)).filter((f) => !f.endsWith('.ts'))) {
        expect(getItemDef(id)?.id, `${group}/${id}`).toBe(id);
      }
    }
  });
});

describe('hot zones (request #82)', () => {
  const mineHexes = worldMapHexes(new Date(0)).filter((h) => resourceNodeAt(h, 'mining'));

  it('deposits are fixed and only some suitable hexes hold one', () => {
    const deposits = mineHexes.filter((h) => isDepositHex(h, 'mining'));
    expect(deposits.length).toBeGreaterThan(0);
    expect(deposits.length).toBeLessThan(mineHexes.length);
    for (const h of deposits) expect(isDepositHex(h, 'mining')).toBe(true);
  });

  it('every region booms once in each cycle of days', () => {
    const n = REGION_IDS.length;
    for (const start of [0, n * 10, n * 333]) {
      const seen = new Set<string>();
      for (let d = start; d < start + n; d++) seen.add(boomRegion('mining', d));
      expect(seen.size).toBe(n);
    }
  });

  it('the motherlode sits in the booming region, and the rumour is near it', () => {
    for (let day = 100; day < 130; day++) {
      const lode = motherlodeHex('mining', day)!;
      expect(mapHexAt(lode)!.region).toBe(boomRegion('mining', day));
      const s = siteConditions(lode, 'mining', day);
      expect(s.motherlode && s.boom).toBe(true);
      const rumour = gatheringRumours(day).find((r) => r.professionId === 'mining')!;
      expect(hexDistance(rumour.near!, lode)).toBeLessThanOrEqual(HOTZONE_RULES.rumourRadius);
    }
  });

  it('gems only drop on a deposit; the boom makes them commoner', () => {
    const mine = getProfession('mining')!.activities[0]!;
    const gem = (site: SiteConditions) =>
      dropChances(mine, { rank: 2, site }).drops.find((d) => d.drop.deposit)!;
    const base = { boom: false, motherlode: false, successBonus: 0, richnessBonus: 0 };
    expect(gem({ ...base, deposit: false, depositMultiplier: 0 }).chance).toBe(0);
    expect(gem({ ...base, deposit: false, depositMultiplier: 0 }).needsDeposit).toBe(true);
    const plain = gem({ ...base, deposit: true, depositMultiplier: 1 }).chance;
    const boom = gem({ ...base, deposit: true, depositMultiplier: 3 }).chance;
    expect(plain).toBeGreaterThan(0);
    expect(boom).toBeGreaterThan(plain);
  });
});
