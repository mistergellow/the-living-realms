import { describe, expect, it } from 'vitest';
import {
  clampToBounds,
  fitZoom,
  MAX_ZOOM,
  MIN_ZOOM,
  screenToWorld,
  worldToScreen,
  zoomAt,
} from '../src/features/world/map-camera';

describe('map camera', () => {
  const cam = { x: 100, y: -40, zoom: 1.5 };

  it('converts between screen and world points', () => {
    expect(screenToWorld(cam, 800, 600, 400, 300)).toEqual({ x: 100, y: -40 });
    const w = screenToWorld(cam, 800, 600, 123, 456);
    const s = worldToScreen(cam, 800, 600, w.x, w.y);
    expect(s.x).toBeCloseTo(123);
    expect(s.y).toBeCloseTo(456);
  });

  it('zooms around the cursor (the point under it stays put)', () => {
    const before = screenToWorld(cam, 800, 600, 650, 120);
    const z = zoomAt(cam, 800, 600, 1.3, 650, 120);
    const after = screenToWorld(z, 800, 600, 650, 120);
    expect(z.zoom).toBeCloseTo(1.95);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it('clamps zoom and panning', () => {
    expect(zoomAt(cam, 800, 600, 100, 0, 0).zoom).toBe(MAX_ZOOM);
    expect(zoomAt(cam, 800, 600, 0.001, 0, 0).zoom).toBe(MIN_ZOOM);
    const far = clampToBounds({ x: 1000, y: 0, zoom: 1 }, { x: 0, y: 0 }, 300);
    expect(far.x).toBeCloseTo(300);
    expect(clampToBounds(cam, { x: 0, y: 0 }, 300)).toBe(cam);
  });

  it('fits an area in the view', () => {
    expect(fitZoom(800, 600, 300)).toBeCloseTo(1);
    expect(fitZoom(0, 600, 300)).toBe(1);
  });
});
