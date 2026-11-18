import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from './api';

/** Move one row up or down and save the new order (the list shows the change straight away) */
export function useReorder<T extends { id: string }>(queryKey: string, path: string, pick: (data: unknown) => T[], put: (data: unknown, items: T[]) => unknown) {
  const api = useApi();
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: (ids: string[]) => api.put(`${path}/order`, { ids }),
    onError: () => qc.invalidateQueries({ queryKey: [queryKey] }),
  });
  return (items: T[], index: number, delta: -1 | 1) => {
    const to = index + delta;
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    [next[index], next[to]] = [next[to], next[index]];
    qc.setQueryData([queryKey], (old: unknown) => put(old, next));
    save.mutate(next.map((x) => x.id));
  };
}
