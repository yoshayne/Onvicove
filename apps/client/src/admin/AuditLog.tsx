import { useQuery } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import Spinner from '../components/shared/Spinner';
import Badge from '../components/shared/Badge';

interface AuditLogEntry {
  id: string;
  admin_email: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export default function AuditLog() {
  const api = useApi();
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'audit-log'],
    queryFn: () => api.get<{ logs: AuditLogEntry[] }>('/admin/audit-log'),
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : error || !data ? (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error instanceof Error ? error.message : 'Failed to load audit log.'}
        </div>
      ) : !data.logs.length ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No admin actions recorded yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Admin</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Target</th>
                <th className="px-4 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {data.logs.map((log) => (
                <tr key={log.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{log.admin_email}</td>
                  <td className="px-4 py-3">
                    <Badge tone="info">{log.action}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {log.target_type}
                    {log.target_id ? ` · ${log.target_id.slice(0, 8)}…` : ''}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(log.details)}</pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
