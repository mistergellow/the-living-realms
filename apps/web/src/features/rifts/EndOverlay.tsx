import type { RunDto } from '@realms/shared';
import { Link } from 'react-router';

/** Result of a run: rewards on victory, equipment damage on defeat or when leaving. */
export function EndOverlay({ run }: { run: RunDto }) {
  const victory = run.status === 'victory';
  return (
    <div className="combat-overlay">
      <div className="panel stack end-card" data-testid="run-result">
        <h2 style={{ color: victory ? 'var(--accent)' : 'var(--danger)' }}>
          {victory ? 'Victory' : run.status === 'abandoned' ? 'You fled the Rift' : 'Defeat'}
        </h2>
        {run.rewards && (
          <div>
            <p style={{ margin: 0 }}>
              Reputation <strong>+{run.rewards.reputation}</strong>
            </p>
            {run.rewards.items.map((i) => (
              <p key={i.id} style={{ margin: '0.25rem 0 0' }}>
                Loot: <strong>{i.name}</strong>
              </p>
            ))}
          </div>
        )}
        {run.penalty && (
          <div>
            <p className="muted" style={{ margin: 0 }}>
              Your equipment was damaged:
            </p>
            {run.penalty.damaged.map((d) => (
              <p
                key={d.id}
                style={{ margin: '0.25rem 0 0', color: d.broken ? 'var(--danger)' : undefined }}
              >
                {d.name}: quality {d.quality}
                {d.broken ? ' — broken!' : ''}
              </p>
            ))}
          </div>
        )}
        <div className="row" style={{ justifyContent: 'center' }}>
          <Link className="btn" to="/rifts">
            Back to Rifts
          </Link>
          <Link className="btn btn-primary" to="/home">
            Return home
          </Link>
        </div>
      </div>
    </div>
  );
}
