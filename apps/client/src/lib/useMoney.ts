import { useQuery } from '@tanstack/react-query';
import { useApi } from './api';
import { formatMoney } from './metrics';
import type { Tenant } from '../types';

/** Formatter for the store's own currency (the tenant query is shared and cached across the dashboard). */
export function useMoney() {
  const api = useApi();
  const { data } = useQuery({ queryKey: ['tenant', 'me'], queryFn: () => api.get<{ tenant: Tenant }>('/tenants/me') });
  const currency = data?.tenant.currency;
  return (cents: number | null | undefined) => (cents == null ? '-' : formatMoney(cents, currency));
}
