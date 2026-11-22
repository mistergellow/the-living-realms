import type {
  ActivityResultDto,
  JobResponseDto,
  ProfessionProfileDto,
  ProfessionsDto,
} from '@realms/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const professionsKey = (characterId: string | null) => ['professions', characterId] as const;

export function useProfessions(characterId: string | null) {
  return useQuery({
    queryKey: professionsKey(characterId),
    enabled: !!characterId,
    queryFn: () => api<ProfessionsDto>('GET', `/characters/${characterId}/professions`),
    // Request #56: look again when a real-time job ends (the items arrive then).
    refetchInterval: (q) => {
      const job = q.state.data?.job;
      if (job?.status !== 'running') return false;
      return Math.max(1000, new Date(job.finishesAt).getTime() - Date.now() + 500);
    },
  });
}

/** Start a job of several attempts, paid in AP or in real time (request #56). */
export function useStartJob(characterId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: {
      professionId: string;
      activityId: string;
      mode: 'ap' | 'time';
      count: number;
    }) =>
      api<JobResponseDto>(
        'POST',
        `/characters/${characterId}/professions/${v.professionId}/activities/${v.activityId}/jobs`,
        { mode: v.mode, count: v.count },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: professionsKey(characterId) });
      void qc.invalidateQueries({ queryKey: ['characters'] });
    },
  });
}

export function useDismissJob(characterId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api<ProfessionsDto>('POST', `/characters/${characterId}/professions/jobs/dismiss`, {}),
    onSuccess: (data) => qc.setQueryData(professionsKey(characterId), data),
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
