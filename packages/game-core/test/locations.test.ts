import { describe, expect, it } from 'vitest';
import { locationAt } from '../src/content/locations.js';
import { REGIONS, riftSites, worldMapHexes } from '../src/content/world-map.js';

describe('locations (request #43)', () => {
  it('capitals are towns', () => {
    const town = locationAt(REGIONS.west.capital!.hex);
    expect(town.kind).toBe('town');
    expect(town.name).toBe(REGIONS.west.capital!.name);
    expect(town.actions.map((a) => a.id)).toEqual(
      expect.arrayContaining(['npcs', 'shop', 'map']),
    );
  });

  it('a Rift entrance offers the Rift', () => {
    const site = riftSites()[0]!;
    const place = locationAt(site);
    expect(place.kind).toBe('rift');
    expect(place.riftId).toBe(site.rift!.id);
    expect(place.actions[0]!.id).toBe('rifts');
  });

  it('other hexes are named by their terrain; crafting is not a place action (#84)', () => {
    const river = worldMapHexes().find((h) => h.terrain === 'river')!;
    const place = locationAt(river);
    expect(place.kind).toBe('wilds');
    expect(place.name).toMatch(/^River · /);
    expect(place.actions.map((a) => a.id)).toEqual(['map']);
  });

  it('the world boss adds its action where it stands', () => {
    const h = worldMapHexes().find((x) => x.region === 'riftlands' && !x.rift)!;
    expect(locationAt(h, { worldBossHere: true }).actions.map((a) => a.id)).toContain('worldboss');
    expect(locationAt(h).actions.map((a) => a.id)).not.toContain('worldboss');
  });
});
