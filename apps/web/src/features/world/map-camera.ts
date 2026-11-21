/*
 * Map camera maths (pure, no Pixi): which world point is at the centre of the
 * view and how far we are zoomed in. Used by the canvas map scene.
 */

export interface Camera {
  /** World point shown at the centre of the view. */
  x: number;
  y: number;
  zoom: number;
}

export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 2.6;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function clampZoom(z: number): number {
  return clamp(z, MIN_ZOOM, MAX_ZOOM);
}

/** Screen pixel → world point. */
export function screenToWorld(
  cam: Camera,
  width: number,
  height: number,
  sx: number,
  sy: number,
): { x: number; y: number } {
  return { x: (sx - width / 2) / cam.zoom + cam.x, y: (sy - height / 2) / cam.zoom + cam.y };
}

/** World point → screen pixel. */
export function worldToScreen(
  cam: Camera,
  width: number,
  height: number,
  wx: number,
  wy: number,
): { x: number; y: number } {
  return { x: (wx - cam.x) * cam.zoom + width / 2, y: (wy - cam.y) * cam.zoom + height / 2 };
}

/** Zoom by `factor`, keeping the world point under (sx, sy) fixed on screen. */
export function zoomAt(
  cam: Camera,
  width: number,
  height: number,
  factor: number,
  sx: number,
  sy: number,
): Camera {
  const zoom = clampZoom(cam.zoom * factor);
  const w = screenToWorld(cam, width, height, sx, sy);
  return { zoom, x: w.x - (sx - width / 2) / zoom, y: w.y - (sy - height / 2) / zoom };
}

/** Keep the view centre within `radius` world units of `center`. */
export function clampToBounds(
  cam: Camera,
  center: { x: number; y: number },
  radius: number,
): Camera {
  const dx = cam.x - center.x;
  const dy = cam.y - center.y;
  const d = Math.hypot(dx, dy);
  if (d <= radius) return cam;
  return { ...cam, x: center.x + (dx / d) * radius, y: center.y + (dy / d) * radius };
}

/** Zoom that fits a circle of `extent` world units (radius) in the view. */
export function fitZoom(width: number, height: number, extent: number): number {
  if (width <= 0 || height <= 0) return 1;
  return clampZoom(Math.min(width, height) / (2 * extent));
}
