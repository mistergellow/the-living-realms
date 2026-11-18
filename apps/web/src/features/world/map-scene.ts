import {
  hexCorners,
  hexDistance,
  hexesInRange,
  hexKey,
  hexToPixel,
  pixelToHex,
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
import { clampToBounds, fitZoom, screenToWorld, zoomAt, type Camera } from './map-camera';

/*
 * World map renderer (PixiJS, ADR-022): hex grid around the player, player
 * tokens, hover/selection, and a camera you can drag, zoom (wheel, pinch,
 * buttons, + / − keys) and recenter. Terrain, fog of war and movement come
 * in Phase 4; the server stays the source of truth for positions.
 */

/** Hex size (centre to corner) in world units. */
export const HEX_SIZE = 34;
/** How many rings of hexes are drawn around the player. */
export const GRID_RADIUS = 12;
/** Rings that fit the view when the map opens. */
const VIEW_RADIUS = 5;

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
}

export interface MapSceneCallbacks {
  onSelect: (h: HexCoord) => void;
  onHover: (h: HexCoord | null) => void;
}

function mix(a: number, b: number, t: number): number {
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t) << s;
  return ch(16) | ch(8) | ch(0);
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
  private gridKey = '';
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
      this.selectedG,
      this.selfGlow,
      this.selfG,
      this.coordLayer,
      this.tokenLayer,
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
    const key = hexKey(d.center);
    if (key !== this.gridKey) {
      const first = this.gridKey === '';
      this.gridKey = key;
      this.buildGrid(d.center);
      const c = hexToPixel(d.center, HEX_SIZE);
      if (first) {
        const zoom = fitZoom(this.width, this.height, HEX_SIZE * (VIEW_RADIUS * 2 + 1) * 0.95);
        this.cam = this.target = { x: c.x, y: c.y, zoom };
      } else {
        this.target = { ...this.target, x: c.x, y: c.y };
      }
    }
    if (prev?.players !== d.players || prev?.selfId !== d.selfId) this.buildTokens(d);
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

  private buildGrid(center: HexCoord) {
    const fill = this.hexFill.clear();
    const lines = this.hexLines.clear();
    for (const t of this.coords.values()) t.destroy();
    this.coords.clear();
    for (const h of hexesInRange(center, GRID_RADIUS)) {
      const { x, y } = hexToPixel(h, HEX_SIZE);
      const d = hexDistance(center, h);
      const edge = Math.max(0, Math.min(1, (d - (GRID_RADIUS - 4)) / 4));
      const pts = CORNERS.map((v, i) => v + (i % 2 === 0 ? x : y));
      const color = mix(C.fill, C.fillAlt, hexNoise(h));
      fill.poly(pts).fill({ color, alpha: 1 - 0.8 * edge });
      lines.poly(pts).stroke({ width: 1.5, color: C.stroke, alpha: 1 - 0.75 * edge });

      const label = new BitmapText({
        text: `${h.q},${h.r}`,
        style: { fontFamily: MONO, fontSize: 9, fill: C.faint },
      });
      label.anchor.set(0.5);
      label.position.set(x, y);
      label.alpha = 1 - edge;
      this.coordLayer.addChild(label);
      this.coords.set(hexKey(h), label);
    }

    // Slow drifting mist over the map.
    if (!this.fog.length) {
      for (let i = 0; i < 9; i++) {
        const s = new Sprite(glowTexture());
        s.anchor.set(0.5);
        s.tint = 0x8fa2d0;
        s.alpha = 0.035 + Math.random() * 0.03;
        s.scale.set(3 + Math.random() * 3, 1.6 + Math.random() * 1.5);
        this.fogLayer.addChild(s);
        this.fog.push({ s, vx: 4 + Math.random() * 8 });
      }
    }
    const c = hexToPixel(center, HEX_SIZE);
    const R = GRID_RADIUS * HEX_SIZE * 1.6;
    for (const f of this.fog)
      f.s.position.set(c.x + (Math.random() - 0.5) * 2 * R, c.y + (Math.random() - 0.5) * 1.6 * R);
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
    return hexDistance(this.data.center, h) <= GRID_RADIUS ? h : null;
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
    return clampToBounds(cam, hexToPixel(this.data.center, HEX_SIZE), GRID_RADIUS * HEX_SIZE * 1.4);
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
    const pulse = 0.5 + 0.5 * Math.sin(this.time / 600);
    this.selfGlow.alpha = 0.18 + 0.12 * (reduced ? 0.5 : pulse);
    this.selectedG.alpha = 0.75 + 0.25 * (reduced ? 1 : pulse);
    for (const t of this.tokens.values()) t.animate(this.time, this.cam.zoom, reduced);

    if (!reduced && this.data) {
      const c = hexToPixel(this.data.center, HEX_SIZE);
      const R = GRID_RADIUS * HEX_SIZE * 1.6;
      for (const f of this.fog) {
        f.s.x += (f.vx * dt) / 1000;
        if (f.s.x > c.x + R) f.s.x = c.x - R;
      }
    }
  };
}
