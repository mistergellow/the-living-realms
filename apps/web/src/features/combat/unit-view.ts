import { COMBAT_RULES } from '@realms/game-core';
import type { CombatantView } from '@realms/shared';
import { ColorMatrixFilter, Container, Graphics, Sprite, Text, type Texture } from 'pixi.js';
import { artFromAbilities } from '../avatar/weapon-art';
import {
  characterTextures,
  enemyTexture,
  TEX_SCALE,
  type CharacterTextures,
} from '../render/avatar-textures';
import { BOSS_HEIGHT, UNIT_HEIGHT } from './combat-layout';
import { clamp01, COLORS, easeInOut, FONT, lerp } from './scene-kit';

/* One combatant on the battlefield: art, plate (name, HP, mana) and idle motion. */

export class UnitView {
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
