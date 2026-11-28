import { HEALTH_RULES } from '@realms/game-core';
import type { HealthDto } from '@realms/shared';
import { useEffect, useRef, useState } from 'react';
import { playSfx, useAudioSettings, type SfxName } from '../../../lib/audio';
import { Link, useNavigate } from 'react-router';
import { Icon } from '../../../shared/ui/Icon';
import { useLogout } from '../../auth/api';
import { useCharacterSheet } from '../../characters/api';
import { CharacterToken } from '../../characters/CharacterToken';
import { fullIn, liveAp } from '../../world/ap';
import { useWorldStore } from '../../world/world-store';
import './hud.css';

/*
 * Request #84: the top HUD. A big portrait in an ornate gilded frame in the
 * corner (reputation on a crest), the name over a wide Action Points bar and
 * the gold below; nothing else across the top. Numbers roll to their
 * new value and flash (gold when they rise, red when they fall).
 */

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** A change worth showing: "+12" floating up from the number (request #87). */
interface Float {
  id: number;
  delta: number;
}

/**
 * A number that rolls to its new value; `dir` says whether it just rose or
 * fell. Request #87: a rise or fall of at least `min` also floats the
 * difference and plays a sound (`up` / `down`; none = no float either).
 */
function useRolling(
  value: number | null,
  fx: { up?: SfxName; down?: SfxName; min?: number } = {},
): { shown: number | null; dir: 'up' | 'down' | null; float: Float | null } {
  const [shown, setShown] = useState(value);
  const [dir, setDir] = useState<'up' | 'down' | null>(null);
  const [float, setFloat] = useState<Float | null>(null);
  const from = useRef(value);
  const { up, down, min = 1 } = fx;
  useEffect(() => {
    const start = from.current;
    from.current = value;
    if (value === null || start === null || start === value) {
      setShown(value);
      return;
    }
    const delta = value - start;
    const sound = delta > 0 ? up : down;
    if (sound && Math.abs(delta) >= min) {
      playSfx(sound);
      setFloat({ id: performance.now(), delta });
    }
    if (reducedMotion()) {
      setShown(value);
      return;
    }
    setDir(delta > 0 ? 'up' : 'down');
    const t0 = performance.now();
    const ms = Math.min(900, 250 + Math.abs(delta) * 12);
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      const eased = 1 - (1 - k) ** 3;
      setShown(Math.round(start + delta * eased));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const clear = setTimeout(() => setDir(null), ms + 700);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(clear);
    };
  }, [value, up, down, min]);
  return { shown, dir, float };
}

/** The floating "+12" / "−3" (re-mounted for every change, so it animates again). */
function Floater({ f, unit = '' }: { f: Float | null; unit?: string }) {
  if (!f) return null;
  return (
    <span key={f.id} className="tb-float" data-dir={f.delta > 0 ? 'up' : 'down'} aria-hidden>
      {f.delta > 0 ? '+' : '−'}
      {Math.abs(f.delta)}
      {unit}
    </span>
  );
}

/** Action Points: a wide bar beside the portrait (+perHour per real hour up to max). */
function ApBar() {
  const ap = useWorldStore((s) => s.self?.ap ?? null);
  const [, setNow] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const value = ap ? liveAp(ap) : null;
  // Spending AP thuds and floats; the slow regrowth does not.
  const { shown, dir, float } = useRolling(value, { down: 'spend' });
  const full = ap ? fullIn(ap) : null;
  const pct = ap && value !== null ? (100 * value) / ap.max : 0;
  return (
    <div className="tb-meter">
      <div
        className="tb-ap"
        data-dir={dir ?? undefined}
        data-filling={!!full}
        title={
          ap
            ? `Action Points: travel and gathering cost AP. +${ap.perHour} per hour${full ? `, full in ${full}` : ' (full)'}.`
            : 'Action Points'
        }
      >
        <span className="tb-ap-fill" style={{ width: `${pct}%` }} />
        <span className="tb-ap-text">
          <strong data-testid={ap ? 'top-ap' : undefined}>
            {shown ?? '—'}
            {ap && <span className="tb-ap-max">/{ap.max}</span>}
          </strong>
          <em>Action points</em>
        </span>
      </div>
      <Floater f={float} unit=" AP" />
    </div>
  );
}

/** HP now from the server's snapshot: it heals 10%/h until `fullAt` (request #85). */
function liveHp(h: HealthDto, now: number): number {
  if (!h.fullAt) return h.max;
  const hoursLeft = Math.max(0, new Date(h.fullAt).getTime() - now) / 3_600_000;
  const perHour = (HEALTH_RULES.regenPctPerHour / 100) * h.max;
  return Math.max(0, Math.min(h.max, Math.floor(h.max - hoursLeft * perHour)));
}

/** Health: carried between Rifts; heals over real time or with potions (request #85). */
function HpBar({ health }: { health: HealthDto | undefined }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const value = health ? liveHp(health, now) : null;
  // Wounds hit hard; healing (a potion) shimmers — not the slow regrowth.
  const { shown, dir, float } = useRolling(value, { down: 'hurt', up: 'heal', min: 3 });
  const pct = health && value !== null ? (100 * value) / health.max : 0;
  const healing = !!health?.fullAt;
  const mins = health?.fullAt
    ? Math.max(1, Math.ceil((new Date(health.fullAt).getTime() - now) / 60_000))
    : 0;
  return (
    <div className="tb-meter">
      <div
        className="tb-ap tb-hp"
        data-dir={dir ?? undefined}
        data-filling={healing}
        data-low={pct < 30}
        title={
          health
            ? `Health: it stays low after a Rift. Heals ${HEALTH_RULES.regenPctPerHour}% per hour${
                healing
                  ? ` (full in ${mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`})`
                  : ''
              }, or drink a Healing Draught.`
            : 'Health'
        }
      >
        <span className="tb-ap-fill" style={{ width: `${pct}%` }} />
        <span className="tb-ap-text">
          <strong data-testid={health ? 'top-hp' : undefined}>
            {shown ?? '—'}
            {health && <span className="tb-ap-max">/{health.max}</span>}
          </strong>
          <em>Health</em>
        </span>
      </div>
      <Floater f={float} unit=" HP" />
    </div>
  );
}

/** The ornate frame around the portrait: a gilded double ring with leaf flourishes. */
function PortraitFrame() {
  return (
    <svg className="tb-frame" viewBox="0 0 120 120" aria-hidden>
      <defs>
        <linearGradient id="tb-gilt" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6e2a8" />
          <stop offset="0.45" stopColor="#c99a48" />
          <stop offset="0.7" stopColor="#7a5524" />
          <stop offset="1" stopColor="#e9c77c" />
        </linearGradient>
      </defs>
      <g fill="url(#tb-gilt)">
        <path d="M14 96c-8 4-12 12-10 20 4-6 9-9 16-10-5-2-7-6-6-10Z" />
        <path d="M24 106c-4 6-3 12 1 14 0-6 3-10 9-12-4 0-8-1-10-2Z" />
        <path d="M100 18c6-6 14-8 19-4-7 1-11 5-13 11-1-3-3-5-6-7Z" />
        <path d="M108 30c7-2 11 0 12 4-5-2-9-1-13 2 1-2 1-4 1-6Z" />
        <path d="M6 60c-3-4-4-9-2-13 2 5 5 7 9 8-3 1-5 3-7 5Z" />
        <path d="M60 114c4 3 9 4 13 2-5-2-7-5-8-9-1 3-3 5-5 7Z" />
      </g>
      <circle cx="60" cy="60" r="51" fill="none" stroke="url(#tb-gilt)" strokeWidth="5" />
      <circle cx="60" cy="60" r="46.5" fill="none" stroke="#2a1d10" strokeWidth="2" />
      <circle cx="60" cy="60" r="45" fill="none" stroke="url(#tb-gilt)" strokeWidth="1.2" />
      {[0, 90, 180, 270].map((deg) => (
        <circle
          key={deg}
          cx={60 + 51 * Math.cos((deg * Math.PI) / 180)}
          cy={60 + 51 * Math.sin((deg * Math.PI) / 180)}
          r="3.2"
          fill="#f6e2a8"
          stroke="#5a3d18"
          strokeWidth="1"
        />
      ))}
    </svg>
  );
}

/** Request #87: sound on/off and the music and effects volumes. */
function SoundMenu() {
  const a = useAudioSettings();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  return (
    <div className="tb-sound" ref={ref}>
      <button
        className="tb-ring-btn"
        aria-label={a.muted ? 'Sound is off' : 'Sound'}
        aria-expanded={open}
        title="Sound"
        data-testid="sound-button"
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name={a.muted ? 'mute' : 'sound'} />
      </button>
      {open && (
        <div className="tb-sound-menu" role="dialog" aria-label="Sound">
          <label className="tb-sound-row">
            <input
              type="checkbox"
              checked={!a.muted}
              onChange={() => a.toggleMute()}
              data-testid="sound-toggle"
            />
            Sound on
          </label>
          <label className="tb-sound-row">
            Music
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={a.music}
              disabled={a.muted}
              onChange={(e) => a.set({ music: Number(e.target.value) })}
            />
          </label>
          <label className="tb-sound-row">
            Effects
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={a.sfx}
              disabled={a.muted}
              onChange={(e) => a.set({ sfx: Number(e.target.value) })}
            />
          </label>
        </div>
      )}
    </div>
  );
}

/** Request #87: play in full screen, like a game (hidden where not supported). */
function FullscreenButton() {
  const [full, setFull] = useState(() => !!document.fullscreenElement);
  useEffect(() => {
    const on = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);
  if (!document.fullscreenEnabled) return null;
  return (
    <button
      className="tb-ring-btn"
      aria-label={full ? 'Leave full screen' : 'Full screen'}
      title={full ? 'Leave full screen' : 'Full screen'}
      onClick={() =>
        void (
          full
            ? document.exitFullscreen()
            : document.documentElement.requestFullscreen({ navigationUI: 'hide' })
        ).catch(() => undefined)
      }
    >
      <Icon name={full ? 'shrink' : 'expand'} />
    </button>
  );
}

export function HudTop(props: {
  characterId: string;
  status: string;
  statusLabel: string;
  name: string | null;
  appearance: Parameters<typeof CharacterToken>[0]['appearance'] | null;
  worldName: string;
  tick: number | null;
  online: number;
}) {
  const sheet = useCharacterSheet(props.characterId);
  const logout = useLogout();
  const navigate = useNavigate();
  const rep = useRolling(sheet.data?.reputation ?? null, { up: 'success' });
  const gold = useRolling(sheet.data?.gold ?? null, { up: 'coin', down: 'coin' });
  return (
    <header className="game-top tb-top">
      <div className="tb-hero">
        <Link
          viewTransition
          className="tb-portrait"
          to="/hero"
          title="Your hero"
          aria-label={`Your hero: ${props.name ?? ''}`}
        >
          <span className="tb-portrait-face">
            {props.appearance && <CharacterToken appearance={props.appearance} size={88} />}
          </span>
          <PortraitFrame />
        </Link>
        <span
          className="tb-crest"
          title="Reputation: earned in Rifts, spent later"
          data-dir={rep.dir ?? undefined}
        >
          <strong data-testid="top-reputation">{rep.shown ?? '—'}</strong>
        </span>
        <Floater f={rep.float} />
        <div className="tb-hero-side">
          <span className="tb-name" data-testid="self-name">
            {props.name ?? '…'}
          </span>
          {/* Request #84: being online is the normal state — only problems are shown. */}
          <span
            className={props.status === 'online' ? 'sr-only' : 'tb-status'}
            data-testid="connection-status"
            role="status"
          >
            {props.status !== 'online' && (
              <span className="status-dot" data-status={props.status} />
            )}
            {props.statusLabel}
          </span>
          <HpBar health={sheet.data?.health} />
          <ApBar />
          <span
            className="tb-gold"
            title="Gold: earned in Rifts; spent in shops and at the blacksmith"
            data-dir={gold.dir ?? undefined}
          >
            <Icon name="coin" />
            <strong data-testid="top-gold">{gold.shown ?? '—'}</strong>
            <Floater f={gold.float} />
            <em>gold</em>
          </span>
        </div>
      </div>

      <span className="spacer" />

      <span className="tb-world" title={props.worldName}>
        {props.online} online
        {props.tick !== null && <span data-testid="world-tick"> · tick {props.tick}</span>}
      </span>
      <SoundMenu />
      <FullscreenButton />
      <button
        className="tb-ring-btn"
        aria-label="Switch character"
        title="Switch character"
        onClick={() => navigate('/characters')}
      >
        <Icon name="swap" />
      </button>
      <button
        className="tb-ring-btn"
        aria-label="Log out"
        title="Log out"
        onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/login') })}
      >
        <Icon name="exit" />
      </button>
    </header>
  );
}
