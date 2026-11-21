import type {
  CharacterDto,
  CharacterListResponse,
  CharacterSheetDto,
  CreateCharacterRequest,
  AllocateAttributesRequest,
  EquipRequest,
  ReadBookResultDto,
  SetOriginRequest,
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

/** Request #36: read a skill book (use an item); the book is consumed even on failure. */
export function useReadBook(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      api<ReadBookResultDto>('POST', `/characters/${id}/items/${itemId}/read`),
    onSuccess: (r) => qc.setQueryData(sheetQueryKey(id), r.sheet),
  });
}

/** Characters made before origins existed choose theirs once. */
export function useSetOrigin(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SetOriginRequest) =>
      api<CharacterSheetDto>('POST', `/characters/${id}/origin`, input),
    onSuccess: (sheet) => qc.setQueryData(sheetQueryKey(id), sheet),
  });
}
