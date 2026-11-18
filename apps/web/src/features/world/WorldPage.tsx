import { hexDistance } from '@realms/game-core';
import type { HexCoord, PresencePlayer } from '@realms/shared';
import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { useShallow } from 'zustand/react/shallow';
import { useLogout } from '../auth/api';
import { useFriends } from '../social/api';
import { useActiveCharacter } from '../characters/active-character';
import { CharacterToken } from '../characters/CharacterToken';
import { Icon } from '../../shared/ui/Icon';
import { Screen } from '../../shared/ui/Screen';
import { HexMap } from './HexMap';
import { useWorldConnection } from './useWorldConnection';
import { useWorldStore } from './world-store';

const STATUS_LABEL = {
  idle: 'Idle',
  connecting: 'Connecting…',
  online: 'Online',
  reconnecting: 'Reconnecting…',
  replaced: 'Playing elsewhere',
  unauthenticated: 'Logged out',
  offline: 'Offline',
} as const;

export function WorldPage() {
  const characterId = useActiveCharacter((s) => s.characterId);
  const clearCharacter = useActiveCharacter((s) => s.clear);
  const navigate = useNavigate();
  const logout = useLogout();
  const [selected, setSelected] = useState<HexCoord | null>(null);
  const [hovered, setHovered] = useState<HexCoord | null>(null);
  const friends = useFriends(characterId);
  const pending = friends.data?.incoming.length ?? 0;
  useWorldConnection(characterId);

  const { status, world, self, tick, log, lastError } = useWorldStore(
    useShallow((s) => ({
      status: s.status,
      world: s.world,
      self: s.self,
      tick: s.tick,
      log: s.log,
      lastError: s.lastError,
    })),
  );
  const playersById = useWorldStore((s) => s.players);
  const players = useMemo(() => Object.values(playersById), [playersById]);

  if (!characterId) return <Navigate to="/characters" replace />;
  if (status === 'unauthenticated') return <Navigate to="/login" replace />;

  const leave = () => {
    clearCharacter();
    navigate('/characters');
  };

  return (
    <Screen className="world" embers={false}>
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
        <header className="hud-top">
          <div className="panel hud-plate">
            {self && <CharacterToken appearance={self.appearance} size={48} />}
            <div>
              {self && (
                <div className="self-name" data-testid="self-name">
                  {self.name}
                </div>
              )}
              <span className="hud-status" data-testid="connection-status">
                <span className="status-dot" data-status={status} />
                <span>{STATUS_LABEL[status]}</span>
              </span>
            </div>
          </div>

          <div className="panel hud-banner">
            <div className="title">{world?.name ?? 'The Living Realms'}</div>
            {tick !== null && (
              <div className="mono muted" data-testid="world-tick">
                Tick {tick}
              </div>
            )}
          </div>

          <nav className="hud-menu" aria-label="Game menu">
            <Link className="btn btn-primary" to="/rifts">
              <Icon name="portal" />
              <span className="label">Rifts</span>
            </Link>
            <Link className="btn" to="/friends" data-testid="friends-link">
              <Icon name="friends" />
              <span className="label">Friends{pending > 0 ? ` (${pending})` : ''}</span>
            </Link>
            {self && (
              <Link className="btn" to={`/characters/${self.id}`}>
                <Icon name="hero" />
                <span className="label">Character</span>
              </Link>
            )}
            <button className="btn" onClick={leave}>
              <Icon name="swap" />
              <span className="label">Switch character</span>
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/login') })}
            >
              <Icon name="exit" />
              <span className="label">Log out</span>
            </button>
          </nav>
        </header>

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

      {status === 'replaced' ? (
        <div className="overlay">
          <div className="panel stack" style={{ maxWidth: '24rem', textAlign: 'center' }}>
            <h2>Playing elsewhere</h2>
            <p className="muted" style={{ margin: 0 }}>
              Your account entered the world from another tab or device. Only one character can be
              played at a time.
            </p>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              Play here instead
            </button>
            <Link to="/characters" onClick={clearCharacter}>
              Back to characters
            </Link>
          </div>
        </div>
      ) : !self ? (
        <div className="overlay">
          <div className="stack" style={{ textAlign: 'center', alignItems: 'center' }}>
            {lastError ? (
              <>
                <div className="alert alert-error">{lastError}</div>
                <Link to="/characters" onClick={clearCharacter}>
                  Back to characters
                </Link>
              </>
            ) : (
              <div className="loading">
                <span className="rune-spinner" aria-hidden />
                Entering the world…
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Screen>
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
