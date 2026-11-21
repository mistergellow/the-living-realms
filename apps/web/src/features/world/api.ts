import type { CharacterDto, HexCoord, RunDto, WorldBossDto } from '@realms/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { runKey } from '../rifts/api';
import { useWorldStore } from './world-store';

/** Travel to a hex (request #43): pays AP; the new position and AP come back. */
export function useTravel(characterId: string | null) {
  const qc = useQueryClient();
  const updateSelf = useWorldStore((s) => s.updateSelf);
  return useMutation({
    mutationFn: (to: HexCoord) =>
      api<{ character: CharacterDto }>('POST', `/characters/${characterId}/move`, { to }).then(
        (r) => r.character,
      ),
    onSuccess: (c) => {
      updateSelf(c);
      // What you can do depends on where you stand.
      void qc.invalidateQueries({ queryKey: ['world-boss'] });
      void qc.invalidateQueries({ queryKey: ['professions'] });
    },
  });
}

export const worldBossKey = (characterId: string | null) => ['world-boss', characterId] as const;

export function useWorldBoss(characterId: string | null) {
  return useQuery({
    queryKey: worldBossKey(characterId),
    queryFn: () =>
      api<WorldBossDto>('GET', `/world-boss${characterId ? `?characterId=${characterId}` : ''}`),
    refetchInterval: 60_000,
  });
}

export function useWorldBossFight(characterId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api<{ run: RunDto }>('POST', '/world-boss/fight', { characterId }).then((r) => r.run),
    onSuccess: (run) => {
      qc.setQueryData(runKey(run.id), run);
      void qc.invalidateQueries({ queryKey: ['world-boss'] });
      void qc.invalidateQueries({ queryKey: ['rift-active'] });
    },
  });
}
