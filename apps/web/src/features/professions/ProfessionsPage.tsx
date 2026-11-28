import {
  AP_RULES,
  ATTRIBUTE_NAMES,
  JOB_RULES,
  jobApCost,
  jobSeconds,
  MASTERY_RANK_NAMES,
  MASTERY_RANKS,
} from '@realms/game-core';
import type {
  ActivityDto,
  ActivityResultDto,
  JobResultDto,
  ProfessionDto,
  ProfessionJobDto,
} from '@realms/shared';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { FormError } from '../../shared/ui/FormError';
import { useActiveCharacter } from '../characters/active-character';
import { useCharacterSheet } from '../characters/api';
import { GatherPanel } from './GatherPanel';
import { LootReveal } from './LootReveal';
import { useDismissJob, usePerformActivity, useProfessions, useStartJob } from './api';
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
      <div className="page-head-text">
        <h1 className="page-title">Professions</h1>
        <p className="page-lead">
          Gather, craft and mend. Every attempt costs AP and teaches Mastery — pick a craft on the
          left to see what you can do with it.
        </p>
      </div>
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
  const [params] = useSearchParams();
  const [selected, setSelected] = useState<string>(params.get('p') ?? 'fishing');
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
      <div className="stack">
        {list.data?.job && <JobBanner job={list.data.job} characterId={characterId} />}
        {current && (
          <ProfessionDetail
            key={current.id}
            p={current}
            characterId={characterId}
            jobRunning={list.data?.job?.status === 'running'}
          />
        )}
      </div>
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

const clock = (s: number) =>
  s >= 3600
    ? `${Math.floor(s / 3600)}h ${Math.round((s % 3600) / 60)}m`
    : s >= 60
      ? `${Math.floor(s / 60)}m ${s % 60}s`
      : `${s}s`;

/** The real-time job (request #56): a countdown, then what it produced. */
export function JobBanner({ job, characterId }: { job: ProfessionJobDto; characterId: string }) {
  const left = useSecondsUntil(job.status === 'running' ? job.finishesAt : null);
  const dismiss = useDismissJob(characterId);
  const r = job.result;
  return (
    <section className="panel prof-job" data-testid="profession-job" data-status={job.status}>
      {job.status === 'running' ? (
        <p style={{ margin: 0 }}>
          Working: <strong>{job.activityName}</strong> × {job.count} ({job.professionName}) ·{' '}
          {left > 0 ? `${clock(left)} left` : 'finishing…'}
          <span className="muted small"> · the items arrive when it ends</span>
        </p>
      ) : (
        <div className="row" style={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
          <span>
            <strong>Job done:</strong> {r?.message}
            {r && r.produced.length > 0 && (
              <>
                {' '}
                Got{' '}
                {r.produced
                  .map((o) => `${o.qty} × ${o.grade ? `${o.grade} ` : ''}${o.name}`)
                  .join(', ')}
                .
              </>
            )}{' '}
            {r && <span className="muted">+{r.pointsGained} Mastery</span>}
          </span>
          <span className="spacer" />
          <button className="btn btn-sm" onClick={() => dismiss.mutate()}>
            OK
          </button>
        </div>
      )}
    </section>
  );
}

/** Several attempts at once: pay with AP now, or with real time (request #56). */
function JobControls({
  p,
  a,
  characterId,
  disabled,
  onResult,
}: {
  p: ProfessionDto;
  a: ActivityDto;
  characterId: string;
  disabled: boolean;
  onResult: (r: JobResultDto) => void;
}) {
  const [count, setCount] = useState(5);
  const start = useStartJob(characterId);
  const n = Math.max(1, Math.min(JOB_RULES.maxCount, Math.floor(count) || 1));
  const ap = jobApCost(p.category, n, AP_RULES.gatherCost);
  const seconds = jobSeconds(p.category, a, n);
  const go = (mode: 'ap' | 'time') =>
    start.mutate(
      { professionId: p.id, activityId: a.id, mode, count: n },
      { onSuccess: (res) => res.result && onResult(res.result) },
    );
  return (
    <div className="job-controls" data-testid={`job-${a.id}`}>
      <label className="small muted">
        Attempts{' '}
        <input
          type="number"
          min={1}
          max={JOB_RULES.maxCount}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          aria-label={`Attempts of ${a.name}`}
        />
      </label>
      <button
        className="btn btn-sm"
        disabled={disabled || start.isPending}
        onClick={() => go('ap')}
        title="All at once, paid in Action Points"
      >
        Now · {ap} AP
      </button>
      <button
        className="btn btn-sm"
        disabled={disabled || start.isPending}
        onClick={() => go('time')}
        title="No AP: the items arrive when the time is up"
      >
        Wait · {clock(seconds)}
      </button>
      <FormError error={start.error} />
    </div>
  );
}

function ProfessionDetail({
  p,
  characterId,
  jobRunning,
}: {
  p: ProfessionDto;
  characterId: string;
  jobRunning: boolean;
}) {
  const [jobResult, setJobResult] = useState<JobResultDto | null>(null);
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
      {jobResult && <LootReveal result={jobResult} />}
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

      {p.category === 'gathering' ? (
        <GatherPanel p={p} characterId={characterId} jobRunning={jobRunning} />
      ) : (
        <>
          <h3 className="prof-sub">Recipes ({unlocked.length})</h3>
          <div className="activities">
            {unlocked.map((a) => {
              const missing = a.inputs.some((i) => i.have < i.qty);
              const needsTarget = !!a.effect && !target;
              // Request #64: say why a recipe cannot be done right now.
              const blocked = !p.availableHere
                ? `Travel to a ${p.terrains?.join(' or ').toLowerCase()} hex first.`
                : p.node && p.node.amount < 1
                  ? 'This spot is exhausted for now.'
                  : p.tool && !p.tool.best
                    ? `You need a ${p.tool.name} in your bag.`
                    : missing
                      ? 'You are missing materials.'
                      : jobRunning
                        ? 'A job is running.'
                        : null;
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
                  {blocked && (
                    <p className="small field-error" data-testid={`blocked-${a.id}`}>
                      {blocked}
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
                      jobRunning ||
                      perform.isPending
                    }
                    onClick={() => run(a)}
                  >
                    {a.name}
                  </button>
                  {!a.effect && (
                    <JobControls
                      p={p}
                      a={a}
                      characterId={characterId}
                      disabled={
                        !p.availableHere || (!!p.tool && !p.tool.best) || missing || jobRunning
                      }
                      onResult={setJobResult}
                    />
                  )}
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
