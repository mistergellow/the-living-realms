import { Texture } from 'pixi.js';

const cache = new Map<string, Promise<Texture>>();

/**
 * Rasterises SVG markup into a Pixi texture of `width`×`height` pixels.
 * Cached by `key`: the same art (same appearance, same layer) is drawn once
 * and shared by every sprite and scene. Uses a data: URL (allowed by our CSP;
 * blob: URLs and workers are not).
 */
export function svgTexture(
  key: string,
  markup: string,
  width: number,
  height: number,
): Promise<Texture> {
  const hit = cache.get(key);
  if (hit) return hit;
  const svg = markup.includes('xmlns=')
    ? markup
    : markup.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  const p = new Promise<Texture>((resolve, reject) => {
    const img = new Image(width, height);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('2D canvas unavailable'));
      ctx.drawImage(img, 0, 0, width, height);
      resolve(Texture.from(canvas));
    };
    img.onerror = () => reject(new Error(`Could not rasterise SVG (${key})`));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
  p.catch(() => cache.delete(key));
  cache.set(key, p);
  return p;
}

/** A texture drawn with the 2D canvas API (gradients, soft glows). Cached by key. */
export function canvasTexture(
  key: string,
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): Texture {
  const hit = drawn.get(key);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) draw(ctx);
  const t = Texture.from(canvas);
  drawn.set(key, t);
  return t;
}
const drawn = new Map<string, Texture>();

/** Soft round glow (white centre fading to transparent); tint it per use. */
export function glowTexture(): Texture {
  return canvasTexture('glow', 128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  });
}

/** Screen-edge darkening, stretched over the whole view. */
export function vignetteTexture(strength = 0.65): Texture {
  return canvasTexture(`vignette:${strength}`, 256, 256, (ctx) => {
    const g = ctx.createRadialGradient(128, 128, 60, 128, 128, 182);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(0,0,0,${strength})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  });
}

/** Vertical gradient strip (stretched to any size). */
export function verticalGradient(key: string, stops: Array<[number, string]>): Texture {
  return canvasTexture(`vgrad:${key}`, 4, 256, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    for (const [at, color] of stops) g.addColorStop(at, color);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 256);
  });
}
