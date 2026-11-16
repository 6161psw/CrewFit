import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, API_URL, tokenStore } from '../api/client';
import type { Me } from '../api/types';

export const googleLoginUrl = (client: 'web' | 'admin') => `${API_URL}/auth/google?client=${client}`;

export async function devLogin(email: string, name?: string) {
  const res = await api.post<{ accessToken: string }>('/auth/dev-login', { email, name });
  tokenStore.set(res.accessToken);
}

export async function logout() {
  await api.post('/auth/logout').catch(() => undefined);
  tokenStore.clear();
}

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<Me>('/users/me'),
    enabled: !!tokenStore.get(),
    retry: false,
    staleTime: 60_000,
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return async () => {
    await logout();
    qc.clear();
  };
}

export const isAdminRole = (me?: Me) => me?.role === 'SCHOOL_ADMIN' || me?.role === 'SUPER_ADMIN';
