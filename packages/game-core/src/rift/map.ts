import type { RoomType } from '@realms/shared';
import { Rng } from '../combat/rng.js';

/*
 * The Rift map (request #31): a Slay-the-Spire-style branching map,
 * generated procedurally from a template (data) with controlled rules.
 *
 * Generation:
 *  1. Draw `paths` walks from row 0 to the last row, one lane step at a time
 *     (left, straight or right), never crossing an existing connection.
 *     Walks that meet share rooms, so branches split and converge.
 *  2. Each walk has a theme (safe, exploration, loot, danger, mixed) whose
 *     weights pick the types of the rooms it creates, under the rules
 *     (fixed first/last rows, earliest Elite/Loot row, no two Campsites in a
 *     row, …).
 *  3. All rooms of the last row lead to the boss.
 *  4. Secret rooms are attached to some rooms: hidden, they lead from that
 *     room to the rooms two rows ahead (an alternative branch).
 *  5. The result is validated (room count, minimum of each type, at least
 *     one convergence). An invalid map is regenerated (deterministically).
 */

export type PathTheme = 'safe' | 'explore' | 'loot' | 'danger' | 'mixed';

export interface MapTemplate {
  /** Rows before the boss row. */
  rows: number;
  /** Lanes (width of the map). */
  cols: number;
  /** Walks drawn from the entrance to the boss. */
  paths: number;
  /** The dungeon must have at least this many rooms (boss included, secrets excluded). */
  minRooms: number;
  firstRow: RoomType;
  /** Row just before the boss (e.g. a Campsite). */
  lastRow: RoomType;
  /** Room-type weights per path theme (only regular rows). */
  themes: Record<PathTheme, Partial<Record<RoomType, number>>>;
  rules: {
    minEliteRow: number;
    minLootRow: number;
    /** These types never follow themselves on a path. */
    noConsecutive: RoomType[];
    minCounts: Partial<Record<RoomType, number>>;
  };
  secrets: { min: number; max: number; minRow: number };
}

export interface RiftMapNode {
  id: string;
  row: number;
  col: number;
  type: RoomType;
  theme: PathTheme | null;
  /** Secret rooms: the room they hang from. */
  anchorId: string | null;
  /** Combat/Elite: index into the Rift's encounter pool. Event: event id. */
  encounter: number | null;
  eventId: string | null;
}

export interface RiftMap {
  /** Rows including the boss row. */
  rows: number;
  cols: number;
  nodes: RiftMapNode[];
  edges: Array<[string, string]>;
  bossId: string;
}

export interface MapContentPools {
  combat: number;
  elite: number;
  events: string[];
}

const THEME_ORDER: PathTheme[] = ['safe', 'explore', 'loot', 'danger', 'mixed'];
const MAX_ATTEMPTS = 200;

export const nodeId = (row: number, col: number) => `r${row}c${col}`;
export const childrenOf = (map: Pick<RiftMap, 'edges'>, id: string) =>
  map.edges.filter(([a]) => a === id).map(([, b]) => b);
export const parentsOf = (map: Pick<RiftMap, 'edges'>, id: string) =>
  map.edges.filter(([, b]) => b === id).map(([a]) => a);
export const findNode = (map: Pick<RiftMap, 'nodes'>, id: string) =>
  map.nodes.find((n) => n.id === id);

function weighted<T extends string>(rng: Rng, weights: Array<[T, number]>): T | null {
  const total = weights.reduce((s, [, w]) => s + Math.max(0, w), 0);
  if (total <= 0) return null;
  let r = rng.next() * total;
  for (const [k, w] of weights) if ((r -= Math.max(0, w)) < 0) return k;
  return weights[weights.length - 1]![0];
}

function shuffle<T>(rng: Rng, list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Two connections between the same rows cross if their lanes swap order. */
function crosses(edges: Set<string>, row: number, from: number, to: number, cols: number): boolean {
  for (let a = 0; a < cols; a++)
    for (let b = 0; b < cols; b++) {
      if (a === from) continue;
      if (!edges.has(`${row}:${a}>${b}`)) continue;
      if ((a < from && b > to) || (a > from && b < to)) return true;
    }
  return false;
}

/** Draw the walks: returns the lanes visited per row and the connections. */
function drawWalks(t: MapTemplate, rng: Rng) {
  const edges = new Set<string>();
  const created = new Map<string, PathTheme>();
  const themes = shuffle(rng, THEME_ORDER);
  const starts = shuffle(
    rng,
    Array.from({ length: t.cols }, (_, i) => i),
  );
  for (let p = 0; p < t.paths; p++) {
    const theme = themes[p % themes.length]!;
    // The first walks start apart, so there are always several entrances.
    let col = p < Math.min(2, t.cols) ? starts[p]! : rng.int(t.cols);
    if (!created.has(nodeId(0, col))) created.set(nodeId(0, col), theme);
    for (let row = 0; row < t.rows - 1; row++) {
      const options = shuffle(
        rng,
        [col - 1, col, col + 1].filter((c) => c >= 0 && c < t.cols),
      );
      let next = options.find((c) => !crosses(edges, row, col, c, t.cols));
      // Boxed in: follow a connection that already leaves this room.
      if (next === undefined) next = options.find((c) => edges.has(`${row}:${col}>${c}`)) ?? col;
      edges.add(`${row}:${col}>${next}`);
      col = next;
      if (!created.has(nodeId(row + 1, col))) created.set(nodeId(row + 1, col), theme);
    }
  }
  return { edges, created };
}

/**
 * Attach a hidden secret room to `anchorId`: it leads to the rooms two rows
 * ahead (or the boss). Returns the secret's id, or null if there is no room
 * for one (anchor too close to the boss, or one already hangs there).
 */
export function attachSecret(map: RiftMap, anchorId: string): string | null {
  const anchor = findNode(map, anchorId);
  if (!anchor || anchor.type === 'secret' || anchor.type === 'boss') return null;
  if (anchor.row + 1 >= map.rows - 1) return null;
  if (map.nodes.some((n) => n.anchorId === anchorId)) return null;
  const regularChildren = childrenOf(map, anchorId).filter(
    (id) => findNode(map, id)?.type !== 'secret',
  );
  const targets = [...new Set(regularChildren.flatMap((c) => childrenOf(map, c)))].filter(
    (id) => findNode(map, id)?.type !== 'secret',
  );
  if (!targets.length) return null;
  const id = `s${map.nodes.filter((n) => n.type === 'secret').length + 1}`;
  map.nodes.push({
    id,
    row: anchor.row + 1,
    // Drawn half a lane beside its anchor.
    col: anchor.col + (anchor.col < map.cols - 1 ? 0.5 : -0.5),
    type: 'secret',
    theme: null,
    anchorId,
    encounter: null,
    eventId: null,
  });
  map.edges.push([anchorId, id]);
  for (const to of targets) map.edges.push([id, to]);
  return id;
}

function assignTypes(t: MapTemplate, rng: Rng, map: RiftMap): void {
  const byRow = (r: number) => map.nodes.filter((n) => n.row === r && n.type !== 'boss');
  for (let row = 0; row < t.rows; row++) {
    for (const node of byRow(row)) {
      if (row === 0) {
        node.type = t.firstRow;
        continue;
      }
      if (row === t.rows - 1) {
        node.type = t.lastRow;
        continue;
      }
      const parents = parentsOf(map, node.id)
        .map((id) => findNode(map, id)!)
        .filter(Boolean);
      const weights = Object.entries(t.themes[node.theme ?? 'mixed']) as Array<[RoomType, number]>;
      const allowed = weights.filter(([type]) => {
        if (type === 'boss' || type === 'secret') return false;
        if (type === 'elite' && row < t.rules.minEliteRow) return false;
        if (type === 'loot' && row < t.rules.minLootRow) return false;
        if (t.rules.noConsecutive.includes(type)) {
          if (parents.some((p) => p.type === type)) return false;
          if (row === t.rows - 2 && t.lastRow === type) return false;
        }
        return true;
      });
      node.type = weighted(rng, allowed) ?? 'combat';
    }
  }
}

function assignContent(rng: Rng, map: RiftMap, pools: MapContentPools): void {
  const events = shuffle(rng, pools.events);
  let e = 0;
  for (const node of map.nodes) {
    if (node.type === 'combat' && pools.combat > 0) node.encounter = rng.int(pools.combat);
    if (node.type === 'elite' && pools.elite > 0) node.encounter = rng.int(pools.elite);
    if (node.type === 'event' && events.length) node.eventId = events[e++ % events.length]!;
  }
}

/** Problems with a generated map (empty = valid). */
export function validateMap(map: RiftMap, t: MapTemplate): string[] {
  const problems: string[] = [];
  const visible = map.nodes.filter((n) => n.type !== 'secret');
  if (visible.length < t.minRooms)
    problems.push(`only ${visible.length} rooms (min ${t.minRooms})`);
  for (const [type, min] of Object.entries(t.rules.minCounts)) {
    const n = visible.filter((x) => x.type === type).length;
    if (n < (min ?? 0)) problems.push(`${n} ${type} rooms (min ${min})`);
  }
  if (!visible.some((n) => parentsOf(map, n.id).length >= 2)) problems.push('no branches converge');
  if (map.nodes.filter((n) => n.row === 0).length < 2) problems.push('only one entrance');
  // Every room reaches the boss; every room is reachable from an entrance.
  const reach = new Set<string>();
  const stack = map.nodes.filter((n) => n.row === 0).map((n) => n.id);
  while (stack.length) {
    const id = stack.pop()!;
    if (reach.has(id)) continue;
    reach.add(id);
    stack.push(...childrenOf(map, id));
  }
  for (const n of map.nodes) {
    if (!reach.has(n.id)) problems.push(`${n.id} is unreachable`);
    if (n.type !== 'boss' && childrenOf(map, n.id).length === 0)
      problems.push(`${n.id} is a dead end`);
  }
  return problems;
}

/** Generate a valid map from a template. Deterministic for a seed. */
export function generateRiftMap(t: MapTemplate, pools: MapContentPools, seed: number): RiftMap {
  const rng = new Rng(seed);
  let last: string[] = [];
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const { edges, created } = drawWalks(t, rng);
    const map: RiftMap = { rows: t.rows + 1, cols: t.cols, nodes: [], edges: [], bossId: 'boss' };
    for (const [id, theme] of created) {
      const [, r, c] = /^r(\d+)c(\d+)$/.exec(id)!;
      map.nodes.push({
        id,
        row: Number(r),
        col: Number(c),
        type: 'combat',
        theme,
        anchorId: null,
        encounter: null,
        eventId: null,
      });
    }
    map.nodes.sort((a, b) => a.row - b.row || a.col - b.col);
    for (const key of edges) {
      const [, r, a, b] = /^(\d+):(\d+)>(\d+)$/.exec(key)!;
      map.edges.push([nodeId(Number(r), Number(a)), nodeId(Number(r) + 1, Number(b))]);
    }
    map.nodes.push({
      id: 'boss',
      row: t.rows,
      col: (t.cols - 1) / 2,
      type: 'boss',
      theme: null,
      anchorId: null,
      encounter: null,
      eventId: null,
    });
    for (const n of map.nodes) if (n.row === t.rows - 1) map.edges.push([n.id, 'boss']);
    assignTypes(t, rng, map);

    const anchors = shuffle(
      rng,
      map.nodes.filter(
        (n) =>
          n.row >= t.secrets.minRow &&
          n.row <= t.rows - 3 &&
          n.type !== 'campsite' &&
          n.type !== 'boss',
      ),
    );
    const wanted = t.secrets.min + rng.int(t.secrets.max - t.secrets.min + 1);
    let placed = 0;
    for (const a of anchors) {
      if (placed >= wanted) break;
      if (attachSecret(map, a.id)) placed++;
    }
    last = validateMap(map, t);
    if (placed < t.secrets.min) last.push(`only ${placed} secret rooms`);
    if (last.length === 0) {
      assignContent(rng, map, pools);
      return map;
    }
  }
  throw new Error(`Could not generate a valid Rift map: ${last.join('; ')}`);
}

/** Every path from an entrance to the boss (visible rooms only). For tests and tools. */
export function allPaths(map: RiftMap, includeSecrets = false): string[][] {
  const out: string[][] = [];
  const ok = (id: string) => includeSecrets || findNode(map, id)?.type !== 'secret';
  const walk = (id: string, acc: string[]) => {
    const next = [...acc, id];
    if (id === map.bossId) return void out.push(next);
    for (const c of childrenOf(map, id)) if (ok(c)) walk(c, next);
  };
  for (const n of map.nodes.filter((x) => x.row === 0)) walk(n.id, []);
  return out;
}
