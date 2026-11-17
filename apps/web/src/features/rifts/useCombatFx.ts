import type { CombatView } from '@realms/shared';
import { useEffect, useRef, useState } from 'react';

export interface FloatText {
  key: number;
  text: string;
  kind: 'damage' | 'crit' | 'heal' | 'dodge';
}

export interface CombatFx {
  actingId: string | null;
  hitIds: Set<string>;
  floats: Record<string, FloatText[]>;
}

const STEP_MS = 650;
const EMPTY: CombatFx = { actingId: null, hitIds: new Set(), floats: {} };

/**
 * Turns new combat log entries into a sequence of short animation steps:
 * attacker lunges, targets flash, numbers float. One step per ability used,
 * so an enemy phase with several attacks plays out one by one.
 */
export function useCombatFx(log: CombatView['log'] | undefined): CombatFx {
  const [fx, setFx] = useState<CombatFx>(EMPTY);
  const lastSeq = useRef<number | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (!log?.length) return;
    const maxSeq = log[log.length - 1]!.seq;
    if (lastSeq.current === null) {
      lastSeq.current = maxSeq; // first load: no replay
      return;
    }
    const fresh = log.filter((e) => e.seq > lastSeq.current!);
    lastSeq.current = maxSeq;
    if (!fresh.length) return;

    const steps: CombatFx[] = [];
    let k = Date.now();
    for (const e of fresh) {
      if (e.t === 'ability' || e.t === 'swap')
        steps.push({ actingId: e.actorId, hitIds: new Set(), floats: {} });
      const cur = steps[steps.length - 1];
      if (!cur) continue;
      const push = (id: string, f: Omit<FloatText, 'key'>) => {
        (cur.floats[id] ??= []).push({ ...f, key: k++ });
      };
      if (e.t === 'damage') {
        cur.hitIds.add(e.targetId);
        push(e.targetId, { text: `-${e.amount}`, kind: e.crit ? 'crit' : 'damage' });
      } else if (e.t === 'heal') push(e.targetId, { text: `+${e.amount}`, kind: 'heal' });
      else if (e.t === 'dodge') push(e.targetId, { text: 'Dodge', kind: 'dodge' });
    }
    timers.current.forEach(clearTimeout);
    timers.current = steps.map((s, i) => window.setTimeout(() => setFx(s), i * STEP_MS));
    timers.current.push(window.setTimeout(() => setFx(EMPTY), steps.length * STEP_MS + 200));
  }, [log]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  return fx;
}
