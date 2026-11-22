import type { LocationScene as SceneId } from '@realms/game-core';
import { DeadTree } from '../../shared/ui/Landscape';

/*
 * The picture of each place (request #69, gothic ink style; PLACEHOLDER ART,
 * original, drawn in code). One drawing per `LocationScene` id from game-core;
 * replace with real illustrations later (same component, an <img> per id).
 */
export function LocationScene({ scene }: { scene: SceneId }) {
  return scene === 'town' ? <TownScene /> : <WildsScene />;
}

const INK = '#050403';
const TORCH = '#d0912f';

/** Crooked town houses: steep roofs, timber, a lit window or two. */
const HOUSES = [
  { x: 40, w: 150, h: 170, roof: 110, lean: -6, lit: [0] },
  { x: 205, w: 110, h: 220, roof: 95, lean: 4, lit: [1] },
  { x: 1110, w: 130, h: 190, roof: 120, lean: 5, lit: [0, 1] },
  { x: 1255, w: 170, h: 150, roof: 100, lean: -3, lit: [] },
  { x: 1440, w: 140, h: 210, roof: 105, lean: 6, lit: [1] },
];

function House(props: (typeof HOUSES)[number]) {
  const { x, w, h, roof, lean, lit } = props;
  const base = 520;
  const top = base - h;
  return (
    <g>
      <path
        d={`M${x} ${base} L${x + lean} ${top} L${x + w / 2 + lean} ${top - roof} L${x + w + lean} ${top} L${x + w} ${base} Z`}
        fill="#0d0b09"
      />
      <path
        d={`M${x + lean + 6} ${top + 8} H${x + w + lean - 6}`}
        stroke="#1e1913"
        strokeWidth="4"
      />
      <rect
        x={x + w * 0.62 + lean}
        y={top - roof * 0.7}
        width="12"
        height={roof * 0.5}
        fill="#0d0b09"
      />
      {[0, 1].map((i) => (
        <rect
          key={i}
          x={x + w * (0.2 + i * 0.4) + lean * 0.5}
          y={top + h * 0.3}
          width={w * 0.16}
          height={h * 0.16}
          fill={lit.includes(i) ? TORCH : '#16120e'}
          opacity={lit.includes(i) ? 0.9 : 1}
        />
      ))}
    </g>
  );
}

function TownScene() {
  return (
    <svg viewBox="0 0 1600 600" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="town-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#060606" />
          <stop offset="0.55" stopColor="#1c1f1c" />
          <stop offset="0.85" stopColor="#3b2616" />
          <stop offset="1" stopColor="#5a3417" />
        </linearGradient>
        <radialGradient id="town-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={TORCH} stopOpacity="0.55" />
          <stop offset="1" stopColor={TORCH} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="600" fill="url(#town-sky)" />
      <circle cx="1270" cy="120" r="44" fill="#d8d0b0" opacity="0.85" />
      {/* the cathedral and keep */}
      <g fill="#0a0908">
        <path d="M480 420 Q800 250 1120 420 Z" />
        <rect x="700" y="170" width="200" height="250" />
        <path d="M690 170 L800 60 L910 170 Z" />
        <rect x="640" y="210" width="62" height="210" />
        <path d="M636 210 L671 120 L706 210 Z" />
        <rect x="900" y="230" width="58" height="190" />
        <path d="M896 230 L929 150 L962 230 Z" />
        <rect x="794" y="20" width="12" height="50" />
        <rect x="782" y="32" width="36" height="8" />
      </g>
      <circle cx="800" cy="250" r="30" fill="#7a2016" opacity="0.85" />
      <path d="M800 220 V280 M770 250 H830" stroke="#0a0908" strokeWidth="6" />
      {/* town wall and gate */}
      <rect x="0" y="430" width="1600" height="100" fill="#11100d" />
      {Array.from({ length: 40 }, (_, i) => (
        <rect key={i} x={i * 40} y="414" width="24" height="18" fill="#11100d" />
      ))}
      <path d="M720 530 V465 Q800 395 880 465 V530 Z" fill={INK} />
      <circle cx="800" cy="480" r="110" fill="url(#town-glow)" />
      {HOUSES.map((h) => (
        <House key={h.x} {...h} />
      ))}
      {/* braziers by the gate */}
      {[670, 930].map((x) => (
        <g key={x}>
          <rect x={x - 4} y="452" width="8" height="78" fill={INK} />
          <path d={`M${x - 14} 452 h28 l-6 -10 h-16 Z`} fill={INK} />
          <path d={`M${x - 8} 442 q8 -26 8 -30 q4 12 8 30 Z`} fill={TORCH} />
          <circle cx={x} cy="436" r="46" fill="url(#town-glow)" />
        </g>
      ))}
      <rect x="0" y="530" width="1600" height="70" fill={INK} />
      <path d="M690 600 L760 530 H840 L910 600 Z" fill="#1d1510" />
    </svg>
  );
}

function WildsScene() {
  return (
    <svg viewBox="0 0 1600 600" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="wilds-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#050605" />
          <stop offset="0.6" stopColor="#1f2620" />
          <stop offset="1" stopColor="#3a3a2c" />
        </linearGradient>
        <linearGradient id="wilds-fog" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8d8a78" stopOpacity="0" />
          <stop offset="0.5" stopColor="#8d8a78" stopOpacity="0.3" />
          <stop offset="1" stopColor="#8d8a78" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="1600" height="600" fill="url(#wilds-sky)" />
      <path
        d="M0 330 L220 230 L420 300 L640 200 L900 310 L1120 220 L1380 300 L1600 240 V600 H0 Z"
        fill="#161814"
      />
      <rect y="300" width="1600" height="140" fill="url(#wilds-fog)" />
      <path d="M0 420 Q400 360 800 410 T1600 400 V600 H0 Z" fill="#0d0e0b" />
      {/* a broken shrine by the road */}
      <g fill={INK}>
        <rect x="760" y="360" width="16" height="70" />
        <rect x="830" y="380" width="16" height="50" />
        <path d="M748 362 L800 340 L858 380 L852 388 L800 352 L756 370 Z" />
      </g>
      <DeadTree x={180} y={480} s={1.2} c="#080806" />
      <DeadTree x={380} y={450} s={0.8} c="#0f100c" />
      <DeadTree x={1280} y={470} s={1.05} c="#0b0c09" />
      <DeadTree x={1480} y={500} s={1.4} c={INK} />
      <path d="M0 500 Q500 450 900 500 T1600 480 V600 H0 Z" fill={INK} />
      <path d="M640 600 Q760 520 800 492 Q850 520 960 600 Z" fill="#1e1811" />
    </svg>
  );
}
