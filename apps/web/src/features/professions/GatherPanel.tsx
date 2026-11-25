import { AP_RULES, JOB_RULES, jobApCost, jobSeconds } from '@realms/game-core';
import type { ActivityDto, JobResultDto, ProfessionDto } from '@realms/shared';
import { useState } from 'react';
import { FormError } from '../../shared/ui/FormError';
import { DefIcon } from '../characters/sheet/ItemIcon';
import { liveAp } from '../world/ap';
import { useWorldStore } from '../world/world-store';
import { useStartJob } from './api';

export const clock = (s: number) =>
  s >= 3600
    ? `${Math.floor(s / 3600)}h ${Math.round((s % 3600) / 60)}m`
    : s >= 60
      ? `${Math.floor(s / 60)}m ${s % 60}s`
      : `${s}s`;

const qtyText = (o: { min: number; max: number }) =>
  o.min === o.max ? `${o.min}` : `${o.min}–${o.max}`;

const pct = (n: number) => (n >= 10 || Number.isInteger(n) ? Math.round(n) : n.toFixed(1));

/** Why the action cannot be done right now (request #64), or null. */
function blockedReason(p: ProfessionDto, jobRunning: boolean): string | null {
  if (!p.availableHere)
    return `Travel to a ${p.terrains?.join(' or ').toLowerCase()} hex to ${p.name.toLowerCase()}.`;
  if (p.node && p.node.amount < 1) return 'This spot is exhausted for now. Try another hex.';
  if (p.tool && !p.tool.best) return `You need a ${p.tool.name} in your bag.`;
  if (jobRunning) return 'You are busy with a job.';
  return null;
}

/**
 * Request #81: a gathering profession as ONE action. Shows what the hex can
 * give (icons, % per attempt), the hot zone of the day (request #82), and a
 * slider to choose how long to work — paid in AP now or in real time.
 */
export function GatherPanel({
  p,
  characterId,
  jobRunning,
}: {
  p: ProfessionDto;
  characterId: string;
  jobRunning: boolean;
}) {
  const a = p.activities[0];
  if (!a?.drops) return null;
  return <GatherBody p={p} a={a} characterId={characterId} jobRunning={jobRunning} />;
}

function GatherBody({
  p,
  a,
  characterId,
  jobRunning,
}: {
  p: ProfessionDto;
  a: ActivityDto;
  characterId: string;
  jobRunning: boolean;
}) {
  const [count, setCount] = useState(5);
  const [result, setResult] = useState<JobResultDto | null>(null);
  const start = useStartJob(characterId);
  const apNow = useWorldStore((s) => (s.self ? liveAp(s.self.ap) : null));
  const drops = a.drops ?? [];
  const blocked = blockedReason(p, jobRunning);
  const maxCount = Math.max(
    1,
    Math.min(JOB_RULES.maxCount, p.node ? Math.max(1, p.node.amount) : JOB_RULES.maxCount),
  );
  const n = Math.max(1, Math.min(maxCount, count));
  const ap = jobApCost('gathering', n, AP_RULES.gatherCost);
  const seconds = jobSeconds('gathering', a, n);
  const short = apNow !== null && apNow < ap;
  const go = (mode: 'ap' | 'time') => {
    setResult(null);
    start.mutate(
      { professionId: p.id, activityId: a.id, mode, count: n },
      { onSuccess: (res) => res.result && setResult(res.result) },
    );
  };

  // Expected haul for the chosen attempts (average quantities).
  const expected = drops
    .filter((d) => d.chance > 0)
    .flatMap((d) =>
      d.items.map((i) => ({
        id: i.itemDefId,
        name: i.name,
        qty: (n * d.chance * (i.min + i.max)) / 200,
      })),
    );

  return (
    <section
      className="gather"
      data-testid={`gather-${p.id}`}
      data-boom={!!p.site?.boom}
      data-motherlode={!!p.site?.motherlode}
    >
      <header className="gather-head">
        <div>
          <h3>{p.name}</h3>
          <span className="gather-rank">
            {p.rankName} {p.title}
            {p.pointsToNext > 0 && (
              <span className="muted">
                {' '}
                · {p.points}/{p.pointsToNext}
              </span>
            )}
          </span>
        </div>
        <div className="gather-tags">
          {p.site?.motherlode && (
            <span className="gather-tag" data-kind="motherlode" data-testid="tag-motherlode">
              Motherlode
            </span>
          )}
          {p.site?.boom && (
            <span
              className="gather-tag"
              data-kind="boom"
              title={`${p.name} is booming in ${p.site.boomRegion} today`}
            >
              Boom today
            </span>
          )}
          {p.site?.deposit && (
            <span className="gather-tag" data-kind="deposit" title="A vein: rare finds live here">
              Deposit
            </span>
          )}
          {p.node && (
            <span
              className="gather-tag"
              data-testid="profession-node"
              data-empty={p.node.amount < 1}
              title={
                p.node.readyAt
                  ? `Exhausted, regrows at ${new Date(p.node.readyAt).toLocaleTimeString()}`
                  : 'Each find takes one; it regrows over time'
              }
            >
              {p.node.richness} spot · {p.node.amount}/{p.node.max} left
            </span>
          )}
        </div>
      </header>

      <ul className="drop-table" aria-label={`What ${a.name.toLowerCase()} can give here`}>
        {drops.map((d, i) => (
          <li
            key={i}
            className="drop-row"
            data-locked={d.locked || d.needsDeposit}
            data-testid={`drop-${d.items[0]!.itemDefId}`}
          >
            <span className="drop-icons">
              {d.items.map((it) => (
                <DefIcon key={it.itemDefId} defId={it.itemDefId} />
              ))}
            </span>
            <span className="drop-name">
              {d.items.map((it) => `${qtyText(it)} × ${it.name}`).join(' + ')}
              {d.locked ? (
                <span className="drop-note">Unlocks at {d.rankName}</span>
              ) : d.needsDeposit ? (
                <span className="drop-note">Only in a deposit</span>
              ) : d.deposit ? (
                <span className="drop-note is-rare">Deposit find</span>
              ) : null}
            </span>
            <span className="drop-bar" aria-hidden>
              <i style={{ width: `${Math.min(100, d.chance)}%` }} />
            </span>
            <span className="drop-chance">
              {d.locked || d.needsDeposit ? '—' : `${pct(d.chance)}%`}
            </span>
          </li>
        ))}
        <li className="drop-row is-nothing">
          <span className="drop-icons" aria-hidden />
          <span className="drop-name muted">Nothing</span>
          <span className="drop-bar" aria-hidden>
            <i style={{ width: `${a.nothingChance ?? 0}%` }} />
          </span>
          <span className="drop-chance muted">{pct(a.nothingChance ?? 0)}%</span>
        </li>
      </ul>

      <div className="gather-work">
        <label className="gather-slider">
          <span>
            Attempts <strong data-testid={`attempts-${p.id}`}>{n}</strong>
          </span>
          <input
            type="range"
            min={1}
            max={maxCount}
            value={n}
            onChange={(e) => setCount(Number(e.target.value))}
            aria-label={`Attempts of ${a.name}`}
          />
        </label>
        <p className="gather-expect small muted">
          {expected.length
            ? `Expected: ${expected
                .map((e) => `~${e.qty >= 10 ? Math.round(e.qty) : e.qty.toFixed(1)} ${e.name}`)
                .join(', ')}`
            : 'Nothing to find here yet.'}
          {a.points > 0 ? ` · up to +${a.points * n} Mastery` : ''}
        </p>
        <div className="gather-buttons">
          <button
            className="btn btn-primary"
            disabled={!!blocked || short || start.isPending}
            onClick={() => go('ap')}
            title={short ? `You have ${apNow} AP` : 'All at once, paid in Action Points'}
            data-testid={`gather-now-${p.id}`}
          >
            {a.name} now · {ap} AP
          </button>
          <button
            className="btn"
            disabled={!!blocked || start.isPending}
            onClick={() => go('time')}
            title="No AP: the finds arrive when the time is up"
            data-testid={`gather-time-${p.id}`}
          >
            Over time · {clock(seconds)}
          </button>
        </div>
        {blocked && (
          <p className="small field-error" data-testid={`blocked-${a.id}`}>
            {blocked}
          </p>
        )}
        <FormError error={start.error} />
      </div>

      {result && (
        <div className="prof-result" data-success={result.successes > 0} data-testid="job-result">
          <strong>{result.message}</strong>{' '}
          <span className="muted">
            (+{result.pointsGained} Mastery · −{result.apSpent} AP)
          </span>
          {result.produced.length > 0 && (
            <div>
              Got:{' '}
              {result.produced
                .map((o) => `${o.qty} × ${o.grade ? `${o.grade} ` : ''}${o.name}`)
                .join(', ')}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
