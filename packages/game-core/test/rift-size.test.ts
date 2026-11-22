import { describe, expect, it } from 'vitest';
import {
  allPaths,
  findNode,
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

  it('Campsites are rare: at most 3 per route on easy Rifts, 1 on the hardest, never none', () => {
    for (let tier = 1; tier <= 5; tier++)
      for (let seed = 1; seed <= 15; seed++) {
        const map = generateRiftMap(mapTemplateForTier(tier), pools, seed * 104729 + tier);
        expect(maxOnAnyPath(map, 'campsite')).toBeLessThanOrEqual(
          RIFT_SIZE_RULES.campsitesPerRoute[tier - 1]!,
        );
        for (const path of allPaths(map))
          expect(
            path.filter((id) => findNode(map, id)!.type === 'campsite').length,
          ).toBeGreaterThanOrEqual(1);
      }
  });

  it('map entrances use their tier’s size', () => {
    const site = riftSites()[0]!;
    const rift = getRift(site.rift!.id)!;
    expect(rift.map.rows).toBe(riftLength(rift.tier!) - 1);
  });
});
