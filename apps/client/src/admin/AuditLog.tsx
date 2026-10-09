import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import Spinner from '../components/shared/Spinner';
import Badge from '../components/shared/Badge';
import Button from '../components/shared/Button';

interface AuditLogEntry {
  id: string;
  admin_email: string;
  action: string;
  target_type: string;
  target_id: string | null;
  target_label: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

interface AuditResponse {
  logs: AuditLogEntry[];
  page: number;
  page_size: number;
  filters: { actions: string[]; admins: string[] };
}

const ACTION_LABELS: Record<string, string> = {
  update_tenant: 'Updated store',
  delete_tenant: 'Deleted store',
  delete_all_tenants: 'Deleted all stores',
  create_tenant: 'Created store',
  send_invite: 'Sent invite',
  impersonate_start: 'Signed in as store',
  refund: 'Refunded payment',
  update_settings: 'Changed platform settings',
  create_coupon: 'Created coupon',
  update_coupon: 'Updated coupon',
  delete_coupon: 'Deleted coupon',
  domain_purchased: 'Domain purchased',
  domain_rejected: 'Domain request rejected',
};
const DANGER = new Set(['delete_tenant', 'delete_all_tenants', 'refund', 'delete_coupon', 'domain_rejected']);

const TARGET_LABELS: Record<string, string> = {
  tenant: 'Store',
  platform_settings: 'Platform settings',
  platform_coupon: 'Coupon',
  order: 'Order',
  booking: 'Booking',
};

function label(action: string) {
  return ACTION_LABELS[action] ?? action.replace(/_/g, ' ');
}

/** Short, readable summary of what changed. Whole-settings dumps are reduced to the keys, long text is clipped. */
function summarize(entry: AuditLogEntry): string {
  const d = entry.details ?? {};
  if (entry.action === 'update_settings') {
    return `Settings saved (${Object.keys(d).join(', ') || 'no fields'})`;
  }
  const parts = Object.entries(d)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => {
      const text = typeof v === 'object' ? JSON.stringify(v) : String(v);
      return `${k.replace(/_/g, ' ')}: ${text.length > 60 ? `${text.slice(0, 57)}…` : text}`;
    });
  return parts.join(' · ');
}

const field = 'rounded-lg border border-slate-300 px-3 py-2 text-sm';

export default function AuditLog() {
  const api = useApi();
  const [action, setAction] = useState('');
  const [admin, setAdmin] = useState('');
  const [targetType, setTargetType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);

  const params = new URLSearchParams();
  if (action) params.set('action', action);
  if (admin) params.set('admin_email', admin);
  if (targetType) params.set('target_type', targetType);
  if (dateFrom) params.set('date_from', dateFrom);
  if (dateTo) params.set('date_to', dateTo);
  if (page) params.set('page', String(page));
  const query = params.toString();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'audit-log', query],
    queryFn: () => api.get<AuditResponse>(`/admin/audit-log${query ? `?${query}` : ''}`),
    placeholderData: (prev) => prev,
  });

  const reset = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(0);
  };
  const hasNext = !!data && data.logs.length === data.page_size;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
      <p className="-mt-2 text-sm text-slate-500">Every action an admin takes on stores, payments, coupons and platform settings.</p>

      <div className="flex flex-wrap gap-3">
        <select value={action} onChange={(e) => reset(setAction)(e.target.value)} className={field}>
          <option value="">All actions</option>
          {(data?.filters.actions ?? []).map((a) => (
            <option key={a} value={a}>{label(a)}</option>
          ))}
        </select>
        <select value={admin} onChange={(e) => reset(setAdmin)(e.target.value)} className={field}>
          <option value="">All admins</option>
          {(data?.filters.admins ?? []).map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <select value={targetType} onChange={(e) => reset(setTargetType)(e.target.value)} className={field}>
          <option value="">All targets</option>
          {Object.entries(TARGET_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-xs text-slate-500">
          From <input type="date" value={dateFrom} onChange={(e) => reset(setDateFrom)(e.target.value)} className={field} />
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-500">
          To <input type="date" value={dateTo} onChange={(e) => reset(setDateTo)(e.target.value)} className={field} />
        </label>
      </div>

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
          No admin actions match.
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
                <tr key={log.id} className="border-t border-slate-100 align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-700">{log.admin_email}</td>
                  <td className="px-4 py-3">
                    <Badge tone={DANGER.has(log.action) ? 'danger' : 'info'}>{label(log.action)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <div className="font-medium text-slate-900">{log.target_label ?? (TARGET_LABELS[log.target_type] ?? log.target_type)}</div>
                    <div className="text-xs text-slate-400">
                      {TARGET_LABELS[log.target_type] ?? log.target_type}
                      {log.target_id ? ` · ${log.target_id.slice(0, 8)}` : ''}
                    </div>
                  </td>
                  <td className="max-w-md px-4 py-3 text-xs text-slate-500">{summarize(log) || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && (page > 0 || hasNext) && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
          <span>Page {page + 1}</span>
          <Button size="sm" variant="secondary" disabled={!hasNext} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
