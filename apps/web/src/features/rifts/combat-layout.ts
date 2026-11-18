import type { CombatSide } from '@realms/shared';

/*
 * Where each battlefield slot sits on the combat screen (pure, no Pixi).
 * Shared by the canvas scene (drawing) and the DOM overlay (click targets),
 * so both always agree.
 *
 * Side view: party on the left, enemies mirrored on the right. Slots 0–2 are
 * the front row (near the centre), 3–5 the back row. Within a row, slot % 3 is
 * the depth: 0 = far (higher up, smaller), 2 = near (lower, larger); the
 * middle depth is stepped back so the three units of a row overlap less.
 */

export interface SlotPlace {
  /** Feet position in CSS pixels. */
  x: number;
  y: number;
  /** Size multiplier (screen size × depth). */
  scale: number;
  depth: number;
}

export interface CombatLayout {
  width: number;
  height: number;
  /** Overall scale for this screen size (1 ≈ a 1050×440 stage). */
  base: number;
  /** Where the far ground meets the backdrop. */
  horizon: number;
  /** Centre of the Rift glow between the two sides. */
  riftX: number;
  place(side: CombatSide, slot: number): SlotPlace;
}

/** Art height (in viewBox units scaled by `scale`) for a unit. */
export const UNIT_HEIGHT = 118;
export const BOSS_HEIGHT = 150;
/** Room above the head for the name, bars and Focus pips. */
export const PLATE_HEIGHT = 38;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function combatLayout(width: number, height: number): CombatLayout {
  // Narrow (phone) screens get relatively bigger units: they have height to spare.
  const byWidth = width < 700 ? width / 640 : width / 1050;
  const base = clamp(Math.min(byWidth, height / 440), 0.42, 1.6);
  const cx = width / 2;
  return {
    width,
    height,
    base,
    horizon: height * 0.46,
    riftX: cx,
    place(side, slot) {
      const depth = slot % 3;
      const front = slot < 3;
      // Zig-zag: the middle depth steps back so units overlap less.
      const off = width * (front ? 0.12 : 0.28) + (depth === 1 ? width * 0.055 : 0);
      const x = side === 'party' ? cx - off : cx + off;
      const y = height * (0.62 + 0.135 * depth);
      return { x, y, scale: base * (0.86 + 0.08 * depth), depth };
    },
  };
}

/** On-screen box of a unit (art + plate), for the clickable overlay. */
export function unitRect(
  layout: CombatLayout,
  side: CombatSide,
  slot: number,
  isBoss: boolean,
): { left: number; top: number; width: number; height: number } {
  const p = layout.place(side, slot);
  const artH = (isBoss ? BOSS_HEIGHT : UNIT_HEIGHT) * p.scale;
  const w = artH * 0.62;
  const plate = PLATE_HEIGHT * plateScale(layout);
  return { left: p.x - w / 2, top: p.y - artH - plate, width: w, height: artH + plate + 6 };
}

/** Name/bars plate scale: follows the screen size, but stays readable. */
export function plateScale(layout: CombatLayout): number {
  return clamp(layout.base, layout.width < 700 ? 0.62 : 0.8, 1.25);
}
