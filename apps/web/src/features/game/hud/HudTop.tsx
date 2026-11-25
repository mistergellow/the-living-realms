import { useEffect, useRef, useState } from 'react';
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

/** A number that rolls to its new value; `dir` says whether it just rose or fell. */
function useRolling(value: number | null): { shown: number | null; dir: 'up' | 'down' | null } {
  const [shown, setShown] = useState(value);
  const [dir, setDir] = useState<'up' | 'down' | null>(null);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    from.current = value;
    if (value === null || start === null || start === value || reducedMotion()) {
      setShown(value);
      return;
    }
    setDir(value > start ? 'up' : 'down');
    const t0 = performance.now();
    const ms = Math.min(900, 250 + Math.abs(value - start) * 12);
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      const eased = 1 - (1 - k) ** 3;
      setShown(Math.round(start + (value - start) * eased));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const clear = setTimeout(() => setDir(null), ms + 700);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(clear);
    };
  }, [value]);
  return { shown, dir };
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
  const { shown, dir } = useRolling(value);
  const full = ap ? fullIn(ap) : null;
  const pct = ap && value !== null ? (100 * value) / ap.max : 0;
  return (
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
  const rep = useRolling(sheet.data?.reputation ?? null);
  const gold = useRolling(sheet.data?.gold ?? null);
  return (
    <header className="game-top tb-top">
      <div className="tb-hero">
        <Link
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
          <ApBar />
          <span
            className="tb-gold"
            title="Gold: earned in Rifts; spent in shops and at the blacksmith"
            data-dir={gold.dir ?? undefined}
          >
            <Icon name="coin" />
            <strong data-testid="top-gold">{gold.shown ?? '—'}</strong>
            <em>gold</em>
          </span>
        </div>
      </div>

      <span className="spacer" />

      <span className="tb-world" title={props.worldName}>
        {props.online} online
        {props.tick !== null && <span data-testid="world-tick"> · tick {props.tick}</span>}
      </span>
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
