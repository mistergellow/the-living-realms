import { hexCorners, hexDistance, hexesInRange, hexKey, hexToPixel } from '@realms/game-core';
import type { HexCoord, PresencePlayer } from '@realms/shared';
import { useMemo } from 'react';
import { emblemPath } from '../characters/CharacterToken';

const SIZE = 34;
const RADIUS = 5;
const CORNERS = hexCorners(SIZE - 1)
  .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
  .join(' ');

interface HexMapProps {
  center: HexCoord;
  players: PresencePlayer[];
  selfId: string | null;
  selected: HexCoord | null;
  onSelect: (h: HexCoord) => void;
}

/**
 * Placeholder exploration view: a window of the hex world around the player.
 * Terrain, fog of war and movement (AP cost per hex) arrive in later phases.
 */
export function HexMap({ center, players, selfId, selected, onSelect }: HexMapProps) {
  const hexes = useMemo(() => hexesInRange(center, RADIUS), [center]);
  const byHex = useMemo(() => {
    const m = new Map<string, PresencePlayer[]>();
    for (const p of players) {
      const k = hexKey(p.position);
      m.set(k, [...(m.get(k) ?? []), p]);
    }
    return m;
  }, [players]);

  const origin = hexToPixel(center, SIZE);
  const extent = SIZE * (RADIUS * 2 + 1) * 0.95;

  return (
    <svg
      className="hex-map"
      viewBox={`${origin.x - extent} ${origin.y - extent} ${extent * 2} ${extent * 2}`}
      preserveAspectRatio="xMidYMid meet"
      aria-label="World map"
    >
      {hexes.map((h) => {
        const { x, y } = hexToPixel(h, SIZE);
        const k = hexKey(h);
        const here = byHex.get(k) ?? [];
        const isSelf = here.some((p) => p.characterId === selfId);
        const isSelected = selected ? hexKey(selected) === k : false;
        const shown = here.find((p) => p.characterId === selfId) ?? here[0];
        return (
          <g
            key={k}
            transform={`translate(${x.toFixed(2)},${y.toFixed(2)})`}
            onClick={() => onSelect(h)}
          >
            <polygon className="hex" points={CORNERS} data-self={isSelf} data-selected={isSelected}>
              <title>{`(${h.q}, ${h.r}) · ${hexDistance(center, h)} from you${here.length ? ` · ${here.map((p) => p.name).join(', ')}` : ''}`}</title>
            </polygon>
            {shown ? (
              <g pointerEvents="none">
                <circle r="13" fill="#0b0d12" stroke={shown.appearance.color} strokeWidth="2" />
                <path d={emblemPath(shown.appearance.emblem)} fill={shown.appearance.color} />
                {here.length > 1 && (
                  <g transform="translate(13,-13)">
                    <circle className="badge" r="8" />
                    <text className="badge-text" textAnchor="middle" dy="3.5">
                      {here.length}
                    </text>
                  </g>
                )}
              </g>
            ) : (
              <text className="coord" textAnchor="middle" dy="3">
                {h.q},{h.r}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
