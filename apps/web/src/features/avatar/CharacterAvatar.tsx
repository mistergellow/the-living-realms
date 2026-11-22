import { normalizeAppearance, type AppearanceV2, type CharacterAppearance } from '@realms/shared';
import { useId } from 'react';
import './avatar.css';

/*
 * Layered "paper doll" character, drawn in SVG (ADR-021; request #69 replaced
 * the chibi look of D32 with gothic, Darkest Dungeon-like figures: adult
 * proportions, a heavy ink outline, hard shadows and muted colours).
 * PROVISIONAL ART: each layer (back hair, legs, torso, arms, weapon, head,
 * face, front hair) is a separate group so it can be replaced by real artwork,
 * and equipment layers can later be drawn on top.
 *
 * viewBox 0 0 120 160 — feet at y≈150, head centre (60, 34), weapon hand at
 * (97, 113), off hand at (23, 110).
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
  | 'scepter'
  | 'chakram'
  | 'scythe'
  | 'sling'
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

const INK = '#050403';

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + amount * 255)));
  const r = f(n >> 16),
    g = f((n >> 8) & 255),
    b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** Muted, grimy version of a colour (pull it toward its own grey, then darken). */
function grim(hex: string, mute = 0.55, darken = 0.2): string {
  const n = parseInt(hex.slice(1), 16);
  const r = n >> 16,
    g = (n >> 8) & 255,
    b = n & 255;
  const l = 0.3 * r + 0.59 * g + 0.11 * b;
  const f = (v: number) =>
    Math.max(0, Math.min(255, Math.round((v + (l - v) * mute) * (1 - darken))));
  return `#${((1 << 24) | (f(r) << 16) | (f(g) << 8) | f(b)).toString(16).slice(1)}`;
}

function BackHair({ a, c }: { a: AppearanceV2; c: string }) {
  const back = shade(c, -0.08);
  switch (a.hairStyle) {
    case 'long':
      return <path d="M49 30 C46 15 74 15 71 30 L74 62 C66 66 54 66 46 62 Z" fill={back} />;
    case 'ponytail':
      return <path d="M67 27 C79 29 82 47 75 61 C74 50 71 41 65 34 Z" fill={back} />;
    case 'bun':
      return <circle cx="60" cy="19" r="5.5" fill={back} />;
    default:
      return null;
  }
}

function FrontHair({ a, c }: { a: AppearanceV2; c: string }) {
  switch (a.hairStyle) {
    case 'shaved':
      return (
        <path
          d="M51 30 C51 20 69 20 69 30 C66 26 54 26 51 30 Z"
          fill={c}
          opacity="0.6"
          stroke="none"
        />
      );
    case 'spiky':
      return (
        <path
          d="M50.5 34 L49 24 L53 25.5 L53 18 L57 22 L60 14.5 L63 22 L67 18 L67 25.5 L71 24 L69.5 34 C68 27 52 27 50.5 34 Z"
          fill={c}
        />
      );
    case 'long':
      return (
        <>
          <path d="M50 34 C48 18 72 18 70 34 L68 29 C64 25 56 25 52 29 Z" fill={c} />
          <path
            d="M50.5 31 C49 41 49 52 52 58 L54 37 Z M69.5 31 C71 41 71 52 68 58 L66 37 Z"
            fill={c}
          />
        </>
      );
    default:
      // short, ponytail and bun share the cap
      return <path d="M50 34 C48 18 72 18 70 34 L68 29.5 C64 25 55 26 52 30 Z" fill={c} />;
  }
}

function Weapon({ weapon }: { weapon: WeaponArt }) {
  switch (weapon) {
    case 'sword':
      return (
        <g className="av-weapon" stroke="#050403" strokeWidth="1.4" strokeLinejoin="round">
          <rect x="94" y="62" width="6" height="44" rx="2" fill="#a7a392" stroke="#050403" />
          <rect x="88" y="104" width="18" height="5" rx="2" fill="#6e5530" />
          <rect x="95" y="109" width="4" height="12" rx="1.5" fill="#2e2016" />
        </g>
      );
    case 'bow':
      return (
        <g className="av-weapon" stroke="#050403" strokeWidth="1.4" strokeLinejoin="round">
          <path
            d="M98 60 C118 84 118 112 98 136"
            stroke="#523620"
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
          />
          <line x1="98" y1="60" x2="98" y2="136" stroke="#cfc6ad" strokeWidth="1.2" />
        </g>
      );
    case 'axe':
      return (
        <g className="av-weapon" stroke="#050403" strokeWidth="1.4" strokeLinejoin="round">
          <rect x="95" y="60" width="5" height="70" rx="2" fill="#4a3220" />
          <path d="M100 62 C116 60 118 82 100 84 Z" fill="#9c9887" stroke="#050403" />
        </g>
      );
    case 'dagger':
      return (
        <g className="av-weapon" stroke="#050403" strokeWidth="1.4" strokeLinejoin="round">
          <path d="M96 86 L99 86 L100 108 L95 108 Z" fill="#a7a392" stroke="#050403" />
          <rect x="92" y="107" width="11" height="4" rx="1.5" fill="#6e5530" />
          <rect x="95.5" y="111" width="4" height="9" rx="1.5" fill="#2e2016" />
        </g>
      );
    case 'tome':
      return (
        <g className="av-weapon" stroke="#050403" strokeWidth="1.4" strokeLinejoin="round">
          <rect x="90" y="104" width="20" height="24" rx="2" fill="#3e2a52" stroke="#050403" />
          <rect
            x="93"
            y="107"
            width="14"
            height="18"
            rx="1"
            fill="none"
            stroke="#a8853e"
            strokeWidth="1.2"
          />
          <circle cx="100" cy="116" r="3" fill="#9a82c9" className="av-orb" />
        </g>
      );
    case 'staff':
      return (
        <g className="av-weapon" stroke="#050403" strokeWidth="1.4" strokeLinejoin="round">
          <rect x="95" y="56" width="5" height="90" rx="2" fill="#4a3220" />
          <circle cx="97.5" cy="54" r="8" fill="#7fb3c9" className="av-orb" />
          <circle cx="95" cy="51" r="2.5" fill="#ffffff" opacity="0.8" />
        </g>
      );
    // ---- request #45: PROVISIONAL drawings ----
    case 'spear':
      return (
        <g className="av-weapon" stroke="#050403" strokeWidth="1.4" strokeLinejoin="round">
          <rect x="95.5" y="44" width="4" height="100" rx="2" fill="#4a3220" />
          <path d="M97.5 30 L102 46 L93 46 Z" fill="#a7a392" stroke="#050403" />
        </g>
      );
    case 'mace':
      return (
        <g className="av-weapon" stroke="#050403" strokeWidth="1.4" strokeLinejoin="round">
          <rect x="95.5" y="80" width="5" height="44" rx="2" fill="#42301f" />
          <circle cx="98" cy="76" r="9" fill="#6f6b60" stroke="#050403" strokeWidth="2" />
        </g>
      );
    case 'wand':
      return (
        <g className="av-weapon" stroke="#050403" strokeWidth="1.4" strokeLinejoin="round">
          <rect x="96" y="92" width="4" height="30" rx="2" fill="#d8c9a3" />
          <circle cx="98" cy="90" r="3.5" fill="#9a82c9" className="av-orb" />
        </g>
      );
    case 'greatsword':
      return (
        <g className="av-weapon" stroke="#050403" strokeWidth="1.4" strokeLinejoin="round">
          <path d="M94 30 L102 30 L102 104 L94 104 Z" fill="#b0ab99" stroke="#050403" />
          <path d="M98 22 L102 30 L94 30 Z" fill="#b0ab99" stroke="#050403" />
          <rect x="84" y="102" width="28" height="6" rx="2" fill="#6e5530" />
          <rect x="95" y="108" width="6" height="20" rx="2" fill="#2e2016" />
        </g>
      );
    case 'greataxe':
      return (
        <g className="av-weapon" stroke="#050403" strokeWidth="1.4" strokeLinejoin="round">
          <rect x="95" y="44" width="6" height="96" rx="2" fill="#42301f" />
          <path d="M101 46 C126 40 128 82 101 78 Z" fill="#9c9887" stroke="#050403" />
          <path d="M95 50 C80 50 80 72 95 72 Z" fill="#8b8778" stroke="#050403" />
        </g>
      );
    case 'handaxe':
      return (
        <g className="av-weapon" stroke="#050403" strokeWidth="1.4" strokeLinejoin="round">
          <rect x="95.5" y="78" width="4.5" height="44" rx="2" fill="#4a3220" />
          <path d="M100 78 C110 76 111 92 100 92 Z" fill="#9c9887" stroke="#050403" />
        </g>
      );
    case 'hammer':
      return (
        <g className="av-weapon" stroke="#050403" strokeWidth="1.4" strokeLinejoin="round">
          <rect x="95.5" y="78" width="5" height="46" rx="2" fill="#42301f" />
          <rect x="86" y="68" width="24" height="12" rx="2" fill="#6f6b60" stroke="#050403" />
        </g>
      );
    case 'greathammer':
      return (
        <g className="av-weapon" stroke="#050403" strokeWidth="1.4" strokeLinejoin="round">
          <rect x="95" y="52" width="6" height="92" rx="2" fill="#3a2a1b" />
          <rect
            x="80"
            y="36"
            width="36"
            height="20"
            rx="3"
            fill="#66625a"
            stroke="#050403"
            strokeWidth="2"
          />
        </g>
      );
    case 'morningstar':
      return (
        <g className="av-weapon" stroke="#050403" strokeWidth="1.4" strokeLinejoin="round">
          <rect x="95.5" y="82" width="5" height="42" rx="2" fill="#42301f" />
          <circle cx="98" cy="76" r="8" fill="#6f6b60" stroke="#050403" strokeWidth="1.5" />
          <path
            d="M98 64 L98 68 M98 84 L98 88 M86 76 L90 76 M106 76 L110 76 M90 68 L92.5 70.5 M106 68 L103.5 70.5 M90 84 L92.5 81.5 M106 84 L103.5 81.5"
            stroke="#a7a392"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>
      );
    case 'lance':
      return (
        <g className="av-weapon" stroke="#050403" strokeWidth="1.4" strokeLinejoin="round">
          <path d="M98 16 L104 96 L92 96 Z" fill="#a7a392" stroke="#050403" />
          <path d="M88 96 L108 96 L104 106 L92 106 Z" fill="#6e1a14" />
          <rect x="95.5" y="106" width="5" height="34" rx="2" fill="#42301f" />
        </g>
      );
    case 'crossbow':
      return (
        <g className="av-weapon" stroke="#050403" strokeWidth="1.4" strokeLinejoin="round">
          <rect x="94" y="88" width="30" height="6" rx="2" fill="#4a3220" />
          <path
            d="M116 72 C124 82 124 100 116 110"
            stroke="#3a2a1b"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          <line x1="116" y1="72" x2="116" y2="110" stroke="#cfc6ad" strokeWidth="1.2" />
          <rect x="94" y="94" width="5" height="14" rx="2" fill="#3a2a1b" />
        </g>
      );
    // ---- request #46 ----
    case 'scepter':
      return (
        <g className="av-weapon" stroke="#050403" strokeWidth="1.4" strokeLinejoin="round">
          <rect x="96" y="80" width="4" height="44" rx="2" fill="#a8853e" />
          <circle cx="98" cy="74" r="7" fill="#e8d28a" className="av-orb" />
          <path
            d="M98 62 L98 68 M92 74 L86 74 M104 74 L110 74"
            stroke="#e8d28a"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      );
    case 'chakram':
      return (
        <g className="av-weapon" stroke="#050403" strokeWidth="1.4" strokeLinejoin="round">
          <circle cx="100" cy="104" r="11" fill="none" stroke="#a7a392" strokeWidth="4" />
          <circle
            cx="100"
            cy="104"
            r="11"
            fill="none"
            stroke="#9a82c9"
            strokeWidth="1.5"
            className="av-orb"
          />
        </g>
      );
    case 'scythe':
      return (
        <g className="av-weapon" stroke="#050403" strokeWidth="1.4" strokeLinejoin="round">
          <rect x="95.5" y="34" width="4.5" height="110" rx="2" fill="#33251a" />
          <path
            d="M98 36 C84 26 64 30 58 44 C70 38 84 40 97 46 Z"
            fill="#a7a392"
            stroke="#050403"
          />
        </g>
      );
    case 'sling':
      return (
        <g className="av-weapon" stroke="#050403" strokeWidth="1.4" strokeLinejoin="round">
          <path d="M96 96 C100 110 104 118 100 128" stroke="#523620" strokeWidth="2" fill="none" />
          <path d="M96 96 C92 110 94 120 100 128" stroke="#523620" strokeWidth="2" fill="none" />
          <ellipse cx="100" cy="129" rx="4" ry="3" fill="#42301f" />
          <circle cx="100" cy="127" r="2.2" fill="#7a7a72" />
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
        <g className="av-offhand" stroke="#050403" strokeWidth="1.4" strokeLinejoin="round">
          <path
            d="M8 96 L32 92 L32 116 C32 128 20 134 20 134 C20 134 8 128 8 116 Z"
            fill="#523620"
            stroke="#050403"
            strokeWidth="2"
          />
          <circle cx="20" cy="112" r="4" fill="#a8853e" />
        </g>
      );
    case 'talisman':
      return (
        <g className="av-offhand" stroke="#050403" strokeWidth="1.4" strokeLinejoin="round">
          <line x1="22" y1="112" x2="18" y2="128" stroke="#a89a78" strokeWidth="1.5" />
          <path d="M12 128 L24 128 L18 140 Z" fill="#cfc6ad" stroke="#050403" />
          <circle cx="18" cy="132" r="2" fill="#7fb3c9" className="av-orb" />
        </g>
      );
    case 'dagger':
      return (
        <g className="av-offhand" stroke="#050403" strokeWidth="1.4" strokeLinejoin="round">
          <path d="M21 86 L24 86 L25 108 L20 108 Z" fill="#a7a392" stroke="#050403" />
          <rect x="17" y="107" width="11" height="4" rx="1.5" fill="#6e5530" />
        </g>
      );
    case 'handaxe':
      return (
        <g className="av-offhand" stroke="#050403" strokeWidth="1.4" strokeLinejoin="round">
          <rect x="19" y="90" width="4" height="40" rx="2" fill="#4a3220" />
          <path d="M19 90 C9 88 8 104 19 104 Z" fill="#9c9887" stroke="#050403" />
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
  const W = (x: number) => 60 + (x - 60) * wide;
  const outfit = grim(a.outfit);
  const outfitDark = shade(outfit, -0.12);
  const mantle = shade(outfit, -0.2);
  const skin = grim(a.skin, 0.15, 0.06);
  const skinShade = shade(skin, -0.14);
  const hair = grim(a.hairColor, 0.25, 0.08);
  const pants = '#26211c';
  const leather = '#2e2117';
  const viewBox = portrait ? '33 12 54 54' : '0 0 120 160';
  const width = portrait ? size : (size * 3) / 4;
  const outline = { stroke: INK, strokeWidth: 1.6, strokeLinejoin: 'round' as const };

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
          <circle cx="60" cy="39" r="27" />
        </clipPath>
      </defs>
      <g
        transform={flip ? 'translate(120 0) scale(-1 1)' : undefined}
        clipPath={portrait ? `url(#clip-${uid})` : undefined}
      >
        {!portrait && part === 'full' && (
          <ellipse cx="60" cy="150" rx="26" ry="4.5" fill="rgba(0,0,0,0.6)" className="av-shadow" />
        )}
        <g className="av-root">
          {show('base') && <BackHair a={a} c={hair} />}
          {/* legs and boots */}
          {show('base') && (
            <g className="av-legs" {...outline}>
              <path d={`M${W(50)} 103 L${W(58)} 103 L55.5 146 L47 146 Z`} fill={pants} />
              <path d={`M${W(62)} 103 L${W(70)} 103 L73 146 L64.5 146 Z`} fill={pants} />
              <path
                d="M46.5 127 L56 127 L56.5 144 Q60.5 145 60.5 149.5 L46 149.5 Z"
                fill={leather}
              />
              <path d="M64 127 L73.5 127 L74 144 Q78 145 78 149.5 L64 149.5 Z" fill={leather} />
            </g>
          )}
          {/* torso, mantle and arms */}
          {show('base') && (
            <g className="av-body" {...outline}>
              {/* off arm */}
              <path d={`M${W(42)} 53 L${W(50)} 55 L${W(43)} 83 L${W(35)} 80 Z`} fill={outfitDark} />
              <path d={`M${W(34)} 80 L${W(44)} 83 L28.5 111 L18.5 107 Z`} fill={outfitDark} />
              <path d="M22.6 96 L31 99 L28.5 107 L19.5 104 Z" fill={leather} />
              <circle cx="23.5" cy="110" r="3.4" fill={skin} />
              {/* weapon arm */}
              <path d={`M${W(70)} 55 L${W(78)} 53 L${W(85)} 80 L${W(77)} 83 Z`} fill={outfitDark} />
              <path d={`M${W(76)} 83 L${W(86)} 80 L101.5 109 L93 115 Z`} fill={outfitDark} />
              <path d="M88.5 98 L97 95 L100.5 104 L92.5 108 Z" fill={leather} />
              {/* tunic */}
              <path
                d={`M${W(45)} 50 Q60 47 ${W(75)} 50 L${W(77)} 60 L${W(72)} 84 L${W(79)} 106 L${W(41)} 106 L${W(48)} 84 L${W(43)} 60 Z`}
                fill={outfit}
              />
              <path
                d={`M${W(53)} 52 L${W(45)} 50 L${W(43)} 60 L${W(48)} 84 L${W(41)} 106 L${W(51)} 106 L${W(55)} 84 Z`}
                fill={INK}
                opacity="0.32"
                stroke="none"
              />
              <path d={`M60 86 L60 106`} stroke={INK} strokeWidth="1" opacity="0.6" />
              <rect x={W(47)} y="82" width={W(73) - W(47)} height="5" fill={leather} />
              <rect x="57.5" y="81.5" width="5" height="6" fill="#7d6a45" strokeWidth="1" />
              {/* shoulder mantle */}
              <path
                d={`M${W(41)} 52 Q60 45 ${W(79)} 52 L${W(81)} 64 Q60 71 ${W(39)} 64 Z`}
                fill={mantle}
              />
              <path d="M55 50 L60 57 L65 50" fill="none" strokeWidth="1.2" />
            </g>
          )}
          {show('weapon') && <Weapon weapon={weapon} />}
          {show('offhand') && <Offhand offhand={offhand} />}
          {show('weapon') && (
            <circle cx="97" cy="113" r="3.4" fill={skin} className="av-hand" {...outline} />
          )}
          {/* head */}
          {show('head') && (
            <g className="av-head">
              <rect x="56.5" y="42" width="7" height="9" fill={skinShade} {...outline} />
              {/* three-quarter view, facing right (toward the enemy): one ear shows */}
              <ellipse cx="52.4" cy="35.8" rx="1.9" ry="3.2" fill={skin} {...outline} />
              <path
                d="M51 30 C51 19.5 69 19.5 69 30 L68.5 39 C67 45.5 63 48 60 48 C57 48 53 45.5 51.5 39 Z"
                fill={skin}
                {...outline}
              />
              {/* hard shadow: brow, right cheek and jaw */}
              <path
                d="M54.5 31 L51.4 30.5 L51.8 39 C53.2 45 57 47.6 60 47.8 C56.6 44.5 54.4 40 54.5 31 Z"
                fill={skinShade}
              />
              <rect x="54" y="32" width="15" height="2.6" fill={skinShade} opacity="0.85" />
              {eyesClosed ? (
                <path
                  d="M56.6 35.6 L60.4 35.9 M64 35.9 L67.4 35.6"
                  stroke={INK}
                  strokeWidth="1.1"
                  strokeLinecap="round"
                />
              ) : (
                <g className="av-eyes">
                  <ellipse cx="58.6" cy="35.7" rx="1.8" ry="1.15" fill="#d9d0bb" />
                  <ellipse cx="65.9" cy="35.6" rx="1.4" ry="1.1" fill="#d9d0bb" />
                  <circle cx="59.3" cy="35.7" r="0.95" fill={a.eyeColor} />
                  <circle cx="66.4" cy="35.6" r="0.85" fill={a.eyeColor} />
                  <path
                    d="M56.6 34.7 L60.8 34.8 M64.3 34.8 L67.6 34.6"
                    stroke={INK}
                    strokeWidth="0.9"
                  />
                </g>
              )}
              <path
                d="M55.6 32.2 L60.8 33 M63.8 33 L68 32.2"
                stroke={shade(hair, -0.12)}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M64.6 35.5 L68.4 40.6 L64.8 41.4"
                stroke={shade(skin, -0.3)}
                strokeWidth="0.8"
                fill="none"
              />
              <path d="M60 43.9 L65.2 43.4" stroke="#3a1f17" strokeWidth="0.9" />
              <g {...outline} strokeWidth={1.3}>
                <FrontHair a={a} c={hair} />
              </g>
            </g>
          )}
        </g>
      </g>
    </svg>
  );
}
