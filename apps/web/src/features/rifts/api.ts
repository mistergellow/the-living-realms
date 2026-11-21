import type { CombatAction, RiftDto, RunDto } from '@realms/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const runKey = (runId: string) => ['rift-run', runId] as const;

export function useRifts() {
  return useQuery({
    queryKey: ['rifts'],
    queryFn: () => api<{ rifts: RiftDto[] }>('GET', '/rifts').then((r) => r.rifts),
  });
}

export function useActiveRun(characterId: string | null) {
  return useQuery({
    queryKey: ['rift-active', characterId],
    enabled: !!characterId,
    queryFn: () =>
      api<{ run: RunDto | null }>('GET', `/rifts/active?characterId=${characterId}`).then(
        (r) => r.run,
      ),
  });
}

export function useStartRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { riftId: string; characterId: string }) =>
      api<RunDto>('POST', `/rifts/${v.riftId}/runs`, { characterId: v.characterId }),
    onSuccess: (run) => qc.setQueryData(runKey(run.id), run),
  });
}

export function useRun(runId: string, characterId: string | null) {
  return useQuery({
    queryKey: runKey(runId),
    enabled: !!characterId,
    queryFn: () => api<RunDto>('GET', `/rifts/runs/${runId}?characterId=${characterId}`),
    staleTime: Infinity,
    // Group runs (A29): poll so other players' votes, plans, the resolution
    // and expired timers show up here.
    refetchInterval: (q) => {
      const run = q.state.data;
      if (!run || run.status !== 'active') return false;
      const me = `p:${characterId}`;
      const planning =
        run.combat?.phase === 'planning' &&
        !run.combat.ready.includes(me) &&
        run.combat.combatants.some((c) => c.id === me && !c.downed && !c.stunned);
      // While you are still planning, refresh less often (others may leave or swap with you).
      return planning ? 4_000 : 1_500;
    },
  });
}

export function useRunAction(runId: string, characterId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (action: CombatAction) =>
      api<RunDto>('POST', `/rifts/runs/${runId}/actions`, { characterId, action }),
    onSuccess: (run) => {
      qc.setQueryData(runKey(runId), run);
      if (run.status !== 'active') {
        void qc.invalidateQueries({ queryKey: ['characters'] });
        void qc.invalidateQueries({ queryKey: ['rift-active'] });
      }
    },
  });
}
