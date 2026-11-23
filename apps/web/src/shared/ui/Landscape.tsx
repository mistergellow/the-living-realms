/*
 * Backdrop of every screen (request #69, the gothic "Darkest" look; PLACEHOLDER
 * ART, original, drawn in code): a sick moon over a ruined manor on a crag,
 * a dead wood, gravestones and banks of fog, all in ink silhouettes. Replace
 * with a real illustration later (same component, an <img>). The SVG covers
 * its box (slice) and keeps the horizon in the lower half.
 */

const INK = '#050403';

/** A dead tree: trunk plus a few crooked branches, drawn as one ink stroke set. */
export function DeadTree({ x, y, s, c = INK }: { x: number; y: number; s: number; c?: string }) {
  const p = (dx: number, dy: number) => `${x + dx * s} ${y + dy * s}`;
  return (
    <g stroke={c} strokeLinecap="round" fill="none">
      <path
        d={`M${p(-7, 0)} C${p(-4, -60)} ${p(-10, -120)} ${p(-2, -190)} L${p(4, -190)} C${p(0, -120)} ${p(6, -60)} ${p(9, 0)} Z`}
        fill={c}
        strokeWidth={2 * s}
      />
      <path
        d={`M${p(-3, -110)} C${p(-30, -130)} ${p(-50, -150)} ${p(-70, -190)}`}
        strokeWidth={5 * s}
      />
      <path d={`M${p(-45, -150)} L${p(-60, -150)}`} strokeWidth={3 * s} />
      <path
        d={`M${p(0, -150)} C${p(20, -175)} ${p(40, -185)} ${p(58, -220)}`}
        strokeWidth={4.5 * s}
      />
      <path d={`M${p(32, -182)} L${p(48, -178)}`} strokeWidth={2.5 * s} />
      <path
        d={`M${p(1, -185)} C${p(-6, -205)} ${p(-2, -225)} ${p(-12, -250)}`}
        strokeWidth={3 * s}
      />
      <path d={`M${p(3, -70)} C${p(25, -82)} ${p(40, -84)} ${p(55, -100)}`} strokeWidth={4 * s} />
    </g>
  );
}

/** A leaning gravestone. */
function Grave({ x, y, s, tilt }: { x: number; y: number; s: number; tilt: number }) {
  return (
    <path
      transform={`rotate(${tilt} ${x} ${y})`}
      d={`M${x - 12 * s} ${y} V${y - 26 * s} Q${x} ${y - 42 * s} ${x + 12 * s} ${y - 26 * s} V${y} Z`}
      fill={INK}
    />
  );
}

export function Landscape({ className }: { className?: string }) {
  return (
    <svg
      className={['landscape', className].filter(Boolean).join(' ')}
      viewBox="0 0 1600 1000"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
    >
      <defs>
        <linearGradient id="ls-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#040404" />
          <stop offset="0.45" stopColor="#141a19" />
          <stop offset="0.72" stopColor="#2c2a22" />
          <stop offset="0.86" stopColor="#3a2418" />
          <stop offset="1" stopColor="#120b08" />
        </linearGradient>
        <radialGradient id="ls-moonglow" cx="0.68" cy="0.3" r="0.4">
          <stop offset="0" stopColor="#c9c3a0" stopOpacity="0.3" />
          <stop offset="0.4" stopColor="#7d7a62" stopOpacity="0.1" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ls-moon" cx="0.42" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#ece4c4" />
          <stop offset="1" stopColor="#a49c7c" />
        </radialGradient>
        <linearGradient id="ls-fog" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8d8a78" stopOpacity="0" />
          <stop offset="0.5" stopColor="#8d8a78" stopOpacity="0.28" />
          <stop offset="1" stopColor="#8d8a78" stopOpacity="0" />
        </linearGradient>
        <filter id="ls-blur" x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>

      <rect width="1600" height="1000" fill="url(#ls-sky)" />
      <rect width="1600" height="1000" fill="url(#ls-moonglow)" />
      {/* the moon, scarred */}
      <circle cx="1090" cy="300" r="92" fill="url(#ls-moon)" />
      <g fill="#8f8768" opacity="0.5">
        <circle cx="1060" cy="280" r="16" />
        <circle cx="1112" cy="330" r="11" />
        <circle cx="1120" cy="268" r="7" />
      </g>
      {/* drifting clouds across the moon */}
      <g className="ls-clouds" filter="url(#ls-blur)" opacity="0.85">
        <ellipse cx="1040" cy="330" rx="260" ry="26" fill="#0b0c0b" />
        <ellipse cx="380" cy="250" rx="320" ry="40" fill="#1d201d" />
        <ellipse cx="1350" cy="200" rx="240" ry="30" fill="#1a1c1a" />
      </g>

      {/* far range */}
      <path
        d="M0 640 L90 590 L170 610 L260 540 L330 575 L420 520 L520 590 L610 560 L700 610 L1600 600 L1600 760 L0 760 Z"
        fill="#1c1c19"
      />
      {/* the ruined manor on its crag */}
      <g fill="#0e0d0b">
        <path d="M1180 760 L1220 600 L1270 560 L1330 590 L1390 540 L1450 620 L1500 760 Z" />
        <rect x="1250" y="430" width="70" height="150" />
        <path d="M1245 430 L1285 360 L1325 430 Z" />
        <rect x="1330" y="470" width="54" height="110" />
        <path d="M1326 470 L1340 440 L1352 462 L1366 432 L1388 470 Z" />
        <rect x="1300" y="380" width="14" height="60" />
        <path d="M1296 380 L1307 330 L1318 380 Z" />
      </g>
      {/* one window still burning */}
      <rect x="1278" y="470" width="10" height="18" fill="#d0912f" />
      <circle cx="1283" cy="479" r="26" fill="#d0912f" opacity="0.18" filter="url(#ls-blur)" />

      {/* fog bank behind the wood */}
      <rect y="640" width="1600" height="150" fill="url(#ls-fog)" />

      {/* the dead wood */}
      <path
        d="M0 790 C200 750 380 760 560 785 C760 812 980 770 1200 780 C1380 788 1500 770 1600 775 L1600 1000 L0 1000 Z"
        fill="#0b0a08"
      />
      <DeadTree x={120} y={800} s={1.5} c="#0b0a08" />
      <DeadTree x={330} y={790} s={1.05} c="#100e0b" />
      <DeadTree x={1490} y={790} s={1.25} c="#0b0a08" />
      <DeadTree x={1010} y={790} s={0.8} c="#13110d" />
      {[640, 690, 742, 800, 860].map((x, i) => (
        <Grave key={x} x={x} y={812 + (i % 2) * 6} s={1 + (i % 3) * 0.2} tilt={(i % 3) * 6 - 6} />
      ))}

      {/* near fog and foreground */}
      <rect y="800" width="1600" height="110" fill="url(#ls-fog)" opacity="0.8" />
      <path
        d="M0 900 C260 860 520 880 800 900 C1080 920 1340 870 1600 890 L1600 1000 L0 1000 Z"
        fill={INK}
      />
      <DeadTree x={1560} y={930} s={2.1} />
      <DeadTree x={30} y={940} s={1.9} />
    </svg>
  );
}
