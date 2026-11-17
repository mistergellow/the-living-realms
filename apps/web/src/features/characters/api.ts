import type { CharacterDto, CharacterListResponse, CreateCharacterRequest } from '@realms/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const charactersQueryKey = ['characters'] as const;

export function useCharacters() {
  return useQuery({
    queryKey: charactersQueryKey,
    queryFn: () => api<CharacterListResponse>('GET', '/characters'),
  });
}

export function useCreateCharacter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCharacterRequest) =>
      api<{ character: CharacterDto }>('POST', '/characters', input).then((r) => r.character),
    onSuccess: () => qc.invalidateQueries({ queryKey: charactersQueryKey }),
  });
}

export function useDeleteCharacter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>('DELETE', `/characters/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: charactersQueryKey }),
  });
}
