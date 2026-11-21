import type { HexCoord, NationId } from '@realms/shared';
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

/**
 * Terrain of a hex (request #43). Gathering professions need the right terrain
 * (see `GATHERING_TERRAIN` in content/professions.ts). PLACEHOLDER generation.
 */
export const TERRAINS = ['plains', 'forest', 'river', 'mountain', 'city'] as const;
export type Terrain = (typeof TERRAINS)[number];

export const TERRAIN_NAMES: Readonly<Record<Terrain, string>> = {
  plains: 'Plains',
  forest: 'Forest',
  river: 'River',
  mountain: 'Mountains (mines)',
  city: 'City',
};

/** Rift difficulty tiers (request #43): deeper in the Riftlands = higher tier. */
export const RIFT_TIERS = 5;
/** How many Rift entrances exist on the map (placeholder, A80). */
export const RIFT_SITE_COUNT = 14;

export interface MapHex {
  q: number;
  r: number;
  region: RegionId;
  terrain: Terrain;
  /** Name of the capital when this hex is one. */
  capital: string | null;
  /**
   * How deep into the Riftlands (0 = edge, 1 = the heart); null outside them.
   * Rifts and the Rift threat get harder with depth.
   */
  riftDepth: number | null;
  /** A Rift entrance on this hex, with its difficulty tier (1 … RIFT_TIERS). */
  rift: { id: string; tier: number } | null;
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

/** Rough height: high inland, low by the sea (with noise) — for mountains and rivers. */
function heightOf(q: number, r: number): number {
  const x = (q + r / 2) / CONTINENT_HALF_WIDTH;
  const y = r / CONTINENT_HALF_HEIGHT;
  return 1 - Math.hypot(x, y) + (smoothNoise(q, r, 3) - 0.5) * 0.9;
}

function baseTerrain(h: HexCoord): Terrain {
  if (smoothNoise(h.q, h.r, 3) > 0.6 && heightOf(h.q, h.r) > 0.25) return 'mountain';
  if (smoothNoise(h.q, h.r, 4) > 0.53) return 'forest';
  return 'plains';
}

/** Rivers run from mountains down to the sea, always to the lowest neighbour. */
function carveRivers(map: Map<string, MapHex>) {
  const mountains = [...map.values()].filter((h) => h.terrain === 'mountain');
  // One source per region: its highest mountain.
  const sources: MapHex[] = [];
  for (const id of REGION_IDS) {
    const best = mountains
      .filter((h) => h.region === id)
      .sort((a, b) => heightOf(b.q, b.r) - heightOf(a.q, a.r))[0];
    if (best) sources.push(best);
  }
  for (const src of sources) {
    let cur: HexCoord = src;
    const seen = new Set<string>();
    for (let step = 0; step < 60; step++) {
      seen.add(hexKey(cur));
      const next = hexNeighbors(cur)
        .filter((n) => !seen.has(hexKey(n)))
        .sort((a, b) => heightOf(a.q, a.r) - heightOf(b.q, b.r))[0];
      if (!next) break;
      const m = map.get(hexKey(next));
      if (!m) break; // reached the sea
      if (m.capital) break;
      if (m.terrain === 'river') break; // joined another river
      m.terrain = 'river';
      cur = next;
    }
  }
}

/** Rift entrances: spread over the Riftlands, harder towards the heart. */
function placeRifts(map: Map<string, MapHex>) {
  const rift = [...map.values()].filter((h) => h.region === 'riftlands');
  const maxD = Math.max(...rift.map((h) => hexDistance(h, RIFTLANDS_CENTER)), 1);
  for (const h of rift)
    h.riftDepth = Math.round((1 - hexDistance(h, RIFTLANDS_CENTER) / maxD) * 100) / 100;
  // The heart always has a Rift; then the most "noisy" hexes, at least 4 apart.
  const candidates = rift
    .filter((h) => h.terrain !== 'river')
    .sort((a, b) => noise(b.q, b.r, 7) - noise(a.q, a.r, 7));
  const heart = map.get(hexKey(RIFTLANDS_CENTER));
  const chosen: MapHex[] = heart ? [heart] : [];
  for (const c of candidates) {
    if (chosen.length >= RIFT_SITE_COUNT) break;
    if (chosen.every((o) => hexDistance(o, c) >= 4)) chosen.push(c);
  }
  for (const h of chosen) {
    const tier = Math.min(RIFT_TIERS, 1 + Math.floor((h.riftDepth ?? 0) * RIFT_TIERS));
    h.rift = { id: `rift_${h.q}_${h.r}`.replace(/-/g, 'm'), tier };
  }
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
    out.set(k, {
      q: h.q,
      r: h.r,
      region: regionOf(h),
      terrain: baseTerrain(h),
      capital: null,
      riftDepth: null,
      rift: null,
    });
    queue.push(...hexNeighbors(h));
  }
  // Capitals are always land and always belong to their nation.
  for (const id of NATIONS) {
    const c = REGIONS[id].capital!;
    out.set(hexKey(c.hex), {
      ...c.hex,
      region: id,
      terrain: 'city',
      capital: c.name,
      riftDepth: null,
      rift: null,
    });
  }
  carveRivers(out);
  placeRifts(out);
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

/** Every Rift entrance on the map. */
export function riftSites(): MapHex[] {
  return worldMapHexes().filter((h) => h.rift);
}

/** The Rift entrance with this id, or null. */
export function riftSiteById(id: string): MapHex | null {
  return riftSites().find((h) => h.rift!.id === id) ?? null;
}

/** Capital hex of a nation. */
export function capitalOf(nation: NationId): HexCoord {
  return REGIONS[nation].capital!.hex;
}
