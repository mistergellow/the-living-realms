import type { CombatLogEntry, CombatView } from '@realms/shared';
import { Container, Graphics, Sprite, Text, type Application, type Ticker } from 'pixi.js';
import { glowTexture } from '../render/svg-texture';
import type { PixiScene } from '../render/usePixiScene';
import { plateScale, UNIT_HEIGHT, type CombatLayout } from './combat-layout';
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

import { Backdrop } from './backdrop';
import {
  clamp01,
  COLORS,
  easeInOut,
  easeOut,
  FONT,
  lerp,
  STATUS_COLORS,
  type Particle,
  type Tween,
} from './scene-kit';
import { UnitView } from './unit-view';

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
