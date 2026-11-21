import type {
  CharacterDto,
  CharacterListResponse,
  CharacterSheetDto,
  CreateCharacterRequest,
  AllocateAttributesRequest,
  EquipRequest,
  LoadoutRequest,
  UnequipRequest,
} from '@realms/shared';
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

export const sheetQueryKey = (id: string) => ['characters', id, 'sheet'] as const;

export function useCharacterSheet(id: string) {
  return useQuery({
    queryKey: sheetQueryKey(id),
    queryFn: () => api<CharacterSheetDto>('GET', `/characters/${id}`),
  });
}

/** Equip / unequip; the server returns the updated sheet, which replaces the cached one. */
export function useEquipment(id: string) {
  const qc = useQueryClient();
  const onSuccess = (sheet: CharacterSheetDto) => qc.setQueryData(sheetQueryKey(id), sheet);
  return {
    equip: useMutation({
      mutationFn: (input: EquipRequest) =>
        api<CharacterSheetDto>('POST', `/characters/${id}/equip`, input),
      onSuccess,
    }),
    unequip: useMutation({
      mutationFn: (input: UnequipRequest) =>
        api<CharacterSheetDto>('POST', `/characters/${id}/unequip`, input),
      onSuccess,
    }),
    /** Use an item, e.g. read a Skill Book (request #47). */
    use: useMutation({
      mutationFn: (itemId: string) =>
        api<CharacterSheetDto>('POST', `/characters/${id}/items/${itemId}/use`),
      onSuccess,
    }),
  };
}

export function useAllocateAttributes(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AllocateAttributesRequest) =>
      api<CharacterSheetDto>('POST', `/characters/${id}/attributes`, input),
    onSuccess: (sheet) => qc.setQueryData(sheetQueryKey(id), sheet),
  });
}

/** Prepared skills (request #39); the server returns the updated sheet. */
export function useLoadout(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LoadoutRequest) =>
      api<CharacterSheetDto>('PUT', `/characters/${id}/loadout`, input),
    onSuccess: (sheet) => qc.setQueryData(sheetQueryKey(id), sheet),
  });
}
