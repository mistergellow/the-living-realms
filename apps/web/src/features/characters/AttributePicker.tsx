import {
  ATTRIBUTE_NAMES,
  ATTRIBUTE_SUMMARIES,
  attributeModifier,
  POINT_BUY,
  pointBuySpent,
} from '@realms/game-core';
import { ATTRIBUTE_KEYS, type Attributes } from '@realms/shared';

const fmtMod = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

/** D&D 5e point-buy: 27 points, scores 8–15. */
export function AttributePicker({
  value,
  onChange,
}: {
  value: Attributes;
  onChange: (a: Attributes) => void;
}) {
  const spent = pointBuySpent(value);
  const remaining = POINT_BUY.budget - spent;
  const costOfNext = (score: number) =>
    (POINT_BUY.cost[score + 1] ?? Infinity) - (POINT_BUY.cost[score] ?? 0);

  return (
    <div className="stack" style={{ gap: '0.5rem' }}>
      <div className="row">
        <span className="field-label">Attributes</span>
        <span className="spacer" />
        <span
          className={remaining < 0 ? 'points-gem field-error' : 'points-gem'}
          data-testid="points-remaining"
        >
          {remaining} / {POINT_BUY.budget} points left
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
                  disabled={score <= POINT_BUY.min}
                  onClick={() => onChange({ ...value, [k]: score - 1 })}
                >
                  −
                </button>
                <span className="attr-score" data-testid={`attr-${k}`}>
                  {score}
                  <small className="muted"> ({fmtMod(attributeModifier(score))})</small>
                </span>
                <button
                  type="button"
                  className="btn btn-sm"
                  aria-label={`Increase ${ATTRIBUTE_NAMES[k]}`}
                  disabled={score >= POINT_BUY.max || costOfNext(score) > remaining}
                  onClick={() => onChange({ ...value, [k]: score + 1 })}
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
