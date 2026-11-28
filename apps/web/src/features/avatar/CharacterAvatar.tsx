import type { CharacterAppearance } from '@realms/shared';
import { BONE_PORTRAIT, BONE_RIG, BONES, boneBox, boneGeometry, type BoneLayer } from './bone-rig';
import { useId } from 'react';
import './avatar.css';
import { getWeaponType, type WeaponArtDef } from '@realms/game-core';
import { WEAPON_HAND } from '../items/art';
import capestripSrc from './base/cape_strip.webp?inline';
import armbackSrc from './base/arm_back.webp?inline';
import legbackSrc from './base/leg_back.webp?inline';
import torsoSrc from './base/torso.webp?inline';
import skirtSrc from './base/skirt.webp?inline';
import headSrc from './base/head.webp?inline';
import armfrontSrc from './base/arm_front.webp?inline';
import pauldronSrc from './base/pauldron.webp?inline';

/*
 * The player character (request #72): the owner's base hero art, cut into
 * pieces and articulated (ADR-054). Every player uses this base for now; the
 * appearance options are kept in the data for later looks.
 *
 * Layers (the canvas renderer animates them separately, same viewBox):
 *   offhand = back arm + off-hand item, turns at the back shoulder;
 *   base    = cape strip, legs, torso and skirt (breathes);
 *   weapon  = main-hand weapon + front arm + pauldron, turns at the front shoulder;
 *   head    = hooded head, turns at the neck.
 *
 * viewBox 0 0 120 160 — feet at y≈150. Pivots in `RIG`.
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

/**
 * Request #91: how the hero is drawn. 'bones' = a skeleton of coloured bones
 * (one colour per part still to be drawn, `bone-rig.ts`); 'painted' = the
 * owner's cut-out pieces (request #72), kept for when the new art arrives.
 */
export const HERO_STYLE: 'bones' | 'painted' = 'bones';

/**
 * Pictures of the bones, by id: drop `_bone_<id>.png` in avatar/bones/ (drawn in
 * the pose and box of the rig reference sheet) and it replaces the colour.
 */
const BONE_ART: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>('./bones/_bone_*.png', {
      eager: true,
      query: '?url',
      import: 'default',
    }),
  ).map(([path, url]) => [path.slice(path.lastIndexOf('/_bone_') + 7, -4), url]),
);

/** The bones of one layer: coloured bars and ovals, with a white dot on each joint. */
function Bones({ layer }: { layer: BoneLayer }) {
  return (
    <g className="av-bones" data-layer={layer}>
      {BONES.filter((b) => b.layer === layer).map((b) => {
        const g = boneGeometry(b);
        const art = BONE_ART[b.id];
        if (art) {
          // The drawn part, once its picture is in avatar/bones/.
          const box = boneBox(b);
          return (
            <image
              key={b.id}
              data-bone={b.id}
              href={art}
              x={box.x}
              y={box.y}
              width={box.w}
              height={box.h}
              preserveAspectRatio="none"
            />
          );
        }
        return (
          <g key={b.id} data-bone={b.id}>
            <title>{b.label}</title>
            {b.shape === 'oval' ? (
              <ellipse
                cx={g.mid.x}
                cy={g.mid.y}
                rx={Math.max(g.length / 2 + 2, b.width * 0.35)}
                ry={b.width / 2}
                transform={`rotate(${g.angle} ${g.mid.x} ${g.mid.y})`}
                fill={b.color}
                stroke="#050403"
                strokeWidth="1.2"
              />
            ) : (
              <>
                <line
                  x1={b.from.x}
                  y1={b.from.y}
                  x2={b.to.x}
                  y2={b.to.y}
                  stroke="#050403"
                  strokeWidth={b.width + 2.4}
                  strokeLinecap="round"
                />
                <line
                  x1={b.from.x}
                  y1={b.from.y}
                  x2={b.to.x}
                  y2={b.to.y}
                  stroke={b.color}
                  strokeWidth={b.width}
                  strokeLinecap="round"
                />
              </>
            )}
            <circle
              cx={b.from.x}
              cy={b.from.y}
              r="1.7"
              fill="#fff"
              stroke="#050403"
              strokeWidth="0.6"
            />
          </g>
        );
      })}
    </g>
  );
}

/** Pivots of the articulated base hero, in viewBox units. */
const PAINTED_RIG = {
  neck: { x: 60.0, y: 44.74 },
  frontShoulder: { x: 76.15, y: 49.11 },
  backShoulder: { x: 44.42, y: 49.11 },
  hand: { x: 106.74, y: 74.38 },
  backFist: { x: 31.88, y: 97.56 },
} as const;
/** Request #91: with the bones, the joints come from the skeleton (`bone-rig.ts`). */
export const RIG: Record<keyof typeof PAINTED_RIG, { x: number; y: number }> =
  HERO_STYLE === 'bones' ? BONE_RIG : PAINTED_RIG;
/** Portrait crop: a square around the head. */
const PORTRAIT = HERO_STYLE === 'bones' ? BONE_PORTRAIT : ({ x: 40, y: 5, size: 39 } as const);

const PARTS = {
  cape_strip: { src: capestripSrc, x: 38.15, y: 48.16, w: 21.28, h: 37.05 },
  arm_back: { src: armbackSrc, x: 19.15, y: 44.36, w: 28.5, h: 59.28 },
  leg_back: { src: legbackSrc, x: 20.1, y: 84.26, w: 67.07, h: 65.74 },
  torso: { src: torsoSrc, x: 39.1, y: 40.56, w: 41.99, h: 51.11 },
  skirt: { src: skirtSrc, x: 42.52, y: 84.26, w: 35.15, h: 34.58 },
  head: { src: headSrc, x: 43.85, y: 8.64, w: 30.78, h: 37.81 },
  arm_front: { src: armfrontSrc, x: 69.5, y: 43.41, w: 42.18, h: 35.91 },
  pauldron: { src: pauldronSrc, x: 64.75, y: 37.71, w: 24.51, h: 22.99 },
} as const;

type PartName = keyof typeof PARTS;

function Piece({
  name,
  scale = 1,
  about,
}: {
  name: PartName;
  scale?: number;
  about?: { x: number; y: number };
}) {
  const p = PARTS[name];
  const img = (
    <image href={p.src} x={p.x} y={p.y} width={p.w} height={p.h} preserveAspectRatio="none" />
  );
  if (scale === 1 || !about) return img;
  return (
    <g
      transform={`translate(${about.x} ${about.y}) scale(${scale}) translate(${-about.x} ${-about.y})`}
    >
      {img}
    </g>
  );
}

/** How a pose holds a weapon: the direction from the hand to the tip (degrees; 90 = down). */
const POSE_ANGLE: Record<WeaponArtDef['pose'], number> = {
  down: 84,
  up: -96,
  bow: -96,
  level: -4,
  forward: -40,
  hand: 0,
};

/** Off hands without a weapon definition (shields): just held, this big. */
const PLAIN_HELD: WeaponArtDef = {
  pose: 'hand',
  grip: { x: 0.5, y: 0.5 },
  angle: 0,
  reach: 0,
  size: 38,
};

/** The art data and hand picture of a weapon type (request #77: its folder). */
function heldArt(type: string): { art: WeaponArtDef; src: string } | null {
  const src = WEAPON_HAND[type];
  if (!src) return null;
  return { art: getWeaponType(type)?.art ?? PLAIN_HELD, src };
}

/** A weapon picture with its grip on a point. */
function PosedWeapon({ type, at }: { type: string; at: { x: number; y: number } }) {
  const held = heldArt(type);
  if (!held) return null;
  const { art, src } = held;
  const rot = art.pose === 'hand' ? 0 : (art.hold ?? POSE_ANGLE[art.pose]) - art.angle;
  const size = art.size;
  return (
    <g
      transform={`translate(${at.x} ${at.y}) rotate(${rot}) scale(${art.scale ?? 1}) translate(${-art.grip.x * size} ${-art.grip.y * size})`}
    >
      <image href={src} width={size} height={size} preserveAspectRatio="none" />
    </g>
  );
}

/** Main-hand weapon: the picture from its folder, in the hand. */
function HeldWeapon({ weapon }: { weapon: WeaponArt }) {
  if (!weapon) return null;
  if (heldArt(weapon)) return <PosedWeapon type={weapon} at={RIG.hand} />;
  return (
    <g transform={`translate(${RIG.hand.x} ${RIG.hand.y}) scale(0.85) translate(-97 -113)`}>
      <Weapon weapon={weapon} />
    </g>
  );
}

/** Off hand: shield, dagger or hand axe pictures at the back fist; talismans drawn. */
function HeldOffhand({ offhand }: { offhand: OffhandArt }) {
  if (!offhand) return null;
  if (heldArt(offhand)) return <PosedWeapon type={offhand} at={RIG.backFist} />;
  return (
    <g transform={`translate(${RIG.backFist.x} ${RIG.backFist.y}) scale(0.85) translate(-20 -112)`}>
      <Offhand offhand={offhand} />
    </g>
  );
}

/** Where the main weapon's tip is (canvas sparks for upgraded weapons). */
export function weaponTip(weapon: WeaponArt): { x: number; y: number } | null {
  const art = weapon ? getWeaponType(weapon)?.art : undefined;
  if (!art || art.pose === 'hand') return null;
  const a = ((art.hold ?? POSE_ANGLE[art.pose]) * Math.PI) / 180;
  const reach = art.reach * art.size * (art.scale ?? 1);
  return { x: RIG.hand.x + Math.cos(a) * reach, y: RIG.hand.y + Math.sin(a) * reach };
}

/** Rotate a layer about a pivot (DOM idle animation). */
const pivotStyle = (p: { x: number; y: number }) => ({
  transformBox: 'view-box' as const,
  transformOrigin: `${p.x}px ${p.y}px`,
});

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
  weapon = null,
  offhand = null,
  size = 160,
  animated = true,
  flip = false,
  portrait = false,
  title,
  className,
  part = 'full',
  inSvg = false,
}: CharacterAvatarProps) {
  const show = (p: Exclude<AvatarPart, 'full'>) => part === 'full' || part === p;
  const uid = useId().replace(/:/g, '');
  const viewBox = portrait
    ? `${PORTRAIT.x} ${PORTRAIT.y} ${PORTRAIT.size} ${PORTRAIT.size}`
    : '0 0 120 160';
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
          <circle
            cx={PORTRAIT.x + PORTRAIT.size / 2}
            cy={PORTRAIT.y + PORTRAIT.size / 2}
            r={PORTRAIT.size / 2}
          />
        </clipPath>
      </defs>
      <g
        transform={flip ? 'translate(120 0) scale(-1 1)' : undefined}
        clipPath={portrait ? `url(#clip-${uid})` : undefined}
      >
        {!portrait && part === 'full' && (
          <ellipse cx="56" cy="150" rx="34" ry="4.5" fill="rgba(0,0,0,0.6)" className="av-shadow" />
        )}
        <g className="av-root">
          {show('offhand') && (
            <g className="av-offhand" style={pivotStyle(RIG.backShoulder)}>
              {HERO_STYLE === 'bones' ? (
                <>
                  <Bones layer="offhand" />
                  <HeldOffhand offhand={offhand} />
                </>
              ) : (
                <>
                  <Piece name="arm_back" />
                  <HeldOffhand offhand={offhand} />
                </>
              )}
            </g>
          )}
          {show('base') && (
            <g className="av-body">
              {HERO_STYLE === 'bones' ? (
                <Bones layer="base" />
              ) : (
                <>
                  <Piece name="cape_strip" />
                  <Piece name="leg_back" />
                  <Piece name="torso" />
                  <Piece name="skirt" />
                </>
              )}
            </g>
          )}
          {show('weapon') && (
            <g className="av-weapon" style={pivotStyle(RIG.frontShoulder)}>
              <HeldWeapon weapon={weapon} />
              {HERO_STYLE === 'bones' ? (
                <Bones layer="weapon" />
              ) : (
                <>
                  <Piece name="arm_front" />
                  <Piece name="pauldron" />
                </>
              )}
            </g>
          )}
          {show('head') && (
            <g className="av-head" style={pivotStyle(RIG.neck)}>
              {HERO_STYLE === 'bones' ? <Bones layer="head" /> : <Piece name="head" />}
            </g>
          )}
        </g>
      </g>
    </svg>
  );
}
