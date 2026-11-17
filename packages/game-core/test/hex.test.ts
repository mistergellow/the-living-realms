import { describe, expect, it } from 'vitest';
import { hex, hexDistance, hexesInRange, hexNeighbors, hexToPixel } from '../src/hex.js';

describe('hex grid', () => {
  it('computes distance in axial coordinates', () => {
    expect(hexDistance(hex(0, 0), hex(0, 0))).toBe(0);
    expect(hexDistance(hex(0, 0), hex(3, 0))).toBe(3);
    expect(hexDistance(hex(0, 0), hex(2, -3))).toBe(3);
    expect(hexDistance(hex(-1, 2), hex(2, -1))).toBe(3);
  });

  it('has six neighbors, all at distance 1', () => {
    const n = hexNeighbors(hex(2, -1));
    expect(n).toHaveLength(6);
    for (const h of n) expect(hexDistance(h, hex(2, -1))).toBe(1);
  });

  it('returns 1 + 3r(r+1) hexes in range', () => {
    expect(hexesInRange(hex(0, 0), 0)).toHaveLength(1);
    expect(hexesInRange(hex(0, 0), 1)).toHaveLength(7);
    expect(hexesInRange(hex(5, 5), 3)).toHaveLength(37);
    for (const h of hexesInRange(hex(5, 5), 3))
      expect(hexDistance(h, hex(5, 5))).toBeLessThanOrEqual(3);
  });

  it('maps the origin to pixel (0,0)', () => {
    expect(hexToPixel(hex(0, 0), 10)).toEqual({ x: 0, y: 0 });
  });
});
