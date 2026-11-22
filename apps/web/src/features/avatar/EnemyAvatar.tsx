import './avatar.css';

/*
 * Enemy art (PROVISIONAL, original placeholders), facing left toward the party.
 * Request #69: gothic ink style to match the heroes (heavy outline, hard
 * shadows, muted flesh, iron and bone, sickly glows).
 * viewBox 0 0 120 160, feet at y≈150 like CharacterAvatar. The outline comes
 * from the root group (stroke INK); shapes that must not be outlined say
 * stroke="none".
 */

const INK = '#050403';
const FLESH = '#8a836e';
const FLESH_DARK = '#5e5848';
const BONE = '#c4b99c';
const ROT = '#4d553b';
const BLOOD = '#6e1a14';
const IRON = '#3b3833';
const IRON_HI = '#5a554c';
const GLOW = '#9fd0c4';
const VOID = '#7d64a8';
const EMBER = '#d0612f';

/** Glowing eyes: a soft halo and a hard core. */
function Eyes({
  pts,
  c = GLOW,
  r = 1.8,
}: {
  pts: Array<[number, number]>;
  c?: string;
  r?: number;
}) {
  return (
    <g className="av-glow" stroke="none">
      {pts.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r={r * 2.4} fill={c} opacity="0.25" />
          <circle cx={x} cy={y} r={r} fill={c} />
        </g>
      ))}
    </g>
  );
}

/** Rift Husk: a gaunt, hunched corpse dragging one claw. */
function Husk() {
  return (
    <>
      <path d="M58 150 L62 116 L72 116 L76 150 Z" fill={FLESH_DARK} />
      <path d="M46 150 L52 114 L60 116 L56 150 Z" fill={FLESH_DARK} />
      <path d="M44 118 C40 96 46 74 64 66 C80 62 90 74 86 94 L80 120 Z" fill={FLESH} />
      <path
        d="M70 70 C82 70 88 80 84 96 L79 120 L70 120 Z"
        fill={INK}
        opacity="0.3"
        stroke="none"
      />
      <path
        d="M52 84 L68 82 M51 92 L68 90 M52 100 L68 98"
        stroke={FLESH_DARK}
        strokeWidth="2"
        fill="none"
      />
      <path d="M44 120 L82 120 L80 128 L46 128 Z" fill={BLOOD} />
      <path d="M50 76 C40 86 32 100 28 118 L34 121 C38 106 46 94 56 86 Z" fill={FLESH} />
      <path
        d="M28 118 L18 126 M29 120 L22 132 M32 121 L30 134"
        stroke={BONE}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path d="M44 58 C42 44 54 36 62 40 C70 44 70 58 62 66 C56 70 46 68 44 58 Z" fill={FLESH} />
      <path d="M44 56 C48 50 56 50 60 54 L58 60 L46 62 Z" fill={INK} stroke="none" opacity="0.8" />
      <Eyes
        pts={[
          [49, 57],
          [56, 57],
        ]}
        r={1.4}
      />
      <path d="M47 64 L50 66 L53 64 L56 66 L59 64" stroke={INK} strokeWidth="1.4" fill="none" />
    </>
  );
}

/** Shard Spitter: a bloated sac pierced by crystal, a lamprey mouth. */
function Spitter() {
  return (
    <>
      <path d="M26 148 C18 112 38 86 62 86 C88 86 104 112 96 148 Z" fill="#5c4a5e" />
      <path
        d="M70 90 C90 94 102 116 96 148 L78 148 C84 122 80 102 70 90 Z"
        fill={INK}
        opacity="0.3"
        stroke="none"
      />
      <path
        d="M44 90 L36 58 L54 86 Z M62 86 L66 48 L74 88 Z M84 98 L102 72 L92 106 Z"
        fill={VOID}
      />
      <path
        d="M40 66 L46 86 M66 54 L68 84"
        stroke="#c9b8e8"
        strokeWidth="1"
        opacity="0.7"
        fill="none"
      />
      <path d="M58 112 C66 108 76 110 78 120" stroke={FLESH_DARK} strokeWidth="2" fill="none" />
      <circle cx="40" cy="116" r="12" fill={INK} />
      <circle cx="40" cy="116" r="7" fill={BLOOD} stroke="none" />
      <path
        d="M33 110 L36 113 M40 106 L40 110 M47 110 L44 113 M33 122 L36 119 M47 122 L44 119 M40 126 L40 122"
        stroke={BONE}
        strokeWidth="1.6"
      />
      <Eyes
        pts={[
          [56, 100],
          [64, 98],
          [70, 102],
        ]}
        c={VOID}
        r={1.4}
      />
    </>
  );
}

/** Hollow Hound: a starved hound, spine showing. */
function Hound() {
  return (
    <>
      <path
        d="M44 126 L40 150 L47 150 L52 128 Z M86 124 L92 150 L99 150 L94 122 Z"
        fill="#2a2622"
      />
      <path
        d="M30 114 C36 100 58 96 80 100 C96 103 104 112 100 124 L56 130 C44 130 34 124 30 114 Z"
        fill="#3e3933"
      />
      <path
        d="M40 102 L46 96 L52 101 L58 95 L64 100 L70 95 L76 100 L82 96 L88 102"
        stroke={BONE}
        strokeWidth="1.6"
        fill="none"
      />
      <path
        d="M48 112 L50 122 M56 112 L58 124 M64 112 L65 124"
        stroke="#2a2622"
        strokeWidth="1.6"
        fill="none"
      />
      <path
        d="M58 128 L54 150 L61 150 L66 128 Z M80 126 L84 150 L91 150 L88 124 Z"
        fill="#3e3933"
      />
      <path d="M32 112 C22 110 12 104 10 96 C18 90 28 92 36 100 Z" fill="#3e3933" />
      <path d="M12 96 L4 92 L14 90 Z M24 94 L22 82 L31 92 Z" fill="#2a2622" />
      <path d="M8 100 L22 102 L10 104" fill={BONE} strokeWidth="1" />
      <Eyes pts={[[20, 96]]} c={EMBER} r={1.6} />
      <path
        d="M100 114 C110 108 114 98 110 88"
        stroke="#3e3933"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />
    </>
  );
}

/** Rift Warden: a horned knight with a rift crystal burning in its chest. */
function Warden() {
  return (
    <>
      <path d="M46 150 L50 112 L60 112 L58 150 Z M64 150 L64 112 L74 112 L78 150 Z" fill={IRON} />
      <path d="M38 116 C34 88 40 66 60 62 C80 66 88 88 84 116 Z" fill={IRON_HI} />
      <path d="M62 62 C80 66 88 88 84 116 L66 116 Z" fill={INK} opacity="0.35" stroke="none" />
      <path d="M60 76 L68 90 L60 106 L52 90 Z" fill={GLOW} className="av-glow" />
      <path d="M60 82 L64 90 L60 100 L56 90 Z" fill="#e8f4ee" stroke="none" className="av-glow" />
      <path d="M38 70 C26 74 22 92 26 112 L34 112 C32 96 36 84 44 78 Z" fill={IRON} />
      <path d="M82 70 C94 74 98 92 94 112 L86 112 C88 96 84 84 76 78 Z" fill={IRON} />
      <path d="M20 112 L36 112 L36 120 L20 120 Z" fill={IRON_HI} />
      <path d="M26 112 L22 60 L30 112 Z" fill={BONE} />
      <path d="M46 40 C46 28 74 28 74 40 L74 58 L46 58 Z" fill={IRON_HI} />
      <path
        d="M46 36 C38 32 34 24 36 16 C40 26 44 28 48 30 Z M74 36 C82 32 86 24 84 16 C80 26 76 28 72 30 Z"
        fill={BONE}
      />
      <rect x="49" y="44" width="22" height="4" fill={INK} />
      <Eyes
        pts={[
          [54, 46],
          [64, 46],
        ]}
        r={1.2}
      />
    </>
  );
}

/** Rift Bulwark: a hulk behind a tower shield. */
function Bulwark() {
  return (
    <>
      <path d="M50 150 L52 116 L64 116 L62 150 Z M70 150 L68 116 L80 116 L84 150 Z" fill={IRON} />
      <path d="M44 118 C42 86 52 64 72 62 C92 64 98 88 94 118 Z" fill={FLESH_DARK} />
      <path d="M58 44 C58 32 82 32 82 44 L82 62 L58 62 Z" fill={IRON} />
      <path d="M60 50 L80 50" stroke={INK} strokeWidth="3" />
      <Eyes
        pts={[
          [64, 50],
          [72, 50],
        ]}
        c={EMBER}
        r={1.1}
      />
      <path d="M18 66 L50 60 L52 138 L20 144 Z" fill={IRON_HI} />
      <path d="M22 70 L46 66 L48 134 L24 139 Z" fill="none" stroke={IRON} strokeWidth="2" />
      <path d="M35 74 L36 132 M24 100 L48 97" stroke={BLOOD} strokeWidth="4" />
      <circle cx="35" cy="100" r="3" fill={BONE} strokeWidth="1" />
    </>
  );
}

/** Rift Leech: a swollen, ringed worm with a round maw. */
function Leech() {
  return (
    <>
      <path
        d="M24 130 C24 104 50 92 76 98 C100 104 110 124 104 146 L32 148 C26 144 24 138 24 130 Z"
        fill="#4a2c2a"
      />
      <path
        d="M44 100 C40 116 40 134 44 148 M62 96 C58 114 58 132 62 148 M80 100 C78 116 78 132 82 148"
        stroke="#2e1a19"
        strokeWidth="2.2"
        fill="none"
      />
      <path
        d="M80 100 C98 106 108 124 104 146 L86 146 C90 128 88 112 80 100 Z"
        fill={INK}
        opacity="0.3"
        stroke="none"
      />
      <circle cx="28" cy="124" r="14" fill={BLOOD} />
      <circle cx="28" cy="124" r="8" fill={INK} stroke="none" />
      <path
        d="M20 116 L24 120 M28 112 L28 117 M36 116 L32 120 M20 132 L24 128 M36 132 L32 128 M28 136 L28 131 M18 124 L23 124 M38 124 L33 124"
        stroke={BONE}
        strokeWidth="1.6"
      />
    </>
  );
}

/** Thornback: a hunched brute grown over with thorns. */
function Thornback() {
  return (
    <>
      <path d="M36 150 L40 124 L50 124 L48 150 Z M80 150 L78 124 L90 124 L92 150 Z" fill={ROT} />
      <path d="M24 126 C22 100 46 82 72 84 C98 86 108 106 102 128 Z" fill="#5d6648" />
      <path
        d="M74 86 C98 88 108 106 102 128 L84 128 C88 110 84 96 74 86 Z"
        fill={INK}
        opacity="0.3"
        stroke="none"
      />
      <path
        d="M38 94 L34 72 L46 90 Z M52 86 L52 62 L60 85 Z M66 84 L72 60 L74 86 Z M80 88 L90 68 L86 92 Z M92 96 L104 80 L98 102 Z"
        fill={BONE}
      />
      <path d="M26 118 C16 116 12 106 16 98 C24 96 32 102 34 110 Z" fill="#5d6648" />
      <path d="M14 108 L8 112 L16 112 Z" fill={BONE} />
      <Eyes pts={[[22, 104]]} c={EMBER} r={1.5} />
    </>
  );
}

/** Void Shaman: a hooded, faceless caster with an eye-topped staff. */
function Shaman() {
  return (
    <>
      <path d="M42 150 C42 118 46 90 60 74 C76 90 82 118 82 150 Z" fill="#2c2433" />
      <path
        d="M62 76 C76 92 82 118 82 150 L68 150 C70 120 68 96 62 76 Z"
        fill={INK}
        opacity="0.35"
        stroke="none"
      />
      <path d="M50 98 L60 120 L70 98" stroke={VOID} strokeWidth="1.6" fill="none" />
      <path d="M44 62 C44 42 76 42 76 62 L74 78 C68 82 52 82 46 78 Z" fill="#2c2433" />
      <path d="M50 64 C50 54 70 54 70 64 L68 76 L52 76 Z" fill={INK} />
      <Eyes
        pts={[
          [56, 68],
          [64, 68],
        ]}
        c={VOID}
        r={1.3}
      />
      <path d="M34 150 L38 52" stroke="#3a2a1b" strokeWidth="3.5" />
      <path d="M48 104 C42 104 38 100 37 96" stroke="#2c2433" strokeWidth="5" fill="none" />
      <circle cx="38" cy="46" r="7" fill={BONE} />
      <circle cx="38" cy="46" r="3" fill={VOID} stroke="none" className="av-glow" />
      <circle cx="38" cy="46" r="11" fill={VOID} opacity="0.2" stroke="none" className="av-glow" />
    </>
  );
}

/** Brood Mother: an egg-heavy sac on spider legs. */
function BroodMother() {
  return (
    <>
      <path
        d="M30 120 L14 150 M38 124 L28 150 M84 124 L96 150 M90 118 L108 150 M34 112 L10 120 M88 110 L110 116"
        stroke={INK}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M30 120 L14 150 M38 124 L28 150 M84 124 L96 150 M90 118 L108 150"
        stroke="#3a2c22"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <ellipse cx="62" cy="110" rx="34" ry="24" fill="#4f3b2c" />
      <path
        d="M70 88 C92 92 100 110 92 126 C84 130 76 132 66 132 C80 120 82 102 70 88 Z"
        fill={INK}
        opacity="0.3"
        stroke="none"
      />
      <circle cx="54" cy="112" r="6" fill={BONE} />
      <circle cx="68" cy="118" r="5" fill={BONE} />
      <circle cx="64" cy="104" r="4" fill={BONE} />
      <circle cx="30" cy="102" r="11" fill="#3a2c22" />
      <Eyes
        pts={[
          [24, 99],
          [28, 104],
          [32, 99],
        ]}
        c={EMBER}
        r={1.1}
      />
    </>
  );
}

/** Volatile Mite: a little tick with a burning fuse. */
function Mite() {
  return (
    <>
      <path
        d="M42 136 L34 150 M52 140 L48 150 M72 140 L76 150 M80 136 L88 150"
        stroke={INK}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <ellipse cx="62" cy="128" rx="24" ry="14" fill={BLOOD} />
      <path d="M50 118 C60 114 72 116 78 122" stroke="#a8301f" strokeWidth="2" fill="none" />
      <circle cx="40" cy="126" r="7" fill="#3a2c22" />
      <Eyes pts={[[37, 124]]} c={EMBER} r={1.2} />
      <path d="M70 116 C72 104 80 98 88 96" stroke={IRON_HI} strokeWidth="2" fill="none" />
      <circle cx="88" cy="96" r="3" fill="#f0c06a" stroke="none" className="av-glow" />
      <circle cx="88" cy="96" r="7" fill={EMBER} opacity="0.35" stroke="none" className="av-glow" />
    </>
  );
}

/** Phase Stalker: a tall shadow with blade arms. */
function Stalker() {
  return (
    <>
      <path d="M52 150 L56 108 L64 108 L68 150 Z" fill="#14161a" />
      <path d="M48 112 C46 88 52 66 60 60 C68 66 74 88 72 112 Z" fill="#1d2127" />
      <path
        d="M50 76 L28 98 L12 96"
        stroke="#1d2127"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M12 96 L-2 88 L14 92 Z" fill={BONE} strokeWidth="1" />
      <path
        d="M70 76 L90 94 L104 88"
        stroke="#1d2127"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M104 88 L118 80 L104 92 Z" fill={BONE} strokeWidth="1" />
      <path d="M52 52 C52 36 68 36 68 52 C68 60 64 64 60 64 C56 64 52 60 52 52 Z" fill="#1d2127" />
      <Eyes
        pts={[
          [56, 52],
          [63, 52],
        ]}
        r={1.2}
      />
      <path
        d="M40 120 C50 112 70 112 80 120"
        stroke={GLOW}
        strokeWidth="1"
        opacity="0.4"
        fill="none"
      />
    </>
  );
}

/** Rift Zealot: a cultist in a red robe and pointed hood. */
function Zealot() {
  return (
    <>
      <path d="M40 150 C42 118 48 92 60 80 C72 92 78 118 80 150 Z" fill={BLOOD} />
      <path
        d="M62 82 C72 94 78 118 80 150 L68 150 C70 122 68 98 62 82 Z"
        fill={INK}
        opacity="0.35"
        stroke="none"
      />
      <path d="M50 104 L60 124 L70 104" stroke="#d6a24a" strokeWidth="1.6" fill="none" />
      <path d="M46 78 L60 38 L74 78 C68 82 52 82 46 78 Z" fill={BLOOD} />
      <path d="M53 70 C53 62 67 62 67 70 L66 78 L54 78 Z" fill={INK} />
      <Eyes
        pts={[
          [57, 72],
          [63, 72],
        ]}
        c={EMBER}
        r={1.1}
      />
      <path
        d="M46 96 C38 100 34 106 32 114"
        stroke={BLOOD}
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M32 114 L26 96 L30 96 L34 112 Z" fill={BONE} strokeWidth="1" />
    </>
  );
}

/** The Hollow Colossus (world boss): a huge hollow giant, cracks full of light. */
function Colossus() {
  return (
    <>
      <path d="M30 150 L34 108 L54 108 L52 150 Z M68 150 L66 108 L86 108 L92 150 Z" fill={IRON} />
      <path d="M18 112 C12 66 30 30 60 26 C92 30 108 66 102 112 Z" fill="#45413a" />
      <path
        d="M62 26 C92 30 108 66 102 112 L80 112 C88 76 80 44 62 26 Z"
        fill={INK}
        opacity="0.35"
        stroke="none"
      />
      <path
        d="M44 44 L52 64 L46 80 L56 100 M76 48 L68 66 L76 84 L66 104"
        stroke={EMBER}
        strokeWidth="2.5"
        fill="none"
        className="av-glow"
      />
      <path
        d="M44 44 L52 64 L46 80 L56 100 M76 48 L68 66 L76 84 L66 104"
        stroke="#f0c06a"
        strokeWidth="0.8"
        fill="none"
        className="av-glow"
      />
      <path d="M18 70 C4 80 2 104 8 124 L20 122 C16 104 18 90 26 82 Z" fill="#45413a" />
      <path d="M102 70 C116 80 118 104 112 124 L100 122 C104 104 102 90 94 82 Z" fill="#45413a" />
      <path d="M44 36 L54 36 L52 42 L44 42 Z M66 36 L76 36 L76 42 L68 42 Z" fill={INK} />
      <Eyes
        pts={[
          [49, 39],
          [71, 39],
        ]}
        c={EMBER}
        r={1.8}
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
      {shadow && <ellipse cx="60" cy="151" rx="34" ry="5" fill="rgba(0,0,0,0.6)" />}
      <g className="av-root" stroke={INK} strokeWidth="2" strokeLinejoin="round">
        <Art />
      </g>
    </svg>
  );
}
