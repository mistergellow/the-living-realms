import type { LocationScene as SceneId } from '@realms/game-core';
import type { ReactNode } from 'react';
import { DeadTree } from '../../shared/ui/Landscape';

/*
 * The picture of each place (request #69, gothic ink style; PLACEHOLDER ART,
 * original, drawn in code). One drawing per `LocationScene` id from game-core;
 * replace with real illustrations later (same component, an <img> per id).
 */
export function LocationScene({ scene, rift = false }: { scene: SceneId; rift?: boolean }) {
  return scene === 'town' ? <TownScene /> : <WildsScene rift={rift} />;
}

/*
 * Request #89 (phase B): scenes are drawn in depth layers (`Layer`), moved at
 * different speeds by the pointer (parallax, CSS vars --px/--py set by the
 * place screen) and kept alive by small loops: clouds over the moon, drifting
 * fog, crows, fireflies, chimney smoke, flickering flames, a pulsing Rift.
 * All CSS-animated (game.css), off with "reduce motion".
 */
function Layer({ depth, children }: { depth: number; children: ReactNode }) {
  return (
    <g className="ps-layer" style={{ ['--depth' as string]: depth }}>
      {children}
    </g>
  );
}

/** Clouds sliding across the sky, on a long loop. */
function Clouds({ y, tint }: { y: number; tint: string }) {
  return (
    <g className="ps-clouds" fill={tint}>
      {[0, 1].map((k) => (
        <g key={k} style={{ ['--k' as string]: k }} className="ps-cloud-band">
          <ellipse cx={200 + k * 800} cy={y} rx="220" ry="26" opacity="0.5" />
          <ellipse cx={420 + k * 800} cy={y + 30} rx="160" ry="18" opacity="0.35" />
          <ellipse cx={640 + k * 800} cy={y - 18} rx="190" ry="20" opacity="0.4" />
        </g>
      ))}
    </g>
  );
}

/** A few crows crossing the sky now and then. */
function Crows() {
  const bird = 'M0 0 q6 -6 12 0 q6 -6 12 0 q-6 -2 -12 3 q-6 -5 -12 -3 Z';
  return (
    <g className="ps-crows" fill="#050403">
      {[
        { y: 150, d: 0, s: 1 },
        { y: 175, d: 0.6, s: 0.8 },
        { y: 135, d: 1.1, s: 0.7 },
      ].map((b, i) => (
        <g
          key={i}
          className="ps-crow"
          style={{ ['--y' as string]: `${b.y}px`, ['--d' as string]: b.d, ['--s' as string]: b.s }}
        >
          <path className="ps-crow-wing" d={bird} />
        </g>
      ))}
    </g>
  );
}

/** Drifting fog bands near the ground. */
function Fog({ y, color, opacity = 0.35 }: { y: number; color: string; opacity?: number }) {
  return (
    <g className="ps-fog" opacity={opacity}>
      {[0, 1].map((k) => (
        <rect
          key={k}
          className="ps-fog-band"
          style={{ ['--k' as string]: k }}
          x={k * 1600}
          y={y}
          width="1600"
          height="120"
          fill={color}
          filter="url(#ps-blur)"
        />
      ))}
    </g>
  );
}

const BlurDef = () => (
  <>
    <filter id="ps-blur" x="-10%" y="-50%" width="120%" height="200%">
      <feGaussianBlur stdDeviation="22" />
    </filter>
    <filter id="ps-soft" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="6" />
    </filter>
  </>
);

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
      {/* chimney smoke (request #89) */}
      <g className="ps-smoke" fill="#57524a" filter="url(#ps-soft)">
        {[0, 1, 2].map((k) => (
          <circle
            key={k}
            cx={x + w * 0.62 + lean + 6}
            cy={top - roof * 0.7 - 6}
            r={7 + k * 3}
            style={{ ['--k' as string]: k }}
          />
        ))}
      </g>
      {[0, 1].map((i) => (
        <rect
          key={i}
          x={x + w * (0.2 + i * 0.4) + lean * 0.5}
          y={top + h * 0.3}
          width={w * 0.16}
          height={h * 0.16}
          fill={lit.includes(i) ? TORCH : '#16120e'}
          opacity={lit.includes(i) ? 0.9 : 1}
          className={lit.includes(i) ? 'ps-window' : undefined}
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
        <BlurDef />
      </defs>
      <rect width="1600" height="600" fill="url(#town-sky)" />
      <Layer depth={0.2}>
        <circle cx="1270" cy="120" r="44" fill="#d8d0b0" opacity="0.85" />
        <Clouds y={110} tint="#14130f" />
        <Crows />
      </Layer>
      {/* the cathedral and keep */}
      <Layer depth={0.5}>
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
        <circle className="ps-rose" cx="800" cy="250" r="30" fill="#7a2016" opacity="0.85" />
        <path d="M800 220 V280 M770 250 H830" stroke="#0a0908" strokeWidth="6" />
      </Layer>
      {/* town wall and gate */}
      <Layer depth={0.8}>
        <rect x="-40" y="430" width="1680" height="100" fill="#11100d" />
        {Array.from({ length: 42 }, (_, i) => (
          <rect key={i} x={i * 40 - 40} y="414" width="24" height="18" fill="#11100d" />
        ))}
        <path d="M720 530 V465 Q800 395 880 465 V530 Z" fill={INK} />
        <circle className="ps-glow" cx="800" cy="480" r="110" fill="url(#town-glow)" />
        {HOUSES.map((h) => (
          <House key={h.x} {...h} />
        ))}
        {/* braziers by the gate */}
        {[670, 930].map((x) => (
          <g key={x}>
            <rect x={x - 4} y="452" width="8" height="78" fill={INK} />
            <path d={`M${x - 14} 452 h28 l-6 -10 h-16 Z`} fill={INK} />
            <path
              className="ps-flame"
              d={`M${x - 8} 442 q8 -26 8 -30 q4 12 8 30 Z`}
              fill={TORCH}
              style={{ transformOrigin: `${x}px 442px` }}
            />
            <circle className="ps-glow" cx={x} cy="436" r="46" fill="url(#town-glow)" />
          </g>
        ))}
      </Layer>
      <Layer depth={1.2}>
        <rect x="-60" y="530" width="1720" height="70" fill={INK} />
        <path d="M690 600 L760 530 H840 L910 600 Z" fill="#1d1510" />
        <Fog y={500} color="#3a2a1c" opacity={0.4} />
      </Layer>
    </svg>
  );
}

function WildsScene({ rift }: { rift: boolean }) {
  return (
    <svg viewBox="0 0 1600 600" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="wilds-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#050605" />
          <stop offset="0.6" stopColor={rift ? '#231a2a' : '#1f2620'} />
          <stop offset="1" stopColor={rift ? '#3a2c40' : '#3a3a2c'} />
        </linearGradient>
        <radialGradient id="rift-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#c69cff" stopOpacity="0.9" />
          <stop offset="0.35" stopColor="#7d4bd6" stopOpacity="0.55" />
          <stop offset="1" stopColor="#3a1a6a" stopOpacity="0" />
        </radialGradient>
        <BlurDef />
      </defs>
      <rect width="1600" height="600" fill="url(#wilds-sky)" />
      <Layer depth={0.2}>
        <circle cx="1180" cy="110" r="40" fill="#cfc9ad" opacity="0.7" />
        <Clouds y={120} tint="#10120f" />
        <Crows />
      </Layer>
      <Layer depth={0.45}>
        <path
          d="M-40 330 L220 230 L420 300 L640 200 L900 310 L1120 220 L1380 300 L1640 240 V600 H-40 Z"
          fill="#161814"
        />
        <Fog y={290} color={rift ? '#5a4870' : '#8d8a78'} opacity={0.3} />
      </Layer>
      <Layer depth={0.75}>
        <path d="M-40 420 Q400 360 800 410 T1640 400 V600 H-40 Z" fill="#0d0e0b" />
        {rift ? (
          /* a Rift: a tear of violet light where the shrine stood */
          <g>
            <circle className="ps-rift-glow" cx="800" cy="370" r="120" fill="url(#rift-glow)" />
            <ellipse
              className="ps-rift"
              cx="800"
              cy="372"
              rx="30"
              ry="70"
              fill="#9a63f0"
              filter="url(#ps-soft)"
            />
            <path
              className="ps-rift"
              d="M800 300 C786 330 812 352 794 378 C780 400 810 420 800 446 C818 420 794 398 808 376 C822 350 792 330 800 300 Z"
              fill="#f1e6ff"
            />
            {Array.from({ length: 12 }, (_, i) => (
              <circle
                key={i}
                className="ps-mote"
                cx="800"
                cy="372"
                r={1.5 + (i % 3)}
                fill="#cdb2ff"
                style={{ ['--i' as string]: i }}
              />
            ))}
          </g>
        ) : (
          /* a broken shrine by the road */
          <g fill={INK}>
            <rect x="760" y="360" width="16" height="70" />
            <rect x="830" y="380" width="16" height="50" />
            <path d="M748 362 L800 340 L858 380 L852 388 L800 352 L756 370 Z" />
          </g>
        )}
        <DeadTree x={380} y={450} s={0.8} c="#0f100c" />
        <DeadTree x={1280} y={470} s={1.05} c="#0b0c09" />
      </Layer>
      <Layer depth={1.2}>
        <DeadTree x={180} y={480} s={1.2} c="#080806" />
        <DeadTree x={1480} y={500} s={1.4} c={INK} />
        <path d="M-60 500 Q500 450 900 500 T1660 480 V600 H-60 Z" fill={INK} />
        <path d="M640 600 Q760 520 800 492 Q850 520 960 600 Z" fill="#1e1811" />
        {!rift &&
          Array.from({ length: 10 }, (_, i) => (
            <circle
              key={i}
              className="ps-firefly"
              cx={150 + ((i * 157) % 1300)}
              cy={430 + ((i * 37) % 90)}
              r="2.2"
              fill="#f3dca4"
              style={{ ['--i' as string]: i }}
            />
          ))}
        <Fog y={470} color={rift ? '#4a3a60' : '#6d6a5a'} opacity={0.35} />
      </Layer>
    </svg>
  );
}
