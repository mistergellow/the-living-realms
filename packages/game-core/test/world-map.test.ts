import { describe, expect, it } from 'vitest';
import {
  REGIONS,
  REGION_IDS,
  hexKey,
  hexNeighbors,
  mapHexAt,
  regionAt,
  worldMapHexes,
} from '../src/index.js';

describe('world map (continent)', () => {
  const hexes = worldMapHexes();

  it('is deterministic', () => {
    expect(worldMapHexes()).toEqual(hexes);
  });

  it('has every region, with the Riftlands in the middle', () => {
    for (const id of REGION_IDS) expect(hexes.some((h) => h.region === id)).toBe(true);
    expect(regionAt({ q: 0, r: 0 })?.id).toBe('riftlands');
  });

  it('places nations west, east and north of the centre', () => {
    const west = REGIONS.west.capital!.hex;
    const east = REGIONS.east.capital!.hex;
    const north = REGIONS.north.capital!.hex;
    const x = (h: { q: number; r: number }) => h.q + h.r / 2;
    expect(x(west)).toBeLessThan(-5);
    expect(x(east)).toBeGreaterThan(5);
    expect(north.r).toBeLessThan(-5);
  });

  it('has exactly one capital hex per nation, inside that nation', () => {
    const capitals = hexes.filter((h) => h.capital);
    const nations = REGION_IDS.filter((id) => REGIONS[id].kind === 'nation');
    expect(capitals).toHaveLength(nations.length);
    for (const id of nations) {
      const c = REGIONS[id].capital!;
      expect(mapHexAt(c.hex)).toMatchObject({ region: id, capital: c.name });
    }
    expect(REGIONS.riftlands.capital).toBeNull();
  });

  it('is one connected landmass and the Riftlands border every nation', () => {
    const keys = new Set(hexes.map(hexKey));
    const seen = new Set<string>();
    const queue = [hexes[0]!];
    while (queue.length) {
      const h = queue.pop()!;
      if (seen.has(hexKey(h))) continue;
      seen.add(hexKey(h));
      for (const n of hexNeighbors(h)) if (keys.has(hexKey(n))) queue.push(mapHexAt(n)!);
    }
    expect(seen.size).toBe(hexes.length);

    const bordering = new Set(
      hexes
        .filter((h) => h.region === 'riftlands')
        .flatMap((h) => hexNeighbors(h).map((n) => mapHexAt(n)?.region)),
    );
    for (const id of ['west', 'east', 'north'] as const) expect(bordering.has(id)).toBe(true);
  });

  it('returns null for the sea', () => {
    expect(mapHexAt({ q: 200, r: 0 })).toBeNull();
    expect(regionAt({ q: 0, r: -100 })).toBeNull();
  });
});
