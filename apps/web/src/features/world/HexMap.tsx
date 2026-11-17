import { hexCorners, hexDistance, hexesInRange, hexKey, hexToPixel } from '@realms/game-core';
import type { HexCoord, PresencePlayer } from '@realms/shared';
import { useMemo } from 'react';
import { CharacterAvatar } from '../avatar/CharacterAvatar';

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
      <defs>
        <radialGradient id="hex-fill" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#262232" />
          <stop offset="100%" stopColor="#15131c" />
        </radialGradient>
      </defs>
      {hexes.map((h) => {
        const { x, y } = hexToPixel(h, SIZE);
        const k = hexKey(h);
        const here = byHex.get(k) ?? [];
        const isSelf = here.some((p) => p.characterId === selfId);
        const isSelected = selected ? hexKey(selected) === k : false;
        const shown = here.find((p) => p.characterId === selfId) ?? here[0];
        // Edge hexes fade into the dark (visual only: no fog-of-war rules yet).
        const fade = 1 - Math.max(0, hexDistance(center, h) - (RADIUS - 2)) * 0.28;
        return (
          <g
            key={k}
            transform={`translate(${x.toFixed(2)},${y.toFixed(2)})`}
            onClick={() => onSelect(h)}
            opacity={fade}
          >
            <polygon className="hex" points={CORNERS} data-self={isSelf} data-selected={isSelected}>
              <title>{`(${h.q}, ${h.r}) · ${hexDistance(center, h)} from you${here.length ? ` · ${here.map((p) => p.name).join(', ')}` : ''}`}</title>
            </polygon>
            {shown ? (
              <g pointerEvents="none">
                {isSelf && <circle className="self-ring" r="22" />}
                <circle r="15" fill="#0b0a10" stroke="var(--accent-strong)" strokeWidth="1.5" />
                <g transform="translate(-14 -14)">
                  <CharacterAvatar
                    appearance={shown.appearance}
                    portrait
                    size={28}
                    animated={false}
                    inSvg
                  />
                </g>
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
