import type { RunDto } from '@realms/shared';
import { Link } from 'react-router';

/** Result of a run: rewards on victory, equipment damage on defeat or when leaving. */
export function EndOverlay({ run }: { run: RunDto }) {
  const victory = run.status === 'victory';
  return (
    <div className="combat-overlay">
      <div className="panel stack end-card" data-testid="run-result">
        <h2 style={{ color: victory ? 'var(--accent)' : 'var(--danger)' }}>
          {run.worldBoss
            ? victory
              ? 'The world boss falls!'
              : 'Your party has fallen'
            : victory
              ? 'Victory'
              : run.status === 'abandoned'
                ? 'You fled the Rift'
                : 'Defeat'}
        </h2>
        {run.worldBoss && (
          <p style={{ margin: 0 }} data-testid="boss-damage">
            Damage dealt to the world boss: <strong>{run.worldBoss.damage.toLocaleString()}</strong>
            . It counts on the leaderboard.
          </p>
        )}
        {run.rewards && (
          <div>
            <p style={{ margin: 0 }} data-testid="reputation-reward">
              Reputation <strong>+{run.rewards.reputation}</strong>
              {run.rewards.clearNumber !== undefined && (
                <span className="muted">
                  {' '}
                  (
                  {run.rewards.clearNumber === 1
                    ? 'first time'
                    : `time #${run.rewards.clearNumber}: ${run.rewards.clearFactorPct}%`}
                  {run.rewards.gearBonusPct ? `, gear +${run.rewards.gearBonusPct}%` : ''})
                </span>
              )}
            </p>
            {run.rewards.clearFactorPct === 0 && (
              <p className="muted" style={{ margin: 0 }}>
                You have beaten this Rift enough times: it gives no more reputation.
              </p>
            )}
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
          <Link className="btn" to={run.worldBoss ? '/world-boss' : '/rifts'}>
            {run.worldBoss ? 'Leaderboard' : 'Back to Rifts'}
          </Link>
          <Link className="btn btn-primary" to="/home">
            Return home
          </Link>
        </div>
      </div>
    </div>
  );
}
