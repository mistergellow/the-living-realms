import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { useShallow } from 'zustand/react/shallow';
import { Icon, type IconName } from '../../shared/ui/Icon';
import { useActiveCharacter } from '../characters/active-character';
import { CharacterToken } from '../characters/CharacterToken';
import { useActiveRun } from '../rifts/api';
import { useLobbyOverview } from '../rifts/lobby-api';
import { useFriends } from '../social/api';
import { useWorldStore } from '../world/world-store';

/**
 * The hub (home screen, request #30): painted backdrop, side menus of icon
 * buttons, a "current activity" card, the big diamond buttons for the main
 * modes and the latest Chronicle line. Everything links to real features.
 */
export function HomePage() {
  const characterId = useActiveCharacter((s) => s.characterId)!;
  const clearCharacter = useActiveCharacter((s) => s.clear);
  const navigate = useNavigate();
  const { log, players, selfId } = useWorldStore(
    useShallow((s) => ({ log: s.log, players: s.players, selfId: s.self?.id ?? null })),
  );
  const friends = useFriends(characterId);
  const pending = friends.data?.incoming.length ?? 0;
  const [drawer, setDrawer] = useState<'chronicle' | 'online' | null>(null);
  const latest = log[0];

  return (
    <div className="hub">
      <ActivityCard characterId={characterId} />

      <nav className="hub-side hub-left" aria-label="Social">
        <SideButton icon="friends" label="Friends" to="/friends" badge={pending} />
        <SideButton icon="lobby" label="Lobbies" to="/rifts" />
        <SideButton
          icon="scroll"
          label="Chronicle"
          pressed={drawer === 'chronicle'}
          onClick={() => setDrawer(drawer === 'chronicle' ? null : 'chronicle')}
        />
      </nav>

      <nav className="hub-side hub-right" aria-label="Hero">
        <SideButton icon="hero" label="Hero" to={`/characters/${characterId}`} />
        <SideButton icon="bag" label="Inventory" to={`/characters/${characterId}#inventory`} />
        <SideButton
          icon="friends"
          label="Online"
          badge={Object.keys(players).length}
          pressed={drawer === 'online'}
          onClick={() => setDrawer(drawer === 'online' ? null : 'online')}
        />
        <SideButton
          icon="swap"
          label="Switch character"
          onClick={() => {
            clearCharacter();
            navigate('/characters');
          }}
        />
      </nav>

      {drawer && (
        <section
          className="panel hub-drawer"
          aria-label={drawer === 'online' ? 'Online' : 'Chronicle'}
        >
          <div className="panel-title">
            <span>
              {drawer === 'online' ? `In the world (${Object.keys(players).length})` : 'Chronicle'}
            </span>
          </div>
          {drawer === 'online' ? (
            <ul className="player-list">
              {Object.values(players).map((p) => (
                <li key={p.characterId}>
                  <CharacterToken appearance={p.appearance} size={26} />
                  <span>{p.name}</span>
                  {p.characterId === selfId && <span className="muted">(you)</span>}
                </li>
              ))}
            </ul>
          ) : (
            <ol className="log">
              {log.map((e) => (
                <li key={e.id}>
                  <time dateTime={e.at}>{new Date(e.at).toLocaleTimeString()}</time>
                  {e.text}
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      <div className="diamonds">
        <Diamond
          to="/rifts"
          icon="portal"
          label="Rifts"
          aria="Enter the Rifts"
          className="d-top"
          main
        />
        <Diamond
          to="/world"
          icon="compass"
          label="World"
          aria="Explore the world"
          className="d-left"
        />
        <Diamond
          to={`/characters/${characterId}`}
          icon="hero"
          label="Hero"
          aria="Your hero"
          className="d-right"
        />
      </div>

      <button
        type="button"
        className="hub-ticker"
        onClick={() => setDrawer(drawer === 'chronicle' ? null : 'chronicle')}
        aria-label="Open the Chronicle"
      >
        <Icon name="chat" />
        <span className="ticker-text">
          {latest ? (
            <>
              <span className="ticker-time">{new Date(latest.at).toLocaleTimeString()}</span>
              {latest.text}
            </>
          ) : (
            'The Chronicle is quiet.'
          )}
        </span>
      </button>
    </div>
  );
}

/** Top-right card: what you can do next (resume a fight, your lobby, or go to the Rifts). */
function ActivityCard({ characterId }: { characterId: string }) {
  const active = useActiveRun(characterId);
  const overview = useLobbyOverview(characterId);
  const run = active.data;
  const lobby = overview.data?.mine;
  const invites = overview.data?.invites.length ?? 0;

  let title: string;
  let body: ReactNode;
  let action: { to: string; label: string };
  if (run) {
    title = `Inside ${run.riftName}`;
    body = `Room ${run.roomIndex + 1} of ${run.rooms.length} — your party is waiting.`;
    action = { to: `/rifts/runs/${run.id}`, label: 'Resume' };
  } else if (lobby) {
    title = `Lobby: ${lobby.riftName}`;
    body = `${lobby.members.length}/${lobby.maxMembers} players gathered.`;
    action = { to: `/rifts/lobbies/${lobby.id}`, label: 'Open lobby' };
  } else if (invites > 0) {
    title = 'You were invited';
    body = `${invites} lobby invitation${invites > 1 ? 's' : ''} waiting.`;
    action = { to: '/rifts', label: 'See invites' };
  } else {
    title = 'A Rift is open';
    body = 'Several rooms and a boss. Go alone or gather up to 6 players.';
    action = { to: '/rifts', label: 'Go to the Rifts' };
  }
  return (
    <section className="panel activity-card" aria-label="Current activity" data-testid="activity">
      <div className="activity-title">{title}</div>
      <div className="activity-row">
        <span className="activity-icon" aria-hidden>
          <Icon name="portal" />
        </span>
        <span className="activity-body">{body}</span>
        <Link className="btn btn-primary btn-sm" to={action.to}>
          {action.label}
        </Link>
      </div>
    </section>
  );
}

function SideButton(props: {
  icon: IconName;
  label: string;
  to?: string;
  badge?: number;
  pressed?: boolean;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <span className="side-icon">
        <Icon name={props.icon} />
        {!!props.badge && <span className="badge-dot">{props.badge}</span>}
      </span>
      <span className="side-label">{props.label}</span>
    </>
  );
  return props.to ? (
    <Link className="side-btn" to={props.to}>
      {inner}
    </Link>
  ) : (
    <button type="button" className="side-btn" aria-pressed={props.pressed} onClick={props.onClick}>
      {inner}
    </button>
  );
}

function Diamond(props: {
  to: string;
  icon: IconName;
  label: string;
  aria: string;
  className: string;
  main?: boolean;
}) {
  return (
    <Link
      to={props.to}
      className={['diamond', props.className, props.main ? 'is-main' : ''].join(' ')}
      aria-label={props.aria}
    >
      <span className="diamond-inner">
        <Icon name={props.icon} />
        <span className="diamond-label">{props.label}</span>
      </span>
    </Link>
  );
}
