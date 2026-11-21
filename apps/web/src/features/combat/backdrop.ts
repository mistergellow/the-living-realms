import { Container, Graphics, Sprite } from 'pixi.js';
import { glowTexture, verticalGradient, vignetteTexture } from '../render/svg-texture';
import { type CombatLayout } from './combat-layout';
import { seeded } from './scene-kit';

/* Battlefield background: sky, ground, rift portal and floating motes. */

export class Backdrop {
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
