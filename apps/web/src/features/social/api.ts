import type { FriendsDto } from '@realms/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const friendsKey = (characterId: string | null) => ['friends', characterId] as const;

/** Friends of the active character; refreshed periodically for requests and online status. */
export function useFriends(characterId: string | null) {
  return useQuery({
    queryKey: friendsKey(characterId),
    enabled: !!characterId,
    refetchInterval: 15_000,
    queryFn: () => api<FriendsDto>('GET', `/social/friends?characterId=${characterId}`),
  });
}

export function useFriendActions(characterId: string | null) {
  const qc = useQueryClient();
  const onSuccess = (data: FriendsDto) => qc.setQueryData(friendsKey(characterId), data);
  return {
    request: useMutation({
      mutationFn: (name: string) =>
        api<FriendsDto>('POST', '/social/friends/requests', { characterId, name }),
      onSuccess,
    }),
    accept: useMutation({
      mutationFn: (otherId: string) =>
        api<FriendsDto>('POST', `/social/friends/requests/${otherId}/accept`, { characterId }),
      onSuccess,
    }),
    remove: useMutation({
      mutationFn: (otherId: string) =>
        api<FriendsDto>('DELETE', `/social/friends/${otherId}?characterId=${characterId}`),
      onSuccess,
    }),
  };
}
