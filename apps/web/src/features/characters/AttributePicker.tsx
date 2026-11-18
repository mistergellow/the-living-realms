import { ATTRIBUTE_NAMES, ATTRIBUTE_RULES, ATTRIBUTE_SUMMARIES } from '@realms/game-core';
import { ATTRIBUTE_KEYS, type Attributes } from '@realms/shared';

/**
 * Distribute attribute points (D33). Used at creation (floor = base 5 in
 * everything) and later to spend unspent points (floor = current scores).
 */
export function AttributePicker(props: {
  value: Attributes;
  onChange: (a: Attributes) => void;
  /** Scores that cannot be lowered (current base attributes). */
  floor: Attributes;
  /** Points available in total on top of `floor`. */
  points: number;
  title?: string;
}) {
  const { value, floor, points } = props;
  const used = ATTRIBUTE_KEYS.reduce((s, k) => s + (value[k] - floor[k]), 0);
  const remaining = points - used;

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row">
        <span className="field-label">{props.title ?? 'Attributes'}</span>
        <span className="spacer" />
        <span className={remaining < 0 ? 'field-error' : 'muted'} data-testid="points-remaining">
          {remaining} / {points} points left
        </span>
      </div>
      <div className="attr-grid">
        {ATTRIBUTE_KEYS.map((k) => {
          const score = value[k];
          return (
            <div key={k} className="attr-row">
              <div>
                <strong>{ATTRIBUTE_NAMES[k]}</strong>
                <div className="field-hint">{ATTRIBUTE_SUMMARIES[k]}</div>
              </div>
              <div className="attr-controls">
                <button
                  type="button"
                  className="btn btn-sm"
                  aria-label={`Decrease ${ATTRIBUTE_NAMES[k]}`}
                  disabled={score <= floor[k]}
                  onClick={() => props.onChange({ ...value, [k]: score - 1 })}
                >
                  −
                </button>
                <span className="attr-score" data-testid={`attr-${k}`}>
                  {score}
                </span>
                <button
                  type="button"
                  className="btn btn-sm"
                  aria-label={`Increase ${ATTRIBUTE_NAMES[k]}`}
                  disabled={score >= ATTRIBUTE_RULES.creationMax || remaining <= 0}
                  onClick={() => props.onChange({ ...value, [k]: score + 1 })}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
