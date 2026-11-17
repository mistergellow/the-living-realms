import type { LoginRequest, MeResponse, RegisterRequest } from '@realms/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../../lib/api';

export const meQueryKey = ['auth', 'me'] as const;

/** Current account, or null when logged out. */
export function useMe() {
  return useQuery({
    queryKey: meQueryKey,
    queryFn: async () => {
      try {
        return (await api<MeResponse>('GET', '/auth/me')).account;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginRequest) => api<MeResponse>('POST', '/auth/login', input),
    onSuccess: (res) => {
      qc.clear();
      qc.setQueryData(meQueryKey, res.account);
    },
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterRequest) => api<MeResponse>('POST', '/auth/register', input),
    onSuccess: (res) => {
      qc.clear();
      qc.setQueryData(meQueryKey, res.account);
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>('POST', '/auth/logout'),
    onSettled: () => {
      qc.clear();
      qc.setQueryData(meQueryKey, null);
    },
  });
}
