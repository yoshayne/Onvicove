import { useQuery } from '@tanstack/react-query';
import { useApi } from './api';

/** True when the signed-in person is a platform admin (the server decides; non-admins get a 403 here). */
export function useIsAdmin(enabled = true) {
  const api = useApi();
  const q = useQuery({
    queryKey: ['admin', 'whoami'],
    queryFn: () => api.get<{ admin: boolean }>('/admin/whoami'),
    retry: false,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
  return { isAdmin: q.data?.admin === true, isLoading: enabled && q.isLoading };
}
