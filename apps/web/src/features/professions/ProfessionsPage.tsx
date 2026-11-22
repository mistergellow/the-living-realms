import { ATTRIBUTE_NAMES, MASTERY_RANK_NAMES, MASTERY_RANKS } from '@realms/game-core';
import type { ActivityDto, ActivityResultDto, ProfessionDto } from '@realms/shared';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { FormError } from '../../shared/ui/FormError';
import { useActiveCharacter } from '../characters/active-character';
import { useCharacterSheet } from '../characters/api';
import { usePerformActivity, useProfessions } from './api';
import './professions.css';

/** The two sections of the profession screen (spec §19). */
export const PROFESSION_SECTIONS = [
  { category: 'gathering', title: 'Gathering Mastery' },
  { category: 'crafting', title: 'Crafting Mastery' },
] as const;

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

/** "1 attempt", "3 attempts". */
export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

const progress = (p: { points: number; pointsToNext: number }) =>
  p.pointsToNext ? Math.min(100, (p.points / p.pointsToNext) * 100) : 100;

/**
 * Professions (request #33, Mastery from request #51): 15 professions in two
 * sections, each with its own Mastery rank (Novice → Grandmaster).
 */
export function ProfessionsPage() {
  const characterId = useActiveCharacter((s) => s.characterId);
  if (!characterId) return <Navigate to="/" replace />;
  return (
    <div className="screen-body">
      <div className="contain stack">
        <InspectBox />
        <ProfessionsPanel characterId={characterId} />
      </div>
    </div>
  );
}

/** Look up another player's professional profile by character name. */
function InspectBox() {
  const [name, setName] = useState('');
  const navigate = useNavigate();
  return (
    <form
      className="row prof-inspect"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) navigate(`/professions/inspect/${encodeURIComponent(name.trim())}`);
      }}
    >
      <h1 className="page-title" style={{ margin: 0 }}>
        Professions
      </h1>
      <span className="spacer" />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Character name"
        aria-label="Character to inspect"
        maxLength={40}
      />
      <button className="btn btn-sm" type="submit" disabled={!name.trim()}>
        Inspect
      </button>
    </form>
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
        {PROFESSION_SECTIONS.map((s) => (
          <section key={s.category} data-testid={`section-${s.category}`}>
            <div className="panel-title">{s.title}</div>
            {profs
              .filter((p) => p.category === s.category)
              .map((p) => (
                <button
                  key={p.id}
                  className="prof-row"
                  data-active={p.id === current?.id}
                  data-testid={`profession-${p.id}`}
                  onClick={() => setSelected(p.id)}
                >
                  <span>{p.name}</span>
                  <span className="prof-level" data-rank={p.rank}>
                    {p.rankName}
                  </span>
                  <span className="prof-xp">
                    <i style={{ width: `${progress(p)}%` }} />
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

/** Six pips, Novice → Grandmaster. */
export function RankLadder({ rank }: { rank: number }) {
  return (
    <ol className="rank-ladder" aria-label="Mastery ranks">
      {MASTERY_RANKS.map((r, i) => (
        <li key={r} data-reached={i <= rank} data-current={i === rank}>
          {MASTERY_RANK_NAMES[r]}
        </li>
      ))}
    </ol>
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
      ].filter((i) => i.slots.length > 0)
    : [];
  const unlocked = p.activities.filter((a) => !a.locked);
  const locked = p.activities.filter((a) => a.locked);
  const rate = p.stats.attempts ? Math.round((p.stats.successes / p.stats.attempts) * 100) : 0;

  const run = (a: ActivityDto) =>
    perform.mutate(
      { professionId: p.id, activityId: a.id, targetItemId: a.effect ? target : undefined },
      { onSuccess: setResult },
    );

  return (
    <section className="panel stack prof-detail" data-testid="profession-detail">
      <header className="stack" style={{ gap: '0.35rem' }}>
        <h2>
          {p.name} <span className="muted">· {p.title}</span>
        </h2>
        <p className="muted" style={{ margin: 0 }}>
          {p.description}
        </p>
        <RankLadder rank={p.rank} />
        <p style={{ margin: 0 }} data-testid="profession-level">
          <strong>{p.rankName}</strong>
          {p.pointsToNext
            ? ` · ${p.points}/${p.pointsToNext} Mastery to ${MASTERY_RANK_NAMES[MASTERY_RANKS[p.rank + 1]!]}`
            : ' · mastered'}
          {busy > 0 && <span className="muted"> · busy for {busy}s</span>}
        </p>
        <div className="prof-bar">
          <i style={{ width: `${progress(p)}%` }} />
        </div>
        {p.terrains && (
          <p
            className={p.availableHere ? 'muted' : 'field-error'}
            style={{ margin: 0 }}
            data-testid="profession-terrain"
          >
            Needs: {p.terrains.join(' or ')}
            {p.availableHere ? ' · you are on one' : ' · travel to one on the world map'}
          </p>
        )}
        {p.node && (
          <p style={{ margin: 0 }} data-testid="profession-node" data-empty={p.node.amount < 1}>
            {p.node.richness} spot here: <strong>{p.node.amount}</strong>/{p.node.max} left
            {p.node.readyAt && (
              <span className="field-error">
                {' '}
                · exhausted, regrows at {new Date(p.node.readyAt).toLocaleTimeString()}
              </span>
            )}
          </p>
        )}
      </header>

      <div className="prof-facts">
        {p.tool && (
          <div data-testid="profession-tool" data-ok={!!p.tool.best}>
            <span className="muted small">Tool</span>
            <strong>
              {p.tool.best
                ? `${p.tool.best.name} (tier ${p.tool.best.tier})`
                : `No ${p.tool.name} in your bag`}
            </strong>
          </div>
        )}
        <div title="Only BASE attributes count. They help a little; Mastery matters most.">
          <span className="muted small">Helped by</span>
          <strong data-testid="profession-attributes">
            {p.attributes.map((a) => ATTRIBUTE_NAMES[a.attribute]).join(', ')} · +{p.attributeBonus}
            %
          </strong>
        </div>
        <div>
          <span className="muted small">Statistics</span>
          <strong data-testid="profession-stats">
            {plural(p.stats.attempts, 'attempt')} · {rate}% success · {p.stats.itemsMade} made
          </strong>
        </div>
        <div>
          <span className="muted small">
            {p.category === 'gathering' ? 'Resources' : 'Works with'}
          </span>
          <strong>{p.resources.map((r) => r.name).join(', ') || '—'}</strong>
        </div>
      </div>

      <FormError error={perform.error} />
      {result && (
        <div className="prof-result" data-success={result.success} data-testid="activity-result">
          <strong>{result.message}</strong>{' '}
          <span className="muted">
            ({result.chance}% chance · +{result.pointsGained} Mastery)
          </span>
          {result.apSpent > 0 && <span className="muted"> · −{result.apSpent} AP</span>}
          {result.produced.length > 0 && (
            <div>
              Got:{' '}
              {result.produced
                .map((o) => `${o.qty} × ${o.grade ? `${o.grade} ` : ''}${o.name}`)
                .join(', ')}
            </div>
          )}
          {result.consumed.length > 0 && (
            <div className="muted">
              Used: {result.consumed.map((o) => `${o.qty} × ${o.name}`).join(', ')}
            </div>
          )}
        </div>
      )}

      <h3 className="prof-sub">Recipes ({unlocked.length})</h3>
      <div className="activities">
        {unlocked.map((a) => {
          const missing = a.inputs.some((i) => i.have < i.qty);
          const needsTarget = !!a.effect && !target;
          return (
            <article key={a.id} className="activity" data-testid={`activity-${a.id}`}>
              <h3>{a.name}</h3>
              <p className="muted small">{a.description}</p>
              <p className="small">
                {a.chance}% success · {a.apCost ? `${a.apCost} AP` : `${a.cooldownSeconds}s`} ·{' '}
                {a.points > 0 ? (
                  `+${a.points} Mastery`
                ) : (
                  <span className="muted">too simple to teach you more</span>
                )}
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
                disabled={
                  !p.availableHere ||
                  (!!p.node && p.node.amount < 1) ||
                  (!!p.tool && !p.tool.best) ||
                  missing ||
                  needsTarget ||
                  busy > 0 ||
                  perform.isPending
                }
                onClick={() => run(a)}
              >
                {a.name}
              </button>
            </article>
          );
        })}
      </div>

      {locked.length > 0 && (
        <>
          <h3 className="prof-sub">Not unlocked yet ({locked.length})</h3>
          <ul className="prof-locked" data-testid="locked-recipes">
            {locked.map((a) => (
              <li key={a.id}>
                <strong>{a.name}</strong>
                <span className="muted small"> · unlocks at {a.rankName}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="prof-cols">
        <div>
          <h3 className="prof-sub">History</h3>
          {p.history.length === 0 ? (
            <p className="muted small">No ranks gained yet.</p>
          ) : (
            <ul className="prof-history" data-testid="profession-history">
              {p.history.map((h) => (
                <li key={h.at}>
                  <strong>{h.rankName}</strong>{' '}
                  <span className="muted small">{new Date(h.at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="prof-sub">Commissions</h3>
          <p className="muted small">
            Other players will be able to order work from you when the player economy opens.
          </p>
        </div>
      </div>
    </section>
  );
}
