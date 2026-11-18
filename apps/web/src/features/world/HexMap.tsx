import type { HexCoord, PresencePlayer } from '@realms/shared';
import { useEffect, useRef } from 'react';
import { prefersReducedMotion, usePixiScene } from '../render/usePixiScene';
import type { MapScene } from './map-scene';

interface HexMapProps {
  center: HexCoord;
  players: PresencePlayer[];
  selfId: string | null;
  selected: HexCoord | null;
  onSelect: (h: HexCoord) => void;
  onHover?: (h: HexCoord | null) => void;
}

/**
 * Exploration map: a PixiJS canvas (map-scene.ts) with drag to pan, wheel or
 * pinch to zoom, keyboard (arrows, + / −, 0) and on-screen zoom buttons.
 * Terrain, fog of war and movement (AP cost per hex) arrive in Phase 4.
 */
export function HexMap({ center, players, selfId, selected, onSelect, onHover }: HexMapProps) {
  const cb = useRef({ onSelect, onHover });
  useEffect(() => {
    cb.current = { onSelect, onHover };
  }, [onSelect, onHover]);
  const { hostRef, scene, failed } = usePixiScene<MapScene>(async (app, w, h, host) => {
    const { MapScene } = await import('./map-scene');
    return new MapScene(
      app,
      w,
      h,
      host,
      {
        onSelect: (hex) => cb.current.onSelect(hex),
        onHover: (hex) => cb.current.onHover?.(hex),
      },
      { reducedMotion: prefersReducedMotion() },
    );
  });

  useEffect(() => {
    scene?.setData({ center, players, selfId, selected });
  }, [scene, center, players, selfId, selected]);

  return (
    <div className="hex-map">
      <div
        className="hex-map-canvas"
        ref={hostRef}
        tabIndex={0}
        role="application"
        aria-label="World map. Drag to move, scroll to zoom; arrow keys, plus, minus and 0 also work."
        data-testid="world-map"
      />
      {failed ? (
        <div className="hex-map-fallback muted">
          The map needs WebGL, which this browser could not start. You are at ({center.q},{' '}
          {center.r}).
        </div>
      ) : (
        <div className="map-controls" role="group" aria-label="Map controls">
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => scene?.zoomBy(1.25)}
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => scene?.zoomBy(0.8)}
            aria-label="Zoom out"
          >
            −
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => scene?.recenter()}
            aria-label="Center on me"
          >
            ◎
          </button>
        </div>
      )}
    </div>
  );
}
