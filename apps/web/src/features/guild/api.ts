import type { GuildViewDto } from '@realms/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const guildKey = (characterId: string | null) => ['guild', characterId] as const;

/** Guilds (request #57). */
export function useGuild(characterId: string | null) {
  return useQuery({
    queryKey: guildKey(characterId),
    enabled: !!characterId,
    queryFn: () => api<GuildViewDto>('GET', `/characters/${characterId}/guild`),
  });
}

export function useGuildAction(characterId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { method?: 'POST' | 'PATCH'; path: string; body?: Record<string, unknown> }) =>
      api<GuildViewDto>(
        v.method ?? 'POST',
        `/characters/${characterId}/guild${v.path}`,
        v.body ?? {},
      ),
    onSuccess: (view) => {
      qc.setQueryData(guildKey(characterId), view);
      void qc.invalidateQueries({ queryKey: ['characters'] });
      void qc.invalidateQueries({ queryKey: ['city'] });
    },
  });
}
