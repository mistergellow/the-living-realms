import type { ActivityResultDto, ProfessionProfileDto, ProfessionsDto } from '@realms/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const professionsKey = (characterId: string | null) => ['professions', characterId] as const;

export function useProfessions(characterId: string | null) {
  return useQuery({
    queryKey: professionsKey(characterId),
    enabled: !!characterId,
    queryFn: () => api<ProfessionsDto>('GET', `/characters/${characterId}/professions`),
  });
}

export function usePerformActivity(characterId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { professionId: string; activityId: string; targetItemId?: string }) =>
      api<ActivityResultDto>(
        'POST',
        `/characters/${characterId}/professions/${v.professionId}/activities/${v.activityId}`,
        v.targetItemId ? { targetItemId: v.targetItemId } : {},
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: professionsKey(characterId) });
      // Items changed (materials, repairs, upgrades).
      void qc.invalidateQueries({ queryKey: ['characters'] });
    },
  });
}

/** Another character's professional profile, by name (request #51). */
export function useProfessionProfile(name: string | undefined) {
  return useQuery({
    queryKey: ['professions', 'profile', name],
    enabled: !!name,
    queryFn: () =>
      api<ProfessionProfileDto>(
        'GET',
        `/characters/by-name/${encodeURIComponent(name!)}/professions/profile`,
      ),
  });
}
