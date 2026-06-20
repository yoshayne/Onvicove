import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Globe, AlertCircle, Copy, Trash2, RefreshCw } from 'lucide-react';
import { useApi } from '../lib/api';
import type { Tenant } from '../types';
import Button from '../components/shared/Button';

interface Props {
  tenant: Tenant;
}

interface RequestResponse {
  domain: string;
  token: string;
  instructions: {
    type: string;
    host: string;
    value: string;
    note: string;
  };
}

interface VerifyResponse {
  verified: boolean;
  domain?: string;
  message?: string;
}

export default function CustomDomainPanel({ tenant }: Props) {
  const api = useApi();
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState<'host' | 'value' | null>(null);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

  const hasDomain = !!tenant.custom_domain;
  const isVerified = tenant.custom_domain_verified;

  function invalidateTenant() {
    queryClient.invalidateQueries({ queryKey: ['tenant', 'me'] });
  }

  const requestMutation = useMutation({
    mutationFn: (domain: string) =>
      api.post<RequestResponse>('/domains/request', { domain }),
    onSuccess: () => {
      setInput('');
      invalidateTenant();
    },
  });

  const verifyMutation = useMutation({
    mutationFn: () => api.post<VerifyResponse>('/domains/verify', {}),
    onSuccess: (res) => {
      setVerifyMessage(res.message ?? null);
      invalidateTenant();
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => api.delete('/domains'),
    onSuccess: () => {
      setVerifyMessage(null);
      invalidateTenant();
    },
  });

  function copy(text: string, which: 'host' | 'value') {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  // ── Verified state ──
  if (hasDomain && isVerified) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <CheckCircle size={18} className="text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Domain connected</p>
            <p className="text-sm text-green-700 font-mono">{tenant.custom_domain}</p>
          </div>
        </div>
        <p className="text-xs text-green-600">
          Your storefront is live at <strong>{tenant.custom_domain}</strong>. Make sure your DNS CNAME still points to your Railway deployment.
        </p>
        <button
          type="button"
          onClick={() => removeMutation.mutate()}
          disabled={removeMutation.isPending}
          className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors self-start"
        >
          <Trash2 size={13} />
          Remove domain
        </button>
      </div>
    );
  }

  // ── Pending verification state ──
  if (hasDomain && !isVerified) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex flex-col gap-4">
        <div className="flex items-start gap-2">
          <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Verification required</p>
            <p className="text-sm text-amber-700">
              Add this DNS TXT record to prove you own <strong className="font-mono">{tenant.custom_domain}</strong>, then click Verify.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-amber-300 bg-white overflow-hidden text-xs font-mono">
          <div className="grid grid-cols-[80px_1fr] divide-y divide-amber-100">
            <div className="bg-amber-100 px-3 py-2 text-amber-700 font-sans font-semibold text-[11px] uppercase tracking-wide">Type</div>
            <div className="px-3 py-2 text-slate-600">TXT</div>

            <div className="bg-amber-100 px-3 py-2 text-amber-700 font-sans font-semibold text-[11px] uppercase tracking-wide">Host</div>
            <div className="px-3 py-2 flex items-center justify-between gap-2">
              <span className="break-all text-slate-700">_onvicove-verify.{tenant.custom_domain}</span>
              <button
                type="button"
                onClick={() => copy(`_onvicove-verify.${tenant.custom_domain}`, 'host')}
                className="shrink-0 text-slate-400 hover:text-slate-700"
                aria-label="Copy host"
              >
                {copied === 'host' ? <CheckCircle size={13} className="text-green-500" /> : <Copy size={13} />}
              </button>
            </div>

            <div className="bg-amber-100 px-3 py-2 text-amber-700 font-sans font-semibold text-[11px] uppercase tracking-wide">Value</div>
            <div className="px-3 py-2 flex items-center justify-between gap-2">
              <span className="break-all text-slate-700">{tenant.custom_domain_verify_token}</span>
              <button
                type="button"
                onClick={() => copy(tenant.custom_domain_verify_token ?? '', 'value')}
                className="shrink-0 text-slate-400 hover:text-slate-700"
                aria-label="Copy value"
              >
                {copied === 'value' ? <CheckCircle size={13} className="text-green-500" /> : <Copy size={13} />}
              </button>
            </div>
          </div>
        </div>

        <p className="text-xs text-amber-700">
          After adding the record, DNS changes typically take 5–30 minutes (up to 48 hours in rare cases).
        </p>

        {verifyMessage && (
          <p className="text-xs text-amber-800 bg-amber-100 rounded px-3 py-2">{verifyMessage}</p>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <Button
            onClick={() => verifyMutation.mutate()}
            isLoading={verifyMutation.isPending}
            size="sm"
          >
            <RefreshCw size={13} className="mr-1.5" />
            Verify now
          </Button>
          <button
            type="button"
            onClick={() => removeMutation.mutate()}
            disabled={removeMutation.isPending}
            className="text-xs text-slate-500 hover:text-red-500 transition-colors"
          >
            Cancel
          </button>
        </div>

        {/* Also show CNAME instructions for when they're done */}
        <div className="pt-2 border-t border-amber-200">
          <p className="text-xs font-semibold text-amber-800 mb-2">After verification, also add this CNAME:</p>
          <div className="rounded-lg border border-amber-300 bg-white overflow-hidden text-xs font-mono">
            <div className="grid grid-cols-[80px_1fr] divide-y divide-amber-100">
              <div className="bg-amber-100 px-3 py-2 text-amber-700 font-sans font-semibold text-[11px] uppercase tracking-wide">Type</div>
              <div className="px-3 py-2 text-slate-600">CNAME</div>
              <div className="bg-amber-100 px-3 py-2 text-amber-700 font-sans font-semibold text-[11px] uppercase tracking-wide">Host</div>
              <div className="px-3 py-2 text-slate-700">{tenant.custom_domain}</div>
              <div className="bg-amber-100 px-3 py-2 text-amber-700 font-sans font-semibold text-[11px] uppercase tracking-wide">Value</div>
              <div className="px-3 py-2 text-slate-700">{process.env.RAILWAY_PUBLIC_DOMAIN ?? 'your-app.up.railway.app'}</div>
            </div>
          </div>
          <p className="text-xs text-amber-600 mt-1">For apex domains (e.g. example.com without www), use an ALIAS/ANAME record instead of CNAME.</p>
        </div>
      </div>
    );
  }

  // ── No domain yet ──
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Globe size={18} className="text-slate-400" />
        <div>
          <p className="text-sm font-semibold text-slate-800">Custom domain</p>
          <p className="text-xs text-slate-500">Connect your own domain so customers visit your store at <em>www.yourbusiness.com</em></p>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="www.example.com"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <Button
          onClick={() => requestMutation.mutate(input)}
          isLoading={requestMutation.isPending}
          disabled={!input.trim()}
          size="sm"
        >
          Connect
        </Button>
      </div>

      {requestMutation.isError && (
        <p className="text-xs text-red-600">
          {requestMutation.error instanceof Error ? requestMutation.error.message : 'Failed to add domain'}
        </p>
      )}

      <p className="text-xs text-slate-400">Available on Pro and Business plans. Use <strong>www.yourdomain.com</strong> — apex domains require ALIAS/ANAME support from your DNS provider.</p>
    </div>
  );
}
