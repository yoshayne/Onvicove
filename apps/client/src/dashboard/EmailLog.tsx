import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../lib/api';
import Spinner from '../components/shared/Spinner';
import Badge from '../components/shared/Badge';
import Button from '../components/shared/Button';
import Modal from '../components/shared/Modal';
import { Input } from '../components/shared/Input';
import { Mail, Eye, RotateCcw, Send, X } from 'lucide-react';

interface EmailLogEntry {
  id: string;
  type: string;
  to_email: string;
  to_name: string | null;
  subject: string;
  status: 'sent' | 'failed';
  error_message: string | null;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
}

interface EmailLogFull extends EmailLogEntry {
  html_content: string;
}

const TYPE_LABELS: Record<string, string> = {
  booking_confirmation: 'Booking Confirmed',
  booking_confirmed: 'Booking Confirmed',
  booking_reminder: 'Reminder',
  booking_cancelled: 'Booking Cancelled',
  booking_refunded: 'Booking Refunded',
  booking_confirmation_resend: 'Resent: Booking Confirmed',
  booking_cancelled_resend: 'Resent: Cancelled',
  order_confirmation: 'Order Confirmed',
  order_confirmation_resend: 'Resent: Order Confirmed',
  payment_link: 'Payment Link',
  payment_link_resend: 'Resent: Payment Link',
};

function typeLabel(type: string) {
  return TYPE_LABELS[type] ?? type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function typeTone(type: string): 'default' | 'success' | 'warning' | 'danger' {
  if (type.includes('cancel')) return 'warning';
  if (type.includes('refund')) return 'danger';
  if (type.includes('resend')) return 'default';
  return 'success';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

const TYPE_FILTERS = [
  { value: '', label: 'All emails' },
  { value: 'booking_confirmation', label: 'Booking confirmed' },
  { value: 'booking_reminder', label: 'Reminders' },
  { value: 'booking_cancelled', label: 'Cancellations' },
  { value: 'order_confirmation', label: 'Order confirmed' },
  { value: 'payment_link', label: 'Payment links' },
];

export default function EmailLog() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState('');
  const [previewEmail, setPreviewEmail] = useState<EmailLogFull | null>(null);
  const [resendTarget, setResendTarget] = useState<EmailLogEntry | null>(null);
  const [resendEmail, setResendEmail] = useState('');
  const [resendError, setResendError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['email-log', typeFilter],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '100' });
      if (typeFilter) params.set('type', typeFilter);
      return api.get<{ emails: EmailLogEntry[]; total: number }>(`/email-log?${params}`);
    },
  });

  const previewQuery = useQuery({
    queryKey: ['email-log-full', previewEmail?.id],
    queryFn: () => api.get<{ email: EmailLogFull }>(`/email-log/${previewEmail!.id}`),
    enabled: !!previewEmail,
  });

  const resendMutation = useMutation({
    mutationFn: ({ id, toEmail }: { id: string; toEmail?: string }) =>
      api.post(`/email-log/${id}/resend`, toEmail ? { to_email: toEmail } : {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-log'] });
      setResendTarget(null);
      setResendEmail('');
      setResendError(null);
    },
    onError: (err: Error) => setResendError(err.message),
  });

  const emails = data?.emails ?? [];
  const total = data?.total ?? 0;

  function openPreview(entry: EmailLogEntry) {
    setPreviewEmail(entry as EmailLogFull);
  }

  function openResend(entry: EmailLogEntry) {
    setResendTarget(entry);
    setResendEmail(entry.to_email);
    setResendError(null);
  }

  function handleResend() {
    if (!resendTarget) return;
    const override = resendEmail.trim() !== resendTarget.to_email ? resendEmail.trim() : undefined;
    resendMutation.mutate({ id: resendTarget.id, toEmail: override });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Email Log</h1>
          <p className="mt-0.5 text-sm text-slate-500">{total} email{total !== 1 ? 's' : ''} sent</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setTypeFilter(f.value)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              typeFilter === f.value
                ? 'border-violet-500 bg-violet-50 text-violet-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : emails.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center">
          <Mail size={32} className="text-slate-300" />
          <p className="text-sm text-slate-500">No emails sent yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Recipient</th>
                <th className="px-4 py-3 text-left">Subject</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Sent</th>
                <th className="px-4 py-3 text-left"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {emails.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Badge tone={typeTone(e.type)}>{typeLabel(e.type)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{e.to_name || e.to_email}</div>
                    {e.to_name && <div className="text-xs text-slate-400">{e.to_email}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{e.subject}</td>
                  <td className="px-4 py-3">
                    {e.status === 'failed' ? (
                      <Badge tone="danger">Failed</Badge>
                    ) : (
                      <Badge tone="success">Sent</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(e.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openPreview(e)}
                        className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                        title="Preview email"
                      >
                        <Eye size={12} />
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => openResend(e)}
                        className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                        title="Resend email"
                      >
                        <RotateCcw size={12} />
                        Resend
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Preview modal */}
      {previewEmail && (
        <Modal isOpen onClose={() => setPreviewEmail(null)} title={previewEmail.subject}>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-4 rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-600">
              <span><strong>To:</strong> {previewEmail.to_name ? `${previewEmail.to_name} <${previewEmail.to_email}>` : previewEmail.to_email}</span>
              <span><strong>Sent:</strong> {formatDate(previewEmail.created_at)}</span>
              <span><strong>Type:</strong> {typeLabel(previewEmail.type)}</span>
            </div>
            {previewQuery.isLoading ? (
              <div className="flex h-64 items-center justify-center"><Spinner /></div>
            ) : (
              <iframe
                srcDoc={previewQuery.data?.email.html_content ?? ''}
                sandbox="allow-same-origin"
                className="h-[500px] w-full rounded-lg border border-slate-200 bg-white"
                title="Email preview"
              />
            )}
            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setPreviewEmail(null)}>Close</Button>
              <Button
                onClick={() => {
                  openResend(previewEmail);
                  setPreviewEmail(null);
                }}
              >
                <RotateCcw size={14} className="mr-1" />
                Resend
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Resend modal */}
      {resendTarget && (
        <Modal isOpen onClose={() => setResendTarget(null)} title="Resend email">
          <div className="flex flex-col gap-4">
            <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <p><strong>Subject:</strong> {resendTarget.subject}</p>
              <p className="mt-1"><strong>Originally sent:</strong> {formatDate(resendTarget.created_at)}</p>
            </div>
            <Input
              label="Send to"
              type="email"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              placeholder="customer@example.com"
            />
            <p className="text-xs text-slate-500">
              The original recipient was <strong>{resendTarget.to_email}</strong>. Change the address above to send to a different email.
            </p>
            {resendError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{resendError}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setResendTarget(null)}>Cancel</Button>
              <Button
                isLoading={resendMutation.isPending}
                onClick={handleResend}
                disabled={!resendEmail.trim()}
              >
                <Send size={14} className="mr-1" />
                Send now
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
