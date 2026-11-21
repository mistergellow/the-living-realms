import type { LocationScene as SceneId } from '@realms/game-core';

/*
 * The picture of each place (PLACEHOLDER ART, original, drawn in code).
 * One drawing per `LocationScene` id from game-core; replace with real
 * illustrations later (same component, an <img> per id).
 */
export function LocationScene({ scene }: { scene: SceneId }) {
  return scene === 'town' ? <TownScene /> : <WildsScene />;
}

const HOUSES = [
  { x: 120, w: 150, h: 120, roof: 70 },
  { x: 290, w: 120, h: 150, roof: 60 },
  { x: 1090, w: 140, h: 135, roof: 66 },
  { x: 1250, w: 170, h: 110, roof: 74 },
  { x: 1440, w: 120, h: 140, roof: 58 },
];

function House({ x, w, h, roof }: { x: number; w: number; h: number; roof: number }) {
  const base = 520;
  return (
    <g>
      <rect x={x} y={base - h} width={w} height={h} fill="#4a3c36" />
      <rect x={x + w * 0.7} y={base - h} width={w * 0.3} height={h} fill="#3a2f2b" />
      <path
        d={`M${x - 10} ${base - h} L${x + w / 2} ${base - h - roof} L${x + w + 10} ${base - h} Z`}
        fill="#6b2f26"
      />
      <rect x={x + w * 0.18} y={base - h * 0.7} width={w * 0.2} height={h * 0.22} fill="#ffcf6e" />
      <rect x={x + w * 0.55} y={base - h * 0.7} width={w * 0.14} height={h * 0.22} fill="#f5a524" />
      <rect x={x + w * 0.4} y={base - h * 0.35} width={w * 0.2} height={h * 0.35} fill="#22191a" />
    </g>
  );
}

function TownScene() {
  return (
    <svg viewBox="0 0 1600 600" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="town-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b2147" />
          <stop offset="0.6" stopColor="#6d3f5c" />
          <stop offset="1" stopColor="#e08a4f" />
        </linearGradient>
        <radialGradient id="town-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffd27a" stopOpacity="0.8" />
          <stop offset="1" stopColor="#ffd27a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="600" fill="url(#town-sky)" />
      <circle cx="1240" cy="150" r="46" fill="#ffe6b0" opacity="0.85" />
      {/* the keep on the hill */}
      <path d="M520 360 Q800 210 1080 360 Z" fill="#2c2536" />
      <rect x="720" y="170" width="160" height="200" fill="#3d3446" />
      <rect x="690" y="140" width="60" height="230" fill="#463c50" />
      <rect x="850" y="150" width="60" height="220" fill="#463c50" />
      <path d="M682 140 L720 90 L758 140 Z M842 150 L880 100 L918 150 Z" fill="#5a2a2a" />
      <rect x="785" y="230" width="30" height="40" fill="#ffcf6e" />
      {/* town wall and gate */}
      <rect x="0" y="420" width="1600" height="110" fill="#5b5150" />
      {Array.from({ length: 40 }, (_, i) => (
        <rect key={i} x={i * 40} y="404" width="24" height="18" fill="#5b5150" />
      ))}
      <rect x="0" y="500" width="1600" height="30" fill="#463e3d" />
      <path d="M720 530 V460 Q800 395 880 460 V530 Z" fill="#1d1617" />
      <circle cx="800" cy="470" r="90" fill="url(#town-glow)" />
      {HOUSES.map((h) => (
        <House key={h.x} {...h} />
      ))}
      {/* lanterns */}
      {[680, 920].map((x) => (
        <g key={x}>
          <rect x={x - 3} y="440" width="6" height="90" fill="#2a2222" />
          <circle cx={x} cy="436" r="12" fill="#ffd27a" />
          <circle cx={x} cy="436" r="40" fill="url(#town-glow)" />
        </g>
      ))}
      <rect x="0" y="530" width="1600" height="70" fill="#2b2420" />
      <path d="M700 600 L760 530 H840 L900 600 Z" fill="#4a3f36" />
    </svg>
  );
}

function WildsScene() {
  return (
    <svg viewBox="0 0 1600 600" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="wilds-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a3d63" />
          <stop offset="1" stopColor="#a9b7a0" />
        </linearGradient>
      </defs>
      <rect width="1600" height="600" fill="url(#wilds-sky)" />
      <path
        d="M0 330 L220 200 L420 300 L640 170 L900 310 L1120 190 L1380 300 L1600 220 V600 H0 Z"
        fill="#56657a"
      />
      <path d="M0 400 Q400 300 800 390 T1600 370 V600 H0 Z" fill="#4f6b45" />
      <path d="M0 470 Q500 410 900 470 T1600 450 V600 H0 Z" fill="#3c5636" />
      {[150, 230, 1290, 1380, 1470].map((x, i) => (
        <path key={x} d={`M${x} ${300 + (i % 2) * 30} l40 120 h-80 Z`} fill="#24361f" />
      ))}
      <ellipse cx="760" cy="520" rx="70" ry="26" fill="#6f6f68" />
      <ellipse cx="860" cy="540" rx="40" ry="16" fill="#5d5d57" />
      <path d="M600 600 Q760 500 820 470 Q880 500 1000 600 Z" fill="#7a6a4c" opacity="0.6" />
    </svg>
  );
}
