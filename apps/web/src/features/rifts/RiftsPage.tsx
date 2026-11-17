import { Link, Navigate, useNavigate } from 'react-router';
import { FormError } from '../../shared/ui/FormError';
import { Icon } from '../../shared/ui/Icon';
import { Screen } from '../../shared/ui/Screen';
import { useActiveCharacter } from '../characters/active-character';
import { useActiveRun, useRifts, useStartRun } from './api';

/** Rift list (decision D31: a list for now; portals on the map in phase 4). */
export function RiftsPage() {
  const characterId = useActiveCharacter((s) => s.characterId);
  const rifts = useRifts();
  const active = useActiveRun(characterId);
  const start = useStartRun();
  const navigate = useNavigate();
  if (!characterId) return <Navigate to="/characters" replace />;

  return (
    <Screen>
      <header className="topbar">
        <Link className="btn btn-ghost btn-sm" to="/world">
          <Icon name="back" />
          Back to the world
        </Link>
        <h1>Rifts</h1>
        <span className="spacer" />
        <span className="logo">The Living Realms</span>
      </header>
      <main className="screen-body">
        <div className="contain stack" style={{ maxWidth: '64rem' }}>
          <p className="muted" style={{ margin: 0, fontSize: '1.05rem', fontStyle: 'italic' }}>
            Rifts are portals to raids: several rooms and a boss. Difficulty does not change with
            the number of players.
          </p>
          <FormError error={start.error ?? rifts.error} />
          {active.data && (
            <div className="panel row" style={{ borderColor: 'var(--accent)' }}>
              <div>
                <strong>You are inside {active.data.riftName}</strong>
                <div className="muted">
                  Room {active.data.roomIndex + 1} of {active.data.rooms.length}
                </div>
              </div>
              <span className="spacer" />
              <Link className="btn btn-primary" to={`/rifts/runs/${active.data.id}`}>
                Resume
              </Link>
            </div>
          )}
          <div className="stack">
            {rifts.data?.map((r) => (
              <article key={r.id} className="panel rift-card" data-testid="rift-card">
                <div className="rift-portal" aria-hidden />
                <div className="stack" style={{ gap: '0.4rem', flex: 1, minWidth: 0 }}>
                  <h2 className="logo" style={{ fontSize: '1.6rem' }}>
                    {r.name}
                  </h2>
                  <span className="muted">{r.description}</span>
                  <ol className="rift-rooms">
                    {r.rooms.map((room, i) => (
                      <li key={i} data-boss={room.isBoss}>
                        {room.isBoss ? '☠ ' : ''}
                        {room.name}
                      </li>
                    ))}
                  </ol>
                  <div className="row" style={{ flexWrap: 'wrap', marginTop: '0.4rem' }}>
                    <button
                      className="btn btn-primary"
                      disabled={start.isPending || !!active.data}
                      onClick={() =>
                        start.mutate(
                          { riftId: r.id, characterId },
                          { onSuccess: (run) => navigate(`/rifts/runs/${run.id}`) },
                        )
                      }
                    >
                      Enter solo
                    </button>
                    <button
                      className="btn"
                      disabled
                      title="Group lobbies arrive in the next milestone"
                    >
                      Create lobby (soon)
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>
    </Screen>
  );
}
