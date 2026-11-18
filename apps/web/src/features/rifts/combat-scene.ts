import { COMBAT_RULES } from '@realms/game-core';
import type { CombatantView, CombatLogEntry, CombatView, StatusId } from '@realms/shared';
import {
  ColorMatrixFilter,
  Container,
  Graphics,
  Sprite,
  Text,
  type Application,
  type Texture,
  type Ticker,
} from 'pixi.js';
import { artFromAbilities } from '../avatar/weapon-art';
import {
  characterTextures,
  enemyTexture,
  TEX_SCALE,
  type CharacterTextures,
} from '../render/avatar-textures';
import { glowTexture, verticalGradient, vignetteTexture } from '../render/svg-texture';
import type { PixiScene } from '../render/usePixiScene';
import { BOSS_HEIGHT, plateScale, UNIT_HEIGHT, type CombatLayout } from './combat-layout';
import { buildTimeline, type FxEvent, type FxStep } from './combat-timeline';

/*
 * Combat screen renderer (PixiJS, ADR-029). Draws the battlefield and plays
 * the combat log as animations. It never decides anything: the server's
 * CombatView is the truth, and input goes through the DOM overlay in
 * CombatStage.tsx (accessible buttons on top of the canvas).
 */

export interface CombatSceneInput {
  combat: CombatView;
  layout: CombatLayout;
  boss: boolean;
  targetIds: ReadonlySet<string>;
  /** Party slots the player may move to (Swap Position), or null. */
  swapSlots: ReadonlySet<number> | null;
  /** Units under the pointer (a whole column for column attacks). */
  hoverIds: ReadonlySet<string>;
}

const COLORS = {
  accent: 0xd4a64a,
  accentStrong: 0xe8bd5f,
  text: 0xe7e3d8,
  hp: 0xd2513f,
  hpBack: 0x000000,
  mana: 0x4a7fe0,
  damage: '#ff8a7a',
  crit: '#ffd166',
  heal: '#7ee2a8',
  dodge: '#cfd6e0',
  block: '#8fb0f5',
  status: '#f2d27a',
  tick: '#ff9f6b',
};

/** Colour of each status (chips use the same hues, see combat.css). */
const STATUS_COLORS: Record<StatusId, number> = {
  bleed: 0xd8334a,
  burn: 0xff8a2a,
  mark: 0xe8c45a,
  weaken: 0x9b7bff,
  stun: 0xd6dbe4,
};

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

const easeOut = (p: number) => 1 - (1 - p) ** 3;
const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Small deterministic RNG so a room's backdrop looks the same on every visit. */
function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

interface Tween {
  t: number;
  dur: number;
  fn: (p: number) => void;
  done?: () => void;
}

interface Particle {
  s: Sprite;
  vx: number;
  vy: number;
  g: number;
  life: number;
  max: number;
  fade: number;
  shrink: boolean;
}

/* ------------------------------------------------------------------------ */

class UnitView {
  readonly root = new Container();
  readonly ring = new Graphics();
  readonly shadow = new Graphics();
  /** Moves for lunges, dodges and knock-back. */
  readonly body = new Container();
  /** The scaled artwork; rotates when the unit falls. */
  readonly figure = new Container();
  readonly plate = new Container();
  readonly marker = new Graphics();
  private readonly nameText: Text;
  private readonly hpText: Text;
  private readonly bars = new Graphics();

  private base?: Sprite;
  private weapon?: Sprite;
  private offhand?: Sprite;
  private head?: Sprite;
  private whole?: Sprite;
  private headTex?: Texture;
  private blinkTex?: Texture;

  view: CombatantView;
  /** Displayed HP/downed (follows the animation, then the server). */
  shownHp: number;
  shownDowned: boolean;
  private barHp: number;
  private barMana: number;
  private lastHpLabel = '';

  homeX = 0;
  homeY = 0;
  scale = 1;
  plateScale = 1;
  x = 0;
  y = 0;
  placed = false;
  offX = 0;
  offY = 0;
  fall = 0;
  flash = 0;
  spawn = 1;
  alpha = 1;
  hover = 0;
  active = false;
  targetable = false;
  hovered = false;
  removing = false;

  private readonly phase = Math.random() * Math.PI * 2;
  private blinkAt = 1500 + Math.random() * 3000;
  private blinkUntil = 0;
  private readonly greyFilter = new ColorMatrixFilter();
  private readonly flashFilter = new ColorMatrixFilter();
  private filterKey = '';

  constructor(view: CombatantView) {
    this.view = view;
    this.shownHp = view.hp;
    this.shownDowned = view.downed;
    this.fall = view.downed ? 1 : 0;
    this.barHp = view.maxHp > 0 ? view.hp / view.maxHp : 0;
    this.barMana = view.maxMana > 0 ? view.mana / view.maxMana : 0;
    this.greyFilter.desaturate();
    this.greyFilter.brightness(0.6, true);

    this.nameText = new Text({
      text: view.name,
      style: {
        fontFamily: FONT,
        fontSize: 12,
        fontWeight: '700',
        fill: COLORS.text,
        stroke: { color: 0x000000, width: 3, join: 'round' },
      },
      resolution: 3,
    });
    this.nameText.anchor.set(0.5, 1);
    this.hpText = new Text({
      text: '',
      style: {
        fontFamily: FONT,
        fontSize: 8,
        fontWeight: '700',
        fill: 0xffffff,
        stroke: { color: 0x000000, width: 2, join: 'round' },
      },
      resolution: 4,
    });
    this.hpText.anchor.set(0.5, 0.5);

    this.plate.addChild(this.bars, this.hpText, this.nameText, this.marker);
    this.body.addChild(this.figure);
    this.root.addChild(this.shadow, this.ring, this.body, this.plate);
    void this.loadArt();
  }

  get isBoss() {
    return this.view.isBoss;
  }
  get artHeight() {
    return (this.isBoss ? BOSS_HEIGHT : UNIT_HEIGHT) * this.scale;
  }
  /** +1 if the unit faces right (party), −1 if it faces left (enemies). */
  get dir() {
    return this.view.side === 'party' ? 1 : -1;
  }
  /** Chest point in scene coordinates (projectile target, effects). */
  chest() {
    return { x: this.x + this.offX, y: this.y - this.artHeight * 0.5 };
  }
  hand() {
    return {
      x: this.x + this.offX + this.dir * this.artHeight * 0.28,
      y: this.y - this.artHeight * 0.38,
    };
  }

  private async loadArt() {
    const k = 1 / TEX_SCALE;
    try {
      if (this.view.kind === 'player') {
        const tex: CharacterTextures = await characterTextures(
          this.view.appearance,
          artFromAbilities(this.view.abilityIds),
        );
        if (this.root.destroyed) return;
        this.base = new Sprite(tex.base);
        this.base.anchor.set(0.5, 150 / 160);
        this.weapon = new Sprite(tex.weapon);
        this.weapon.anchor.set(97 / 120, 110 / 160);
        this.weapon.position.set(37, -40);
        this.offhand = new Sprite(tex.offhand);
        this.offhand.anchor.set(20 / 120, 104 / 160);
        this.offhand.position.set(-40, -46);
        this.head = new Sprite(tex.head);
        this.head.anchor.set(0.5, 88 / 160);
        this.head.position.set(0, -62);
        this.headTex = tex.head;
        this.blinkTex = tex.headBlink;
        for (const s of [this.base, this.weapon, this.offhand, this.head]) s.scale.set(k);
        this.figure.addChild(this.base, this.offhand, this.weapon, this.head);
      } else {
        const tex = await enemyTexture(this.view.enemyDefId);
        if (this.root.destroyed) return;
        this.whole = new Sprite(tex);
        this.whole.anchor.set(0.5, 150 / 160);
        this.whole.scale.set(k);
        this.figure.addChild(this.whole);
      }
    } catch (err) {
      console.warn('Could not load unit art', err);
    }
  }

  /** Per-frame drawing. `t` is scene time in ms. */
  render(t: number, dt: number, reduced: boolean) {
    if (!this.placed) {
      this.x = this.homeX;
      this.y = this.homeY;
      this.placed = true;
    }
    // Ease towards the home position (slot changes, resizes).
    const follow = 1 - Math.exp(-dt / 90);
    this.x = lerp(this.x, this.homeX, follow);
    this.y = lerp(this.y, this.homeY, follow);
    this.root.position.set(this.x, this.y);
    this.root.zIndex = Math.round(this.homeY * 10) + (this.isBoss ? 1 : 0);
    // Players who left a group run stay on the field, faded.
    this.root.alpha = this.alpha * (this.view.left ? 0.45 : 1);

    const hoverTarget = this.hovered && this.targetable ? 1 : 0;
    this.hover = lerp(this.hover, hoverTarget, 1 - Math.exp(-dt / 70));

    // Figure: scale, idle breathing, fall.
    const s = (this.artHeight / 160) * (1 + 0.05 * this.hover) * (0.6 + 0.4 * this.spawn);
    this.figure.scale.set(s);
    this.body.position.set(this.offX, this.offY);
    this.figure.rotation = -this.dir * 1.36 * easeInOut(this.fall);
    this.figure.x = -this.dir * 26 * this.scale * easeInOut(this.fall);
    this.figure.y = -6 * this.scale * easeInOut(this.fall);

    const idle = reduced || this.fall > 0 ? 0 : 1;
    const w = (t / 2600) * Math.PI * 2 + this.phase;
    const breathe = Math.sin(w) * idle;
    if (this.base) {
      this.base.scale.set(1 / TEX_SCALE, (1 / TEX_SCALE) * (1 + 0.022 * breathe));
      this.head!.y = -62 - 2.2 * breathe;
      this.head!.rotation = (-1.5 * Math.PI * breathe) / 180;
      this.weapon!.rotation = (2 * Math.PI * breathe) / 180;
      this.weapon!.y = -40 - 1.2 * breathe;
      this.offhand!.rotation = (-2 * Math.PI * breathe) / 180;
      this.offhand!.y = -46 - 1.2 * breathe;
      // Blink.
      if (!reduced && this.headTex && this.blinkTex) {
        if (t >= this.blinkAt) {
          this.blinkUntil = t + 120;
          this.blinkAt = t + 2800 + Math.random() * 3200;
        }
        this.head!.texture = t < this.blinkUntil && this.fall === 0 ? this.blinkTex : this.headTex;
      }
    } else if (this.whole) {
      const we = (t / 2100) * Math.PI * 2 + this.phase;
      this.whole.y = -1.8 * Math.sin(we) * idle;
      this.whole.scale.set(1 / TEX_SCALE, (1 / TEX_SCALE) * (1 + 0.02 * Math.sin(we * 2) * idle));
    }

    // Filters: grey when down, white flash when hit.
    this.flash = Math.max(0, this.flash - dt / 160);
    const key = `${this.fall > 0.5 ? 'g' : ''}${this.flash > 0 ? 'f' : ''}`;
    if (key !== this.filterKey) {
      this.filterKey = key;
      const f = [];
      if (key.includes('g')) f.push(this.greyFilter);
      if (key.includes('f')) f.push(this.flashFilter);
      this.figure.filters = f.length ? f : null;
    }
    if (this.flash > 0) this.flashFilter.brightness(1 + 1.6 * this.flash, false);

    // Ground shadow + turn/target ring.
    const rx = this.artHeight * 0.3;
    this.shadow
      .clear()
      .ellipse(this.offX * 0.6, 0, rx, rx * 0.22)
      .fill({ color: 0x000000, alpha: 0.45 });
    this.ring.clear();
    const pulse = 0.5 + 0.5 * Math.sin(t / 220);
    if (this.active && !this.shownDowned) {
      this.ring
        .ellipse(this.offX * 0.6, 0, rx * 1.15, rx * 0.3)
        .fill({ color: COLORS.accent, alpha: 0.18 + 0.12 * pulse })
        .stroke({ width: 2, color: COLORS.accentStrong, alpha: 0.75 + 0.25 * pulse });
    }
    if (this.targetable) {
      this.ring.ellipse(this.offX * 0.6, 0, rx * 1.05, rx * 0.27).stroke({
        width: 2 + this.hover,
        color: 0xffe2a0,
        alpha: 0.45 + 0.35 * pulse + 0.2 * this.hover,
      });
    }

    this.renderPlate(t, dt);
  }

  private renderPlate(t: number, dt: number) {
    const v = this.view;
    const ps = this.plateScale;
    this.plate.scale.set(ps);
    // Keep names readable when the plate shrinks on small screens.
    this.nameText.scale.set(Math.max(1, 0.85 / ps));
    this.plate.position.set(0, -this.artHeight * (1 - 0.06 * easeInOut(this.fall)) - 2);
    this.plate.alpha = this.shownDowned ? 0.55 : 1;

    const hpTarget = v.maxHp > 0 ? this.shownHp / v.maxHp : 0;
    const manaTarget = v.maxMana > 0 ? v.mana / v.maxMana : 0;
    const k = 1 - Math.exp(-dt / 140);
    this.barHp = lerp(this.barHp, hpTarget, k);
    this.barMana = lerp(this.barMana, manaTarget, k);

    const W = 84;
    const g = this.bars.clear();
    let y = 0;
    if (v.kind === 'player') {
      // Focus pips (diamonds).
      y -= 8;
      const n = COMBAT_RULES.focusMax;
      const gap = 9;
      const start = -((n - 1) * gap) / 2;
      for (let i = 0; i < n; i++) {
        const cx = start + i * gap;
        const cy = y + 3.5;
        const on = i < v.focus;
        g.poly([cx, cy - 3.5, cx + 3.5, cy, cx, cy + 3.5, cx - 3.5, cy])
          .fill({ color: on ? COLORS.accent : 0xffffff, alpha: on ? 1 : 0.12 })
          .stroke({ width: 1, color: on ? COLORS.accentStrong : 0xffffff, alpha: on ? 1 : 0.25 });
      }
      if (v.maxMana > 0) {
        y -= 7;
        g.roundRect(-W / 2, y, W, 5, 2.5).fill({ color: COLORS.hpBack, alpha: 0.6 });
        g.roundRect(-W / 2, y, Math.max(0, W * clamp01(this.barMana)), 5, 2.5).fill(COLORS.mana);
      }
    }
    y -= 10;
    g.roundRect(-W / 2 - 1, y - 1, W + 2, 10, 5).fill({ color: COLORS.hpBack, alpha: 0.65 });
    g.roundRect(-W / 2, y, Math.max(0, W * clamp01(this.barHp)), 8, 4).fill(COLORS.hp);
    g.roundRect(-W / 2, y, Math.max(0, W * clamp01(this.barHp)), 3, 1.5).fill({
      color: 0xffffff,
      alpha: 0.18,
    });
    const label = `${Math.round(this.shownHp)}/${v.maxHp}`;
    if (label !== this.lastHpLabel) {
      this.hpText.text = label;
      this.lastHpLabel = label;
    }
    this.hpText.position.set(0, y + 4);
    this.nameText.position.set(0, y - 2);
    const name = v.left ? `${v.name} (left)` : v.name;
    if (this.nameText.text !== name) this.nameText.text = name;

    // Bouncing chevron over valid targets.
    this.marker.clear();
    if (this.targetable) {
      const my = y - 22 - 4 * Math.abs(Math.sin(t / 260)) - 3 * this.hover;
      this.marker
        .poly([-7, my - 7, 7, my - 7, 0, my + 2])
        .fill({ color: 0xffe2a0, alpha: 0.85 + 0.15 * this.hover })
        .stroke({ width: 1.5, color: 0x5a4210 });
    }
  }

  destroy() {
    this.root.destroy({ children: true });
  }
}

/* ------------------------------------------------------------------------ */

class Backdrop {
  readonly root = new Container();
  private readonly sky = new Sprite();
  private readonly ground = new Sprite();
  private readonly far = new Graphics();
  private readonly near = new Graphics();
  private readonly floorLines = new Graphics();
  private readonly floorGlow = new Sprite(glowTexture());
  private readonly riftGlow = new Sprite(glowTexture());
  private readonly rift = new Container();
  private readonly rings: Graphics[] = [];
  private readonly core = new Graphics();
  private readonly motes: Array<{ s: Sprite; vy: number; sway: number; ph: number }> = [];
  private readonly moteLayer = new Container();
  private readonly vignette = new Sprite(vignetteTexture());
  private layout: CombatLayout | null = null;
  private boss: boolean | null = null;

  constructor() {
    this.floorGlow.anchor.set(0.5);
    this.floorGlow.blendMode = 'add';
    this.riftGlow.anchor.set(0.5);
    this.riftGlow.blendMode = 'add';
    for (let i = 0; i < 3; i++) {
      const g = new Graphics();
      g.blendMode = 'add';
      this.rings.push(g);
      this.rift.addChild(g);
    }
    this.core.blendMode = 'add';
    this.rift.addChild(this.core);
    for (let i = 0; i < 46; i++) {
      const s = new Sprite(glowTexture());
      s.anchor.set(0.5);
      s.blendMode = 'add';
      this.motes.push({
        s,
        vy: 8 + Math.random() * 18,
        sway: 6 + Math.random() * 14,
        ph: Math.random() * 10,
      });
      this.moteLayer.addChild(s);
    }
    this.root.addChild(
      this.sky,
      this.far,
      this.near,
      this.ground,
      this.floorLines,
      this.floorGlow,
      this.riftGlow,
      this.rift,
      this.moteLayer,
      this.vignette,
    );
  }

  setup(layout: CombatLayout, boss: boolean, seed: number) {
    if (this.layout === layout && this.boss === boss) return;
    const resized = this.layout?.width !== layout.width || this.layout?.height !== layout.height;
    this.layout = layout;
    this.boss = boss;
    const { width: w, height: h, horizon } = layout;

    this.sky.texture = verticalGradient(
      boss ? 'sky-boss' : 'sky',
      boss
        ? [
            [0, '#0c090f'],
            [0.6, '#2c1832'],
            [1, '#46203f'],
          ]
        : [
            [0, '#0a0b13'],
            [0.6, '#211c40'],
            [1, '#352b5e'],
          ],
    );
    this.sky.position.set(0, 0);
    this.sky.width = w;
    this.sky.height = horizon + 2;

    this.ground.texture = verticalGradient(
      boss ? 'ground-boss' : 'ground',
      boss
        ? [
            [0, '#24142a'],
            [1, '#08060a'],
          ]
        : [
            [0, '#1c1931'],
            [1, '#07080d'],
          ],
    );
    this.ground.position.set(0, horizon);
    this.ground.width = w;
    this.ground.height = h - horizon;

    // Mountain silhouettes (seeded, so the room looks the same each time).
    const rnd = seeded(seed);
    const ridge = (g: Graphics, top: number, amp: number, steps: number, color: number) => {
      const pts: number[] = [0, horizon + 1];
      for (let i = 0; i <= steps; i++) {
        const x = (w * i) / steps;
        const mid = Math.abs(x - layout.riftX) < w * 0.06 ? 0.4 : 1;
        pts.push(x, horizon - (top + amp * rnd()) * h * mid);
      }
      pts.push(w, horizon + 1);
      g.clear().poly(pts).fill(color);
    };
    ridge(this.far, 0.1, 0.16, 16, boss ? 0x1e1022 : 0x181530);
    ridge(this.near, 0.02, 0.07, 26, boss ? 0x140b17 : 0x100e1f);

    // Perspective floor lines.
    const fl = this.floorLines.clear();
    for (let i = 1; i <= 5; i++) {
      const y = horizon + (h - horizon) * (i / 6) ** 1.6;
      fl.moveTo(0, y).lineTo(w, y);
    }
    for (let i = -6; i <= 6; i++) {
      fl.moveTo(layout.riftX + i * w * 0.02, horizon).lineTo(layout.riftX + i * w * 0.22, h);
    }
    fl.stroke({ width: 1, color: boss ? 0xff9ad9 : 0x9fb4ff, alpha: 0.05 });

    const tint = boss ? 0xff6fbf : 0x7fd3ff;
    this.riftGlow.tint = tint;
    this.riftGlow.position.set(layout.riftX, horizon - h * 0.02);
    this.riftGlow.scale.set((w * 0.36) / 128, (h * 0.9) / 128);
    this.floorGlow.tint = tint;
    this.floorGlow.position.set(layout.riftX, h * 0.78);
    this.floorGlow.scale.set((w * 0.5) / 128, (h * 0.22) / 128);
    this.rift.position.set(layout.riftX, horizon - h * 0.02);

    const ringColors = boss ? [0xff6fbf, 0xb35cff, 0xffd0f0] : [0x7fd3ff, 0x8f7cff, 0xd6f3ff];
    const rh = h * 0.24;
    const rw = Math.max(18, w * 0.03);
    this.rings.forEach((g, i) => {
      g.clear()
        .ellipse(0, 0, rw * (1 - i * 0.18), rh * (1 - i * 0.12))
        .stroke({ width: 3 - i * 0.6, color: ringColors[i]!, alpha: 0.55 });
    });
    this.core
      .clear()
      .ellipse(0, 0, rw * 0.45, rh * 0.82)
      .fill({ color: boss ? 0xffe0f4 : 0xe0f6ff, alpha: 0.55 });

    for (const m of this.motes) {
      if (resized || m.s.x === 0) {
        m.s.position.set(Math.random() * w, horizon * 0.3 + Math.random() * (h - horizon * 0.3));
      }
      m.s.tint = boss
        ? Math.random() < 0.5
          ? 0xff8fd0
          : 0xffc38f
        : Math.random() < 0.5
          ? 0x9fdcff
          : 0xb7a6ff;
      const sc = 0.03 + Math.random() * 0.06;
      m.s.scale.set(sc);
      m.s.alpha = 0.25 + Math.random() * 0.5;
    }

    this.vignette.width = w;
    this.vignette.height = h;
  }

  animate(t: number, dt: number, reduced: boolean) {
    const l = this.layout;
    if (!l) return;
    const pulse = Math.sin(t / 900);
    this.riftGlow.alpha = 0.33 + 0.07 * pulse;
    this.floorGlow.alpha = 0.16 + 0.05 * pulse;
    this.core.alpha = 0.75 + 0.2 * Math.sin(t / 340);
    if (!reduced) {
      this.rings.forEach((g, i) => {
        g.rotation = Math.sin(t / (1400 + i * 500) + i) * 0.22;
        g.scale.set(1 + 0.05 * Math.sin(t / (600 + i * 210) + i), 1);
      });
      for (const m of this.motes) {
        m.s.y -= (m.vy * dt) / 1000;
        m.s.x += (Math.sin(t / 1000 + m.ph) * m.sway * dt) / 1000;
        if (m.s.y < l.height * 0.08) {
          m.s.y = l.height + 10;
          m.s.x = Math.random() * l.width;
        }
      }
    }
  }
}

/* ------------------------------------------------------------------------ */

export class CombatScene implements PixiScene {
  private readonly world = new Container();
  private readonly backdrop = new Backdrop();
  private readonly unitsLayer = new Container();
  private readonly slotMarks = new Graphics();
  private readonly fxLayer = new Container();
  private readonly units = new Map<string, UnitView>();
  private readonly tweens: Tween[] = [];
  private readonly timers: Array<{ at: number; fn: () => void }> = [];
  private readonly particles: Particle[] = [];
  private input: CombatSceneInput | null = null;
  private now = 0;
  private queueEnd = 0;
  private shake = 0;
  private readonly stepMs: number;
  private destroyed = false;

  constructor(
    private readonly app: Application,
    _width: number,
    _height: number,
    private readonly opts: {
      reducedMotion: boolean;
      /** Called as each step starts, with the last log seq it shows. */
      onProgress?: (seq: number) => void;
      /** Called when everything queued by `play` has finished playing. */
      onIdle?: () => void;
    },
  ) {
    this.stepMs = opts.reducedMotion ? 420 : 650;
    this.unitsLayer.sortableChildren = true;
    this.slotMarks.zIndex = -1;
    this.unitsLayer.addChild(this.slotMarks);
    this.world.addChild(this.backdrop.root, this.unitsLayer, this.fxLayer);
    app.stage.addChild(this.world);
    app.stage.eventMode = 'none';
    app.ticker.add(this.tick);
  }

  private get busy() {
    return this.now < this.queueEnd;
  }

  resize(): void {
    // Layout comes from React with the new size (see update).
  }

  update(input: CombatSceneInput): void {
    if (this.destroyed) return;
    const first = this.input === null;
    this.input = input;
    const { combat, layout } = input;
    const seed = combat.combatants
      .filter((c) => c.side === 'enemies')
      .map((c) => c.id)
      .join('|')
      .split('')
      .reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
    this.backdrop.setup(layout, input.boss, seed);

    const ids = new Set(combat.combatants.map((c) => c.id));
    for (const [id, u] of this.units) {
      if (ids.has(id) || u.removing) continue;
      u.removing = true;
      this.tween(
        320,
        (p) => (u.alpha = 1 - p),
        () => {
          u.destroy();
          this.units.delete(id);
        },
      );
    }
    const ps = plateScale(layout);
    for (const c of combat.combatants) {
      let u = this.units.get(c.id);
      if (!u || u.removing) {
        u = new UnitView(c);
        this.units.set(c.id, u);
        this.unitsLayer.addChild(u.root);
        if (!first) this.spawnIn(u);
      }
      u.view = c;
      const p = layout.place(c.side, c.slot);
      u.homeX = p.x;
      u.homeY = p.y;
      u.scale = p.scale;
      u.plateScale = ps;
      u.active = combat.activeId === c.id && combat.phase === 'party';
      const swappable = c.side === 'party' && (input.swapSlots?.has(c.slot) ?? false);
      u.targetable = input.targetIds.has(c.id) || swappable;
      u.hovered = input.hoverIds.has(c.id);
    }
    if (!this.busy) this.syncShown();
    this.drawSlotMarks();
  }

  /**
   * Plays new log entries as animations (queued after anything still
   * playing). Returns how many ms (of animation time) until everything queued
   * has played, or 0 if there was nothing to play; `onIdle` fires at the end.
   */
  play(entries: ReadonlyArray<CombatLogEntry>): number {
    const steps = buildTimeline(entries);
    if (!steps.length) return 0;
    const start = Math.max(this.now, this.queueEnd);
    steps.forEach((step, i) =>
      this.after(start - this.now + i * this.stepMs, () => this.runStep(step)),
    );
    this.queueEnd = start + steps.length * this.stepMs;
    this.after(this.queueEnd - this.now + 60, () => {
      if (this.busy) return; // more was queued meanwhile; its own callback will fire
      this.syncShown();
      this.opts.onIdle?.();
    });
    return this.queueEnd - this.now + 60;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.app.ticker?.remove(this.tick);
    for (const u of this.units.values()) u.destroy();
    this.units.clear();
  }

  /* -- internals ---------------------------------------------------------- */

  private syncShown() {
    for (const u of this.units.values()) {
      if (u.removing) continue;
      u.shownHp = u.view.hp;
      this.setDowned(u, u.view.downed);
    }
  }

  private setDowned(u: UnitView, downed: boolean) {
    if (u.shownDowned === downed) return;
    u.shownDowned = downed;
    const from = u.fall;
    const to = downed ? 1 : 0;
    this.tween(downed ? 520 : 420, (p) => (u.fall = lerp(from, to, easeOut(p))));
    if (downed) this.dust(u);
    else this.burst(u.chest().x, u.chest().y, 0xffe2a0, 14, 1);
  }

  private drawSlotMarks() {
    const g = this.slotMarks.clear();
    const input = this.input;
    if (!input?.swapSlots) return;
    const occupied = new Set(
      input.combat.combatants.filter((c) => c.side === 'party').map((c) => c.slot),
    );
    for (const slot of input.swapSlots) {
      if (occupied.has(slot)) continue;
      const p = input.layout.place('party', slot);
      const rx = UNIT_HEIGHT * p.scale * 0.32;
      g.ellipse(p.x, p.y, rx, rx * 0.28)
        .fill({ color: COLORS.accent, alpha: 0.12 })
        .stroke({ width: 2, color: COLORS.accent, alpha: 0.8 });
    }
  }

  private spawnIn(u: UnitView) {
    u.spawn = 0;
    u.alpha = 0;
    this.tween(450, (p) => {
      u.spawn = easeOut(p);
      u.alpha = p;
    });
    this.after(30, () => {
      const c = u.chest();
      this.burst(c.x, c.y, this.input?.boss ? 0xff6fbf : 0x9f8cff, 18, 1.2);
    });
  }

  private runStep(step: FxStep) {
    if (step.seq) this.opts.onProgress?.(step.seq);
    const actor = step.actorId ? this.units.get(step.actorId) : undefined;
    const targets = step.targetIds
      .map((id) => this.units.get(id))
      .filter((u): u is UnitView => !!u);
    const S = this.stepMs;
    const reduced = this.opts.reducedMotion;
    const impact = (delay: number) => this.after(delay, () => this.applyEvents(step.events, actor));

    if (!actor || step.kind === 'none' || step.kind === 'swap') {
      impact(step.kind === 'swap' ? S * 0.3 : 0);
      return;
    }

    if (step.kind === 'melee') {
      const tx = targets[0]?.x ?? actor.x + actor.dir * 120;
      const dist = Math.min(Math.abs(tx - actor.x) * 0.55, (this.input?.layout.width ?? 800) * 0.3);
      const reach = (reduced ? 18 : dist) * actor.dir;
      this.tween(
        S * 0.42,
        (p) => (actor.offX = reach * easeOut(p)),
        () => this.tween(S * 0.5, (p) => (actor.offX = reach * (1 - easeInOut(p)))),
      );
      this.after(S * 0.36, () => {
        for (const t of targets) this.slash(t, actor.dir);
      });
      impact(S * 0.42);
      return;
    }

    if (step.kind === 'heal' || step.kind === 'guard') {
      this.tween(S * 0.5, (p) => (actor.offY = -10 * Math.sin(p * Math.PI)));
      this.glowAt(
        actor.chest().x,
        actor.chest().y,
        step.kind === 'heal' ? 0x7ee2a8 : 0x6f9cff,
        0.9,
      );
      impact(S * 0.35);
      return;
    }

    // Ranged / magic: recoil, then a projectile to each target.
    const recoil = -8 * actor.dir;
    this.tween(S * 0.25, (p) => (actor.offX = recoil * Math.sin(p * Math.PI)));
    const flight = S * 0.32;
    this.after(S * 0.18, () => {
      const from = actor.hand();
      for (const t of targets)
        this.projectile(step.kind as 'ranged' | 'magic', actor, from, t.chest(), flight);
    });
    impact(S * 0.18 + flight);
  }

  private applyEvents(events: FxEvent[], actor: UnitView | undefined) {
    const stack = new Map<string, number>();
    for (const e of events) {
      const u = this.units.get(e.targetId);
      if (!u) continue;
      const n = stack.get(u.view.id) ?? 0;
      stack.set(u.view.id, n + 1);
      const c = u.chest();
      const fy = u.y - u.artHeight * 0.85 - n * 22;
      switch (e.t) {
        case 'damage': {
          const away = actor ? Math.sign(u.x - actor.x) || -u.dir : -u.dir;
          if (e.blocked > 0) {
            this.glowAt(c.x, c.y, 0x6f9cff, 0.7);
            this.float(u.x + 26 * u.dir, fy - 8, `${e.blocked} blocked`, COLORS.block, 14);
          }
          if (e.amount <= 0) {
            this.knock(u, away * 4);
            break;
          }
          u.shownHp = Math.max(0, u.shownHp - e.amount);
          u.flash = 1;
          this.knock(u, away * (e.crit ? 16 : 9));
          this.burst(c.x, c.y, e.crit ? 0xffd166 : 0xffb199, e.crit ? 22 : 11, e.crit ? 1.5 : 1);
          this.float(
            u.x,
            fy,
            `-${e.amount}`,
            e.crit ? COLORS.crit : COLORS.damage,
            e.crit ? 30 : 22,
          );
          if (e.crit) {
            this.float(u.x, fy - 26, 'CRITICAL', COLORS.crit, 13);
            this.shake = Math.max(this.shake, 9);
          } else this.shake = Math.max(this.shake, 3);
          break;
        }
        case 'block':
          this.glowAt(c.x, c.y, 0x6f9cff, 1.1);
          this.rise(c.x, u.y, 0x8fb0f5, 10);
          this.float(u.x, fy, `+${e.amount} Block`, COLORS.block, 16);
          break;
        case 'status': {
          const name = e.status[0]!.toUpperCase() + e.status.slice(1);
          this.burst(c.x, c.y, STATUS_COLORS[e.status], 10, 0.8);
          this.float(u.x, fy, name, COLORS.status, 15);
          break;
        }
        case 'tick':
          u.shownHp = Math.max(0, u.shownHp - e.amount);
          u.flash = 0.7;
          this.rise(c.x, u.y, STATUS_COLORS[e.status], 12);
          this.float(u.x, fy, `-${e.amount}`, COLORS.tick, 20);
          break;
        case 'stunned':
          this.burst(u.x, u.y - u.artHeight * 0.95, 0xfff1a8, 12, 0.6);
          this.float(u.x, fy, 'Stunned', COLORS.status, 15);
          break;
        case 'heal':
          u.shownHp = Math.min(u.view.maxHp, u.shownHp + e.amount);
          this.rise(c.x, u.y, 0x7ee2a8, 16);
          this.float(u.x, fy, `+${e.amount}`, COLORS.heal, 22);
          break;
        case 'dodge': {
          const side = -u.dir * 22;
          this.tween(this.stepMs * 0.45, (p) => (u.offX = side * Math.sin(p * Math.PI)));
          this.float(u.x, fy, 'Dodge', COLORS.dodge, 16);
          break;
        }
        case 'downed':
          u.shownHp = 0;
          this.setDowned(u, true);
          break;
        case 'revived':
          u.shownHp = e.hp;
          this.setDowned(u, false);
          this.float(u.x, fy, `+${e.hp}`, COLORS.heal, 18);
          break;
      }
    }
  }

  /* -- effects ------------------------------------------------------------- */

  private knock(u: UnitView, dx: number) {
    this.tween(this.stepMs * 0.4, (p) => {
      const k = Math.sin(p * Math.PI) * (1 - p * 0.3);
      u.offX = dx * k;
    });
  }

  private slash(target: UnitView, dir: number) {
    const c = target.chest();
    const r = target.artHeight * 0.32;
    const g = new Graphics();
    g.blendMode = 'add';
    g.position.set(c.x, c.y);
    g.rotation = dir > 0 ? -0.5 : 0.5 + Math.PI;
    this.fxLayer.addChild(g);
    this.tween(
      220,
      (p) => {
        const a0 = -1.1 + p * 1.6;
        g.clear()
          .arc(0, 0, r, a0, a0 + 1.4)
          .stroke({ width: 5 * (1 - p) + 1, color: 0xfff1cf, alpha: 1 - p * 0.8 });
      },
      () => g.destroy(),
    );
  }

  private projectile(
    kind: 'ranged' | 'magic',
    actor: UnitView,
    from: { x: number; y: number },
    to: { x: number; y: number },
    flight: number,
  ) {
    const party = actor.view.side === 'party';
    const color = kind === 'magic' ? (party ? 0x7fd3ff : 0xd08cff) : party ? 0xf0e2c0 : 0xc48cff;
    const node = new Container();
    const glow = new Sprite(glowTexture());
    glow.anchor.set(0.5);
    glow.blendMode = 'add';
    glow.tint = color;
    const shape = new Graphics();
    if (kind === 'magic') {
      glow.scale.set(0.42);
      shape.circle(0, 0, 5).fill(0xffffff);
    } else if (party) {
      glow.scale.set(0.18);
      shape
        .moveTo(-16, 0)
        .lineTo(8, 0)
        .stroke({ width: 2, color: 0x8a5a2e })
        .poly([8, -4, 15, 0, 8, 4])
        .fill(0xdfe6ee)
        .poly([-16, 0, -20, -4, -13, 0, -20, 4])
        .fill(0xe8e2d0);
    } else {
      glow.scale.set(0.26);
      shape.poly([-10, 0, 0, -4, 10, 0, 0, 4]).fill(0xe2d4ff);
    }
    node.addChild(glow, shape);
    this.fxLayer.addChild(node);
    const arc = kind === 'ranged' ? Math.min(60, Math.abs(to.x - from.x) * 0.12) : 10;
    let px = from.x;
    let py = from.y;
    this.tween(
      flight,
      (p) => {
        const x = lerp(from.x, to.x, p);
        const y = lerp(from.y, to.y, p) - Math.sin(p * Math.PI) * arc;
        node.rotation = Math.atan2(y - py, x - px);
        px = x;
        py = y;
        node.position.set(x, y);
        if (kind === 'magic' && Math.random() < 0.7) this.spark(x, y, color, 0.3, 0.6);
      },
      () => {
        node.destroy({ children: true });
        this.glowAt(to.x, to.y, color, kind === 'magic' ? 1 : 0.5);
      },
    );
  }

  private glowAt(x: number, y: number, color: number, size: number) {
    const s = new Sprite(glowTexture());
    s.anchor.set(0.5);
    s.blendMode = 'add';
    s.tint = color;
    s.position.set(x, y);
    this.fxLayer.addChild(s);
    this.tween(
      360,
      (p) => {
        s.scale.set(size * (0.4 + p * 0.9));
        s.alpha = 1 - p;
      },
      () => s.destroy(),
    );
  }

  private spark(x: number, y: number, color: number, speed: number, size: number) {
    const s = new Sprite(glowTexture());
    s.anchor.set(0.5);
    s.blendMode = 'add';
    s.tint = color;
    s.position.set(x, y);
    s.scale.set(0.05 * size + Math.random() * 0.05 * size);
    this.fxLayer.addChild(s);
    const a = Math.random() * Math.PI * 2;
    const v = (40 + Math.random() * 160) * speed;
    const life = 300 + Math.random() * 300;
    this.particles.push({
      s,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 40 * speed,
      g: 260,
      life,
      max: life,
      fade: 1,
      shrink: true,
    });
  }

  private burst(x: number, y: number, color: number, count: number, power: number) {
    for (let i = 0; i < count; i++) this.spark(x, y, color, power, 1.2);
    this.glowAt(x, y, color, 0.6 * power);
  }

  private rise(x: number, y: number, color: number, count: number) {
    for (let i = 0; i < count; i++) {
      const s = new Sprite(glowTexture());
      s.anchor.set(0.5);
      s.blendMode = 'add';
      s.tint = color;
      s.scale.set(0.05 + Math.random() * 0.06);
      s.position.set(x + (Math.random() - 0.5) * 50, y - Math.random() * 40);
      this.fxLayer.addChild(s);
      const life = 700 + Math.random() * 500;
      this.particles.push({
        s,
        vx: (Math.random() - 0.5) * 20,
        vy: -50 - Math.random() * 60,
        g: 0,
        life,
        max: life,
        fade: 1,
        shrink: false,
      });
    }
  }

  private dust(u: UnitView) {
    for (let i = 0; i < 12; i++) {
      const s = new Sprite(glowTexture());
      s.anchor.set(0.5);
      s.tint = 0x8a8496;
      s.alpha = 0.5;
      s.scale.set(0.12 + Math.random() * 0.1);
      s.position.set(u.x - u.dir * (Math.random() * 50), u.y - 4);
      this.fxLayer.addChild(s);
      const life = 600 + Math.random() * 400;
      this.particles.push({
        s,
        vx: (Math.random() - 0.5) * 70,
        vy: -10 - Math.random() * 25,
        g: 0,
        life,
        max: life,
        fade: 0.5,
        shrink: false,
      });
    }
  }

  private float(x: number, y: number, text: string, color: string, size: number) {
    const t = new Text({
      text,
      style: {
        fontFamily: FONT,
        fontSize: size,
        fontWeight: '800',
        fill: color,
        stroke: { color: 0x000000, width: Math.max(3, size / 6), join: 'round' },
        letterSpacing: size < 15 ? 1.5 : 0,
      },
      resolution: 2,
    });
    t.anchor.set(0.5);
    t.position.set(x, y);
    t.zIndex = 10;
    this.fxLayer.addChild(t);
    const lift = this.opts.reducedMotion ? 10 : 42;
    this.tween(
      950,
      (p) => {
        t.y = y - lift * easeOut(p);
        t.alpha = p < 0.15 ? p / 0.15 : 1 - clamp01((p - 0.55) / 0.45);
        t.scale.set(p < 0.15 ? 0.7 + 2.6 * p : 1.09 - 0.09 * clamp01((p - 0.15) / 0.2));
      },
      () => t.destroy(),
    );
  }

  /* -- clock ---------------------------------------------------------------- */

  private tween(dur: number, fn: (p: number) => void, done?: () => void) {
    const tw: Tween = { t: 0, dur: Math.max(1, dur), fn, done };
    this.tweens.push(tw);
    fn(0);
  }

  private after(ms: number, fn: () => void) {
    this.timers.push({ at: this.now + Math.max(0, ms), fn });
  }

  private readonly tick = (ticker: Ticker) => {
    if (this.destroyed) return;
    // Up to 100 ms per frame: slow devices still finish on time, a long pause does not skip ahead.
    const dt = Math.min(ticker.deltaMS, 100);
    // Full frame rate only while something is playing; idle motion is fine at 30 fps.
    ticker.maxFPS = this.busy || this.tweens.length || this.particles.length ? 60 : 30;
    this.now += dt;
    const reduced = this.opts.reducedMotion;

    for (let i = 0; i < this.timers.length;) {
      const tm = this.timers[i]!;
      if (tm.at <= this.now) {
        this.timers.splice(i, 1);
        tm.fn();
      } else i++;
    }
    for (let i = 0; i < this.tweens.length;) {
      const tw = this.tweens[i]!;
      tw.t += dt;
      const p = clamp01(tw.t / tw.dur);
      tw.fn(p);
      if (p >= 1) {
        this.tweens.splice(i, 1);
        tw.done?.();
      } else i++;
    }
    for (let i = 0; i < this.particles.length;) {
      const pt = this.particles[i]!;
      pt.life -= dt;
      if (pt.life <= 0) {
        pt.s.destroy();
        this.particles.splice(i, 1);
        continue;
      }
      const s = dt / 1000;
      pt.vy += pt.g * s;
      pt.s.x += pt.vx * s;
      pt.s.y += pt.vy * s;
      const k = pt.life / pt.max;
      pt.s.alpha = k * pt.fade;
      if (pt.shrink) pt.s.scale.set(pt.s.scale.x * (0.985 + 0.015 * k));
      i++;
    }

    this.backdrop.animate(this.now, dt, reduced);
    for (const u of this.units.values()) u.render(this.now, dt, reduced);

    // Screen shake (impacts, crits).
    if (this.shake > 0.1 && !reduced) {
      this.world.position.set(
        (Math.random() - 0.5) * this.shake,
        (Math.random() - 0.5) * this.shake,
      );
      this.shake *= Math.exp(-dt / 70);
    } else {
      this.shake = 0;
      this.world.position.set(0, 0);
    }
  };
}
