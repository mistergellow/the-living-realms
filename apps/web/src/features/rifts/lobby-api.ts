import type { LobbyDto, LobbyOverviewDto, LobbyVisibility } from '@realms/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

/*
 * Lobbies refresh by polling (A29): simple and robust at this scale. A
 * WebSocket push can replace the intervals later without changing the API.
 */
export const lobbyKey = (id: string) => ['lobby', id] as const;
export const overviewKey = (characterId: string | null) => ['lobby-overview', characterId] as const;

export function useLobbyOverview(characterId: string | null) {
  return useQuery({
    queryKey: overviewKey(characterId),
    enabled: !!characterId,
    refetchInterval: 4_000,
    queryFn: () => api<LobbyOverviewDto>('GET', `/rifts/lobbies?characterId=${characterId}`),
  });
}

export function useLobby(lobbyId: string, characterId: string | null) {
  return useQuery({
    queryKey: lobbyKey(lobbyId),
    enabled: !!characterId,
    refetchInterval: (q) => (q.state.data?.status === 'open' ? 1_500 : false),
    queryFn: () => api<LobbyDto>('GET', `/rifts/lobbies/${lobbyId}?characterId=${characterId}`),
  });
}

export function useLobbyActions(characterId: string | null) {
  const qc = useQueryClient();
  const set = (l: LobbyDto) => {
    qc.setQueryData(lobbyKey(l.id), l);
    void qc.invalidateQueries({ queryKey: overviewKey(characterId) });
  };
  const post = <T>(url: string, body: Record<string, unknown> = {}) =>
    api<T>('POST', url, { characterId, ...body });
  return {
    create: useMutation({
      mutationFn: (v: { riftId: string; visibility: LobbyVisibility }) =>
        post<LobbyDto>('/rifts/lobbies', v),
      onSuccess: set,
    }),
    join: useMutation({
      mutationFn: (lobbyId: string) => post<LobbyDto>(`/rifts/lobbies/${lobbyId}/join`),
      onSuccess: set,
    }),
    leave: useMutation({
      mutationFn: (lobbyId: string) => post<void>(`/rifts/lobbies/${lobbyId}/leave`),
      onSuccess: () => void qc.invalidateQueries({ queryKey: overviewKey(characterId) }),
    }),
    slot: useMutation({
      mutationFn: (v: { lobbyId: string; slot: number }) =>
        post<LobbyDto>(`/rifts/lobbies/${v.lobbyId}/slot`, { slot: v.slot }),
      onSuccess: set,
    }),
    ready: useMutation({
      mutationFn: (v: { lobbyId: string; ready: boolean }) =>
        post<LobbyDto>(`/rifts/lobbies/${v.lobbyId}/ready`, { ready: v.ready }),
      onSuccess: set,
    }),
    kick: useMutation({
      mutationFn: (v: { lobbyId: string; targetCharacterId: string }) =>
        post<LobbyDto>(`/rifts/lobbies/${v.lobbyId}/kick`, {
          targetCharacterId: v.targetCharacterId,
        }),
      onSuccess: set,
    }),
    invite: useMutation({
      mutationFn: (v: { lobbyId: string; friendCharacterId: string }) =>
        post<LobbyDto>(`/rifts/lobbies/${v.lobbyId}/invite`, {
          friendCharacterId: v.friendCharacterId,
        }),
      onSuccess: set,
    }),
    start: useMutation({
      mutationFn: (lobbyId: string) => post<LobbyDto>(`/rifts/lobbies/${lobbyId}/start`),
      onSuccess: set,
    }),
  };
}
