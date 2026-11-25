import type { GatherRumourDto } from '@realms/shared';

const hoursLeft = (iso: string) =>
  Math.max(1, Math.ceil((new Date(iso).getTime() - Date.now()) / 3_600_000));

/** Request #82: where each gathering profession booms today. */
export function Rumours({ rumours }: { rumours: GatherRumourDto[] }) {
  if (!rumours.length) return null;
  return (
    <section className="rumours" aria-label="Word on the roads" data-testid="rumours">
      <div className="panel-title">
        <span>Word on the roads</span>
      </div>
      <p className="muted small rumours-lead">
        Where gathering pays today. It all moves on in {hoursLeft(rumours[0]!.endsAt)}h.
      </p>
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
