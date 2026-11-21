import { setCustomContent } from '@realms/game-core';
import type {
  AdminCharacterDto,
  AdminCharacterListResponse,
  AdminGrantItemRequest,
  AdminUpdateCharacterRequest,
  AdminUpdateItemRequest,
  CustomAbilityDto,
  CustomAbilityInput,
  CustomContentDto,
  CustomItemDto,
  CustomItemInput,
} from '@realms/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

/*
 * Admin tools (request #41) and the custom content every client needs.
 * Admin-made items/abilities are loaded into the game-core registry so that
 * getItemDef/getAbility (sheet, combat bar, combat log, art) know them.
 */

export const customContentQueryKey = ['content', 'custom'] as const;

/** Loads admin-made content into the registry. Used by RequireAuth before any game screen. */
export function useCustomContent(enabled: boolean) {
  return useQuery({
    queryKey: customContentQueryKey,
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const content = await api<CustomContentDto>('GET', '/content/custom');
      setCustomContent(content);
      return content;
    },
  });
}

const characterKey = (id: string) => ['admin', 'character', id] as const;

export function useAdminCharacters() {
  return useQuery({
    queryKey: ['admin', 'characters'],
    queryFn: () => api<AdminCharacterListResponse>('GET', '/admin/characters'),
  });
}

export function useAdminCharacter(id: string | null) {
  return useQuery({
    queryKey: characterKey(id ?? ''),
    enabled: !!id,
    queryFn: () => api<AdminCharacterDto>('GET', `/admin/characters/${id}`),
  });
}

type CharacterAction =
  | { type: 'update'; body: AdminUpdateCharacterRequest }
  | { type: 'grant'; body: AdminGrantItemRequest }
  | { type: 'updateItem'; itemId: string; body: AdminUpdateItemRequest }
  | { type: 'removeItem'; itemId: string }
  | { type: 'teach'; abilityId: string }
  | { type: 'forget'; abilityId: string };

/** Every change returns the updated character, which replaces the cached one. */
export function useAdminCharacterAction(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (a: CharacterAction) => {
      const base = `/admin/characters/${id}`;
      switch (a.type) {
        case 'update':
          return api<AdminCharacterDto>('PATCH', base, a.body);
        case 'grant':
          return api<AdminCharacterDto>('POST', `${base}/items`, a.body);
        case 'updateItem':
          return api<AdminCharacterDto>('PATCH', `${base}/items/${a.itemId}`, a.body);
        case 'removeItem':
          return api<AdminCharacterDto>('DELETE', `${base}/items/${a.itemId}`);
        case 'teach':
          return api<AdminCharacterDto>('POST', `${base}/skills`, { abilityId: a.abilityId });
        case 'forget':
          return api<AdminCharacterDto>(
            'DELETE',
            `${base}/skills/${encodeURIComponent(a.abilityId)}`,
          );
      }
    },
    onSuccess: (dto) => {
      qc.setQueryData(characterKey(id), dto);
      // The player's own screens (sheet, top bar) show the change on next view.
      void qc.invalidateQueries({ queryKey: ['characters', id] });
      void qc.invalidateQueries({ queryKey: ['admin', 'characters'] });
    },
  });
}

export function useSaveCustomItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string | null; input: CustomItemInput }) =>
      id
        ? api<CustomItemDto>('PUT', `/admin/content/items/${id}`, input)
        : api<CustomItemDto>('POST', '/admin/content/items', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: customContentQueryKey }),
  });
}

export function useSaveCustomAbility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string | null; input: CustomAbilityInput }) =>
      id
        ? api<CustomAbilityDto>('PUT', `/admin/content/abilities/${id}`, input)
        : api<CustomAbilityDto>('POST', '/admin/content/abilities', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: customContentQueryKey }),
  });
}
