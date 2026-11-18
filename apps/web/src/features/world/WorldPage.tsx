import { hexDistance } from '@realms/game-core';
import type { HexCoord } from '@realms/shared';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { useShallow } from 'zustand/react/shallow';
import { useLogout } from '../auth/api';
import { useFriends } from '../social/api';
import { useActiveCharacter } from '../characters/active-character';
import { CharacterToken } from '../characters/CharacterToken';
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
  const players = Object.values(useWorldStore((s) => s.players));

  if (!characterId) return <Navigate to="/characters" replace />;
  if (status === 'unauthenticated') return <Navigate to="/login" replace />;

  const leave = () => {
    clearCharacter();
    navigate('/characters');
  };

  return (
    <div className="world">
      <header className="world-top">
        <span className="title">{world?.name ?? 'The Living Realms'}</span>
        <span className="row" style={{ gap: 6 }} data-testid="connection-status">
          <span className="status-dot" data-status={status} />
          <span className="muted">{STATUS_LABEL[status]}</span>
        </span>
        {tick !== null && (
          <span className="mono muted" data-testid="world-tick">
            Tick {tick}
          </span>
        )}
        <span className="spacer" />
        {self && (
          <span className="row" style={{ gap: 8 }}>
            <CharacterToken appearance={self.appearance} size={28} />
            <strong data-testid="self-name">{self.name}</strong>
          </span>
        )}
        <Link className="btn btn-primary btn-sm" to="/rifts">
          Rifts
        </Link>
        <Link className="btn btn-ghost btn-sm" to="/friends" data-testid="friends-link">
          Friends{pending > 0 ? ` (${pending})` : ''}
        </Link>
        {self && (
          <Link className="btn btn-ghost btn-sm" to={`/characters/${self.id}`}>
            Character
          </Link>
        )}
        <button className="btn btn-ghost btn-sm" onClick={leave}>
          Switch character
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/login') })}
        >
          Log out
        </button>
      </header>

      <section className="world-map">
        {self ? (
          <HexMap
            center={self.position}
            players={players}
            selfId={self.id}
            selected={selected}
            onSelect={setSelected}
          />
        ) : null}
        {status === 'replaced' ? (
          <div className="overlay">
            <div className="panel stack" style={{ maxWidth: 380, textAlign: 'center' }}>
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
            <div className="stack" style={{ textAlign: 'center' }}>
              {lastError ? (
                <>
                  <div className="alert alert-error">{lastError}</div>
                  <Link to="/characters" onClick={clearCharacter}>
                    Back to characters
                  </Link>
                </>
              ) : (
                <span className="muted">Entering the world…</span>
              )}
            </div>
          </div>
        ) : null}
        {self && (
          <div className="map-legend panel" style={{ padding: '6px 10px' }}>
            {selected ? (
              <span>
                Hex{' '}
                <span className="mono">
                  ({selected.q}, {selected.r})
                </span>{' '}
                · {hexDistance(self.position, selected)} away
              </span>
            ) : (
              <span className="muted">Select a hex to inspect it.</span>
            )}
          </div>
        )}
      </section>

      <aside className="world-side">
        <section className="panel">
          <div className="panel-title">In the world ({players.length})</div>
          <ul className="player-list" data-testid="player-list">
            {players.map((p) => (
              <li key={p.characterId}>
                <CharacterToken appearance={p.appearance} size={22} />
                <span>{p.name}</span>
                {p.characterId === self?.id && <span className="muted">(you)</span>}
              </li>
            ))}
          </ul>
        </section>
        <section className="panel" style={{ flex: 1 }}>
          <div className="panel-title">Chronicle</div>
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
    </div>
  );
}
