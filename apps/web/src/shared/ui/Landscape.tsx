/*
 * Painted-style landscape backdrop (PLACEHOLDER ART, original, drawn in code):
 * dusk sky, clouds, mountain ranges, a castle on a hill, a village, pines and
 * mist. Replace with a real illustration later (same component, an <img>).
 * The SVG covers its box (slice) and keeps the horizon in the lower half.
 */

const STARS = Array.from({ length: 70 }, (_, i) => ({
  x: (i * 211 + 37) % 1600,
  y: (i * 97 + 13) % 330,
  r: 0.6 + ((i * 7) % 5) * 0.28,
  o: 0.35 + ((i * 13) % 6) * 0.1,
}));

function Pine({ x, y, s, c }: { x: number; y: number; s: number; c: string }) {
  return (
    <path
      d={`M${x} ${y - 70 * s} L${x + 16 * s} ${y - 36 * s} L${x + 9 * s} ${y - 36 * s} L${x + 22 * s} ${y - 8 * s} L${x + 4 * s} ${y - 8 * s} L${x + 4 * s} ${y} L${x - 4 * s} ${y} L${x - 4 * s} ${y - 8 * s} L${x - 22 * s} ${y - 8 * s} L${x - 9 * s} ${y - 36 * s} L${x - 16 * s} ${y - 36 * s} Z`}
      fill={c}
    />
  );
}

function Tower(props: { x: number; base: number; w: number; h: number; roof: number }) {
  const { x, base, w, h, roof } = props;
  return (
    <g>
      <rect x={x} y={base - h} width={w} height={h} fill="url(#ls-wall)" />
      <rect
        x={x + w - w * 0.28}
        y={base - h}
        width={w * 0.28}
        height={h}
        fill="#9d958a"
        opacity="0.55"
      />
      <path
        d={`M${x - 3} ${base - h} L${x + w / 2} ${base - h - roof} L${x + w + 3} ${base - h} Z`}
        fill="url(#ls-roof)"
      />
      <rect
        x={x + w * 0.38}
        y={base - h + h * 0.22}
        width={w * 0.24}
        height={h * 0.12}
        rx="2"
        fill="#3b3442"
      />
      <rect
        x={x + w * 0.38}
        y={base - h + h * 0.52}
        width={w * 0.24}
        height={h * 0.12}
        rx="2"
        fill="#3b3442"
      />
    </g>
  );
}

function House({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g>
      <rect x={x} y={y - 22 * s} width={34 * s} height={22 * s} fill="#e8e1d4" />
      <path
        d={`M${x - 4 * s} ${y - 22 * s} L${x + 17 * s} ${y - 40 * s} L${x + 38 * s} ${y - 22 * s} Z`}
        fill="#a4483a"
      />
      <rect x={x + 6 * s} y={y - 15 * s} width={6 * s} height={6 * s} fill="#4a4050" />
      <rect x={x + 21 * s} y={y - 13 * s} width={7 * s} height={13 * s} fill="#5a4636" />
    </g>
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
          <stop offset="0" stopColor="#141c3d" />
          <stop offset="0.35" stopColor="#3b3f73" />
          <stop offset="0.58" stopColor="#9a7aa0" />
          <stop offset="0.75" stopColor="#efb79a" />
          <stop offset="1" stopColor="#f6d6b0" />
        </linearGradient>
        <radialGradient id="ls-sun" cx="0.62" cy="0.62" r="0.35">
          <stop offset="0" stopColor="#fff2d6" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffd9a8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ls-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8a8fb8" />
          <stop offset="1" stopColor="#b9aec4" />
        </linearGradient>
        <linearGradient id="ls-mid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5f6d94" />
          <stop offset="1" stopColor="#8d93a8" />
        </linearGradient>
        <linearGradient id="ls-hill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9bb062" />
          <stop offset="1" stopColor="#5f7a3c" />
        </linearGradient>
        <linearGradient id="ls-cliff" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b8a86" />
          <stop offset="1" stopColor="#4f5058" />
        </linearGradient>
        <linearGradient id="ls-near" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6f8a45" />
          <stop offset="1" stopColor="#36482a" />
        </linearGradient>
        <linearGradient id="ls-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ece6da" />
          <stop offset="1" stopColor="#c9c0b2" />
        </linearGradient>
        <linearGradient id="ls-roof" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c0573f" />
          <stop offset="1" stopColor="#7d3328" />
        </linearGradient>
        <filter id="ls-blur" x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
        <filter id="ls-soft" x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {/* sky */}
      <rect width="1600" height="1000" fill="url(#ls-sky)" />
      {STARS.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={s.o} />
      ))}
      <rect width="1600" height="1000" fill="url(#ls-sun)" />

      {/* clouds */}
      <g className="ls-clouds" filter="url(#ls-blur)" opacity="0.9">
        <ellipse cx="260" cy="380" rx="260" ry="70" fill="#f4c8b0" />
        <ellipse cx="420" cy="340" rx="170" ry="80" fill="#f7d9c4" />
        <ellipse cx="1180" cy="300" rx="280" ry="75" fill="#f0c0aa" />
        <ellipse cx="1350" cy="350" rx="200" ry="70" fill="#f8dccb" />
        <ellipse cx="800" cy="430" rx="320" ry="55" fill="#f9e2cf" />
        <ellipse cx="560" cy="250" rx="160" ry="45" fill="#c7a3b8" opacity="0.7" />
      </g>

      {/* far and mid mountains */}
      <path
        d="M0 610 L120 520 L210 560 L330 450 L440 540 L560 470 L700 560 L820 500 L930 560 L1060 440 L1180 530 L1300 470 L1450 560 L1600 500 L1600 700 L0 700 Z"
        fill="url(#ls-far)"
        opacity="0.85"
      />
      <path
        d="M0 660 L140 590 L260 640 L400 560 L520 640 L640 600 L760 660 L900 590 L1040 650 L1180 580 L1320 650 L1470 600 L1600 650 L1600 760 L0 760 Z"
        fill="url(#ls-mid)"
      />
      <ellipse
        cx="800"
        cy="690"
        rx="900"
        ry="40"
        fill="#f6e6de"
        opacity="0.45"
        filter="url(#ls-blur)"
      />

      {/* castle hill */}
      <path
        d="M520 760 C620 640 700 610 800 600 C920 590 1010 620 1120 700 L1180 760 Z"
        fill="url(#ls-hill)"
      />
      <path
        d="M980 640 C1040 630 1100 660 1130 720 L1140 800 L1020 800 C1010 740 990 690 980 640 Z"
        fill="url(#ls-cliff)"
      />
      <g>
        <rect x="690" y="560" width="300" height="50" fill="url(#ls-wall)" />
        <path d="M690 560 L700 550 L980 550 L990 560 Z" fill="#b9b0a2" />
        <Tower x={700} base={600} w={44} h={110} roof={60} />
        <Tower x={770} base={580} w={60} h={190} roof={95} />
        <Tower x={860} base={585} w={52} h={150} roof={80} />
        <Tower x={930} base={600} w={40} h={95} roof={55} />
        <Tower x={820} base={560} w={30} h={210} roof={70} />
      </g>

      {/* village */}
      <path d="M1180 760 C1260 720 1380 700 1600 710 L1600 800 L1180 800 Z" fill="#7f9550" />
      <House x={1260} y={735} s={1.1} />
      <House x={1320} y={728} s={1.25} />
      <House x={1405} y={722} s={1.05} />
      <House x={1470} y={726} s={1.2} />
      <path d="M0 740 C150 700 300 700 460 735 L520 790 L0 800 Z" fill="#738a48" />
      <g opacity="0.75">
        <rect x="140" y="660" width="44" height="60" fill="#8c8a84" />
        <rect x="150" y="640" width="14" height="22" fill="#8c8a84" />
        <rect x="196" y="680" width="30" height="40" fill="#8c8a84" />
      </g>

      {/* mist */}
      <g filter="url(#ls-blur)" opacity="0.55">
        <ellipse cx="300" cy="780" rx="360" ry="40" fill="#fff" />
        <ellipse cx="1200" cy="790" rx="420" ry="36" fill="#fff" />
      </g>

      {/* near hills and pines */}
      <path
        d="M0 830 C220 770 420 780 640 830 C860 880 1100 800 1600 820 L1600 1000 L0 1000 Z"
        fill="url(#ls-near)"
      />
      <path
        d="M560 1000 C640 920 720 870 800 850 C880 870 960 920 1040 1000 Z"
        fill="#c9b48a"
        opacity="0.55"
      />
      <g>
        {[30, 70, 110, 160, 1460, 1500, 1545, 1585].map((x, i) => (
          <Pine key={i} x={x} y={880 + (i % 3) * 18} s={1.6 + (i % 2) * 0.4} c="#2f4527" />
        ))}
        {[230, 290, 1360, 1410].map((x, i) => (
          <Pine key={`m${i}`} x={x} y={840 + (i % 2) * 12} s={1.1} c="#3d5832" />
        ))}
      </g>
      <rect
        y="900"
        width="1600"
        height="100"
        fill="#1b2416"
        opacity="0.35"
        filter="url(#ls-soft)"
      />
    </svg>
  );
}
