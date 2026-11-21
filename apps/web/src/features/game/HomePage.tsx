import { locationAt, type LocationActionId } from '@realms/game-core';
import { CHAT_MAX_LENGTH, type HexCoord } from '@realms/shared';
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useShallow } from 'zustand/react/shallow';
import { Icon, type IconName } from '../../shared/ui/Icon';
import { useActiveCharacter } from '../characters/active-character';
import { useActiveRun } from '../rifts/api';
import { useLobbyOverview } from '../rifts/lobby-api';
import { useWorldStore } from '../world/world-store';
import { LocationScene } from './LocationScene';

const ACTION_ICON: Record<LocationActionId, IconName> = {
  npcs: 'friends',
  shop: 'bag',
  rifts: 'portal',
  workshop: 'gear',
  map: 'compass',
};
const ACTION_TO: Partial<Record<LocationActionId, string>> = {
  rifts: '/rifts',
  workshop: '/professions',
  map: '/world',
};

/**
 * The hex you are standing on (request #40): its picture, what you can do
 * there (talk to people, market, workshop, Rifts, leave to the world map)
 * and the chat with everyone on the same hex. It is the first screen when
 * you open the game.
 */
export function HomePage() {
  const characterId = useActiveCharacter((s) => s.characterId)!;
  const self = useWorldStore((s) => s.self);
  const position = self?.position ?? { q: 0, r: 0 };
  const place = locationAt(position);

  return (
    <div className="place" data-testid="place">
      <div className="place-main">
        <section className="place-scene" aria-label={`${place.name} scene`}>
          <LocationScene scene={place.scene} />
          <div className="place-caption">
            <span className="place-kind">
              {place.kind === 'town' ? 'Town' : 'Wilderness'} · hex ({position.q}, {position.r})
            </span>
            <h1 data-testid="place-name">{place.name}</h1>
          </div>
        </section>
        <p className="place-desc">{place.description}</p>

        <ActivityCard characterId={characterId} />

        <nav className="place-actions" aria-label={`What to do in ${place.name}`}>
          {place.actions.map((a) => {
            const to = ACTION_TO[a.id];
            const inner = (
              <>
                <Icon name={ACTION_ICON[a.id]} />
                <span className="place-action-text">
                  <strong>
                    {a.label}
                    {!a.available && <span className="soon">soon</span>}
                  </strong>
                  <span>{a.description}</span>
                </span>
              </>
            );
            return a.available && to ? (
              <Link key={a.id} className="place-action" to={to} aria-label={a.label}>
                {inner}
              </Link>
            ) : (
              <div
                key={a.id}
                className="place-action"
                aria-disabled="true"
                title={`${a.label}: coming in a later update`}
              >
                {inner}
              </div>
            );
          })}
        </nav>
      </div>

      <HexChat hex={position} />
    </div>
  );
}

/** Chat with everyone on the same hex. */
function HexChat({ hex }: { hex: HexCoord }) {
  const { chat, players, selfId, send, online } = useWorldStore(
    useShallow((s) => ({
      chat: s.chat,
      players: s.players,
      selfId: s.self?.id ?? null,
      send: s.send,
      online: s.status === 'online',
    })),
  );
  const here = useMemo(
    () => Object.values(players).filter((p) => p.position.q === hex.q && p.position.r === hex.r),
    [players, hex.q, hex.r],
  );
  const [text, setText] = useState('');
  const logRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.length]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    send({ type: 'chat.send', data: { text: t } });
    setText('');
  };

  return (
    <section className="panel hex-chat" aria-label="Hex chat">
      <div className="panel-title">
        <span>Chat on this hex</span>
      </div>
      <div className="hex-chat-here" data-testid="hex-here">
        <Icon name="friends" />
        {here.length <= 1
          ? 'Nobody else is here.'
          : `${here.length} here: ${here.map((p) => p.name).join(', ')}`}
      </div>
      <ol className="hex-chat-log" ref={logRef} data-testid="hex-chat-log" aria-live="polite">
        {chat.length === 0 && <li className="muted">It is quiet. Say something.</li>}
        {chat.map((m) => (
          <li key={m.id} className={m.characterId === selfId ? 'is-self' : undefined}>
            <time dateTime={m.at}>
              {new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </time>
            <span className="who">{m.name}</span>
            {m.text}
          </li>
        ))}
      </ol>
      <form className="hex-chat-form" onSubmit={submit}>
        <input
          aria-label="Message"
          placeholder={online ? 'Say something…' : 'Connecting…'}
          maxLength={CHAT_MAX_LENGTH}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!online}
        />
        <button className="btn btn-primary btn-sm" type="submit" disabled={!online || !text.trim()}>
          Send
        </button>
      </form>
    </section>
  );
}

/** What you can do next (resume a fight, your lobby, or go to the Rifts). */
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
    body = `${run.roomsVisited} rooms explored — your party is waiting.`;
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
    return null;
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
