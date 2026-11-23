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

// ---- request #71: the Rift themes (PROVISIONAL art) ----
const SEA = '#2c4448';
const SEA_HI = '#46676a';
const CRYSTAL = '#7f97a6';
const CRYSTAL_HI = '#b8cad3';
const CLOTH = '#3a1512';

/** Grave Crawler: a corpse on all fours, reaching for your back line. */
function Crawler() {
  return (
    <>
      <path
        d="M30 140 C34 120 52 112 74 114 C92 116 102 126 100 140 L92 150 L84 150 L86 138 L62 138 L56 150 L48 150 L50 138 C40 140 34 142 30 140 Z"
        fill={FLESH}
      />
      <path
        d="M40 126 L20 128 L8 140 M38 132 L22 142 L14 150"
        stroke={FLESH_DARK}
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M8 140 L2 136 M8 140 L3 144 M14 150 L8 150" stroke={BONE} strokeWidth="1.6" />
      <path
        d="M58 118 L60 126 M68 116 L70 126 M78 118 L78 128"
        stroke={FLESH_DARK}
        strokeWidth="1.6"
      />
      <path d="M26 122 C22 110 34 104 42 110 C46 116 42 126 34 128 Z" fill={FLESH} />
      <Eyes pts={[[30, 116]]} r={1.4} />
    </>
  );
}

/** Bone Archer: a skeleton with a bow. */
function BoneArcher() {
  return (
    <>
      <path
        d="M54 150 L56 110 M68 150 L64 110"
        stroke={BONE}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path d="M50 112 L72 112 L70 74 L54 74 Z" fill={INK} />
      <path d="M52 80 H70 M52 88 H70 M52 96 H70 M53 104 H69" stroke={BONE} strokeWidth="2" />
      <path
        d="M54 78 L36 96 L28 92"
        stroke={BONE}
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M26 60 C14 80 14 106 26 126" stroke="#523620" strokeWidth="4" fill="none" />
      <path d="M26 60 L26 126" stroke="#cfc6ad" strokeWidth="1" />
      <circle cx="62" cy="62" r="11" fill={BONE} />
      <path d="M55 60 h5 v4 h-5 Z M64 60 h5 v4 h-5 Z M58 70 h8" fill={INK} stroke="none" />
      <Eyes
        pts={[
          [57, 62],
          [66, 62],
        ]}
        c={EMBER}
        r={1}
      />
    </>
  );
}

/** Husk Abomination (mini-boss): stitched, bloated, huge. */
function Abomination() {
  return (
    <>
      <path
        d="M30 150 L36 120 L52 122 L48 150 Z M74 150 L72 122 L90 120 L96 150 Z"
        fill={FLESH_DARK}
      />
      <path d="M14 124 C8 80 30 44 64 42 C98 44 116 80 108 124 Z" fill={FLESH} />
      <path
        d="M66 44 C98 46 116 80 108 124 L86 124 C94 92 86 60 66 44 Z"
        fill={INK}
        opacity="0.3"
        stroke="none"
      />
      <path
        d="M40 70 L44 110 M40 80 L48 78 M41 92 L49 90 M42 104 L50 102"
        stroke={BLOOD}
        strokeWidth="2"
        fill="none"
      />
      <path d="M14 90 C2 98 -2 116 4 130 L16 128 C14 116 16 106 22 100 Z" fill={FLESH} />
      <path
        d="M2 130 L-4 140 M6 132 L4 142"
        stroke={BONE}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="46" cy="40" r="12" fill={FLESH} />
      <Eyes pts={[[42, 40]]} c={EMBER} r={1.8} />
      <path d="M38 48 L42 50 L46 48" stroke={INK} strokeWidth="1.4" fill="none" />
    </>
  );
}

/** Prism Sentinel: a crystal obelisk with one eye. */
function PrismSentinel() {
  return (
    <>
      <path d="M60 30 L82 70 L76 150 L44 150 L38 70 Z" fill={CRYSTAL} />
      <path d="M60 30 L82 70 L76 150 L62 150 Z" fill={INK} opacity="0.3" stroke="none" />
      <path
        d="M60 30 L60 150 M38 70 L82 70 M42 110 L78 110"
        stroke={CRYSTAL_HI}
        strokeWidth="1"
        opacity="0.6"
      />
      <circle cx="58" cy="82" r="8" fill={INK} />
      <Eyes pts={[[57, 82]]} c={CRYSTAL_HI} r={2.6} />
    </>
  );
}

/** Geode Crusher: a rock brute with crystal fists. */
function GeodeCrusher() {
  return (
    <>
      <path d="M42 150 L46 120 L58 120 L56 150 Z M70 150 L70 120 L82 120 L86 150 Z" fill={IRON} />
      <path d="M30 124 C26 92 42 72 66 72 C90 72 100 94 96 124 Z" fill="#5a5146" />
      <path
        d="M68 72 C90 72 100 94 96 124 L80 124 C84 100 80 84 68 72 Z"
        fill={INK}
        opacity="0.3"
        stroke="none"
      />
      <path
        d="M30 92 L12 112 L16 128"
        stroke="#5a5146"
        strokeWidth="9"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M8 124 L16 118 L24 126 L18 136 Z" fill={CRYSTAL} />
      <path d="M60 72 L64 58 L70 72 Z M76 76 L84 64 L84 80 Z" fill={CRYSTAL} />
      <Eyes
        pts={[
          [46, 92],
          [56, 92],
        ]}
        c={CRYSTAL_HI}
        r={1.4}
      />
    </>
  );
}

/** Geode Titan (mini-boss): a golem bristling with crystal. */
function GeodeTitan() {
  return (
    <>
      <path d="M34 150 L38 116 L56 116 L54 150 Z M70 150 L68 116 L86 116 L92 150 Z" fill={IRON} />
      <path d="M18 118 C14 70 36 36 64 34 C94 36 110 70 104 118 Z" fill="#5a5146" />
      <path
        d="M66 36 C94 38 110 70 104 118 L84 118 C92 84 84 54 66 36 Z"
        fill={INK}
        opacity="0.3"
        stroke="none"
      />
      <path
        d="M44 36 L48 10 L58 34 Z M64 34 L72 4 L78 36 Z M84 44 L100 22 L96 50 Z M30 52 L18 32 L36 46 Z"
        fill={CRYSTAL}
      />
      <path d="M18 76 C4 86 0 108 6 126 L18 124 C16 108 18 96 26 88 Z" fill="#5a5146" />
      <path d="M0 122 L8 116 L16 124 L10 134 Z" fill={CRYSTAL} />
      <rect x="34" y="58" width="30" height="8" fill={INK} />
      <Eyes
        pts={[
          [40, 62],
          [56, 62],
        ]}
        c={CRYSTAL_HI}
        r={1.8}
      />
    </>
  );
}

/** The Crystal Matriarch (boss): a crystal spider-queen. */
function Matriarch() {
  return (
    <>
      <path
        d="M30 110 L6 150 M40 116 L24 150 M82 116 L98 150 M90 108 L114 150 M28 96 L0 104 M92 94 L118 100"
        stroke={INK}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M30 110 L6 150 M40 116 L24 150 M82 116 L98 150 M90 108 L114 150"
        stroke={CRYSTAL}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <ellipse cx="62" cy="98" rx="38" ry="26" fill={CRYSTAL} />
      <path
        d="M70 74 C94 80 104 98 96 116 C88 122 78 124 66 124 C82 112 84 92 70 74 Z"
        fill={INK}
        opacity="0.3"
        stroke="none"
      />
      <path
        d="M44 76 L40 48 L52 74 Z M62 72 L64 36 L72 74 Z M80 78 L92 54 L88 82 Z"
        fill={CRYSTAL_HI}
      />
      <path d="M40 60 C30 52 24 60 26 70 C30 78 40 78 44 72 Z" fill={CRYSTAL} />
      <circle cx="32" cy="66" r="9" fill={CRYSTAL_HI} />
      <Eyes
        pts={[
          [28, 64],
          [34, 62],
          [30, 70],
        ]}
        c={VOID}
        r={1.3}
      />
    </>
  );
}

/** Hooded cultist body, shared by the cult. */
function Cultist({ robe, children }: { robe: string; children?: React.ReactNode }) {
  return (
    <>
      <path d="M42 150 C44 120 48 96 60 84 C72 96 76 120 78 150 Z" fill={robe} />
      <path
        d="M62 86 C72 98 76 120 78 150 L68 150 C70 124 68 102 62 86 Z"
        fill={INK}
        opacity="0.35"
        stroke="none"
      />
      <path d="M48 82 L60 50 L72 82 C66 86 54 86 48 82 Z" fill={robe} />
      <path d="M54 76 C54 68 66 68 66 76 L65 84 L55 84 Z" fill={INK} />
      {children}
    </>
  );
}

function CultAssassin() {
  return (
    <Cultist robe="#1c1212">
      <Eyes
        pts={[
          [58, 78],
          [63, 78],
        ]}
        c={EMBER}
        r={0.9}
      />
      <path
        d="M46 104 L30 96 M48 112 L30 120"
        stroke="#1c1212"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path d="M30 96 L18 88 L22 98 Z M30 120 L16 124 L24 128 Z" fill={BONE} strokeWidth="1" />
      <path d="M50 92 L70 92" stroke={BLOOD} strokeWidth="2" />
    </Cultist>
  );
}

function Flagellant() {
  return (
    <>
      <path d="M48 150 L52 112 L62 112 L60 150 Z M66 150 L66 112 L76 112 L80 150 Z" fill={CLOTH} />
      <path d="M44 114 C42 92 48 74 62 70 C78 74 82 92 80 114 Z" fill={FLESH} />
      <path d="M60 76 L72 108 M66 74 L78 100 M54 80 L64 110" stroke={BLOOD} strokeWidth="2" />
      <path d="M44 114 H80 V122 H44 Z" fill={CLOTH} />
      <path
        d="M46 84 C34 88 26 96 22 106"
        stroke={FLESH}
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M22 106 C14 112 12 124 18 132 M22 106 C18 116 22 126 30 130"
        stroke="#523620"
        strokeWidth="1.6"
        fill="none"
      />
      <path d="M52 54 C52 42 72 42 72 54 C72 64 66 70 62 70 C56 70 52 64 52 54 Z" fill={CLOTH} />
      <Eyes
        pts={[
          [57, 58],
          [64, 58],
        ]}
        c={EMBER}
        r={1}
      />
    </>
  );
}

function BloodPriest() {
  return (
    <Cultist robe={BLOOD}>
      <Eyes
        pts={[
          [58, 78],
          [63, 78],
        ]}
        c={BONE}
        r={0.9}
      />
      <path d="M50 100 L60 118 L70 100" stroke="#a8853e" strokeWidth="1.6" fill="none" />
      <path
        d="M46 104 C38 104 34 100 33 94"
        stroke={BLOOD}
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M26 86 H40 L36 94 H30 Z M33 94 V100" fill="#a8853e" />
      <path d="M28 86 H38" stroke={BLOOD} strokeWidth="2" />
    </Cultist>
  );
}

function Fanatic() {
  return (
    <Cultist robe="#4a2a22">
      <Eyes
        pts={[
          [58, 78],
          [63, 78],
        ]}
        c={EMBER}
        r={0.9}
      />
      <path
        d="M46 98 C38 98 32 92 30 86"
        stroke="#4a2a22"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M30 86 L22 70 L32 66 L36 82 Z" fill={IRON_HI} />
    </Cultist>
  );
}

/** High Inquisitor (mini-boss): tall hat, armour, a branding staff. */
function Inquisitor() {
  return (
    <>
      <path d="M38 150 C40 116 46 88 60 76 C74 88 80 116 82 150 Z" fill={IRON} />
      <path
        d="M62 78 C74 90 80 116 82 150 L70 150 C72 120 70 96 62 78 Z"
        fill={INK}
        opacity="0.35"
        stroke="none"
      />
      <path d="M44 110 H76 V118 H44 Z" fill={BLOOD} />
      <path d="M50 74 L54 30 L66 30 L70 74 Z" fill={CLOTH} />
      <path d="M50 60 H70" stroke="#a8853e" strokeWidth="2" />
      <path d="M52 74 C52 66 68 66 68 74 L67 82 L53 82 Z" fill={INK} />
      <Eyes
        pts={[
          [57, 76],
          [63, 76],
        ]}
        c={EMBER}
        r={1}
      />
      <path d="M28 150 L32 60" stroke="#3a2a1b" strokeWidth="3.5" />
      <path d="M26 56 L38 56 L36 64 L28 64 Z" fill={EMBER} className="av-glow" />
    </>
  );
}

/** The Bleeding Saint (boss): haloed, red-robed, weeping blood. */
function Saint() {
  return (
    <>
      <circle
        cx="60"
        cy="40"
        r="26"
        fill="none"
        stroke="#a8853e"
        strokeWidth="3"
        className="av-glow"
      />
      <path d="M30 150 C32 110 40 76 60 62 C80 76 88 110 90 150 Z" fill={BLOOD} />
      <path
        d="M62 64 C80 78 88 110 90 150 L74 150 C76 116 72 86 62 64 Z"
        fill={INK}
        opacity="0.35"
        stroke="none"
      />
      <path d="M46 100 L60 130 L74 100" stroke="#a8853e" strokeWidth="2" fill="none" />
      <path d="M48 60 C48 42 72 42 72 60 C72 72 66 78 60 78 C54 78 48 72 48 60 Z" fill={FLESH} />
      <path d="M48 52 C50 40 70 40 72 52 C68 46 52 46 48 52 Z" fill={CLOTH} />
      <path d="M54 60 L54 72 M66 60 L66 74" stroke={BLOOD} strokeWidth="1.6" />
      <Eyes
        pts={[
          [54, 58],
          [66, 58],
        ]}
        c={BLOOD}
        r={1.3}
      />
      <path
        d="M34 110 C24 108 18 100 18 92"
        stroke={BLOOD}
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
      />
    </>
  );
}

/** Drowned Thrall: bloated, weed-draped. */
function Thrall() {
  return (
    <>
      <path d="M44 150 L48 116 L60 116 L58 150 Z M66 150 L66 116 L78 116 L80 150 Z" fill={SEA} />
      <path d="M36 118 C32 90 44 68 62 66 C82 68 90 90 86 118 Z" fill={SEA_HI} />
      <path
        d="M64 68 C82 70 90 90 86 118 L72 118 C76 96 72 80 64 68 Z"
        fill={INK}
        opacity="0.3"
        stroke="none"
      />
      <path
        d="M44 74 C42 92 46 108 44 122 M52 70 C52 90 56 104 52 120"
        stroke={ROT}
        strokeWidth="2.4"
        fill="none"
      />
      <path
        d="M38 84 C28 92 24 104 24 116"
        stroke={SEA_HI}
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M48 52 C48 40 70 40 70 52 C70 62 64 68 58 68 C52 68 48 62 48 52 Z" fill={SEA_HI} />
      <Eyes
        pts={[
          [53, 54],
          [61, 54],
        ]}
        c={GLOW}
        r={1.2}
      />
    </>
  );
}

/** Tide Lurker: an eel-thing rising from the water. */
function Lurker() {
  return (
    <>
      <path
        d="M96 150 C100 120 84 100 64 96 C44 92 34 76 40 60 C44 50 34 44 26 50"
        stroke={INK}
        strokeWidth="16"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M96 150 C100 120 84 100 64 96 C44 92 34 76 40 60 C44 50 34 44 26 50"
        stroke={SEA}
        strokeWidth="12"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M70 92 L78 82 L80 96 M54 84 L58 72 L62 88" fill={SEA_HI} />
      <path d="M18 50 L30 42 L32 56 Z" fill={SEA} />
      <path d="M16 52 L26 50 L18 56" fill={BONE} strokeWidth="1" />
      <Eyes pts={[[28, 46]]} c={GLOW} r={1.4} />
      <path d="M60 150 C70 144 82 144 100 150" stroke={SEA_HI} strokeWidth="2" fill="none" />
    </>
  );
}

/** Siren: a pale drowned singer above the water. */
function Siren() {
  return (
    <>
      <path d="M50 150 C44 130 52 112 60 104 C70 112 76 132 70 150 Z" fill={SEA} />
      <path d="M70 150 L84 140 L80 154 Z" fill={SEA} />
      <path d="M48 106 C46 86 52 70 60 66 C68 70 74 86 72 106 Z" fill="#a8a28e" />
      <path
        d="M50 70 C40 74 34 94 34 120 M70 70 C78 76 82 96 80 118"
        stroke="#2a2420"
        strokeWidth="4"
        fill="none"
      />
      <path d="M50 52 C50 40 70 40 70 52 C70 62 64 68 60 68 C56 68 50 62 50 52 Z" fill="#a8a28e" />
      <path
        d="M48 50 C48 34 72 34 72 52 L76 78 C72 66 66 56 60 54 C54 56 48 66 44 78 Z"
        fill="#2a2420"
      />
      <Eyes
        pts={[
          [56, 54],
          [64, 54],
        ]}
        c={GLOW}
        r={1.2}
      />
      <path d="M56 62 Q60 66 64 62" stroke={INK} strokeWidth="1.4" fill="none" />
    </>
  );
}

/** The Drowned Knight (mini-boss): barnacled armour and a trident. */
function DrownedKnight() {
  return (
    <>
      <path d="M44 150 L48 112 L60 112 L58 150 Z M66 150 L66 112 L78 112 L82 150 Z" fill={IRON} />
      <path d="M36 116 C32 86 42 64 62 60 C82 64 90 86 86 116 Z" fill={SEA_HI} />
      <path d="M64 62 C82 66 90 86 86 116 L72 116 Z" fill={INK} opacity="0.35" stroke="none" />
      <circle cx="46" cy="84" r="2.5" fill={BONE} />
      <circle cx="74" cy="96" r="2" fill={BONE} />
      <circle cx="52" cy="104" r="2" fill={BONE} />
      <path d="M48 40 C48 28 76 28 76 40 L76 60 L48 60 Z" fill={SEA_HI} />
      <rect x="50" y="46" width="24" height="4" fill={INK} />
      <Eyes
        pts={[
          [56, 48],
          [66, 48],
        ]}
        c={GLOW}
        r={1.2}
      />
      <path d="M28 150 L28 46" stroke="#3a2a1b" strokeWidth="3.5" />
      <path
        d="M20 46 L20 34 M28 46 L28 30 M36 46 L36 34 M20 46 H36"
        stroke={IRON_HI}
        strokeWidth="2.5"
        fill="none"
      />
    </>
  );
}

/** The Leviathan Maw (boss): a vast jaw rising from black water. */
function Maw() {
  return (
    <>
      <path d="M4 150 C6 90 30 40 70 30 C100 28 116 60 116 150 Z" fill={SEA} />
      <path
        d="M74 32 C102 32 116 62 116 150 L96 150 C100 90 92 54 74 32 Z"
        fill={INK}
        opacity="0.35"
        stroke="none"
      />
      <path d="M14 96 C30 70 56 66 80 80 C60 92 34 104 14 96 Z" fill={INK} />
      <path
        d="M20 92 L24 84 L28 92 L34 80 L38 92 L46 78 L50 90 L58 78 L62 88 L70 80 L72 86"
        fill="none"
        stroke={BONE}
        strokeWidth="2.5"
      />
      <path
        d="M22 100 L28 108 L34 100 L42 110 L48 100 L56 108 L62 98"
        fill="none"
        stroke={BONE}
        strokeWidth="2.5"
      />
      <Eyes
        pts={[
          [64, 52],
          [80, 50],
        ]}
        c={GLOW}
        r={2}
      />
      <path
        d="M0 150 C20 140 40 142 60 150 C80 142 100 140 120 150"
        stroke={SEA_HI}
        strokeWidth="2"
        fill="none"
      />
    </>
  );
}

/** Void Horror: a floating mass of eyes and tendrils. */
function Horror() {
  return (
    <>
      <path
        d="M40 110 C30 130 34 146 44 150 M56 114 C54 132 60 144 66 150 M72 110 C80 126 84 140 92 146"
        stroke={INK}
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M40 110 C30 130 34 146 44 150 M56 114 C54 132 60 144 66 150 M72 110 C80 126 84 140 92 146"
        stroke="#2c2433"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="58" cy="86" r="30" fill="#2c2433" />
      <path
        d="M62 56 C86 60 92 92 80 110 C76 98 72 76 62 56 Z"
        fill={INK}
        opacity="0.35"
        stroke="none"
      />
      <circle cx="50" cy="82" r="8" fill={BONE} />
      <circle cx="48" cy="82" r="3.5" fill={VOID} stroke="none" />
      <Eyes
        pts={[
          [66, 70],
          [70, 96],
          [40, 100],
        ]}
        c={VOID}
        r={1.5}
      />
    </>
  );
}

/** Rift Knight: black armour, rift-light in the visor, a greatsword. */
function RiftKnight() {
  return (
    <>
      <path d="M44 150 L48 110 L60 110 L58 150 Z M66 150 L66 110 L78 110 L82 150 Z" fill={IRON} />
      <path d="M36 114 C32 84 42 62 62 58 C82 62 90 84 86 114 Z" fill="#2a2730" />
      <path d="M64 60 C82 64 90 84 86 114 L72 114 Z" fill={INK} opacity="0.35" stroke="none" />
      <path d="M60 70 L60 100" stroke={VOID} strokeWidth="2" className="av-glow" />
      <path d="M48 38 C48 26 74 26 74 38 L74 58 L48 58 Z" fill="#2a2730" />
      <path d="M50 44 H72 V48 H50 Z" fill={VOID} stroke="none" className="av-glow" />
      <path d="M30 140 L26 30 L34 30 Z" fill={IRON_HI} />
      <path d="M20 128 H40" stroke={IRON_HI} strokeWidth="4" />
    </>
  );
}

/** Unmaker: a thin floating figure with a hole for a face. */
function Unmaker() {
  return (
    <>
      <path d="M52 140 C46 110 50 84 60 72 C70 84 74 110 68 140 L60 150 Z" fill="#1d1a22" />
      <path
        d="M50 92 L32 104 L26 120 M70 92 L86 104 L92 118"
        stroke="#1d1a22"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx="60" cy="56" rx="12" ry="16" fill="#1d1a22" />
      <ellipse cx="58" cy="58" rx="6" ry="9" fill={INK} stroke="none" />
      <ellipse
        cx="58"
        cy="58"
        rx="9"
        ry="12"
        fill={VOID}
        opacity="0.2"
        stroke="none"
        className="av-glow"
      />
    </>
  );
}

/** Void Herald (mini-boss): horned and winged. */
function Herald() {
  return (
    <>
      <path
        d="M58 70 C30 50 8 60 4 90 C20 80 34 84 46 96 Z M64 70 C90 50 112 60 116 90 C100 80 86 84 74 96 Z"
        fill="#2c2433"
      />
      <path d="M44 150 C44 116 50 88 60 76 C70 88 76 116 76 150 Z" fill="#2c2433" />
      <path d="M62 78 C70 90 76 116 76 150 L68 150 Z" fill={INK} opacity="0.35" stroke="none" />
      <path d="M50 58 C50 46 70 46 70 58 C70 70 66 76 60 76 C54 76 50 70 50 58 Z" fill="#1d1a22" />
      <path
        d="M50 50 C44 40 42 30 46 22 C48 34 52 40 56 46 Z M70 50 C76 40 78 30 74 22 C72 34 68 40 64 46 Z"
        fill={BONE}
      />
      <Eyes
        pts={[
          [56, 60],
          [64, 60],
        ]}
        c={VOID}
        r={1.4}
      />
    </>
  );
}

/** The Rift Heart (boss): a vast beating heart of the Rift. */
function RiftHeartArt() {
  return (
    <>
      <path
        d="M20 150 C30 136 40 130 50 126 M100 150 C90 136 80 130 70 126 M60 150 V126"
        stroke={INK}
        strokeWidth="7"
        fill="none"
      />
      <path
        d="M20 150 C30 136 40 130 50 126 M100 150 C90 136 80 130 70 126 M60 150 V126"
        stroke={BLOOD}
        strokeWidth="4"
        fill="none"
      />
      <path
        d="M60 128 C20 110 6 80 18 56 C30 34 54 38 60 56 C66 38 90 34 102 56 C114 80 100 110 60 128 Z"
        fill="#5a1a14"
      />
      <path
        d="M62 56 C68 40 90 36 102 56 C112 76 102 104 66 124 C88 100 92 74 62 56 Z"
        fill={INK}
        opacity="0.3"
        stroke="none"
      />
      <path
        d="M34 60 C44 72 40 90 52 100 M78 52 C72 70 84 84 74 102"
        stroke={VOID}
        strokeWidth="2.5"
        fill="none"
        className="av-glow"
      />
      <path
        d="M50 30 L54 14 M66 30 L70 12"
        stroke="#5a1a14"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <Eyes pts={[[58, 80]]} c={VOID} r={3} />
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
  // request #71
  grave_crawler: Crawler,
  bone_archer: BoneArcher,
  husk_abomination: Abomination,
  prism_sentinel: PrismSentinel,
  geode_crusher: GeodeCrusher,
  geode_titan: GeodeTitan,
  crystal_matriarch: Matriarch,
  cult_assassin: CultAssassin,
  flagellant: Flagellant,
  blood_priest: BloodPriest,
  cult_fanatic: Fanatic,
  high_inquisitor: Inquisitor,
  bleeding_saint: Saint,
  drowned_thrall: Thrall,
  tide_lurker: Lurker,
  drowned_siren: Siren,
  drowned_knight: DrownedKnight,
  leviathan_maw: Maw,
  void_horror: Horror,
  rift_knight: RiftKnight,
  unmaker: Unmaker,
  void_herald: Herald,
  rift_heart: RiftHeartArt,
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
