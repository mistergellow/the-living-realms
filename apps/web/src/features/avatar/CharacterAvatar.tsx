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

export type WeaponArt =
  | 'sword'
  | 'axe'
  | 'dagger'
  | 'bow'
  | 'staff'
  | 'tome'
  // request #45 (and the types that had no drawing yet)
  | 'spear'
  | 'mace'
  | 'wand'
  | 'greatsword'
  | 'greataxe'
  | 'handaxe'
  | 'hammer'
  | 'greathammer'
  | 'morningstar'
  | 'lance'
  | 'crossbow'
  | null;
export type OffhandArt = 'shield' | 'talisman' | 'dagger' | 'handaxe' | null;

/**
 * Which layers to draw. `full` is the whole figure; the others are the layers
 * the canvas renderer animates separately (they share the same viewBox, so
 * they line up when stacked): `base` = back hair, legs, torso and arms;
 * `weapon` = main-hand weapon and front hand; `offhand` = shield, talisman or
 * second dagger; `head` = neck, head, face and front hair.
 */
export type AvatarPart = 'full' | 'base' | 'weapon' | 'offhand' | 'head';

export interface CharacterAvatarProps {
  appearance: CharacterAppearance | null | undefined;
  weapon?: WeaponArt;
  offhand?: OffhandArt;
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
  /** Draw only some layers (canvas renderer). Default `full`. */
  part?: AvatarPart;
  /** Closed eyes (blink frame for the canvas renderer). */
  eyesClosed?: boolean;
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
    case 'axe':
      return (
        <g className="av-weapon">
          <rect x="95" y="60" width="5" height="70" rx="2" fill="#7a5530" />
          <path d="M100 62 C116 60 118 82 100 84 Z" fill="#b8c2cf" stroke="#6f7a88" />
        </g>
      );
    case 'dagger':
      return (
        <g className="av-weapon">
          <path d="M96 86 L99 86 L100 108 L95 108 Z" fill="#cfd6e0" stroke="#7d8896" />
          <rect x="92" y="107" width="11" height="4" rx="1.5" fill="#8a6a3a" />
          <rect x="95.5" y="111" width="4" height="9" rx="1.5" fill="#5a4026" />
        </g>
      );
    case 'tome':
      return (
        <g className="av-weapon">
          <rect x="90" y="104" width="20" height="24" rx="2" fill="#5b3a7a" stroke="#2e1d40" />
          <rect
            x="93"
            y="107"
            width="14"
            height="18"
            rx="1"
            fill="none"
            stroke="#d4a64a"
            strokeWidth="1.2"
          />
          <circle cx="100" cy="116" r="3" fill="#b28df0" className="av-orb" />
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
    // ---- request #45: PROVISIONAL drawings ----
    case 'spear':
      return (
        <g className="av-weapon">
          <rect x="95.5" y="44" width="4" height="100" rx="2" fill="#7a5530" />
          <path d="M97.5 30 L102 46 L93 46 Z" fill="#cfd6e0" stroke="#7d8896" />
        </g>
      );
    case 'mace':
      return (
        <g className="av-weapon">
          <rect x="95.5" y="80" width="5" height="44" rx="2" fill="#6b4a2a" />
          <circle cx="98" cy="76" r="9" fill="#8d96a3" stroke="#59616c" strokeWidth="2" />
        </g>
      );
    case 'wand':
      return (
        <g className="av-weapon">
          <rect x="96" y="92" width="4" height="30" rx="2" fill="#d8c9a3" />
          <circle cx="98" cy="90" r="3.5" fill="#b28df0" className="av-orb" />
        </g>
      );
    case 'greatsword':
      return (
        <g className="av-weapon">
          <path d="M94 30 L102 30 L102 104 L94 104 Z" fill="#d6dde6" stroke="#7d8896" />
          <path d="M98 22 L102 30 L94 30 Z" fill="#d6dde6" stroke="#7d8896" />
          <rect x="84" y="102" width="28" height="6" rx="2" fill="#8a6a3a" />
          <rect x="95" y="108" width="6" height="20" rx="2" fill="#5a4026" />
        </g>
      );
    case 'greataxe':
      return (
        <g className="av-weapon">
          <rect x="95" y="44" width="6" height="96" rx="2" fill="#6b4a2a" />
          <path d="M101 46 C126 40 128 82 101 78 Z" fill="#b8c2cf" stroke="#6f7a88" />
          <path d="M95 50 C80 50 80 72 95 72 Z" fill="#a3adba" stroke="#6f7a88" />
        </g>
      );
    case 'handaxe':
      return (
        <g className="av-weapon">
          <rect x="95.5" y="78" width="4.5" height="44" rx="2" fill="#7a5530" />
          <path d="M100 78 C110 76 111 92 100 92 Z" fill="#b8c2cf" stroke="#6f7a88" />
        </g>
      );
    case 'hammer':
      return (
        <g className="av-weapon">
          <rect x="95.5" y="78" width="5" height="46" rx="2" fill="#6b4a2a" />
          <rect x="86" y="68" width="24" height="12" rx="2" fill="#8d96a3" stroke="#59616c" />
        </g>
      );
    case 'greathammer':
      return (
        <g className="av-weapon">
          <rect x="95" y="52" width="6" height="92" rx="2" fill="#5e4226" />
          <rect
            x="80"
            y="36"
            width="36"
            height="20"
            rx="3"
            fill="#7d8796"
            stroke="#4d5560"
            strokeWidth="2"
          />
        </g>
      );
    case 'morningstar':
      return (
        <g className="av-weapon">
          <rect x="95.5" y="82" width="5" height="42" rx="2" fill="#6b4a2a" />
          <circle cx="98" cy="76" r="8" fill="#8d96a3" stroke="#59616c" strokeWidth="1.5" />
          <path
            d="M98 64 L98 68 M98 84 L98 88 M86 76 L90 76 M106 76 L110 76 M90 68 L92.5 70.5 M106 68 L103.5 70.5 M90 84 L92.5 81.5 M106 84 L103.5 81.5"
            stroke="#cfd6e0"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>
      );
    case 'lance':
      return (
        <g className="av-weapon">
          <path d="M98 16 L104 96 L92 96 Z" fill="#cfd6e0" stroke="#7d8896" />
          <path d="M88 96 L108 96 L104 106 L92 106 Z" fill="#8a2a2a" />
          <rect x="95.5" y="106" width="5" height="34" rx="2" fill="#6b4a2a" />
        </g>
      );
    case 'crossbow':
      return (
        <g className="av-weapon">
          <rect x="94" y="88" width="30" height="6" rx="2" fill="#7a5530" />
          <path
            d="M116 72 C124 82 124 100 116 110"
            stroke="#5e4226"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          <line x1="116" y1="72" x2="116" y2="110" stroke="#e8e2d0" strokeWidth="1.2" />
          <rect x="94" y="94" width="5" height="14" rx="2" fill="#5e4226" />
        </g>
      );
    default:
      return null;
  }
}

function Offhand({ offhand }: { offhand: OffhandArt }) {
  switch (offhand) {
    case 'shield':
      return (
        <g className="av-offhand">
          <path
            d="M8 96 L32 92 L32 116 C32 128 20 134 20 134 C20 134 8 128 8 116 Z"
            fill="#8a5a2e"
            stroke="#4a3018"
            strokeWidth="2"
          />
          <circle cx="20" cy="112" r="4" fill="#c9a24a" />
        </g>
      );
    case 'talisman':
      return (
        <g className="av-offhand">
          <line x1="22" y1="112" x2="18" y2="128" stroke="#cdbb92" strokeWidth="1.5" />
          <path d="M12 128 L24 128 L18 140 Z" fill="#e8e0c8" stroke="#8c7a52" />
          <circle cx="18" cy="132" r="2" fill="#7fd3ff" className="av-orb" />
        </g>
      );
    case 'dagger':
      return (
        <g className="av-offhand">
          <path d="M21 86 L24 86 L25 108 L20 108 Z" fill="#cfd6e0" stroke="#7d8896" />
          <rect x="17" y="107" width="11" height="4" rx="1.5" fill="#8a6a3a" />
        </g>
      );
    case 'handaxe':
      return (
        <g className="av-offhand">
          <rect x="19" y="90" width="4" height="40" rx="2" fill="#7a5530" />
          <path d="M19 90 C9 88 8 104 19 104 Z" fill="#b8c2cf" stroke="#6f7a88" />
        </g>
      );
    default:
      return null;
  }
}

export function CharacterAvatar({
  appearance,
  weapon = null,
  offhand = null,
  size = 160,
  animated = true,
  flip = false,
  portrait = false,
  title,
  className,
  part = 'full',
  eyesClosed = false,
  inSvg = false,
}: CharacterAvatarProps) {
  const show = (p: Exclude<AvatarPart, 'full'>) => part === 'full' || part === p;
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
        {!portrait && part === 'full' && (
          <ellipse cx="60" cy="151" rx="30" ry="6" fill="rgba(0,0,0,0.35)" className="av-shadow" />
        )}
        <g className="av-root">
          {show('base') && <BackHair a={a} />}
          {/* legs */}
          {show('base') && (
            <g className="av-legs">
              <rect x={60 - 14 * wide} y="118" width="12" height="28" rx="5" fill="#2b3040" />
              <rect x={60 + 14 * wide - 12} y="118" width="12" height="28" rx="5" fill="#2b3040" />
              <rect x={60 - 15 * wide} y="139" width="14" height="10" rx="4" fill="#4a3424" />
              <rect x={60 + 15 * wide - 14} y="139" width="14" height="10" rx="4" fill="#4a3424" />
            </g>
          )}
          {/* torso + arms */}
          {show('base') && (
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
          )}
          {show('weapon') && <Weapon weapon={weapon} />}
          {show('offhand') && <Offhand offhand={offhand} />}
          {show('weapon') && (
            <circle cx={60 + 24.5 * wide} cy="120" r="5.5" fill={a.skin} className="av-hand" />
          )}
          {/* head */}
          {show('head') && (
            <g className="av-head">
              <rect x="53" y="80" width="14" height="10" rx="4" fill={skinShade} />
              <circle cx="26" cy="64" r="6" fill={a.skin} />
              <circle cx="94" cy="64" r="6" fill={a.skin} />
              <circle cx="60" cy="60" r="34" fill={a.skin} />
              {eyesClosed ? (
                <path
                  d="M42 67 Q47 70 52 67 M68 67 Q73 70 78 67"
                  stroke="#1d1a22"
                  strokeWidth="2.2"
                  fill="none"
                  strokeLinecap="round"
                />
              ) : (
                <g className="av-eyes">
                  <ellipse cx="47" cy="66" rx="5" ry="6.5" fill="#1d1a22" />
                  <ellipse cx="73" cy="66" rx="5" ry="6.5" fill="#1d1a22" />
                  <ellipse cx="47" cy="67" rx="3.8" ry="4.8" fill={a.eyeColor} />
                  <ellipse cx="73" cy="67" rx="3.8" ry="4.8" fill={a.eyeColor} />
                  <circle cx="45.5" cy="64" r="1.8" fill="#fff" />
                  <circle cx="71.5" cy="64" r="1.8" fill="#fff" />
                </g>
              )}
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
          )}
        </g>
      </g>
    </svg>
  );
}
