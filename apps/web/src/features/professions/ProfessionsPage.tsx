import type { ActivityDto, ActivityResultDto, ProfessionDto } from '@realms/shared';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router';
import { FormError } from '../../shared/ui/FormError';
import { useActiveCharacter } from '../characters/active-character';
import { useCharacterSheet } from '../characters/api';
import { usePerformActivity, useProfessions } from './api';
import './professions.css';

const CATEGORY_NAMES = {
  gathering: 'Gathering',
  crafting: 'Crafting',
  service: 'Service',
} as const;

/** Seconds until an ISO time, refreshed every second. */
function useSecondsUntil(iso: string | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!iso) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [iso]);
  return iso ? Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 1000)) : 0;
}

/**
 * Professions (request #33): pick a profession, practise its activities.
 * Levels (0–10) raise the success chance and the results.
 */
export function ProfessionsPage() {
  const characterId = useActiveCharacter((s) => s.characterId);
  if (!characterId) return <Navigate to="/" replace />;
  return (
    <div className="screen-body">
      <div className="contain" style={{ maxWidth: '72rem' }}>
        <ProfessionsPanel characterId={characterId} />
      </div>
    </div>
  );
}

/** The professions list + detail; also shown in the character sheet's Professions tab. */
export function ProfessionsPanel({ characterId }: { characterId: string }) {
  const list = useProfessions(characterId);
  const [selected, setSelected] = useState<string>('fishing');
  const profs = list.data?.professions ?? [];
  const current = profs.find((p) => p.id === selected) ?? profs[0];

  return (
    <div className="professions">
      <aside className="panel prof-list" aria-label="Professions">
        {(['gathering', 'crafting', 'service'] as const).map((cat) => (
          <section key={cat}>
            <div className="panel-title">{CATEGORY_NAMES[cat]}</div>
            {profs
              .filter((p) => p.category === cat)
              .map((p) => (
                <button
                  key={p.id}
                  className="prof-row"
                  data-active={p.id === current?.id}
                  data-testid={`profession-${p.id}`}
                  onClick={() => setSelected(p.id)}
                >
                  <span>{p.name}</span>
                  <span className="prof-level">Lv {p.level}</span>
                  <span className="prof-xp">
                    <i style={{ width: `${p.xpToNext ? (p.xp / p.xpToNext) * 100 : 100}%` }} />
                  </span>
                </button>
              ))}
          </section>
        ))}
      </aside>
      {current && <ProfessionDetail key={current.id} p={current} characterId={characterId} />}
    </div>
  );
}

function ProfessionDetail({ p, characterId }: { p: ProfessionDto; characterId: string }) {
  const perform = usePerformActivity(characterId);
  const sheet = useCharacterSheet(characterId);
  const busy = useSecondsUntil(p.readyAt);
  const [result, setResult] = useState<ActivityResultDto | null>(null);
  const [target, setTarget] = useState<string>('');
  const gear = sheet.data
    ? [
        ...Object.values(sheet.data.equipment).filter((i): i is NonNullable<typeof i> => !!i),
        ...sheet.data.inventory,
      ].filter((i) => i.kind !== 'material' && i.kind !== 'consumable')
    : [];

  const run = (a: ActivityDto) =>
    perform.mutate(
      { professionId: p.id, activityId: a.id, targetItemId: a.effect ? target : undefined },
      { onSuccess: setResult },
    );

  return (
    <section className="panel stack prof-detail" data-testid="profession-detail">
      <header>
        <h2>
          {p.name} <span className="muted">· {p.title}</span>
        </h2>
        <p className="muted" style={{ margin: 0 }}>
          {p.description}
        </p>
        <p style={{ margin: '0.4rem 0 0' }} data-testid="profession-level">
          Level <strong>{p.level}</strong>/{p.maxLevel}
          {p.xpToNext ? ` · ${p.xp}/${p.xpToNext} XP` : ' · mastered'}
          {busy > 0 && <span className="muted"> · busy for {busy}s</span>}
        </p>
      </header>
      <FormError error={perform.error} />
      {result && (
        <div className="prof-result" data-success={result.success} data-testid="activity-result">
          <strong>{result.message}</strong>{' '}
          <span className="muted">
            ({result.chance}% chance · +{result.xpGained} XP)
          </span>
          {result.produced.length > 0 && (
            <div>Got: {result.produced.map((o) => `${o.qty} × ${o.name}`).join(', ')}</div>
          )}
          {result.consumed.length > 0 && (
            <div className="muted">
              Used: {result.consumed.map((o) => `${o.qty} × ${o.name}`).join(', ')}
            </div>
          )}
        </div>
      )}
      <div className="activities">
        {p.activities.map((a) => {
          const missing = a.inputs.some((i) => i.have < i.qty);
          const needsTarget = !!a.effect && !target;
          return (
            <article key={a.id} className="activity" data-locked={a.locked}>
              <h3>{a.name}</h3>
              <p className="muted small">{a.description}</p>
              <p className="small">
                {a.locked ? `Needs level ${a.minLevel}` : `${a.chance}% success`} ·{' '}
                {a.cooldownSeconds}s
              </p>
              {a.inputs.length > 0 && (
                <p className="small">
                  Needs:{' '}
                  {a.inputs.map((i) => (
                    <span key={i.itemDefId} data-short={i.have < i.qty}>
                      {i.qty} × {i.name} ({i.have}){' '}
                    </span>
                  ))}
                </p>
              )}
              {a.outputs.length > 0 && (
                <p className="small">
                  Makes:{' '}
                  {a.outputs
                    .map((o) => `${o.min === o.max ? o.min : `${o.min}–${o.max}`} × ${o.name}`)
                    .join(', ')}
                </p>
              )}
              {a.effect && (
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  aria-label={`Item to ${a.effect}`}
                >
                  <option value="">Choose an item…</option>
                  {gear.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} · quality {i.quality}
                    </option>
                  ))}
                </select>
              )}
              <button
                className="btn btn-primary btn-sm"
                disabled={a.locked || missing || needsTarget || busy > 0 || perform.isPending}
                onClick={() => run(a)}
              >
                {a.name}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
