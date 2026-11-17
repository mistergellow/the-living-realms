import { normalizeAppearance, type AppearanceV2, type CharacterAppearance } from '@realms/shared';
import { useId } from 'react';
import './avatar.css';

/*
 * Layered "paper doll" character, drawn in SVG (decision D32, ADR-021).
 * PROVISIONAL ART: each layer (back hair, legs, torso, arms, weapon, head,
 * face, front hair) is a separate group so it can be replaced by real artwork,
 * and equipment layers can later be drawn on top.
 *
 * viewBox 0 0 120 160 — feet at y≈150, head centre (60, 60).
 */

export type WeaponArt = 'sword' | 'bow' | 'staff' | null;

export interface CharacterAvatarProps {
  appearance: CharacterAppearance | null | undefined;
  weapon?: WeaponArt;
  /**
   * Height in reference px at a 16px root font size (width is 3/4). Rendered in
   * rem, so avatars scale with the fluid UI (tokens.css).
   */
  size?: number;
  /** Drawn inside another SVG (the map): use user units instead of rem. */
  inSvg?: boolean;
  /** Idle animation (breathing, blinking). */
  animated?: boolean;
  /** Mirror horizontally. */
  flip?: boolean;
  /** Only head and shoulders, cropped (lists, map, tokens). */
  portrait?: boolean;
  title?: string;
  className?: string;
}

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + amount * 255)));
  const r = f(n >> 16),
    g = f((n >> 8) & 255),
    b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function BackHair({ a }: { a: AppearanceV2 }) {
  const c = shade(a.hairColor, -0.06);
  switch (a.hairStyle) {
    case 'long':
      return <path d="M22 58 C18 10 102 10 98 58 L102 112 C88 120 32 120 18 112 Z" fill={c} />;
    case 'ponytail':
      return <path d="M86 52 C110 56 112 92 98 112 C96 96 92 80 82 70 Z" fill={c} />;
    case 'bun':
      return <circle cx="60" cy="16" r="13" fill={c} />;
    default:
      return null;
  }
}

function FrontHair({ a }: { a: AppearanceV2 }) {
  const c = a.hairColor;
  const hi = shade(a.hairColor, 0.12);
  switch (a.hairStyle) {
    case 'shaved':
      return <path d="M27 58 C24 10 96 10 93 58 C86 40 34 40 27 58 Z" fill={c} opacity="0.55" />;
    case 'spiky':
      return (
        <>
          <path d="M24 64 C17 8 103 8 96 64 Z" fill={c} />
          <path
            d="M25 62 L22 40 L34 44 L34 24 L46 36 L52 16 L62 32 L72 16 L76 36 L88 26 L88 44 L99 42 L95 62 C90 48 82 44 72 46 C66 40 54 40 48 46 C38 44 30 50 25 62 Z"
            fill={c}
          />
        </>
      );
    case 'long':
      return (
        <>
          <path
            d="M23 68 C16 4 104 4 97 68 C92 50 84 42 72 44 C64 38 52 38 46 44 C36 42 28 50 23 68 Z"
            fill={c}
          />
          <path
            d="M24 60 C22 76 24 92 30 104 L36 70 Z M96 60 C98 76 96 92 90 104 L84 70 Z"
            fill={c}
          />
          <path
            d="M42 24 C52 18 68 18 78 23"
            stroke={hi}
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
        </>
      );
    default:
      // short, ponytail and bun share the fringe
      return (
        <>
          <path
            d="M24 66 C17 4 103 4 96 66 C92 50 84 42 72 45 C66 38 52 38 46 45 C37 43 29 51 24 66 Z"
            fill={c}
          />
          <path
            d="M42 24 C52 18 68 18 78 23"
            stroke={hi}
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
        </>
      );
  }
}

function Weapon({ weapon }: { weapon: WeaponArt }) {
  switch (weapon) {
    case 'sword':
      return (
        <g className="av-weapon">
          <rect x="94" y="62" width="6" height="44" rx="2" fill="#cfd6e0" stroke="#7d8896" />
          <rect x="88" y="104" width="18" height="5" rx="2" fill="#8a6a3a" />
          <rect x="95" y="109" width="4" height="12" rx="1.5" fill="#5a4026" />
        </g>
      );
    case 'bow':
      return (
        <g className="av-weapon">
          <path
            d="M98 60 C118 84 118 112 98 136"
            stroke="#8a5a2e"
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
          />
          <line x1="98" y1="60" x2="98" y2="136" stroke="#e8e2d0" strokeWidth="1.2" />
        </g>
      );
    case 'staff':
      return (
        <g className="av-weapon">
          <rect x="95" y="56" width="5" height="90" rx="2" fill="#7a5530" />
          <circle cx="97.5" cy="54" r="8" fill="#7fd3ff" className="av-orb" />
          <circle cx="95" cy="51" r="2.5" fill="#ffffff" opacity="0.8" />
        </g>
      );
    default:
      return null;
  }
}

export function CharacterAvatar({
  appearance,
  weapon = null,
  size = 160,
  animated = true,
  flip = false,
  portrait = false,
  title,
  className,
  inSvg = false,
}: CharacterAvatarProps) {
  const a = normalizeAppearance(appearance);
  const uid = useId().replace(/:/g, '');
  const wide = a.body === 'sturdy' ? 1 : 0.86;
  const outfit = a.outfit;
  const outfitDark = shade(outfit, -0.18);
  const skinShade = shade(a.skin, -0.1);
  const viewBox = portrait ? '14 12 92 92' : '0 0 120 160';
  const width = portrait ? size : (size * 3) / 4;

  return (
    <svg
      className={['avatar', animated ? 'is-animated' : '', className].filter(Boolean).join(' ')}
      width={width}
      height={size}
      style={inSvg ? undefined : { width: `${width / 16}rem`, height: `${size / 16}rem` }}
      viewBox={viewBox}
      role="img"
      aria-label={title ?? 'Character'}
    >
      {title && <title>{title}</title>}
      <defs>
        <clipPath id={`clip-${uid}`}>
          <circle cx="60" cy="58" r="46" />
        </clipPath>
      </defs>
      <g
        transform={flip ? 'translate(120 0) scale(-1 1)' : undefined}
        clipPath={portrait ? `url(#clip-${uid})` : undefined}
      >
        {!portrait && (
          <ellipse cx="60" cy="151" rx="30" ry="6" fill="rgba(0,0,0,0.35)" className="av-shadow" />
        )}
        <g className="av-root">
          <BackHair a={a} />
          {/* legs */}
          <g className="av-legs">
            <rect x={60 - 14 * wide} y="118" width="12" height="28" rx="5" fill="#2b3040" />
            <rect x={60 + 14 * wide - 12} y="118" width="12" height="28" rx="5" fill="#2b3040" />
            <rect x={60 - 15 * wide} y="139" width="14" height="10" rx="4" fill="#4a3424" />
            <rect x={60 + 15 * wide - 14} y="139" width="14" height="10" rx="4" fill="#4a3424" />
          </g>
          {/* torso + arms */}
          <g className="av-body">
            <rect x={60 - 30 * wide} y="88" width="11" height="30" rx="5.5" fill={outfitDark} />
            <circle cx={60 - 24.5 * wide} cy="120" r="5.5" fill={a.skin} />
            <path
              d={`M${60 - 24 * wide} 126 L${60 - 20 * wide} 90 C${60 - 16 * wide} 84 ${60 + 16 * wide} 84 ${60 + 20 * wide} 90 L${60 + 24 * wide} 126 Z`}
              fill={outfit}
            />
            <rect x={60 - 22 * wide} y="113" width={44 * wide} height="6" rx="2" fill="#3b2b1e" />
            <rect x="57" y="113" width="6" height="6" rx="1" fill="#d4a64a" />
            <path d={`M52 87 L60 100 L68 87`} stroke={outfitDark} strokeWidth="3" fill="none" />
            <rect
              x={60 + 30 * wide - 11}
              y="88"
              width="11"
              height="30"
              rx="5.5"
              fill={outfitDark}
            />
          </g>
          <Weapon weapon={weapon} />
          <circle cx={60 + 24.5 * wide} cy="120" r="5.5" fill={a.skin} className="av-hand" />
          {/* head */}
          <g className="av-head">
            <rect x="53" y="80" width="14" height="10" rx="4" fill={skinShade} />
            <circle cx="26" cy="64" r="6" fill={a.skin} />
            <circle cx="94" cy="64" r="6" fill={a.skin} />
            <circle cx="60" cy="60" r="34" fill={a.skin} />
            <g className="av-eyes">
              <ellipse cx="47" cy="66" rx="5" ry="6.5" fill="#1d1a22" />
              <ellipse cx="73" cy="66" rx="5" ry="6.5" fill="#1d1a22" />
              <ellipse cx="47" cy="67" rx="3.8" ry="4.8" fill={a.eyeColor} />
              <ellipse cx="73" cy="67" rx="3.8" ry="4.8" fill={a.eyeColor} />
              <circle cx="45.5" cy="64" r="1.8" fill="#fff" />
              <circle cx="71.5" cy="64" r="1.8" fill="#fff" />
            </g>
            <path
              d="M41 56 L52 57 M68 57 L79 56"
              stroke={shade(a.hairColor, -0.1)}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <ellipse cx="40" cy="76" rx="5" ry="2.5" fill="#e88c8c" opacity="0.35" />
            <ellipse cx="80" cy="76" rx="5" ry="2.5" fill="#e88c8c" opacity="0.35" />
            <path
              d="M56 79 Q60 82 64 79"
              stroke="#7a4a3a"
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
            />
            <FrontHair a={a} />
          </g>
        </g>
      </g>
    </svg>
  );
}
