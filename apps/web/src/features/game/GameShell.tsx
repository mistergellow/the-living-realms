import { useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useShallow } from 'zustand/react/shallow';
import { Icon, type IconName } from '../../shared/ui/Icon';
import { Screen } from '../../shared/ui/Screen';
import { useLogout } from '../auth/api';
import { useActiveCharacter } from '../characters/active-character';
import { useCharacterSheet } from '../characters/api';
import { CharacterToken } from '../characters/CharacterToken';
import { useFriends } from '../social/api';
import { useWorldConnection } from '../world/useWorldConnection';
import { fullIn, liveAp } from '../world/ap';
import { useWorldStore } from '../world/world-store';
import './game.css';

const STATUS_LABEL = {
  idle: 'Idle',
  connecting: 'Connecting…',
  online: 'Online',
  reconnecting: 'Reconnecting…',
  replaced: 'Playing elsewhere',
  unauthenticated: 'Logged out',
  offline: 'Offline',
} as const;

/** How much the painted backdrop is darkened per screen (0 = as painted). */
const DIM: Record<string, number> = { '/home': 0.45, '/world': 0.4 };

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
  const location = useLocation();
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
    <Screen className="game" dim={DIM[location.pathname] ?? 0.62}>
      <TopBar
        characterId={characterId}
        status={status}
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

function TopBar(props: {
  characterId: string;
  status: keyof typeof STATUS_LABEL;
  name: string | null;
  appearance: Parameters<typeof CharacterToken>[0]['appearance'] | null;
  worldName: string;
  tick: number | null;
  online: number;
}) {
  const sheet = useCharacterSheet(props.characterId);
  const logout = useLogout();
  const navigate = useNavigate();
  return (
    <header className="game-top">
      <Link className="profile-plate" to={`/characters/${props.characterId}`} title="Your hero">
        {props.appearance && <CharacterToken appearance={props.appearance} size={44} />}
        <span className="profile-text">
          <span className="profile-name" data-testid="self-name">
            {props.name ?? '…'}
          </span>
          <span className="profile-status" data-testid="connection-status">
            <span className="status-dot" data-status={props.status} />
            {STATUS_LABEL[props.status]}
          </span>
        </span>
      </Link>

      <div className="res-pill" title="Reputation: earned in Rifts, spent later">
        <Icon name="star" />
        <span className="res-text">
          <strong data-testid="top-reputation">{sheet.data?.reputation ?? '—'}</strong>
          <small>Reputation</small>
        </span>
      </div>
      <div className="res-pill" title="Gold: earned in Rifts; spent in shops and at the blacksmith">
        <Icon name="coin" />
        <span className="res-text">
          <strong data-testid="top-gold">{sheet.data?.gold ?? '—'}</strong>
          <small>Gold</small>
        </span>
      </div>
      <ApPill />
      <div className="res-pill res-pill-quiet" title="Characters in the world right now">
        <Icon name="friends" />
        <span className="res-text">
          <strong>{props.online}</strong>
          <small>Online</small>
        </span>
      </div>
      <span className="spacer" />
      <div className="world-chip" title={props.worldName}>
        <span>{props.worldName}</span>
        {props.tick !== null && (
          <span className="mono" data-testid="world-tick">
            Tick {props.tick}
          </span>
        )}
      </div>
      <button
        className="icon-btn icon-btn-quiet"
        aria-label="Switch character"
        title="Switch character"
        onClick={() => navigate('/characters')}
      >
        <Icon name="swap" />
      </button>
      <button
        className="icon-btn"
        aria-label="Log out"
        title="Log out"
        onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/login') })}
      >
        <Icon name="exit" />
      </button>
    </header>
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
    { to: `/characters/${characterId}`, label: 'Character', icon: 'hero' },
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

/** Action Points (request #43): spent to travel; +10 per real hour up to 120. */
function ApPill() {
  const ap = useWorldStore((s) => s.self?.ap ?? null);
  const [, setNow] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  if (!ap) return null;
  const full = fullIn(ap);
  return (
    <div
      className="res-pill"
      title={`Action Points: travel costs AP. +${ap.perHour} per hour${full ? `, full in ${full}` : ' (full)'}.`}
    >
      <Icon name="bolt" />
      <span className="res-text">
        <strong data-testid="top-ap">
          {liveAp(ap)}/{ap.max}
        </strong>
        <small>Action points</small>
      </span>
    </div>
  );
}
