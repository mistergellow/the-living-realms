import { hexDistance } from '@realms/game-core';
import type { HexCoord, PresencePlayer } from '@realms/shared';
import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { CharacterToken } from '../characters/CharacterToken';
import { HexMap } from './HexMap';
import { useWorldStore } from './world-store';

/**
 * Exploration: the PixiJS hex map with the players online and the Chronicle.
 * Rendered inside GameShell (top bar, bottom navigation and the world
 * connection live there).
 */
export function WorldPage() {
  const [selected, setSelected] = useState<HexCoord | null>(null);
  const [hovered, setHovered] = useState<HexCoord | null>(null);
  const { self, log } = useWorldStore(useShallow((s) => ({ self: s.self, log: s.log })));
  const playersById = useWorldStore((s) => s.players);
  const players = useMemo(() => Object.values(playersById), [playersById]);

  return (
    <div className="world">
      <section className="world-map">
        {self ? (
          <HexMap
            center={self.position}
            players={players}
            selfId={self.id}
            selected={selected}
            onSelect={setSelected}
            onHover={setHovered}
          />
        ) : null}
      </section>

      <div className="hud">
        <aside className="hud-side">
          <section className="panel">
            <div className="panel-title">
              <span>In the world ({players.length})</span>
            </div>
            <ul className="player-list" data-testid="player-list">
              {players.map((p) => (
                <li key={p.characterId}>
                  <CharacterToken appearance={p.appearance} size={26} />
                  <span>{p.name}</span>
                  {p.characterId === self?.id && <span className="muted">(you)</span>}
                </li>
              ))}
            </ul>
          </section>
          <section className="panel chronicle">
            <div className="panel-title">
              <span>Chronicle</span>
            </div>
            <ol className="log">
              {log.map((e) => (
                <li
                  key={e.id}
                  style={{
                    color:
                      e.tone === 'error'
                        ? 'var(--danger)'
                        : e.tone === 'warn'
                          ? 'var(--warning)'
                          : undefined,
                  }}
                >
                  <time dateTime={e.at}>{new Date(e.at).toLocaleTimeString()}</time>
                  {e.text}
                </li>
              ))}
            </ol>
          </section>
        </aside>

        {self && (
          <div className="panel hud-bottom">
            <HexInfo hex={hovered ?? selected} from={self.position} players={players} />
          </div>
        )}
      </div>
    </div>
  );
}

/** One line about a hex: coordinates, distance and who is there. */
function HexInfo({
  hex,
  from,
  players,
}: {
  hex: HexCoord | null;
  from: HexCoord;
  players: PresencePlayer[];
}) {
  if (!hex) return <span className="muted">Select a hex to inspect it.</span>;
  const here = players.filter((p) => p.position.q === hex.q && p.position.r === hex.r);
  return (
    <span data-testid="hex-info">
      Hex{' '}
      <span className="mono">
        ({hex.q}, {hex.r})
      </span>{' '}
      · {hexDistance(from, hex)} away
      {here.length > 0 && <> · {here.map((p) => p.name).join(', ')}</>}
    </span>
  );
}
