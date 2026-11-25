import { useEffect } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router';
import { useShallow } from 'zustand/react/shallow';
import { Icon, type IconName } from '../../shared/ui/Icon';
import { Screen } from '../../shared/ui/Screen';
import { useActiveCharacter } from '../characters/active-character';
import { useCharacterSheet } from '../characters/api';
import { useFriends } from '../social/api';
import { useWorldConnection } from '../world/useWorldConnection';
import { useWorldStore } from '../world/world-store';
import './game.css';
import { HudTop } from './hud/HudTop';

const STATUS_LABEL = {
  idle: 'Idle',
  connecting: 'Connecting…',
  online: 'Online',
  reconnecting: 'Reconnecting…',
  replaced: 'Playing elsewhere',
  unauthenticated: 'Logged out',
  offline: 'Offline',
} as const;

/**
 * How much the painted backdrop is darkened. One value for every page
 * (request #70): a different value per page made the background pulse on
 * every navigation.
 */
const DIM = 0.55;

/**
 * The in-game frame shared by the hex screen, the world map, Rifts and Friends:
 * the world connection (you stay online while moving between them), the top
 * bar (portrait, name, status, reputation; switching character is a small
 * corner button, request #40) and the bottom navigation bar.
 * Pages render inside `.game-main`.
 */
export function GameShell() {
  const characterId = useActiveCharacter((s) => s.characterId);
  const clearCharacter = useActiveCharacter((s) => s.clear);
  useWorldConnection(characterId);
  // Request #59: actions that spend AP (gathering, jobs, Rifts) refresh the
  // character; keep the header's AP in step with it right away.
  const sheet = useCharacterSheet(characterId);
  const updateSelf = useWorldStore((s) => s.updateSelf);
  useEffect(() => {
    if (sheet.data) updateSelf(sheet.data.character);
  }, [sheet.data, updateSelf]);
  const { status, self, world, tick, lastError, online } = useWorldStore(
    useShallow((s) => ({
      status: s.status,
      self: s.self,
      world: s.world,
      tick: s.tick,
      lastError: s.lastError,
      online: Object.keys(s.players).length,
    })),
  );

  if (!characterId) return <Navigate to="/" replace />;
  if (status === 'unauthenticated') return <Navigate to="/login" replace />;

  return (
    <Screen className="game" dim={DIM}>
      <HudTop
        characterId={characterId}
        status={status}
        statusLabel={STATUS_LABEL[status]}
        name={self?.name ?? null}
        appearance={self?.appearance ?? null}
        worldName={world?.name ?? 'The Living Realms'}
        tick={tick}
        online={online}
      />
      <main className="game-main">
        <Outlet />
      </main>
      <BottomNav characterId={characterId} />

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

function BottomNav({ characterId }: { characterId: string }) {
  const friends = useFriends(characterId);
  const pending = friends.data?.incoming.length ?? 0;
  const { pathname } = useLocation();
  // Request #69: five places, named for what you do there. Friends and Guild
  // share "Allies"; the crafts got their own entry.
  const items: Array<{
    to: string;
    label: string;
    icon: IconName;
    home?: boolean;
    badge?: number;
    testId?: string;
    also?: string[];
  }> = [
    { to: '/hero', label: 'Character', icon: 'hero' },
    { to: '/world', label: 'World', icon: 'compass' },
    {
      to: '/home',
      label: 'Here',
      icon: 'home',
      home: true,
      also: ['/city', '/rifts', '/world-boss'],
    },
    { to: '/professions', label: 'Crafts', icon: 'gear' },
    {
      to: '/friends',
      label: 'Allies',
      icon: 'friends',
      badge: pending,
      testId: 'friends-link',
      also: ['/guild'],
    },
  ];
  return (
    <nav className="game-nav" aria-label="Main">
      {items.map((it) => (
        <NavLink
          key={it.label}
          to={it.to}
          className={({ isActive }) =>
            [
              'nav-item',
              it.home ? 'nav-home' : '',
              isActive || it.also?.some((p) => pathname.startsWith(p)) ? 'is-active' : '',
            ].join(' ')
          }
          data-testid={it.testId}
        >
          <span className="nav-icon">
            <Icon name={it.icon} />
            {!!it.badge && <span className="badge-dot">{it.badge}</span>}
          </span>
          <span className="nav-label">{it.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
