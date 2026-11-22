import {
  AP_RULES,
  hexDistance,
  mapHexAt,
  nextRiftReset,
  REGIONS,
  TERRAIN_NAMES,
} from '@realms/game-core';
import type { HexCoord, PresencePlayer } from '@realms/shared';
import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { CharacterToken } from '../characters/CharacterToken';
import { liveAp } from './ap';
import { useTravel, useWorldBoss } from './api';
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
  const boss = useWorldBoss(self?.id ?? null);
  const bossAt = boss.data && !boss.data.defeatedAt ? boss.data.position : null;

  return (
    <div className="world">
      <section className="world-map">
        {self ? (
          <HexMap
            center={self.position}
            players={players}
            selfId={self.id}
            selected={selected}
            boss={bossAt}
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
            <HexInfo
              hex={selected ?? hovered}
              from={self.position}
              players={players}
              characterId={self.id}
              boss={bossAt}
              ap={liveAp(self.ap)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * About a hex: region and terrain (or capital / Rift / world boss), distance,
 * who is there, and travel (request #43): pay AP per hex to go there at once.
 */
function HexInfo({
  hex,
  from,
  players,
  characterId,
  boss,
  ap,
}: {
  hex: HexCoord | null;
  from: HexCoord;
  players: PresencePlayer[];
  characterId: string;
  boss: HexCoord | null;
  ap: number;
}) {
  const travel = useTravel(characterId);
  if (!hex) return <span className="muted">Select a hex to inspect it or travel there.</span>;
  const here = players.filter((p) => p.position.q === hex.q && p.position.r === hex.r);
  const tile = mapHexAt(hex);
  const steps = hexDistance(from, hex);
  const cost = steps * AP_RULES.moveCostPerHex;
  const bossHere = !!boss && boss.q === hex.q && boss.r === hex.r;
  const title = !tile
    ? 'Open sea'
    : tile.capital
      ? `${tile.capital}, ${REGIONS[tile.region].name}`
      : `${TERRAIN_NAMES[tile.terrain]} · ${REGIONS[tile.region].name}`;
  return (
    <span data-testid="hex-info" className="hex-info">
      <strong>{title}</strong>
      {tile?.rift && (
        <span
          className="hex-tag rift"
          title={`Rifts move every day. This one closes at ${nextRiftReset().toLocaleTimeString()}.`}
        >
          Rift · tier {tile.rift.tier}
        </span>
      )}
      {bossHere && <span className="hex-tag boss">World boss</span>} · Hex{' '}
      <span className="mono">
        ({hex.q}, {hex.r})
      </span>{' '}
      · {steps} away
      {here.length > 0 && <> · {here.map((p) => p.name).join(', ')}</>}
      {tile && steps > 0 && (
        <button
          className="btn btn-primary btn-sm"
          disabled={travel.isPending || cost > ap}
          title={cost > ap ? `You need ${cost} AP` : undefined}
          onClick={() => travel.mutate(hex)}
          data-testid="travel"
        >
          Travel here · {cost} AP
        </button>
      )}
      {travel.error && <span className="field-error"> {travel.error.message}</span>}
    </span>
  );
}
