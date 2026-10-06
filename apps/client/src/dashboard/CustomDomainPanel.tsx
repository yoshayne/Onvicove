import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Circle, Globe, AlertCircle, Copy, Trash2, RefreshCw, ExternalLink, ShoppingBag, Loader2, Lock } from 'lucide-react';
import { useApi } from '../lib/api';
import type { Tenant } from '../types';
import Button from '../components/shared/Button';
import DomainPurchasePanel from './DomainPurchasePanel';

interface Props {
  tenant: Tenant;
}

type DomainState = 'awaiting_txt' | 'awaiting_dns' | 'provisioning' | 'active';

interface DomainChecks {
  txt: boolean;
  routing: boolean;
  https: boolean;
}

interface DomainStatusResponse {
  domain: string | null;
  status?: DomainState;
  message?: string;
  checks?: DomainChecks;
}

interface VerifyResponse {
  verified: boolean;
  status?: DomainState;
  message?: string;
}

type CopiedKey = string;

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

const CUSTOM_DOMAIN_PLANS = ['business'];

const REGISTRARS = [
  { name: 'GoDaddy', url: 'https://dcc.godaddy.com/manage/dns' },
  { name: 'Namecheap', url: 'https://ap.www.namecheap.com/Domains/DomainControlPanel' },
  { name: 'Cloudflare', url: 'https://dash.cloudflare.com' },
  { name: 'Squarespace', url: 'https://account.squarespace.com/domains' },
  { name: 'Porkbun', url: 'https://porkbun.com/account/domainsSpeedy' },
];

function Step({ done, label, hint }: { done: boolean; label: string; hint?: string }) {
  return (
    <li className="flex items-start gap-2 text-xs">
      {done
        ? <CheckCircle size={14} className="mt-0.5 shrink-0 text-green-600" />
        : <Circle size={14} className="mt-0.5 shrink-0 text-slate-300" />}
      <span className={done ? 'text-slate-700' : 'text-slate-400'}>
        {label}
        {hint && !done && <span className="block text-[11px] text-slate-400">{hint}</span>}
      </span>
    </li>
  );
}

export default function CustomDomainPanel({ tenant }: Props) {
  const api = useApi();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('connect');
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState<CopiedKey | null>(null);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

  const domain = tenant.custom_domain;
  const hasDomain = !!domain;
  const isVerified = tenant.custom_domain_verified;
  const storedStatus: DomainState = tenant.custom_domain_status ?? (isVerified ? 'provisioning' : 'awaiting_txt');
  const isApex = !!domain && domain.split('.').length === 2;
  const records = tenant.custom_domain_records ?? [];
  const cnameTarget = records.find((r) => r.type === 'CNAME')?.value ?? tenant.custom_domain_cname_target;
  const canUseCustomDomain = CUSTOM_DOMAIN_PLANS.includes(tenant.plan) || hasDomain;

  function invalidateTenant() {
    queryClient.invalidateQueries({ queryKey: ['tenant', 'me'] });
  }

  function copyText(value: string, key: CopiedKey) {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  // Poll while the domain is being set up; stops once it is live.
  const statusQuery = useQuery({
    queryKey: ['domain-status', domain],
    queryFn: async () => {
      const res = await api.get<DomainStatusResponse>('/domains/status');
      if (res.status && res.status !== tenant.custom_domain_status) invalidateTenant();
      return res;
    },
    enabled: hasDomain && storedStatus !== 'active',
    refetchInterval: 15000,
    retry: false,
  });

  const status: DomainState = statusQuery.data?.status ?? storedStatus;
  const checks: DomainChecks = statusQuery.data?.checks ?? {
    txt: isVerified,
    routing: status === 'provisioning' || status === 'active',
    https: status === 'active',
  };
  const statusMessage = verifyMessage ?? statusQuery.data?.message ?? null;

  const requestMutation = useMutation({
    mutationFn: (value: string) => api.post('/domains/request', { domain: value }),
    onSuccess: () => { setInput(''); setVerifyMessage(null); invalidateTenant(); },
  });

  const verifyMutation = useMutation({
    mutationFn: () => api.post<VerifyResponse>('/domains/verify', {}),
    onSuccess: (res) => {
      setVerifyMessage(res.status === 'active' ? null : (res.message ?? null));
      invalidateTenant();
      queryClient.invalidateQueries({ queryKey: ['domain-status'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => api.delete('/domains'),
    onSuccess: () => { setVerifyMessage(null); invalidateTenant(); queryClient.removeQueries({ queryKey: ['domain-status'] }); },
  });

  function confirmRemove() {
    if (window.confirm(`Disconnect ${domain}? Your store will no longer be reachable at this address.`)) {
      removeMutation.mutate();
    }
  }

  const mutationError =
    (requestMutation.error ?? verifyMutation.error ?? removeMutation.error) as Error | null;

  // ── Domain connected ──
  if (hasDomain) {
    const live = status === 'active';
    return (
      <div className={`rounded-xl border p-5 flex flex-col gap-5 ${live ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
        <div className="flex items-start gap-3">
          {live
            ? <CheckCircle size={18} className="text-green-600 shrink-0 mt-0.5" />
            : <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />}
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${live ? 'text-green-800' : 'text-amber-800'}`}>
              {live ? 'Domain connected & SSL active' : 'Finish setting up your domain'}
            </p>
            <a
              href={`https://${domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-sm font-mono hover:underline inline-flex items-center gap-1 ${live ? 'text-green-700' : 'text-amber-700'}`}
            >
              {domain}
              <ExternalLink size={11} />
            </a>
          </div>
        </div>

        {/* Progress */}
        <ul className="flex flex-col gap-1.5 rounded-lg bg-white/70 border border-white p-3">
          <Step done={checks.txt} label="Ownership confirmed" hint="Add the TXT record below, then check again." />
          <Step done={checks.routing} label="Domain points to your store" hint="Add the CNAME record below at your DNS provider." />
          <Step done={checks.https} label="SSL certificate active" hint="Issued automatically a few minutes after DNS points here." />
        </ul>

        {statusMessage && !live && (
          <div className="bg-amber-100 rounded-lg px-3 py-2 text-xs text-amber-800 flex items-start gap-2">
            <AlertCircle size={13} className="shrink-0 mt-0.5" />
            {statusMessage}
          </div>
        )}

        {/* Step 1 — TXT verification */}
        {!isVerified && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-slate-700">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] mr-1.5">1</span>
              Prove you own it (TXT record)
            </p>
            <DnsRecord
              label="TXT record — proves you own this domain"
              rows={[
                { field: 'Type', value: 'TXT', copyKey: 'txt-type' },
                { field: 'Host', value: `_onvicove-verify.${domain}`, copyKey: 'txt-host' },
                { field: 'Value', value: tenant.custom_domain_verify_token ?? '', copyKey: 'txt-value' },
              ]}
              copied={copied}
              onCopy={copyText}
            />
            <p className="text-[11px] text-amber-700">
              Some DNS providers want only the first part as the host — enter <code className="bg-amber-100 px-1 rounded">_onvicove-verify</code> without the domain. Keep this record in place; we re-check it periodically.
            </p>
          </div>
        )}

        {/* Step 2 — routing records */}
        {!live && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-slate-700">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] mr-1.5">{isVerified ? 1 : 2}</span>
              Point your domain here
            </p>
            {records.length > 0 ? (
              records.map((r, i) => (
                <DnsRecord
                  key={`${r.type}-${r.host}-${i}`}
                  label={`${r.type} record`}
                  rows={[
                    { field: 'Type', value: r.type, copyKey: `r${i}-type` },
                    { field: 'Host', value: r.host || domain!, copyKey: `r${i}-host` },
                    { field: 'Value', value: r.value, copyKey: `r${i}-value` },
                  ]}
                  copied={copied}
                  onCopy={copyText}
                />
              ))
            ) : cnameTarget ? (
              <DnsRecord
                label={isApex ? 'ALIAS / ANAME record — routes traffic to your store' : 'CNAME record — routes traffic to your store'}
                rows={[
                  { field: 'Type', value: isApex ? 'ALIAS / ANAME' : 'CNAME', copyKey: 'cname-type' },
                  { field: 'Host', value: isApex ? '@' : (domain ?? ''), copyKey: 'cname-host' },
                  { field: 'Value', value: cnameTarget, copyKey: 'cname-value' },
                ]}
                copied={copied}
                onCopy={copyText}
              />
            ) : (
              <p className="text-xs text-amber-700">
                Your connection address is still being prepared by our hosting provider. Click “Check status” in a minute and it will appear here.
              </p>
            )}
            {isApex && (
              <p className="text-[11px] text-amber-700">
                <strong>Using a bare domain (no www)?</strong> Most DNS providers can’t set a CNAME there — use an ALIAS/ANAME (or “CNAME flattening”) record, which Cloudflare supports natively. The simplest option is to connect <strong className="font-mono">www.{domain}</strong> instead; visitors to the bare domain can be redirected to it.
              </p>
            )}
          </div>
        )}

        {!live && (
          <div className="bg-white rounded-lg border border-amber-200 p-3 flex flex-col gap-2">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Jump to your DNS settings</p>
            <div className="flex flex-wrap gap-2">
              {REGISTRARS.map((r) => (
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
            <p className="text-[11px] text-slate-500">
              DNS changes usually take <strong>5–30 minutes</strong>, occasionally up to 48 hours. This page checks automatically every 15 seconds.
            </p>
          </div>
        )}

        {mutationError && (
          <p className="text-xs text-red-600">{mutationError.message}</p>
        )}

        <div className="flex items-center gap-4">
          {!live && (
            <Button onClick={() => verifyMutation.mutate()} isLoading={verifyMutation.isPending} size="sm">
              {statusQuery.isFetching && !verifyMutation.isPending
                ? <Loader2 size={13} className="mr-1.5 animate-spin" />
                : <RefreshCw size={13} className="mr-1.5" />}
              Check status
            </Button>
          )}
          <button
            type="button"
            onClick={confirmRemove}
            disabled={removeMutation.isPending}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 transition-colors"
          >
            <Trash2 size={13} />
            {removeMutation.isPending ? 'Removing…' : live ? 'Remove domain' : 'Start over'}
          </button>
        </div>
      </div>
    );
  }

  // ── Not on a plan that includes custom domains ──
  if (!canUseCustomDomain) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 flex items-start gap-3">
        <Lock size={18} className="text-slate-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-800">Custom domain</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Use your own address like <em>www.yourbusiness.com</em> instead of a shared URL. Included with the Business plan.
          </p>
          <Link
            to="/dashboard/billing"
            className="mt-3 inline-block rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
          >
            View plans
          </Link>
        </div>
      </div>
    );
  }

  // ── No domain yet ──
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
            <p>→ We recommend <strong>www.yourdomain.com</strong>. Bare domains (without www) need ALIAS/ANAME support at your DNS provider.</p>
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
