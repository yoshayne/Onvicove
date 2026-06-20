import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Globe, AlertCircle, Copy, Trash2, RefreshCw, ExternalLink, ShoppingBag } from 'lucide-react';
import { useApi } from '../lib/api';
import type { Tenant } from '../types';
import Button from '../components/shared/Button';
import DomainPurchasePanel from './DomainPurchasePanel';

interface Props {
  tenant: Tenant;
}

interface VerifyResponse {
  verified: boolean;
  domain?: string;
  cnameTarget?: string;
  message?: string;
}

type CopiedKey = 'txt-host' | 'txt-value' | 'cname-host' | 'cname-value';

function DnsRecord({
  label,
  rows,
  copied,
  onCopy,
}: {
  label: string;
  rows: { field: string; value: string; copyKey: CopiedKey }[];
  copied: CopiedKey | null;
  onCopy: (value: string, key: CopiedKey) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden text-xs">
      <div className="bg-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-200">
        {label}
      </div>
      {rows.map((row) => (
        <div key={row.field} className="grid grid-cols-[72px_1fr] border-b border-slate-100 last:border-0">
          <div className="px-3 py-2 bg-slate-50 text-slate-500 font-medium border-r border-slate-100 flex items-center">{row.field}</div>
          <div className="px-3 py-2 flex items-center justify-between gap-2 min-w-0">
            <span className="font-mono text-slate-700 break-all">{row.value}</span>
            <button
              type="button"
              onClick={() => onCopy(row.value, row.copyKey)}
              className="shrink-0 text-slate-400 hover:text-slate-700 transition-colors"
              aria-label={`Copy ${row.field}`}
            >
              {copied === row.copyKey
                ? <CheckCircle size={13} className="text-green-500" />
                : <Copy size={13} />}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

type Tab = 'connect' | 'buy';

export default function CustomDomainPanel({ tenant }: Props) {
  const api = useApi();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('connect');
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState<CopiedKey | null>(null);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

  const hasDomain = !!tenant.custom_domain;
  const isVerified = tenant.custom_domain_verified;
  const cnameTarget = tenant.custom_domain_cname_target ?? 'your-app.up.railway.app';

  function invalidateTenant() {
    queryClient.invalidateQueries({ queryKey: ['tenant', 'me'] });
  }

  function copyText(value: string, key: CopiedKey) {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  const requestMutation = useMutation({
    mutationFn: (domain: string) => api.post('/domains/request', { domain }),
    onSuccess: () => { setInput(''); invalidateTenant(); },
  });

  const verifyMutation = useMutation({
    mutationFn: () => api.post<VerifyResponse>('/domains/verify', {}),
    onSuccess: (res) => {
      setVerifyMessage(res.verified ? null : (res.message ?? null));
      invalidateTenant();
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => api.delete('/domains'),
    onSuccess: () => { setVerifyMessage(null); invalidateTenant(); },
  });

  // ── Verified ──
  if (hasDomain && isVerified) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-5 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <CheckCircle size={18} className="text-green-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-green-800">Domain connected & SSL active</p>
            <a
              href={`https://${tenant.custom_domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-green-700 font-mono hover:underline inline-flex items-center gap-1"
            >
              {tenant.custom_domain}
              <ExternalLink size={11} />
            </a>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-green-200 p-3 flex flex-col gap-1.5">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Your DNS settings</p>
          <div className="text-xs text-slate-600 grid grid-cols-[60px_1fr] gap-x-3 gap-y-1 font-mono">
            <span className="text-slate-400">CNAME</span><span>{tenant.custom_domain} → {cnameTarget}</span>
            <span className="text-slate-400">TXT</span><span>_onvicove-verify.{tenant.custom_domain} (verified)</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => removeMutation.mutate()}
          disabled={removeMutation.isPending}
          className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors self-start"
        >
          <Trash2 size={13} />
          {removeMutation.isPending ? 'Removing…' : 'Remove domain'}
        </button>
      </div>
    );
  }

  // ── Pending verification ──
  if (hasDomain && !isVerified) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Two DNS records needed</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Add both records to your DNS provider for <strong className="font-mono">{tenant.custom_domain}</strong>, then click Verify.
            </p>
          </div>
        </div>

        {/* Step 1 — TXT verification */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-slate-700">
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] mr-1.5">1</span>
            Ownership proof (TXT record)
          </p>
          <DnsRecord
            label="TXT record — proves you own this domain"
            rows={[
              { field: 'Type', value: 'TXT', copyKey: 'txt-host' },
              {
                field: 'Host',
                value: `_onvicove-verify.${tenant.custom_domain}`,
                copyKey: 'txt-host',
              },
              {
                field: 'Value',
                value: tenant.custom_domain_verify_token ?? '',
                copyKey: 'txt-value',
              },
            ]}
            copied={copied}
            onCopy={copyText}
          />
          <p className="text-[11px] text-amber-700">
            Some DNS providers show "Host" as just the subdomain part — in that case enter <code className="bg-amber-100 px-1 rounded">_onvicove-verify</code> without the domain.
          </p>
        </div>

        {/* Step 2 — CNAME */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-slate-700">
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] mr-1.5">2</span>
            Point your domain here (CNAME record)
          </p>
          <DnsRecord
            label="CNAME record — routes traffic to your store"
            rows={[
              { field: 'Type', value: 'CNAME', copyKey: 'cname-host' },
              { field: 'Host', value: tenant.custom_domain ?? '', copyKey: 'cname-host' },
              { field: 'Value', value: cnameTarget, copyKey: 'cname-value' },
            ]}
            copied={copied}
            onCopy={copyText}
          />
          <p className="text-[11px] text-amber-700">
            <strong>Apex domain?</strong> If you're using <code className="bg-amber-100 px-1 rounded">example.com</code> (no www), use an <strong>ALIAS</strong> or <strong>ANAME</strong> record instead of CNAME. Cloudflare DNS supports this natively.
          </p>
        </div>

        {/* Registrar quick links */}
        <div className="bg-white rounded-lg border border-amber-200 p-3 flex flex-col gap-2">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Jump to your DNS settings</p>
          <div className="flex flex-wrap gap-2">
            {[
              { name: 'GoDaddy', url: 'https://dcc.godaddy.com/manage/dns' },
              { name: 'Namecheap', url: 'https://ap.www.namecheap.com/Domains/DomainControlPanel' },
              { name: 'Cloudflare', url: 'https://dash.cloudflare.com' },
              { name: 'Squarespace', url: 'https://account.squarespace.com/domains' },
              { name: 'Google Domains', url: 'https://domains.google.com' },
            ].map((r) => (
              <a
                key={r.name}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-0.5"
              >
                {r.name} <ExternalLink size={10} />
              </a>
            ))}
          </div>
        </div>

        <p className="text-xs text-amber-700">
          DNS changes usually take <strong>5–30 minutes</strong>. In rare cases it can take up to 48 hours.
        </p>

        {verifyMessage && (
          <div className="bg-amber-100 rounded-lg px-3 py-2 text-xs text-amber-800 flex items-start gap-2">
            <AlertCircle size={13} className="shrink-0 mt-0.5" />
            {verifyMessage}
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button
            onClick={() => verifyMutation.mutate()}
            isLoading={verifyMutation.isPending}
            size="sm"
          >
            <RefreshCw size={13} className="mr-1.5" />
            Verify & activate SSL
          </Button>
          <button
            type="button"
            onClick={() => removeMutation.mutate()}
            disabled={removeMutation.isPending}
            className="text-xs text-slate-500 hover:text-red-500 transition-colors"
          >
            Start over
          </button>
        </div>
      </div>
    );
  }

  // ── No domain ──
  return (
    <div className="flex flex-col gap-4">
      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
        <button
          type="button"
          onClick={() => setTab('connect')}
          className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium rounded-md px-3 py-2 transition-all ${
            tab === 'connect'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Globe size={13} />
          I already have a domain
        </button>
        <button
          type="button"
          onClick={() => setTab('buy')}
          className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium rounded-md px-3 py-2 transition-all ${
            tab === 'buy'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <ShoppingBag size={13} />
          Buy a domain
        </button>
      </div>

      {tab === 'connect' ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <Globe size={18} className="text-slate-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-slate-800">Connect a custom domain</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Let customers visit your store at <em>www.yourbusiness.com</em> instead of a shared URL. SSL is included free.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && input.trim()) requestMutation.mutate(input); }}
              placeholder="www.yourdomain.com"
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
              {requestMutation.error instanceof Error ? requestMutation.error.message : 'Something went wrong'}
            </p>
          )}

          <div className="flex flex-col gap-1 text-xs text-slate-400">
            <p>→ SSL certificate is provisioned automatically — no extra cost.</p>
            <p>→ We recommend <strong>www.yourdomain.com</strong>. Apex domains (without www) require ALIAS/ANAME support.</p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <DomainPurchasePanel />
        </div>
      )}
    </div>
  );
}
