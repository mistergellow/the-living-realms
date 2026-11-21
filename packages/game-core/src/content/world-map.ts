import type { HexCoord } from '@realms/shared';
import { hexDistance, hexKey, hexNeighbors } from '../hex.js';

/*
 * The world map: one continent split into four regions (placeholder layout,
 * names and sizes — see docs/REQUESTS.md "Decisões em aberto"):
 *
 *   - three nations: one to the west, one to the east, one to the north;
 *   - the Riftlands: the neutral, Rift-infected land between them.
 *
 * The map is pure data generated deterministically from the constants below,
 * so the server (authoritative) and the client (rendering) always agree.
 * Terrain and per-hex AP costs come later.
 */

export const REGION_IDS = ['west', 'east', 'north', 'riftlands'] as const;
export type RegionId = (typeof REGION_IDS)[number];

export interface RegionDef {
  id: RegionId;
  name: string;
  kind: 'nation' | 'neutral';
  description: string;
  /** Capital city (nations only): exactly one hex. */
  capital: { name: string; hex: HexCoord } | null;
}

export const REGIONS: Readonly<Record<RegionId, RegionDef>> = {
  west: {
    id: 'west',
    name: 'Kingdom of the West',
    kind: 'nation',
    description: 'A nation on the western side of the continent.',
    capital: { name: 'West Capital', hex: { q: -14, r: 2 } },
  },
  east: {
    id: 'east',
    name: 'Kingdom of the East',
    kind: 'nation',
    description: 'A nation on the eastern side of the continent.',
    capital: { name: 'East Capital', hex: { q: 12, r: 2 } },
  },
  north: {
    id: 'north',
    name: 'Kingdom of the North',
    kind: 'nation',
    description: 'A nation in the north of the continent.',
    capital: { name: 'North Capital', hex: { q: 5, r: -10 } },
  },
  riftlands: {
    id: 'riftlands',
    name: 'The Riftlands',
    kind: 'neutral',
    description: 'Neutral land between the nations, infected by the Rifts.',
    capital: null,
  },
};

/** Half-width of the continent, in hex columns from the centre. */
export const CONTINENT_HALF_WIDTH = 22;
/** Half-height of the continent, in hex rows from the centre. */
export const CONTINENT_HALF_HEIGHT = 16;
/** Heart of the Riftlands: the middle of the continent, open to the southern coast. */
export const RIFTLANDS_CENTER: HexCoord = { q: -3, r: 6 };
/**
 * Hexes are split between the capitals and the Riftlands' heart by distance;
 * distances to the heart are multiplied by this (< 1 = larger Riftlands).
 */
export const RIFTLANDS_WEIGHT = 0.8;

export interface MapHex {
  q: number;
  r: number;
  region: RegionId;
  /** Name of the capital when this hex is one. */
  capital: string | null;
}

/** Stable pseudo-random value per hex in [0, 1) (no Math.random: deterministic). */
function noise(q: number, r: number, seed: number): number {
  let n = (q * 374761393 + r * 668265263 + seed * 2147483647) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 2 ** 32;
}

/** Noise smoothed over the hex and its ring, so coasts and borders are not jagged. */
function smoothNoise(q: number, r: number, seed: number): number {
  let sum = noise(q, r, seed) * 2;
  for (const [dq, dr] of [
    [1, 0],
    [1, -1],
    [0, -1],
    [-1, 0],
    [-1, 1],
    [0, 1],
  ] as const)
    sum += noise(q + dq, r + dr, seed);
  return sum / 8;
}

function isLand(q: number, r: number): boolean {
  // Ellipse in "column/row" space (pointy-top: x = q + r/2 columns, y = r rows).
  const x = (q + r / 2) / CONTINENT_HALF_WIDTH;
  const y = r / CONTINENT_HALF_HEIGHT;
  const d = Math.hypot(x, y);
  return d + (smoothNoise(q, r, 1) - 0.5) * 0.35 < 1;
}

const NATIONS = REGION_IDS.filter((id) => REGIONS[id].kind === 'nation');

function regionOf(h: HexCoord): RegionId {
  // Nearest seed wins; a little noise keeps the borders from being straight lines.
  let best: RegionId = 'riftlands';
  let bestD = hexDistance(h, RIFTLANDS_CENTER) * RIFTLANDS_WEIGHT;
  for (const id of NATIONS) {
    const d = hexDistance(h, REGIONS[id].capital!.hex) + (smoothNoise(h.q, h.r, 2) - 0.5) * 3;
    if (d < bestD) {
      bestD = d;
      best = id;
    }
  }
  return best;
}

function buildMap(): Map<string, MapHex> {
  const land = new Set<string>();
  const R = Math.max(CONTINENT_HALF_WIDTH, CONTINENT_HALF_HEIGHT) + 4;
  for (let r = -R; r <= R; r++)
    for (let q = -R - R; q <= R + R; q++) if (isLand(q, r)) land.add(hexKey({ q, r }));
  for (const id of NATIONS) land.add(hexKey(REGIONS[id].capital!.hex));

  // Keep only the land connected to the centre: no unreachable islets.
  const out = new Map<string, MapHex>();
  const queue: HexCoord[] = [{ q: 0, r: 0 }];
  while (queue.length) {
    const h = queue.pop()!;
    const k = hexKey(h);
    if (!land.has(k) || out.has(k)) continue;
    out.set(k, { q: h.q, r: h.r, region: regionOf(h), capital: null });
    queue.push(...hexNeighbors(h));
  }
  // Capitals are always land and always belong to their nation.
  for (const id of NATIONS) {
    const c = REGIONS[id].capital!;
    out.set(hexKey(c.hex), { ...c.hex, region: id, capital: c.name });
  }
  return out;
}

const WORLD_MAP = buildMap();

/** Every land hex of the continent. */
export function worldMapHexes(): MapHex[] {
  return [...WORLD_MAP.values()];
}

/** The map hex at `h`, or `null` when it is sea (off the continent). */
export function mapHexAt(h: HexCoord): MapHex | null {
  return WORLD_MAP.get(hexKey(h)) ?? null;
}

/** Region of a hex, or `null` when it is sea. */
export function regionAt(h: HexCoord): RegionDef | null {
  const m = mapHexAt(h);
  return m ? REGIONS[m.region] : null;
}
