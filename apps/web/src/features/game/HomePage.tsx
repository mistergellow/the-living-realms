import { locationAt, type LocationActionId, type LocationKind } from '@realms/game-core';
import { CHAT_MAX_LENGTH, type HexCoord, type ProfessionDto } from '@realms/shared';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { Link, useNavigate } from 'react-router';
import { useShallow } from 'zustand/react/shallow';
import { Icon, type IconName } from '../../shared/ui/Icon';
import { useActiveCharacter } from '../characters/active-character';
import { useCharacterSheet } from '../characters/api';
import { CharacterAvatar } from '../avatar/CharacterAvatar';
import { offhandArtFor, weaponArtFor } from '../avatar/weapon-art';
import { DefIcon } from '../characters/sheet/ItemIcon';
import { useProfessions } from '../professions/api';
import { GatherPanel } from '../professions/GatherPanel';
import { Rumours } from '../professions/Rumours';
import { JobBanner } from '../professions/ProfessionsPage';
import { useActiveRun } from '../rifts/api';
import { useLobbyOverview } from '../rifts/lobby-api';
import { useWorldBoss } from '../world/api';
import { useWorldStore } from '../world/world-store';
import { LocationScene } from './LocationScene';
import '../professions/professions.css';
import { playSfx, useAmbience } from '../../lib/audio';

const ACTION_ICON: Record<LocationActionId, IconName> = {
  npcs: 'friends',
  shop: 'bag',
  market: 'coin',
  rifts: 'portal',
  map: 'compass',
  worldboss: 'skull',
  storage: 'lock',
  blacksmith: 'sword',
};
const ACTION_TO: Partial<Record<LocationActionId, string>> = {
  rifts: '/rifts',
  map: '/world',
  worldboss: '/world-boss',
  shop: '/city/shop',
  market: '/city/market',
  storage: '/city/storage',
  blacksmith: '/city/blacksmith',
};

const KIND_LABEL: Record<LocationKind, string> = {
  town: 'Capital',
  wilds: 'Wilderness',
  rift: 'Rift entrance',
  sea: 'Sea',
};

/** One thing you can do on this hex: a panel here, or a link to its screen. */
type Station =
  | { key: string; kind: 'gather'; label: string; profession: ProfessionDto; hot: string | null }
  | { key: string; kind: 'rumours'; label: string }
  | { key: string; kind: 'link'; label: string; icon: IconName; to: string | null; hint: string };

/**
 * The hex you are standing on (request #40), reorganised as a game screen
 * (request #83): the scene fills the screen, a bar of stations at the bottom
 * (keys 1–9) opens what you can do here in a framed panel over the scene. Only
 * that panel scrolls. Adding something new to a place = one more station.
 */
export function HomePage() {
  const characterId = useActiveCharacter((s) => s.characterId)!;
  const self = useWorldStore((s) => s.self);
  const position = self?.position ?? { q: 0, r: 0 };
  const boss = useWorldBoss(characterId);
  const profs = useProfessions(characterId);
  const run = useActiveRun(characterId);
  const bossHere =
    !!boss.data &&
    !boss.data.defeatedAt &&
    boss.data.position.q === position.q &&
    boss.data.position.r === position.r;
  const place = locationAt(position, { worldBossHere: bossHere });
  // Request #87: the capital murmurs, the wilds blow, a Rift hums.
  useAmbience(place.kind === 'town' ? 'town' : place.kind === 'rift' ? 'rift' : 'wilds');
  const jobRunning = profs.data?.job?.status === 'running';

  const stations = useMemo<Station[]>(() => {
    const gather: Station[] = run.data
      ? []
      : (profs.data?.professions ?? [])
          .filter((p) => p.category === 'gathering' && p.availableHere)
          .map((p) => ({
            key: `gather:${p.id}`,
            kind: 'gather',
            label: p.name,
            profession: p,
            hot: p.site?.motherlode ? 'Motherlode' : p.site?.boom ? 'Boom' : null,
          }));
    const links: Station[] = place.actions.map((a) => ({
      key: `link:${a.id}`,
      kind: 'link',
      label: a.label,
      icon: ACTION_ICON[a.id],
      to: a.available ? (ACTION_TO[a.id] ?? null) : null,
      hint: a.description,
    }));
    const rumours: Station[] = profs.data?.rumours.length
      ? [{ key: 'rumours', kind: 'rumours', label: 'Rumours' }]
      : [];
    return [...gather, ...links, ...rumours];
  }, [profs.data, place.actions, run.data]);

  // The first gathering station is open when you arrive; click again to close.
  // The choice belongs to this hex: travelling elsewhere starts afresh.
  const placeKey = `${position.q},${position.r}`;
  const [choice, setChoice] = useState<{ at: string; key: string | null } | null>(null);
  const fallback = stations.find((s) => s.kind === 'gather')?.key ?? null;
  const openKey = choice?.at === placeKey ? choice.key : fallback;
  const open = stations.find((s) => s.key === openKey && s.kind !== 'link') ?? null;
  const choose = (key: string | null) => {
    playSfx(key ? 'open' : 'close'); // request #87
    setChoice({ at: placeKey, key });
  };

  // Request #89: the scene's layers follow the pointer a little (parallax).
  const parallax = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty(
      '--px',
      (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3),
    );
    e.currentTarget.style.setProperty(
      '--py',
      (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3),
    );
  };
  const resetParallax = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.style.setProperty('--px', '0');
    e.currentTarget.style.setProperty('--py', '0');
  };

  const navigate = useNavigate();
  const activate = (s: Station) => {
    if (s.kind === 'link') {
      if (s.to) void navigate(s.to, { viewTransition: true });
      return;
    }
    choose(s.key === openKey ? null : s.key);
  };
  // Keys 1–9 pick a station (not while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      const s = stations[Number(e.key) - 1];
      if (!s || !/^[1-9]$/.test(e.key)) return;
      if (s.kind === 'link') {
        if (s.to) void navigate(s.to, { viewTransition: true });
      } else {
        const key = s.key === openKey ? null : s.key;
        playSfx(key ? 'open' : 'close');
        setChoice({ at: placeKey, key });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stations, navigate, placeKey, openKey]);

  return (
    <div className="place" data-testid="place">
      <div className="place-stage" onPointerMove={parallax} onPointerLeave={resetParallax}>
        <div className="place-scene" aria-hidden>
          <LocationScene scene={place.scene} rift={place.kind === 'rift'} />
        </div>
        <PlaceCast key={placeKey} characterId={characterId} hex={position} />
        <header className="place-plate">
          <h1 data-testid="place-name">{place.name}</h1>
          <span className="place-kind">
            {KIND_LABEL[place.kind]}
            {place.region ? `, ${place.region}` : ''} ({position.q}, {position.r})
          </span>
          <p className="place-desc">{place.description}</p>
        </header>

        <div className="place-alerts">
          <ActivityCard characterId={characterId} />
          <NextStep characterId={characterId} atRift={place.kind === 'rift'} />
          {profs.data?.job && <JobBanner job={profs.data.job} characterId={characterId} />}
        </div>

        {open && (
          <section
            className="place-panel"
            aria-label={open.label}
            data-testid="place-panel"
            key={open.key}
          >
            <button
              className="place-panel-close"
              data-sfx="none"
              onClick={() => choose(null)}
              aria-label="Close"
              title="Close"
            >
              ×
            </button>
            {open.kind === 'gather' && (
              <GatherPanel p={open.profession} characterId={characterId} jobRunning={jobRunning} />
            )}
            {open.kind === 'rumours' && profs.data && <Rumours rumours={profs.data.rumours} />}
          </section>
        )}

        <nav className="station-bar" aria-label={`What to do in ${place.name}`}>
          {stations.map((s, i) => (
            <StationButton
              key={s.key}
              s={s}
              hotkey={i < 9 ? i + 1 : null}
              active={s.key === open?.key}
              onClick={() => activate(s)}
            />
          ))}
        </nav>
      </div>

      <HexChat hex={position} />
    </div>
  );
}

/**
 * Request #89 (phase B): your hero stands in the place, breathing, lit by the
 * scene; the other players on the hex wait further back, in shadow.
 */
function PlaceCast({ characterId, hex }: { characterId: string; hex: HexCoord }) {
  const sheet = useCharacterSheet(characterId);
  const { players, selfId } = useWorldStore(
    useShallow((s) => ({ players: s.players, selfId: s.self?.id ?? null })),
  );
  const others = useMemo(
    () =>
      Object.values(players)
        .filter((p) => p.characterId !== selfId && p.position.q === hex.q && p.position.r === hex.r)
        .slice(0, 3),
    [players, selfId, hex.q, hex.r],
  );
  const s = sheet.data;
  if (!s) return null;
  return (
    <div className="place-cast" aria-hidden data-testid="place-hero">
      {others.map((p, i) => (
        <div key={p.characterId} className="place-other" style={{ ['--i' as string]: i }}>
          <CharacterAvatar appearance={p.appearance} size={220} flip={i % 2 === 0} />
          <span className="place-other-name">{p.name}</span>
        </div>
      ))}
      <div className="place-hero">
        <CharacterAvatar
          appearance={s.character.appearance}
          weapon={weaponArtFor(s.equipment.mainHand?.broken ? null : s.equipment.mainHand?.defId)}
          offhand={offhandArtFor(s.equipment.offHand?.broken ? null : s.equipment.offHand?.defId)}
          size={300}
        />
      </div>
    </div>
  );
}

function StationButton({
  s,
  hotkey,
  active,
  onClick,
}: {
  s: Station;
  hotkey: number | null;
  active: boolean;
  onClick: () => void;
}) {
  const disabled = s.kind === 'link' && !s.to;
  const title =
    s.kind === 'link'
      ? `${s.label}: ${disabled ? 'coming in a later update' : s.hint}`
      : s.kind === 'gather'
        ? `${s.label}: see what you can find here`
        : 'Where gathering pays today';
  const art =
    s.kind === 'gather' ? (
      <DefIcon defId={s.profession.activities[0]?.drops?.[0]?.items[0]?.itemDefId ?? ''} />
    ) : (
      <Icon name={s.kind === 'rumours' ? 'scroll' : s.icon} />
    );
  return (
    <button
      type="button"
      className="station"
      data-kind={s.kind}
      data-active={active}
      data-hot={s.kind === 'gather' ? (s.hot ?? undefined) : undefined}
      aria-pressed={s.kind === 'link' ? undefined : active}
      aria-label={s.label}
      aria-disabled={disabled || undefined}
      title={title}
      data-testid={`station-${s.key.replace(':', '-')}`}
      data-sfx={s.kind === 'link' ? undefined : 'none'}
      onClick={disabled ? undefined : onClick}
    >
      <span className="station-art">{art}</span>
      <span className="station-label">{s.label}</span>
      {hotkey && <kbd className="station-key">{hotkey}</kbd>}
      {s.kind === 'gather' && s.hot && <span className="station-hot">{s.hot}</span>}
      {disabled && <span className="station-hot is-soon">soon</span>}
    </button>
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
    body = `${run.roomsVisited} room${run.roomsVisited === 1 ? '' : 's'} explored — your party is waiting.`;
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
        <Link viewTransition className="btn btn-primary btn-sm" to={action.to}>
          {action.label}
        </Link>
      </div>
    </section>
  );
}

/**
 * Request #69: a newcomer always sees one clear next step (until their first
 * reputation): spend the attribute points, find a Rift, go in.
 */
function NextStep({ characterId, atRift }: { characterId: string; atRift: boolean }) {
  const sheet = useCharacterSheet(characterId);
  const active = useActiveRun(characterId);
  const s = sheet.data;
  if (!s || active.data || s.reputation > 0) return null;
  const step =
    s.attributePoints > 0
      ? {
          title: `Spend your ${s.attributePoints} attribute points`,
          body: 'Make your hero stronger before the first fight. Might hits harder, Endurance keeps you standing.',
          to: '/hero',
          label: 'Open your hero',
        }
      : atRift
        ? {
            title: 'Enter the Rift',
            body: 'You stand at a Rift. Go in alone or gather a party, and pick your doors wisely.',
            to: '/rifts',
            label: 'Enter',
          }
        : {
            title: 'Find a Rift',
            body: 'Rifts are where heroes earn gold, gear and reputation. Open the world map and travel to a Tier 1 Rift (purple marks).',
            to: '/world',
            label: 'Open the map',
          };
  return (
    <section className="panel next-step" aria-label="Next step" data-testid="next-step">
      <span className="next-step-mark" aria-hidden>
        !
      </span>
      <span className="next-step-text">
        <strong>{step.title}</strong>
        <span className="muted">{step.body}</span>
      </span>
      <Link viewTransition className="btn btn-primary btn-sm" to={step.to}>
        {step.label}
      </Link>
    </section>
  );
}
