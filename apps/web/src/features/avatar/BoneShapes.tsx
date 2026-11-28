import { boneBox, boneGeometry, type BoneDef } from './bone-rig';

/**
 * Request #91: draw bones — a coloured bar or oval each, with a white dot on
 * the joint it turns at — or, when a bone has a picture, the picture in its
 * box. Shared by the hero (`CharacterAvatar`) and the monsters (`EnemyAvatar`).
 */
export function BoneShapes({
  bones,
  art,
  layer,
}: {
  bones: readonly BoneDef[];
  /** Pictures by bone id. */
  art: Record<string, string>;
  layer?: string;
}) {
  return (
    <g className="av-bones" data-layer={layer}>
      {bones.map((b) => {
        const g = boneGeometry(b);
        const src = art[b.id];
        if (src) {
          const box = boneBox(b);
          return (
            <image
              key={b.id}
              data-bone={b.id}
              href={src}
              x={box.x}
              y={box.y}
              width={box.w}
              height={box.h}
              preserveAspectRatio="none"
            />
          );
        }
        return (
          <g key={b.id} data-bone={b.id}>
            <title>{b.label}</title>
            {b.shape === 'oval' ? (
              <ellipse
                cx={g.mid.x}
                cy={g.mid.y}
                rx={Math.max(g.length / 2 + 2, b.width * 0.35)}
                ry={b.width / 2}
                transform={`rotate(${g.angle} ${g.mid.x} ${g.mid.y})`}
                fill={b.color}
                stroke="#050403"
                strokeWidth="1.2"
              />
            ) : (
              <>
                <line
                  x1={b.from.x}
                  y1={b.from.y}
                  x2={b.to.x}
                  y2={b.to.y}
                  stroke="#050403"
                  strokeWidth={b.width + 2.4}
                  strokeLinecap="round"
                />
                <line
                  x1={b.from.x}
                  y1={b.from.y}
                  x2={b.to.x}
                  y2={b.to.y}
                  stroke={b.color}
                  strokeWidth={b.width}
                  strokeLinecap="round"
                />
              </>
            )}
            <circle
              cx={b.from.x}
              cy={b.from.y}
              r="1.7"
              fill="#fff"
              stroke="#050403"
              strokeWidth="0.6"
            />
          </g>
        );
      })}
    </g>
  );
}
