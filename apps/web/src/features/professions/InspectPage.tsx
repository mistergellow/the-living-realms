import { Link, useParams } from 'react-router';
import { FormError } from '../../shared/ui/FormError';
import { useProfessionProfile } from './api';
import { plural, PROFESSION_SECTIONS, RankLadder } from './ProfessionsPage';
import './professions.css';

/** Another player's professional profile (request #51): ranks and statistics. */
export function InspectPage() {
  const { name } = useParams();
  const profile = useProfessionProfile(name);
  const p = profile.data;
  return (
    <div className="screen-body">
      <div className="contain stack" data-testid="profession-profile">
        <div className="row" style={{ alignItems: 'baseline' }}>
          <h1 className="page-title" style={{ margin: 0 }}>
            {p?.character.name ?? name} · Professions
          </h1>
          <span className="spacer" />
          <Link className="btn btn-sm btn-ghost" to="/professions">
            Back to my professions
          </Link>
        </div>
        <FormError error={profile.error} />
        {p && (
          <div className="prof-cols">
            {PROFESSION_SECTIONS.map((s) => (
              <section key={s.category} className="panel stack">
                <div className="panel-title">{s.title}</div>
                {p.professions
                  .filter((x) => x.category === s.category)
                  .map((x) => (
                    <article key={x.id} className="prof-card" data-testid={`profile-${x.id}`}>
                      <div className="row">
                        <strong>{x.name}</strong>
                        <span className="spacer" />
                        <span className="prof-level">{x.rankName}</span>
                      </div>
                      <RankLadder rank={x.rank} />
                      <div className="prof-bar">
                        <i style={{ width: `${Math.round(x.progress * 100)}%` }} />
                      </div>
                      <span className="muted small">
                        {plural(x.stats.attempts, 'attempt')} · {x.stats.successes}{' '}
                        {x.stats.successes === 1 ? 'success' : 'successes'} · {x.stats.itemsMade}{' '}
                        made
                      </span>
                    </article>
                  ))}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
