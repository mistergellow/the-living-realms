import './avatar.css';

/*
 * Enemy art (PROVISIONAL, original placeholders), facing left toward the party.
 * viewBox 0 0 120 160, feet at y≈150 like CharacterAvatar.
 */

function Husk() {
  return (
    <>
      <path d="M36 150 L42 104 C40 80 56 66 72 70 C90 74 92 98 86 112 L90 150 Z" fill="#5d6470" />
      <path d="M40 104 C30 112 24 122 22 132 L30 134 C34 124 40 118 46 114 Z" fill="#4a505b" />
      <path
        d="M22 132 L14 138 M22 132 L16 128 M22 132 L18 142"
        stroke="#c9d3e0"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="58" cy="62" r="22" fill="#6b7280" />
      <path d="M40 54 C46 42 70 40 78 52" stroke="#4a505b" strokeWidth="5" fill="none" />
      <circle cx="50" cy="64" r="4" fill="#6ff5ff" className="av-glow" />
      <circle cx="64" cy="64" r="4" fill="#6ff5ff" className="av-glow" />
      <path d="M48 76 L54 74 L58 78 L62 74 L66 76" stroke="#2d3138" strokeWidth="2" fill="none" />
    </>
  );
}

function Spitter() {
  return (
    <>
      <path d="M28 146 C20 110 40 84 62 84 C86 84 102 110 94 146 Z" fill="#7d4fb3" />
      <path
        d="M44 88 L38 60 L54 84 M64 84 L66 52 L74 86 M84 96 L100 74 L90 102"
        fill="#b28df0"
        stroke="#e2d4ff"
        strokeWidth="1.5"
      />
      <ellipse cx="46" cy="116" rx="11" ry="9" fill="#2a1840" />
      <ellipse cx="46" cy="116" rx="6" ry="5" fill="#f2a0ff" className="av-glow" />
      <circle cx="60" cy="102" r="4" fill="#fff" />
      <circle cx="74" cy="104" r="4" fill="#fff" />
      <circle cx="59" cy="103" r="2" fill="#1d1028" />
      <circle cx="73" cy="105" r="2" fill="#1d1028" />
    </>
  );
}

function Hound() {
  return (
    <>
      <path
        d="M30 116 C34 98 58 92 82 98 C98 102 104 116 100 126 L96 150 L88 150 L86 130 L50 132 L48 150 L40 150 L38 130 C32 128 28 124 30 116 Z"
        fill="#2f2a3a"
      />
      <path d="M30 116 C20 112 12 104 14 96 C22 92 30 94 36 102 Z" fill="#3a3448" />
      <path d="M14 96 L8 92 L16 90 Z M24 94 L22 84 L30 92 Z" fill="#3a3448" />
      <circle cx="22" cy="100" r="2.6" fill="#ff7a59" className="av-glow" />
      <path d="M12 104 L18 106 L14 108" stroke="#e8e2d0" strokeWidth="1.5" fill="none" />
      <path
        d="M100 112 C110 104 114 96 112 88"
        stroke="#2f2a3a"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
      />
    </>
  );
}

function Warden() {
  return (
    <>
      <path d="M22 150 L28 96 C30 70 48 56 62 56 C80 56 98 70 100 96 L106 150 Z" fill="#3c4458" />
      <path d="M20 96 C8 104 6 124 10 140 L24 138 C22 124 26 112 32 106 Z" fill="#2e3546" />
      <path d="M100 96 C112 104 116 122 112 140 L98 138 C100 124 96 112 92 106 Z" fill="#2e3546" />
      <path
        d="M50 92 L62 74 L74 92 L62 118 Z"
        fill="#7fd3ff"
        stroke="#d6f3ff"
        strokeWidth="2"
        className="av-glow"
      />
      <path d="M38 40 C42 18 82 18 86 40 L82 58 L42 58 Z" fill="#4c5670" />
      <rect x="46" y="42" width="32" height="6" rx="3" fill="#7fd3ff" className="av-glow" />
      <path
        d="M38 40 L30 24 L44 34 M86 40 L94 24 L80 34"
        fill="#7fd3ff"
        stroke="#d6f3ff"
        strokeWidth="1.5"
      />
    </>
  );
}

/* ---- request #44: new enemies (PROVISIONAL art) ---- */
function Bulwark() {
  return (
    <>
      <path d="M30 150 L34 92 C36 74 50 66 64 66 C80 66 92 76 92 94 L96 150 Z" fill="#4b5263" />
      <rect
        x="14"
        y="78"
        width="40"
        height="66"
        rx="6"
        fill="#6b7590"
        stroke="#c3ccdf"
        strokeWidth="3"
      />
      <path d="M34 90 L34 132 M20 110 L48 110" stroke="#c3ccdf" strokeWidth="3" />
      <circle cx="66" cy="54" r="16" fill="#5b6376" />
      <rect x="56" y="50" width="20" height="5" rx="2" fill="#7fd3ff" className="av-glow" />
    </>
  );
}

function Leech() {
  return (
    <>
      <path
        d="M20 140 C20 110 40 92 64 92 C92 92 108 112 104 140 C96 150 30 152 20 140 Z"
        fill="#7a2b3c"
      />
      <path
        d="M26 124 C34 118 44 118 52 124 M60 120 C70 114 82 114 92 120"
        stroke="#a84a5e"
        strokeWidth="3"
        fill="none"
      />
      <circle cx="24" cy="112" r="14" fill="#8e3448" />
      <circle cx="20" cy="112" r="8" fill="#2a0c12" />
      <path
        d="M14 106 L18 110 M14 118 L18 114 M26 104 L22 108 M26 120 L22 116"
        stroke="#ffd0d6"
        strokeWidth="2"
      />
    </>
  );
}

function Thornback() {
  return (
    <>
      <path d="M22 148 C18 112 40 88 66 88 C92 88 106 112 102 148 Z" fill="#3f5a2c" />
      <path
        d="M30 100 L22 80 L40 96 M46 90 L44 66 L58 88 M66 88 L72 62 L78 90 M86 96 L102 78 L94 104 M98 116 L114 108 L102 124"
        fill="#8fd16a"
        stroke="#cdf0b0"
        strokeWidth="1.5"
      />
      <circle cx="34" cy="122" r="4" fill="#ffd166" className="av-glow" />
      <circle cx="48" cy="124" r="4" fill="#ffd166" className="av-glow" />
    </>
  );
}

function Shaman() {
  return (
    <>
      <path d="M34 150 L44 90 C46 74 56 66 64 66 C74 66 82 74 84 90 L94 150 Z" fill="#2c2148" />
      <path d="M44 90 L64 150 L84 90" fill="#3b2b66" />
      <circle cx="64" cy="56" r="16" fill="#3b2b66" />
      <path d="M48 48 C52 30 76 30 80 48" fill="#2c2148" />
      <circle cx="58" cy="58" r="3" fill="#c77dff" className="av-glow" />
      <circle cx="70" cy="58" r="3" fill="#c77dff" className="av-glow" />
      <path d="M20 150 L28 54" stroke="#6b4f2a" strokeWidth="4" strokeLinecap="round" />
      <circle cx="28" cy="48" r="9" fill="#d06bff" className="av-glow" />
    </>
  );
}

function BroodMother() {
  return (
    <>
      <ellipse cx="66" cy="118" rx="44" ry="32" fill="#5a4a2a" />
      <ellipse cx="74" cy="122" rx="24" ry="18" fill="#8a7240" />
      <circle cx="68" cy="116" r="6" fill="#f0c674" className="av-glow" />
      <circle cx="86" cy="126" r="5" fill="#f0c674" className="av-glow" />
      <circle cx="26" cy="98" r="16" fill="#4a3c22" />
      <circle cx="20" cy="94" r="3" fill="#ff7a59" className="av-glow" />
      <circle cx="28" cy="92" r="3" fill="#ff7a59" className="av-glow" />
      <path
        d="M34 142 L28 154 M52 148 L50 156 M84 148 L88 156 M100 140 L108 150"
        stroke="#3a2e18"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </>
  );
}

function Mite() {
  return (
    <>
      <ellipse cx="60" cy="132" rx="22" ry="16" fill="#4a1f1f" />
      <ellipse cx="60" cy="128" rx="12" ry="9" fill="#ff5d5d" className="av-glow" />
      <path d="M60 112 C60 102 66 98 72 96" stroke="#c9b98a" strokeWidth="2.5" fill="none" />
      <circle cx="74" cy="95" r="3" fill="#ffd166" className="av-glow" />
      <path
        d="M40 140 L32 148 M48 146 L44 154 M72 146 L76 154 M80 140 L88 148"
        stroke="#2a0f0f"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="44" cy="126" r="2.5" fill="#fff" />
    </>
  );
}

function Stalker() {
  return (
    <g opacity="0.85">
      <path d="M40 150 C36 120 40 90 56 72 C72 90 80 120 76 150 Z" fill="#1d2a3a" />
      <path d="M56 72 C46 60 48 42 60 36 C72 42 74 60 64 72 Z" fill="#26384e" />
      <path
        d="M54 52 L58 54 M64 54 L68 52"
        stroke="#bfe8ff"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="av-glow"
      />
      <path
        d="M36 100 L14 84 M78 100 L100 86"
        stroke="#26384e"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path d="M14 84 L6 80 M100 86 L110 82" stroke="#bfe8ff" strokeWidth="2" />
    </g>
  );
}

function Zealot() {
  return (
    <>
      <path d="M36 150 L42 92 C44 76 54 68 64 68 C74 68 84 76 86 92 L92 150 Z" fill="#5c1a1a" />
      <path
        d="M50 92 L64 120 L78 92"
        stroke="#d06bff"
        strokeWidth="3"
        fill="none"
        className="av-glow"
      />
      <circle cx="64" cy="56" r="15" fill="#3a1010" />
      <path d="M48 44 L64 26 L80 44" fill="#5c1a1a" />
      <circle cx="64" cy="58" r="4" fill="#d06bff" className="av-glow" />
      <path d="M90 96 L104 78" stroke="#c9b98a" strokeWidth="4" strokeLinecap="round" />
    </>
  );
}

function Colossus() {
  return (
    <>
      <path d="M14 150 L22 74 C26 40 46 24 62 24 C80 24 100 40 104 74 L110 150 Z" fill="#4a4a52" />
      <path
        d="M40 60 L52 90 L44 120 M84 60 L74 92 L82 124"
        stroke="#ff4d4d"
        strokeWidth="3"
        fill="none"
        className="av-glow"
      />
      <circle cx="50" cy="48" r="5" fill="#ff4d4d" className="av-glow" />
      <circle cx="74" cy="48" r="5" fill="#ff4d4d" className="av-glow" />
      <path
        d="M14 96 C2 110 2 134 8 148 L24 146 M106 96 C118 110 118 134 112 148 L96 146"
        fill="#3a3a42"
      />
    </>
  );
}

const ART: Record<string, () => React.JSX.Element> = {
  rift_husk: Husk,
  shard_spitter: Spitter,
  hollow_hound: Hound,
  rift_warden: Warden,
  rift_bulwark: Bulwark,
  rift_leech: Leech,
  thornback: Thornback,
  void_shaman: Shaman,
  brood_mother: BroodMother,
  volatile_mite: Mite,
  phase_stalker: Stalker,
  rift_zealot: Zealot,
  hollow_colossus: Colossus,
};

export function EnemyAvatar({
  enemyDefId,
  size = 160,
  title,
  className,
  shadow = true,
  inSvg = false,
}: {
  enemyDefId: string | null;
  /** Height in reference px; rendered in rem (see CharacterAvatar). */
  size?: number;
  /** Ground shadow (the canvas renderer draws its own). */
  shadow?: boolean;
  inSvg?: boolean;
  title?: string;
  className?: string;
}) {
  const Art = (enemyDefId && ART[enemyDefId]) || Husk;
  return (
    <svg
      className={['avatar', 'is-animated', 'is-enemy', className].filter(Boolean).join(' ')}
      width={(size * 3) / 4}
      height={size}
      style={inSvg ? undefined : { width: `${(size * 3) / 4 / 16}rem`, height: `${size / 16}rem` }}
      viewBox="0 0 120 160"
      role="img"
      aria-label={title ?? 'Enemy'}
    >
      {title && <title>{title}</title>}
      {shadow && <ellipse cx="60" cy="151" rx="34" ry="6" fill="rgba(0,0,0,0.4)" />}
      <g className="av-root">
        <Art />
      </g>
    </svg>
  );
}
