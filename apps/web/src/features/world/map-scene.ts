import {
  HEX_DIRECTIONS,
  REGIONS,
  REGION_IDS,
  RIFTLANDS_CENTER,
  hexAdd,
  hexCorners,
  hexKey,
  hexToPixel,
  mapHexAt,
  pixelToHex,
  worldMapHexes,
  type MapHex,
} from '@realms/game-core';
import type { HexCoord, PresencePlayer } from '@realms/shared';
import {
  BitmapText,
  Container,
  Graphics,
  Sprite,
  Text,
  type Application,
  type Ticker,
} from 'pixi.js';
import { portraitTexture } from '../render/avatar-textures';
import { glowTexture, vignetteTexture } from '../render/svg-texture';
import type { PixiScene } from '../render/usePixiScene';
import { REGION_COLORS } from './region-colors';
import { clampToBounds, fitZoom, screenToWorld, zoomAt, type Camera } from './map-camera';

/*
 * World map renderer (PixiJS, ADR-029, ADR-040): the whole continent coloured
 * by region (three nations + the Riftlands), borders, coast and capitals,
 * player tokens, hover/selection, and a camera you can drag, zoom (wheel,
 * pinch, buttons, + / − keys) and recenter. Terrain, fog of war and movement
 * come later; the server stays the source of truth for positions.
 */

/** Hex size (centre to corner) in world units. */
export const HEX_SIZE = 34;
/** Rings that fit the view when the map opens. */
const VIEW_RADIUS = 5;

const MAP_HEXES: readonly MapHex[] = worldMapHexes();
/** Centre and radius (world units) of the continent, for the camera and the mist. */
const MAP_BOUNDS = (() => {
  const pts = MAP_HEXES.map((h) => hexToPixel(h, HEX_SIZE));
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const x = (Math.min(...xs) + Math.max(...xs)) / 2;
  const y = (Math.min(...ys) + Math.max(...ys)) / 2;
  const radius = Math.max(...pts.map((p) => Math.hypot(p.x - x, p.y - y))) + HEX_SIZE;
  return { x, y, radius };
})();

const C = {
  bg: 0x0b0d12,
  fill: 0x1a2030,
  fillAlt: 0x1f2638,
  stroke: 0x2f374b,
  hover: 0x2a3350,
  selected: 0x3a3420,
  accent: 0xd4a64a,
  accentStrong: 0xe8bd5f,
  ink: 0x1a1408,
  text: 0xe7e3d8,
  faint: 0x6b7283,
};
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const CORNERS = hexCorners(HEX_SIZE - 1).flatMap((p) => [p.x, p.y]);

export interface MapSceneData {
  center: HexCoord;
  players: PresencePlayer[];
  selfId: string | null;
  selected: HexCoord | null;
  /** Where the season's world boss stands (request #43), if known. */
  boss: HexCoord | null;
}

export interface MapSceneCallbacks {
  onSelect: (h: HexCoord) => void;
  onHover: (h: HexCoord | null) => void;
}

function mix(a: number, b: number, t: number): number {
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t) << s;
  return ch(16) | ch(8) | ch(0);
}

/** Terrain changes the region colour (request #43): water, rock and deep forest. */
function terrainTint(base: number, terrain: MapHex['terrain']): number {
  if (terrain === 'river') return mix(base, 0x2f6fb0, 0.6);
  if (terrain === 'mountain') return mix(base, 0x6f6a60, 0.45);
  if (terrain === 'forest') return mix(base, 0x16351c, 0.3);
  return base;
}

/** Stable pseudo-random value per hex in [0, 1). */
function hexNoise(h: HexCoord): number {
  let n = (h.q * 374761393 + h.r * 668265263) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 2 ** 32;
}

class Token {
  readonly root = new Container();
  private readonly ring = new Graphics();
  private readonly frame = new Graphics();
  private readonly portrait = new Sprite();
  private readonly label: Text;
  private readonly badge = new Container();
  private readonly badgeText: Text;
  readonly phase = Math.random() * Math.PI * 2;
  shownId = '';
  isSelf = false;

  constructor() {
    this.portrait.anchor.set(0.5);
    this.label = new Text({
      text: '',
      style: {
        fontFamily: FONT,
        fontSize: 11,
        fontWeight: '700',
        fill: C.text,
        stroke: { color: 0x000000, width: 3, join: 'round' },
      },
      resolution: 3,
    });
    this.label.anchor.set(0.5, 0);
    this.label.position.set(0, 22);
    this.badgeText = new Text({
      text: '',
      style: { fontFamily: FONT, fontSize: 10, fontWeight: '800', fill: C.ink },
      resolution: 3,
    });
    this.badgeText.anchor.set(0.5);
    const disc = new Graphics().circle(0, 0, 8).fill(C.accent).stroke({ width: 1.5, color: C.ink });
    this.badge.addChild(disc, this.badgeText);
    this.badge.position.set(15, -15);
    this.root.addChild(this.ring, this.frame, this.portrait, this.label, this.badge);
  }

  set(players: PresencePlayer[], selfId: string | null) {
    const shown = players.find((p) => p.characterId === selfId) ?? players[0]!;
    this.isSelf = players.some((p) => p.characterId === selfId);
    const name = players.length > 1 ? `${shown.name} +${players.length - 1}` : shown.name;
    if (this.label.text !== name) this.label.text = name;
    this.badge.visible = players.length > 1;
    this.badgeText.text = String(players.length);
    this.frame
      .clear()
      .circle(0, 0, 18)
      .fill(C.bg)
      .stroke({ width: this.isSelf ? 2.5 : 1.5, color: this.isSelf ? C.accentStrong : C.accent });
    const key = `${shown.characterId}:${JSON.stringify(shown.appearance)}`;
    if (key !== this.shownId) {
      this.shownId = key;
      void portraitTexture(shown.appearance)
        .then((t) => {
          if (this.root.destroyed) return;
          this.portrait.texture = t;
          this.portrait.width = 34;
          this.portrait.height = 34;
        })
        .catch((err) => console.warn('Could not load portrait', err));
    }
  }

  animate(t: number, zoom: number, reduced: boolean) {
    const bob = reduced ? 0 : Math.sin(t / 700 + this.phase) * 1.5;
    this.frame.y = this.portrait.y = bob;
    this.label.visible = zoom >= 0.75;
    this.ring.clear();
    if (this.isSelf) {
      const p = (t % 1800) / 1800;
      this.ring
        .circle(0, bob, 18 + p * 14)
        .stroke({ width: 2, color: C.accentStrong, alpha: (1 - p) * 0.7 });
    }
  }
}

export class MapScene implements PixiScene {
  private readonly world = new Container();
  private readonly hexFill = new Graphics();
  private readonly hexLines = new Graphics();
  private readonly borderG = new Graphics();
  private readonly capitalLayer = new Container();
  private readonly terrainG = new Graphics();
  private readonly siteLayer = new Container();
  private readonly bossMarker = new Container();
  private bossKey = '';
  private readonly regionLabels = new Container();
  private readonly labelAnchors: Array<{ t: Text; y: number; below: boolean }> = [];
  private readonly hoverG = new Graphics();
  private readonly selectedG = new Graphics();
  private readonly selfG = new Graphics();
  private readonly selfGlow = new Sprite(glowTexture());
  private readonly coordLayer = new Container();
  private readonly tokenLayer = new Container();
  private readonly fogLayer = new Container();
  private readonly vignette = new Sprite(vignetteTexture(0.7));
  private readonly coords = new Map<string, BitmapText>();
  private readonly tokens = new Map<string, Token>();
  private readonly fog: Array<{ s: Sprite; vx: number }> = [];

  private data: MapSceneData | null = null;
  private gridBuilt = false;
  private centerKey = '';
  private width: number;
  private height: number;
  private cam: Camera = { x: 0, y: 0, zoom: 1 };
  private target: Camera = { x: 0, y: 0, zoom: 1 };
  private hovered: HexCoord | null = null;
  private time = 0;
  private destroyed = false;

  private readonly pointers = new Map<number, { x: number; y: number }>();
  private dragging = false;
  private moved = 0;
  private pinchDist = 0;

  constructor(
    private readonly app: Application,
    width: number,
    height: number,
    private readonly host: HTMLElement,
    private readonly cb: MapSceneCallbacks,
    private readonly opts: { reducedMotion: boolean },
  ) {
    this.width = width;
    this.height = height;
    this.selfGlow.anchor.set(0.5);
    this.selfGlow.blendMode = 'add';
    this.selfGlow.tint = C.accent;
    this.world.addChild(
      this.hexFill,
      this.hoverG,
      this.hexLines,
      this.terrainG,
      this.borderG,
      this.selectedG,
      this.selfGlow,
      this.selfG,
      this.coordLayer,
      this.capitalLayer,
      this.siteLayer,
      this.bossMarker,
      this.tokenLayer,
      this.regionLabels,
      this.fogLayer,
    );
    app.stage.addChild(this.world, this.vignette);
    app.stage.eventMode = 'none';
    app.ticker.add(this.tick);

    host.addEventListener('pointerdown', this.onDown);
    host.addEventListener('pointermove', this.onMove);
    host.addEventListener('pointerup', this.onUp);
    host.addEventListener('pointercancel', this.onUp);
    host.addEventListener('pointerleave', this.onLeave);
    host.addEventListener('wheel', this.onWheel, { passive: false });
    host.addEventListener('keydown', this.onKey);
    this.resize(width, height);
  }

  setData(d: MapSceneData) {
    if (this.destroyed) return;
    const prev = this.data;
    this.data = d;
    if (!this.gridBuilt) {
      this.gridBuilt = true;
      this.buildGrid();
    }
    const key = hexKey(d.center);
    if (key !== this.centerKey) {
      const first = this.centerKey === '';
      this.centerKey = key;
      const c = hexToPixel(d.center, HEX_SIZE);
      if (first) {
        const zoom = fitZoom(this.width, this.height, HEX_SIZE * (VIEW_RADIUS * 2 + 1) * 0.95);
        this.cam = this.target = { x: c.x, y: c.y, zoom };
      } else {
        this.target = { ...this.target, x: c.x, y: c.y };
      }
    }
    if (prev?.players !== d.players || prev?.selfId !== d.selfId) this.buildTokens(d);
    this.placeBoss(d.boss);
    this.drawSelected();
    this.drawSelf();
  }

  zoomBy(factor: number) {
    this.target = zoomAt(
      this.target,
      this.width,
      this.height,
      factor,
      this.width / 2,
      this.height / 2,
    );
  }

  recenter() {
    if (!this.data) return;
    const c = hexToPixel(this.data.center, HEX_SIZE);
    const zoom = fitZoom(this.width, this.height, HEX_SIZE * (VIEW_RADIUS * 2 + 1) * 0.95);
    this.target = { x: c.x, y: c.y, zoom };
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.vignette.width = width;
    this.vignette.height = height;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.app.ticker?.remove(this.tick);
    const h = this.host;
    h.removeEventListener('pointerdown', this.onDown);
    h.removeEventListener('pointermove', this.onMove);
    h.removeEventListener('pointerup', this.onUp);
    h.removeEventListener('pointercancel', this.onUp);
    h.removeEventListener('pointerleave', this.onLeave);
    h.removeEventListener('wheel', this.onWheel);
    h.removeEventListener('keydown', this.onKey);
    h.style.cursor = '';
  }

  /* -- drawing ------------------------------------------------------------ */

  private buildGrid() {
    const fill = this.hexFill.clear();
    const lines = this.hexLines.clear();
    const borders = this.borderG.clear();
    for (const t of this.coords.values()) t.destroy();
    this.coords.clear();
    this.capitalLayer.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.siteLayer.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.terrainG.clear();
    this.regionLabels.removeChildren().forEach((c) => c.destroy());
    this.labelAnchors.length = 0;
    const corners = hexCorners(HEX_SIZE);

    for (const h of MAP_HEXES) {
      const { x, y } = hexToPixel(h, HEX_SIZE);
      const pts = CORNERS.map((v, i) => v + (i % 2 === 0 ? x : y));
      const base = terrainTint(REGION_COLORS[h.region], h.terrain);
      fill.poly(pts).fill(mix(mix(base, C.bg, 0.45), base, hexNoise(h) * 0.35));
      this.drawTerrainGlyph(h, x, y);
      if (h.rift) this.siteLayer.addChild(this.riftMarker(x, y, h.rift.tier));
      lines.poly(pts).stroke({ width: 1, color: mix(base, C.text, 0.15), alpha: 0.35 });

      // Edges towards the sea (coast) or another region (border).
      HEX_DIRECTIONS.forEach((dir, i) => {
        const n = mapHexAt(hexAdd(h, dir));
        if (n && n.region === h.region) return;
        const a = corners[(6 - i) % 6]!;
        const b = corners[(7 - i) % 6]!;
        borders
          .moveTo(x + a.x, y + a.y)
          .lineTo(x + b.x, y + b.y)
          .stroke(
            n
              ? { width: 3, color: C.text, alpha: 0.55, cap: 'round' }
              : { width: 3.5, color: 0xc9b98a, alpha: 0.8, cap: 'round' },
          );
      });

      if (h.capital) {
        this.capitalLayer.addChild(this.capitalMarker(x, y, h.capital));
        continue;
      }
      const label = new BitmapText({
        text: `${h.q},${h.r}`,
        style: { fontFamily: MONO, fontSize: 9, fill: C.faint },
      });
      label.anchor.set(0.5);
      label.position.set(x, y);
      this.coordLayer.addChild(label);
      this.coords.set(hexKey(h), label);
    }

    // Region names, shown when zoomed out.
    for (const id of REGION_IDS) {
      const t = new Text({
        text: REGIONS[id].name.toUpperCase(),
        style: {
          fontFamily: FONT,
          fontSize: 30,
          fontWeight: '800',
          letterSpacing: 4,
          fill: C.text,
          stroke: { color: 0x000000, width: 5, join: 'round' },
        },
        resolution: 2,
      });
      t.anchor.set(0.5, 0);
      t.alpha = 0.85;
      // Nations: under their capital (the screen offset is set each frame); Riftlands: centre.
      const cap = REGIONS[id].capital;
      // The Riftlands' name sits further south, clear of the nations' names.
      const at = hexToPixel(cap ? cap.hex : hexAdd(RIFTLANDS_CENTER, { q: -2, r: 4 }), HEX_SIZE);
      t.position.set(at.x, at.y);
      this.regionLabels.addChild(t);
      this.labelAnchors.push({ t, y: at.y, below: cap !== null });
    }

    // Slow drifting mist over the map.
    if (!this.fog.length) {
      for (let i = 0; i < 14; i++) {
        const s = new Sprite(glowTexture());
        s.anchor.set(0.5);
        s.tint = 0x8fa2d0;
        s.alpha = 0.035 + Math.random() * 0.03;
        s.scale.set(3 + Math.random() * 3, 1.6 + Math.random() * 1.5);
        this.fogLayer.addChild(s);
        this.fog.push({ s, vx: 4 + Math.random() * 8 });
      }
    }
    const R = MAP_BOUNDS.radius;
    for (const f of this.fog)
      f.s.position.set(
        MAP_BOUNDS.x + (Math.random() - 0.5) * 2 * R,
        MAP_BOUNDS.y + (Math.random() - 0.5) * 1.4 * R,
      );
  }

  /** Terrain glyphs (request #43, placeholder art): trees, peaks, water ripples. */
  private drawTerrainGlyph(h: MapHex, x: number, y: number) {
    const g = this.terrainG;
    const j = (hexNoise(h) - 0.5) * 8;
    if (h.terrain === 'forest') {
      for (const [dx, dy] of [
        [-9, 4],
        [5, -2],
        [9, 10],
      ] as const)
        g.poly([
          x + dx + j - 6,
          y + dy + 6,
          x + dx + j,
          y + dy - 8,
          x + dx + j + 6,
          y + dy + 6,
        ]).fill({
          color: 0x14301a,
          alpha: 0.75,
        });
    } else if (h.terrain === 'mountain') {
      g.poly([x - 15, y + 10, x - 3 + j / 2, y - 12, x + 9, y + 10]).fill({
        color: 0x9a9a92,
        alpha: 0.7,
      });
      g.poly([x - 3 + j / 2, y - 12, x - 7, y - 4, x + 1, y - 4]).fill({
        color: 0xe8e8e0,
        alpha: 0.7,
      });
    } else if (h.terrain === 'river') {
      for (const dy of [-6, 2, 10])
        g.moveTo(x - 12, y + dy)
          .quadraticCurveTo(x - 4, y + dy - 5, x + 4, y + dy)
          .quadraticCurveTo(x + 10, y + dy + 4, x + 14, y + dy)
          .stroke({ width: 1.5, color: 0xbfe0ff, alpha: 0.5 });
    }
  }

  /** A Rift entrance: a purple portal with its tier (request #43). */
  private riftMarker(x: number, y: number, tier: number): Container {
    const c = new Container();
    c.position.set(x, y);
    const ring = new Graphics()
      .ellipse(0, 0, 11, 15)
      .fill({ color: 0x2a0f3d })
      .stroke({ width: 3, color: 0xc77dff })
      .ellipse(0, 0, 5, 8)
      .fill({ color: 0xe0b3ff, alpha: 0.8 });
    const label = new Text({
      text: `T${tier}`,
      style: {
        fontFamily: FONT,
        fontSize: 10,
        fontWeight: '800',
        fill: 0xf3e2ff,
        stroke: { color: 0x000000, width: 3, join: 'round' },
      },
      resolution: 3,
    });
    label.anchor.set(0.5, 0);
    label.position.set(0, 15);
    c.addChild(ring, label);
    return c;
  }

  /** The world boss marker (request #43): a red skull that pulses. */
  private placeBoss(h: HexCoord | null) {
    const key = h ? hexKey(h) : '';
    if (key === this.bossKey) return;
    this.bossKey = key;
    this.bossMarker.removeChildren().forEach((c) => c.destroy({ children: true }));
    if (!h) return;
    const { x, y } = hexToPixel(h, HEX_SIZE);
    this.bossMarker.position.set(x, y);
    const g = new Graphics()
      .circle(0, 0, 17)
      .fill({ color: 0x3a0606 })
      .stroke({ width: 3, color: 0xff4d4d })
      .circle(-5, -2, 3.5)
      .fill(0xffd0d0)
      .circle(5, -2, 3.5)
      .fill(0xffd0d0)
      .rect(-5, 6, 10, 4)
      .fill(0xffd0d0);
    const label = new Text({
      text: 'World boss',
      style: {
        fontFamily: FONT,
        fontSize: 10,
        fontWeight: '800',
        fill: 0xff9a9a,
        stroke: { color: 0x000000, width: 3, join: 'round' },
      },
      resolution: 3,
    });
    label.anchor.set(0.5, 0);
    label.position.set(0, 19);
    this.bossMarker.addChild(g, label);
  }

  /** A placeholder capital: a gold keep on its hex with the city name. */
  private capitalMarker(x: number, y: number, name: string): Container {
    const c = new Container();
    c.position.set(x, y);
    const keep = new Graphics()
      .poly([
        -11, 8, -11, -4, -7, -4, -7, -9, -3, -9, -3, -4, 3, -4, 3, -9, 7, -9, 7, -4, 11, -4, 11, 8,
      ])
      .fill(C.accent)
      .stroke({ width: 1.5, color: C.ink })
      .rect(-2.5, 1, 5, 7)
      .fill(C.ink);
    const label = new Text({
      text: name,
      style: {
        fontFamily: FONT,
        fontSize: 11,
        fontWeight: '800',
        fill: C.accentStrong,
        stroke: { color: 0x000000, width: 3, join: 'round' },
      },
      resolution: 3,
    });
    label.anchor.set(0.5, 0);
    label.position.set(0, 11);
    c.addChild(keep, label);
    return c;
  }

  private buildTokens(d: MapSceneData) {
    const byHex = new Map<string, PresencePlayer[]>();
    for (const p of d.players) {
      const k = hexKey(p.position);
      byHex.set(k, [...(byHex.get(k) ?? []), p]);
    }
    for (const [k, t] of this.tokens) {
      if (byHex.has(k)) continue;
      t.root.destroy({ children: true });
      this.tokens.delete(k);
    }
    for (const [k, players] of byHex) {
      let t = this.tokens.get(k);
      if (!t) {
        t = new Token();
        const { x, y } = hexToPixel(players[0]!.position, HEX_SIZE);
        t.root.position.set(x, y);
        this.tokens.set(k, t);
        this.tokenLayer.addChild(t.root);
      }
      t.set(players, d.selfId);
    }
    for (const [k, label] of this.coords) label.visible = !byHex.has(k);
  }

  private hexPath(g: Graphics, h: HexCoord) {
    const { x, y } = hexToPixel(h, HEX_SIZE);
    return g.poly(CORNERS.map((v, i) => v + (i % 2 === 0 ? x : y)));
  }

  private drawSelected() {
    const g = this.selectedG.clear();
    const s = this.data?.selected;
    if (s) this.hexPath(g, s).fill(C.selected).stroke({ width: 2, color: C.accent });
  }

  private drawSelf() {
    const g = this.selfG.clear();
    if (!this.data) return;
    this.hexPath(g, this.data.center).stroke({ width: 2.5, color: C.accent });
    const { x, y } = hexToPixel(this.data.center, HEX_SIZE);
    this.selfGlow.position.set(x, y);
    this.selfGlow.scale.set((HEX_SIZE * 2.4) / 128);
  }

  private drawHover() {
    const g = this.hoverG.clear();
    const h = this.hovered;
    if (!h || (this.data?.selected && hexKey(this.data.selected) === hexKey(h))) return;
    this.hexPath(g, h).fill(C.hover);
  }

  /* -- input -------------------------------------------------------------- */

  private local(e: PointerEvent | WheelEvent) {
    const r = this.host.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private hexAt(sx: number, sy: number): HexCoord | null {
    if (!this.data) return null;
    const w = screenToWorld(this.cam, this.width, this.height, sx, sy);
    const h = pixelToHex(w.x, w.y, HEX_SIZE);
    return mapHexAt(h) ? h : null;
  }

  private setHover(h: HexCoord | null) {
    const same = h && this.hovered ? hexKey(h) === hexKey(this.hovered) : h === this.hovered;
    if (same) return;
    this.hovered = h;
    this.drawHover();
    this.cb.onHover(h);
  }

  private readonly onDown = (e: PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    this.host.setPointerCapture?.(e.pointerId);
    this.pointers.set(e.pointerId, this.local(e));
    this.moved = 0;
    this.dragging = false;
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.pinchDist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
    }
  };

  private readonly onMove = (e: PointerEvent) => {
    const p = this.local(e);
    const prev = this.pointers.get(e.pointerId);
    if (!prev) {
      if (e.pointerType === 'mouse') {
        const h = this.hexAt(p.x, p.y);
        this.setHover(h);
        this.host.style.cursor = h ? 'pointer' : 'grab';
      }
      return;
    }
    this.pointers.set(e.pointerId, p);
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      if (this.pinchDist > 0) {
        const f = dist / this.pinchDist;
        this.cam = this.target = this.bound(
          zoomAt(this.cam, this.width, this.height, f, (a!.x + b!.x) / 2, (a!.y + b!.y) / 2),
        );
      }
      this.pinchDist = dist;
      this.dragging = true;
      return;
    }
    const dx = p.x - prev.x;
    const dy = p.y - prev.y;
    this.moved += Math.abs(dx) + Math.abs(dy);
    if (this.moved > 6) {
      this.dragging = true;
      this.host.style.cursor = 'grabbing';
    }
    if (this.dragging) {
      const next = {
        ...this.cam,
        x: this.cam.x - dx / this.cam.zoom,
        y: this.cam.y - dy / this.cam.zoom,
      };
      this.cam = this.target = this.bound(next);
    }
  };

  private readonly onUp = (e: PointerEvent) => {
    const had = this.pointers.delete(e.pointerId);
    if (!had) return;
    if (!this.dragging && this.pointers.size === 0 && e.type === 'pointerup') {
      const p = this.local(e);
      const h = this.hexAt(p.x, p.y);
      if (h) this.cb.onSelect(h);
    }
    if (this.pointers.size === 0) {
      this.dragging = false;
      this.pinchDist = 0;
      this.host.style.cursor = '';
    }
  };

  private readonly onLeave = () => {
    if (!this.pointers.size) this.setHover(null);
  };

  private readonly onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const p = this.local(e);
    const unit = e.deltaMode === 1 ? 16 : 1;
    const f = Math.exp(-e.deltaY * unit * 0.0015);
    this.target = this.bound(zoomAt(this.target, this.width, this.height, f, p.x, p.y));
  };

  private readonly onKey = (e: KeyboardEvent) => {
    const step = 80 / this.target.zoom;
    const move = (dx: number, dy: number) => {
      this.target = this.bound({ ...this.target, x: this.target.x + dx, y: this.target.y + dy });
    };
    switch (e.key) {
      case 'ArrowLeft':
        move(-step, 0);
        break;
      case 'ArrowRight':
        move(step, 0);
        break;
      case 'ArrowUp':
        move(0, -step);
        break;
      case 'ArrowDown':
        move(0, step);
        break;
      case '+':
      case '=':
        this.zoomBy(1.25);
        break;
      case '-':
      case '_':
        this.zoomBy(0.8);
        break;
      case '0':
      case 'Home':
        this.recenter();
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  private bound(cam: Camera): Camera {
    if (!this.data) return cam;
    return clampToBounds(cam, MAP_BOUNDS, MAP_BOUNDS.radius);
  }

  /* -- clock -------------------------------------------------------------- */

  private readonly tick = (ticker: Ticker) => {
    if (this.destroyed) return;
    const dt = Math.min(ticker.deltaMS, 100);
    // The map is mostly still: 30 fps, or 60 while the camera is moving.
    const moving =
      this.pointers.size > 0 ||
      Math.abs(this.target.x - this.cam.x) + Math.abs(this.target.y - this.cam.y) > 0.5 ||
      Math.abs(this.target.zoom - this.cam.zoom) > 0.002;
    ticker.maxFPS = moving ? 60 : 30;
    this.time += dt;
    const reduced = this.opts.reducedMotion;

    const k = reduced ? 1 : 1 - Math.exp(-dt / 90);
    this.cam = {
      x: this.cam.x + (this.target.x - this.cam.x) * k,
      y: this.cam.y + (this.target.y - this.cam.y) * k,
      zoom: this.cam.zoom + (this.target.zoom - this.cam.zoom) * k,
    };
    this.world.scale.set(this.cam.zoom);
    this.world.position.set(
      this.width / 2 - this.cam.x * this.cam.zoom,
      this.height / 2 - this.cam.y * this.cam.zoom,
    );

    this.coordLayer.visible = this.cam.zoom >= 0.85;
    this.regionLabels.alpha = Math.max(0, Math.min(1, (0.85 - this.cam.zoom) / 0.25));
    this.regionLabels.visible = this.regionLabels.alpha > 0;
    // Names and capitals keep a readable size on screen when zoomed out.
    for (const l of this.labelAnchors) {
      l.t.scale.set(0.42 / this.cam.zoom);
      l.t.y = l.y + (l.below ? 34 : -8) / this.cam.zoom;
    }
    const capScale = Math.max(1, 0.7 / this.cam.zoom);
    for (const c of this.capitalLayer.children) c.scale.set(capScale);
    for (const c of this.siteLayer.children) c.scale.set(capScale);
    this.bossMarker.scale.set(capScale * (1 + (reduced ? 0 : 0.06 * Math.sin(this.time / 300))));
    this.terrainG.visible = this.cam.zoom >= 0.4;
    const pulse = 0.5 + 0.5 * Math.sin(this.time / 600);
    this.selfGlow.alpha = 0.18 + 0.12 * (reduced ? 0.5 : pulse);
    this.selectedG.alpha = 0.75 + 0.25 * (reduced ? 1 : pulse);
    for (const t of this.tokens.values()) t.animate(this.time, this.cam.zoom, reduced);

    if (!reduced) {
      const R = MAP_BOUNDS.radius;
      for (const f of this.fog) {
        f.s.x += (f.vx * dt) / 1000;
        if (f.s.x > MAP_BOUNDS.x + R) f.s.x = MAP_BOUNDS.x - R;
      }
    }
  };
}
