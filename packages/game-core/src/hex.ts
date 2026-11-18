import type { HexCoord } from '@realms/shared';

/*
 * Hexagonal grid utilities using **axial coordinates** (q, r), pointy-top
 * orientation. The implicit third cube coordinate is s = -q - r.
 * Reference: https://www.redblobgames.com/grids/hexagons/
 *
 * Movement cost (Action Points per hex) is a game mechanic for a later phase;
 * it will be built on top of `hexDistance` / pathfinding here.
 */

export const HEX_DIRECTIONS: readonly HexCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export const hex = (q: number, r: number): HexCoord => ({ q, r });

export function hexEquals(a: HexCoord, b: HexCoord): boolean {
  return a.q === b.q && a.r === b.r;
}

export function hexKey(h: HexCoord): string {
  return `${h.q},${h.r}`;
}

export function hexAdd(a: HexCoord, b: HexCoord): HexCoord {
  return { q: a.q + b.q, r: a.r + b.r };
}

/** Number of hex steps between two hexes. */
export function hexDistance(a: HexCoord, b: HexCoord): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

export function hexNeighbors(h: HexCoord): HexCoord[] {
  return HEX_DIRECTIONS.map((d) => hexAdd(h, d));
}

/** All hexes within `radius` steps of `center` (inclusive). */
export function hexesInRange(center: HexCoord, radius: number): HexCoord[] {
  const out: HexCoord[] = [];
  for (let q = -radius; q <= radius; q++) {
    const rMin = Math.max(-radius, -q - radius);
    const rMax = Math.min(radius, -q + radius);
    for (let r = rMin; r <= rMax; r++) out.push({ q: center.q + q, r: center.r + r });
  }
  return out;
}

/** Pixel center of a hex (pointy-top) for a given hex `size` (center-to-corner). */
export function hexToPixel(h: HexCoord, size: number): { x: number; y: number } {
  return {
    x: size * Math.sqrt(3) * (h.q + h.r / 2),
    y: size * 1.5 * h.r,
  };
}

/** Corner points of a pointy-top hex centered at the origin. */
export function hexCorners(size: number): Array<{ x: number; y: number }> {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30);
    return { x: size * Math.cos(angle), y: size * Math.sin(angle) };
  });
}

/** Round fractional axial coordinates to the nearest hex (cube rounding). */
export function hexRound(q: number, r: number): HexCoord {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  // Avoid -0 so keys and equality stay clean.
  return { q: rq + 0, r: rr + 0 };
}

/** Hex containing a pixel point (inverse of `hexToPixel`, pointy-top). */
export function pixelToHex(x: number, y: number, size: number): HexCoord {
  const q = ((Math.sqrt(3) / 3) * x - y / 3) / size;
  const r = ((2 / 3) * y) / size;
  return hexRound(q, r);
}
