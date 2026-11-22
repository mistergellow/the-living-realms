import type { CityDto } from '@realms/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { sheetQueryKey } from '../characters/api';

export const cityKey = (characterId: string | null) => ['city', characterId] as const;

/** City services (request #50). */
export function useCity(characterId: string | null) {
  return useQuery({
    queryKey: cityKey(characterId),
    enabled: !!characterId,
    queryFn: () => api<CityDto>('GET', `/characters/${characterId}/city`),
  });
}

export function useCityAction(characterId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { path: string; body: Record<string, unknown> }) =>
      api<CityDto>('POST', `/characters/${characterId}/city/${v.path}`, v.body),
    onSuccess: (city) => {
      qc.setQueryData(cityKey(characterId), city);
      qc.setQueryData(sheetQueryKey(characterId!), city.sheet);
    },
  });
}
