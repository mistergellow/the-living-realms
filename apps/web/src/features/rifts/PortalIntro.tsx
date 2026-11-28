import { useEffect, useState } from 'react';
import { prefersReducedMotion } from '../../lib/audio';

/** Runs whose portal was already shown in this tab (so a reload mid-run does not replay it). */
const shown = new Set<string>();

/**
 * Request #89 (phase B): stepping into a Rift. A violet vortex opens over the
 * screen, swallows it and fades into the first room — once per run.
 */
export function PortalIntro({ runId }: { runId: string }) {
  const [on, setOn] = useState(() => !shown.has(runId) && !prefersReducedMotion());
  useEffect(() => {
    shown.add(runId);
    if (!on) return;
    const t = window.setTimeout(() => setOn(false), 1300);
    return () => clearTimeout(t);
  }, [runId, on]);
  if (!on) return null;
  return (
    <div className="portal-intro" aria-hidden data-testid="portal-intro">
      <div className="portal-swirl" />
      <div className="portal-core" />
    </div>
  );
}
