import { ROOM_TYPE_INFO } from '@realms/game-core';
import type { MapDto, MapNodeDto, RoomType, VoteView } from '@realms/shared';

/*
 * The Rift map (request #31): Slay-the-Spire style, drawn in SVG. Rows go
 * from the entrance (bottom) to the boss (top); lines connect rooms; the
 * rooms you can go to next glow and are buttons. Presentation only: the
 * layout comes from the server's map (rows, lanes, connections).
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

const ROW_H = 74;
const COL_W = 86;
const PAD = 44;

export function RiftMap({
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
  const width = PAD * 2 + COL_W * (map.cols - 1);
  const height = PAD * 2 + ROW_H * (map.rows - 1);
  const pos = (n: Pick<MapNodeDto, 'row' | 'col'>) => ({
    x: PAD + n.col * COL_W,
    y: height - PAD - n.row * ROW_H,
  });
  const byId = new Map(map.nodes.map((n) => [n.id, n]));
  const visitedEdge = (a: MapNodeDto, b: MapNodeDto) => a.visited && b.visited;

  return (
    <svg
      className="rift-map"
      viewBox={`0 0 ${width} ${height}`}
      role="group"
      aria-label="Rift map"
      data-testid="rift-map"
    >
      {map.edges.map(([from, to]) => {
        const a = byId.get(from);
        const b = byId.get(to);
        if (!a || !b) return null;
        const p = pos(a);
        const q = pos(b);
        return (
          <line
            key={`${from}-${to}`}
            x1={p.x}
            y1={p.y}
            x2={q.x}
            y2={q.y}
            className="map-edge"
            data-walked={visitedEdge(a, b)}
            data-next={a.current && b.available}
            data-secret={a.secret || b.secret}
          />
        );
      })}
      {map.nodes.map((n) => {
        const { x, y } = pos(n);
        const voters = votes.filter((v) => v.optionId === n.id);
        const r = n.type === 'boss' ? 26 : 19;
        const label = `${ROOM_TYPE_INFO[n.type].name}${n.available ? ' — go here' : ''}${n.visited ? ' (visited)' : ''}`;
        const body = (
          <>
            <circle r={r + 6} className="map-halo" />
            <circle r={r} className="map-node-bg" />
            <text className="map-glyph" dy="0.35em" fontSize={n.type === 'boss' ? 24 : 17}>
              {ROOM_GLYPH[n.type]}
            </text>
            {voters.length > 0 && (
              <text className="map-votes" x={r + 4} y={-r + 2}>
                {voters.map((v) => nameOf(v.characterId).slice(0, 1)).join('')}
              </text>
            )}
          </>
        );
        return (
          <g
            key={n.id}
            transform={`translate(${x} ${y})`}
            className="map-node"
            data-type={n.type}
            data-visited={n.visited}
            data-current={n.current}
            data-available={n.available}
            data-mine={myVote === n.id}
          >
            {n.available && !disabled ? (
              <a
                role="button"
                tabIndex={0}
                aria-label={label}
                data-testid={`room-${n.type}`}
                onClick={() => onChoose(n.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onChoose(n.id);
                  }
                }}
              >
                <title>{label}</title>
                {body}
              </a>
            ) : (
              <>
                <title>{label}</title>
                {body}
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function MapLegend() {
  return (
    <ul className="map-legend">
      {(Object.keys(ROOM_TYPE_INFO) as RoomType[]).map((t) => (
        <li key={t} title={ROOM_TYPE_INFO[t].description}>
          <span className="legend-glyph" data-type={t}>
            {ROOM_GLYPH[t]}
          </span>
          {ROOM_TYPE_INFO[t].name}
        </li>
      ))}
    </ul>
  );
}
