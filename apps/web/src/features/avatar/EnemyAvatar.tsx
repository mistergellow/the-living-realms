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

const ART: Record<string, () => React.JSX.Element> = {
  rift_husk: Husk,
  shard_spitter: Spitter,
  hollow_hound: Hound,
  rift_warden: Warden,
};

export function EnemyAvatar({
  enemyDefId,
  size = 160,
  title,
  className,
  inSvg = false,
}: {
  enemyDefId: string | null;
  /** Height in reference px; rendered in rem (see CharacterAvatar). */
  size?: number;
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
      <ellipse cx="60" cy="151" rx="34" ry="6" fill="rgba(0,0,0,0.4)" />
      <g className="av-root">
        <Art />
      </g>
    </svg>
  );
}
