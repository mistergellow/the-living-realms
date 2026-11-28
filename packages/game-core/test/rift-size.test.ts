import { describe, expect, it } from 'vitest';
import {
  allPaths,
  generateRiftMap,
  getRift,
  mapTemplateForTier,
  maxOnAnyPath,
  RIFT_SIZE_RULES,
  riftLength,
  riftSites,
} from '../src/index.js';

const pools = { combat: 6, elite: 3, events: ['a', 'b', 'c', 'd'] };

describe('Rift size and Campsites (request #60)', () => {
  it('routes have 10 rooms at tier 1 up to 20 at tier 5', () => {
    expect(riftLength(1)).toBe(10);
    expect(riftLength(5)).toBe(20);
    for (let tier = 1; tier <= 5; tier++)
      for (let seed = 1; seed <= 15; seed++) {
        const map = generateRiftMap(mapTemplateForTier(tier), pools, seed * 7919 + tier);
        for (const path of allPaths(map)) expect(path).toHaveLength(riftLength(tier));
      }
  });

  it('Campsites are rare and never guaranteed (request #90): at most one per route', () => {
    let maps = 0;
    let withCampsite = 0;
    for (let tier = 1; tier <= 5; tier++)
      for (let seed = 1; seed <= 40; seed++) {
        const map = generateRiftMap(mapTemplateForTier(tier), pools, seed * 104729 + tier);
        expect(maxOnAnyPath(map, 'campsite')).toBeLessThanOrEqual(
          RIFT_SIZE_RULES.campsitesPerRoute[tier - 1]!,
        );
        maps++;
        if (map.nodes.some((n) => n.type === 'campsite')) withCampsite++;
      }
    // Most Rifts have none; some have one somewhere.
    expect(withCampsite / maps).toBeGreaterThan(0.1);
    expect(withCampsite / maps).toBeLessThan(0.6);
  });

  it('map entrances use their tier’s size', () => {
    const site = riftSites()[0]!;
    const rift = getRift(site.rift!.id)!;
    expect(rift.map.rows).toBe(riftLength(rift.tier!) - 1);
  });
});
