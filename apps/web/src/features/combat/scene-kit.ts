import type { StatusId } from '@realms/shared';
import type { Sprite } from 'pixi.js';

/* Shared constants and helpers for the combat renderer (combat-scene.ts). */

export const COLORS = {
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
export const STATUS_COLORS: Record<StatusId, number> = {
  bleed: 0xd8334a,
  burn: 0xff8a2a,
  mark: 0xe8c45a,
  weaken: 0x9b7bff,
  stun: 0xd6dbe4,
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export const easeOut = (p: number) => 1 - (1 - p) ** 3;
export const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Small deterministic RNG so a room's backdrop looks the same on every visit. */
export function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

export interface Tween {
  t: number;
  dur: number;
  fn: (p: number) => void;
  done?: () => void;
}

export interface Particle {
  s: Sprite;
  vx: number;
  vy: number;
  g: number;
  life: number;
  max: number;
  fade: number;
  shrink: boolean;
}
