import { describe, expect, it } from 'vitest';
import { locationAt, namedLocations } from '../src/content/locations.js';

describe('locations', () => {
  it('the world spawn is a town with its own actions', () => {
    const town = locationAt({ q: 0, r: 0 });
    expect(town.kind).toBe('town');
    expect(town.actions.map((a) => a.id)).toEqual(
      expect.arrayContaining(['npcs', 'shop', 'rifts', 'workshop', 'map']),
    );
  });

  it('any other hex is open wilderness you can leave', () => {
    const wild = locationAt({ q: 7, r: -3 });
    expect(wild.kind).toBe('wilds');
    expect(wild.actions.some((a) => a.id === 'map' && a.available)).toBe(true);
  });

  it('lists named places with their hex', () => {
    expect(namedLocations()).toContainEqual(expect.objectContaining({ hex: { q: 0, r: 0 } }));
  });
});
