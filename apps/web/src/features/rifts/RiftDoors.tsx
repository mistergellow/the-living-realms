import { ROOM_TYPE_INFO } from '@realms/game-core';
import type { MapDto, MapNodeDto, RoomType, VoteView } from '@realms/shared';

/*
 * The way on through a Rift (request #69, replaces the Slay-the-Spire map of
 * request #31): the party stands in a corridor and picks a door — left,
 * middle or right — without knowing what waits behind it. Only the boss lair
 * (and a secret passage you found) is named; everything else is revealed when
 * you walk in. The rooms and their connections still come from the server's
 * map; this only shows the next choices and the path walked so far.
 */

export const ROOM_GLYPH: Record<RoomType, string> = {
  combat: '⚔',
  elite: '☠',
  campsite: '🔥',
  event: '?',
  loot: '◆',
  secret: '✦',
  boss: '♛',
};

const SIDE_NAMES: Record<number, string[]> = {
  1: ['The passage'],
  2: ['Left', 'Right'],
  3: ['Left', 'Middle', 'Right'],
};

/** Name of each door, by its place among the choices (left to right). */
export function doorNames(count: number): string[] {
  return (
    SIDE_NAMES[count] ??
    Array.from({ length: count }, (_, i) =>
      i === 0 ? 'Left' : i === count - 1 ? 'Right' : `Middle ${i}`,
    )
  );
}

export function RiftDoors({
  map,
  votes,
  nameOf,
  myVote,
  disabled,
  onChoose,
}: {
  map: MapDto;
  votes: VoteView[];
  nameOf: (characterId: string) => string;
  myVote: string | null;
  disabled: boolean;
  onChoose: (nodeId: string) => void;
}) {
  const doors = map.nodes.filter((n) => n.available).sort((a, b) => a.col - b.col);
  const names = doorNames(doors.length);
  const walked = map.nodes.filter((n) => n.visited).sort((a, b) => a.row - b.row);
  const current = map.nodes.find((n) => n.current);
  const next = current ? current.row + 2 : 1;

  return (
    <div className="rift-doors" data-testid="rift-doors">
      <ol className="rift-path" aria-label="Rooms behind you">
        <li className="path-step" data-kind="entrance" title="Entrance">
          ⌂
        </li>
        {walked.map((n) => (
          <PathStep key={n.id} node={n} />
        ))}
        <li className="path-depth muted">
          Next: room {Math.min(next, map.rows)} of {map.rows}
        </li>
      </ol>

      <div className="doors" role="group" aria-label="Choose a door" data-count={doors.length}>
        {doors.map((d, i) => {
          const voters = votes.filter((v) => v.optionId === d.id);
          const known = d.type === 'boss' || d.type === 'secret';
          const label = known ? ROOM_TYPE_INFO[d.type!].name : names[i]!;
          return (
            <button
              key={d.id}
              type="button"
              className="door"
              data-testid="door"
              data-known={known ? d.type : undefined}
              data-mine={myVote === d.id}
              disabled={disabled}
              aria-label={`${label}${known ? '' : ' door'}${myVote === d.id ? ' (your vote)' : ''}`}
              onClick={() => onChoose(d.id)}
            >
              <DoorArt kind={known ? d.type! : null} />
              <span className="door-name">{label}</span>
              <span className="door-hint muted">
                {d.type === 'boss'
                  ? 'The lair. No turning back.'
                  : d.type === 'secret'
                    ? 'A hidden way you found.'
                    : 'What waits beyond is unknown.'}
              </span>
              {voters.length > 0 && (
                <span className="door-votes">
                  {voters.map((v) => nameOf(v.characterId)).join(', ')}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PathStep({ node }: { node: MapNodeDto }) {
  const t = node.type;
  return (
    <li
      className="path-step"
      data-kind={t ?? 'unknown'}
      data-current={node.current}
      title={t ? ROOM_TYPE_INFO[t].name : 'Unknown'}
    >
      {t ? ROOM_GLYPH[t] : '·'}
    </li>
  );
}

/** A stone archway with a door ajar; the boss lair burns red. */
function DoorArt({ kind }: { kind: RoomType | null }) {
  const glow = kind === 'boss' ? '#c8331f' : kind === 'secret' ? '#7e6bb8' : '#d0912f';
  return (
    <svg className="door-art" viewBox="0 0 120 170" aria-hidden>
      <defs>
        <radialGradient id={`door-glow-${kind ?? 'x'}`} cx="0.5" cy="0.75" r="0.6">
          <stop offset="0" stopColor={glow} stopOpacity="0.55" />
          <stop offset="1" stopColor={glow} stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* stones of the arch */}
      <path
        d="M6 170 V62 C6 22 114 22 114 62 V170 H96 V66 C96 40 24 40 24 66 V170 Z"
        fill="#2a231c"
        stroke="#050403"
        strokeWidth="3"
      />
      <path
        d="M12 92 H24 M96 92 H108 M12 124 H24 M96 124 H108 M14 56 L26 62 M106 56 L94 62 M44 30 L48 42 M76 30 L72 42 M60 26 V39"
        stroke="#050403"
        strokeWidth="2.5"
      />
      {/* the dark beyond, a sliver of light */}
      <path d="M24 170 V66 C24 40 96 40 96 66 V170 Z" fill="#050403" />
      <path d="M24 170 V66 C24 40 96 40 96 66 V170 Z" fill={`url(#door-glow-${kind ?? 'x'})`} />
      {/* the door, half open */}
      <path
        className="door-leaf"
        d="M24 170 V66 C24 52 40 44 56 43 L64 170 Z"
        fill="#3a2a1b"
        stroke="#050403"
        strokeWidth="2.5"
      />
      <path d="M34 60 V168 M46 50 V168" stroke="#1d150e" strokeWidth="2" />
      <path d="M26 92 H58 M27 140 H61" stroke="#14100d" strokeWidth="4" />
      <circle cx="54" cy="116" r="3" fill="#7d6a45" stroke="#050403" />
      {kind === 'boss' && (
        <path d="M60 52 l6 10 h-12 Z M48 66 h24" stroke="#c8331f" strokeWidth="2" fill="none" />
      )}
    </svg>
  );
}
