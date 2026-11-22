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

/** How deep into the Riftlands each Riftlands hex is (0 edge … 1 heart). */
function setRiftDepth(map: Map<string, MapHex>) {
  const rift = [...map.values()].filter((h) => h.region === 'riftlands');
  const maxD = Math.max(...rift.map((h) => hexDistance(h, RIFTLANDS_CENTER)), 1);
  for (const h of rift)
    h.riftDepth = Math.round((1 - hexDistance(h, RIFTLANDS_CENTER) / maxD) * 100) / 100;
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
  setRiftDepth(out);
  return out;
}

const WORLD_MAP = buildMap();

/*
 * Rift entrances (request #55): they move every day (UTC). Each day has its
 * own layout, derived from the day number, so every server and client agrees
 * without storing anything. Threat is a pyramid: many tier-1 Rifts (some
 * inside the nations' territories), few tier-5 ones deep in the Riftlands.
 */
export const RIFT_LAYOUT_RULES = {
  /** Rifts of each tier per day (tier 1 … 5). */
  perTier: [12, 8, 5, 3, 2] as readonly number[],
  /** Minimum distance between two Rifts. */
  minSpacing: 3,
  /** Rifts never open this close to a capital. */
  capitalDistance: 3,
  /** Minimum Riftlands depth per tier (tiers 1–2 may also open in the nations). */
  minDepth: [0, 0, 0, 0.4, 0.65] as readonly number[],
  /** Tiers that may open inside a nation's territory. */
  nationTiers: [1, 2] as readonly number[],
} as const;

const DAY_MS = 86_400_000;
/** Day number (UTC) the Rift layout belongs to. */
export const riftDay = (now: Date = new Date()) => Math.floor(now.getTime() / DAY_MS);
/** When the Rifts move next (the next UTC midnight). */
export const nextRiftReset = (now: Date = new Date()) => new Date((riftDay(now) + 1) * DAY_MS);

const enc = (n: number) => String(n).replace('-', 'm');
const dec = (s: string) => Number(s.replace('m', '-'));

/** Id of a Rift entrance: position, tier and day (`rift_q_r_tier_day`). */
export const riftSiteId = (q: number, r: number, tier: number, day: number) =>
  `rift_${enc(q)}_${enc(r)}_${tier}_${day}`;

/**
 * Position, tier and day of a Rift id. Ids from before request #55
 * (`rift_q_r`) still resolve, with the tier of their depth.
 */
export function parseRiftId(
  id: string,
): { q: number; r: number; tier: number; day: number | null } | null {
  const m = /^rift_(m?\d+)_(m?\d+)(?:_(\d)_(\d+))?$/.exec(id);
  if (!m) return null;
  const q = dec(m[1]!);
  const r = dec(m[2]!);
  const h = WORLD_MAP.get(hexKey({ q, r }));
  if (!h) return null;
  if (m[3]) return { q, r, tier: Number(m[3]), day: Number(m[4]) };
  const tier = Math.min(RIFT_TIERS, 1 + Math.floor((h.riftDepth ?? 0) * RIFT_TIERS));
  return { q, r, tier, day: null };
}

const layouts = new Map<number, Map<string, { id: string; tier: number }>>();

/** The Rift entrances of a day: hex key → { id, tier }. */
export function riftLayout(day: number): Map<string, { id: string; tier: number }> {
  const cached = layouts.get(day);
  if (cached) return cached;
  const capitals = NATIONS.map((id) => REGIONS[id].capital!.hex);
  const land = [...WORLD_MAP.values()].filter(
    (h) =>
      h.terrain !== 'river' &&
      h.terrain !== 'city' &&
      capitals.every((c) => hexDistance(c, h) >= RIFT_LAYOUT_RULES.capitalDistance),
  );
  // A different shuffle every day.
  const order = [...land].sort(
    (a, b) => noise(a.q, a.r, 1000 + (day % 100_000)) - noise(b.q, b.r, 1000 + (day % 100_000)),
  );
  const chosen: Array<{ h: MapHex; tier: number }> = [];
  // Hardest first, so the deep hexes go to the high tiers.
  for (let tier = RIFT_TIERS; tier >= 1; tier--) {
    let left = RIFT_LAYOUT_RULES.perTier[tier - 1] ?? 0;
    const inNations = RIFT_LAYOUT_RULES.nationTiers.includes(tier);
    for (const h of order) {
      if (left <= 0) break;
      const riftlands = h.region === 'riftlands';
      if (!riftlands && !inNations) continue;
      if (riftlands && (h.riftDepth ?? 0) < (RIFT_LAYOUT_RULES.minDepth[tier - 1] ?? 0)) continue;
      if (chosen.some((c) => hexDistance(c.h, h) < RIFT_LAYOUT_RULES.minSpacing)) continue;
      chosen.push({ h, tier });
      left--;
    }
  }
  const out = new Map(
    chosen.map(({ h, tier }) => [hexKey(h), { id: riftSiteId(h.q, h.r, tier, day), tier }]),
  );
  if (layouts.size > 8) layouts.clear();
  layouts.set(day, out);
  return out;
}

const withRift = (h: MapHex, day: number): MapHex => ({
  ...h,
  rift: riftLayout(day).get(hexKey(h)) ?? null,
});

/** Every land hex of the continent, with today's Rift entrances. */
export function worldMapHexes(now: Date = new Date()): MapHex[] {
  const day = riftDay(now);
  return [...WORLD_MAP.values()].map((h) => withRift(h, day));
}

/** The map hex at `h` (with today's Rift, if any), or `null` when it is sea. */
export function mapHexAt(h: HexCoord, now: Date = new Date()): MapHex | null {
  const m = WORLD_MAP.get(hexKey(h));
  return m ? withRift(m, riftDay(now)) : null;
}

/** Region of a hex, or `null` when it is sea. */
export function regionAt(h: HexCoord): RegionDef | null {
  const m = WORLD_MAP.get(hexKey(h));
  return m ? REGIONS[m.region] : null;
}

/** Today's Rift entrances. */
export function riftSites(now: Date = new Date()): MapHex[] {
  return worldMapHexes(now).filter((h) => h.rift);
}

/**
 * The hex of a Rift id with its Rift (any day: a run that started yesterday
 * still knows where it is), or null.
 */
export function riftSiteById(id: string): MapHex | null {
  const p = parseRiftId(id);
  const h = p && WORLD_MAP.get(hexKey(p));
  return h && p ? { ...h, rift: { id, tier: p.tier } } : null;
}

/** Whether a Rift entrance is open now (Rifts move every day). */
export function isRiftOpen(id: string, now: Date = new Date()): boolean {
  const p = parseRiftId(id);
  if (!p) return false;
  return riftLayout(riftDay(now)).get(hexKey(p))?.id === id;
}

/** Capital hex of a nation. */
export function capitalOf(nation: NationId): HexCoord {
  return REGIONS[nation].capital!.hex;
}
