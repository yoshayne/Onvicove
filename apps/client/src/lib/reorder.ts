import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from './api';
import { moveItem } from './dragReorder';

/** Move a row to a new place and save the order (the list shows the change straight away) */
export function useReorder<T extends { id: string }>(queryKey: string, path: string, pick: (data: unknown) => T[], put: (data: unknown, items: T[]) => unknown) {
  const api = useApi();
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: (ids: string[]) => api.put(`${path}/order`, { ids }),
    onError: () => qc.invalidateQueries({ queryKey: [queryKey] }),
  });
  return (items: T[], from: number, to: number) => {
    const next = moveItem(items, from, to);
    if (next === items) return;
    qc.setQueryData([queryKey], (old: unknown) => put(old, next));
    save.mutate(next.map((x) => x.id));
  };
}
