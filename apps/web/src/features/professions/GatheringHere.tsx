import type { GatherRumourDto } from '@realms/shared';
import { useActiveRun } from '../rifts/api';
import { useProfessions } from './api';
import { GatherPanel } from './GatherPanel';
import { JobBanner } from './ProfessionsPage';
import './professions.css';

/**
 * Request #81: on the hex you stand on, every gathering profession it allows
 * is one action with its drop table. Below: the day's rumours (request #82).
 */
export function GatheringHere({ characterId }: { characterId: string }) {
  const list = useProfessions(characterId);
  const run = useActiveRun(characterId);
  if (!list.data || run.data) return null;
  const here = list.data.professions.filter((p) => p.category === 'gathering' && p.availableHere);
  const jobRunning = list.data.job?.status === 'running';
  return (
    <>
      {list.data.job && <JobBanner job={list.data.job} characterId={characterId} />}
      {here.length > 0 && (
        <section
          className="panel gather-here"
          aria-label="Gathering here"
          data-testid="gather-here"
        >
          <div className="panel-title">
            <span>Gathering here</span>
          </div>
          <div className="gather-list">
            {here.map((p) => (
              <GatherPanel key={p.id} p={p} characterId={characterId} jobRunning={jobRunning} />
            ))}
          </div>
        </section>
      )}
      <Rumours rumours={list.data.rumours} />
    </>
  );
}

const hoursLeft = (iso: string) =>
  Math.max(1, Math.ceil((new Date(iso).getTime() - Date.now()) / 3_600_000));

/** Request #82: where each gathering profession booms today. */
export function Rumours({ rumours }: { rumours: GatherRumourDto[] }) {
  if (!rumours.length) return null;
  return (
    <section className="panel rumours" aria-label="Word on the roads" data-testid="rumours">
      <div className="panel-title">
        <span>Word on the roads</span>
        <span className="muted small">changes in {hoursLeft(rumours[0]!.endsAt)}h</span>
      </div>
      <ul>
        {rumours.map((r) => (
          <li key={r.professionId}>
            <strong>{r.professionName}</strong> booms in <strong>{r.regionName}</strong>
            {r.near && (
              <span className="muted">
                {' '}
                — a motherlode is said to lie near ({r.near.q}, {r.near.r})
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
