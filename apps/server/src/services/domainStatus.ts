import { resolveTxt, resolveCname, resolve4 } from 'node:dns/promises';

export type DomainStatus = 'awaiting_txt' | 'awaiting_dns' | 'provisioning' | 'active';

export interface DomainChecks {
  txt: boolean;
  routing: boolean;
  https: boolean;
}

export const TXT_HOST_PREFIX = '_onvicove-verify';

export async function checkTxt(domain: string, token: string | null | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const records = await resolveTxt(`${TXT_HOST_PREFIX}.${domain}`);
    return records.flat().includes(token);
  } catch {
    return false;
  }
}

function clean(host: string): string {
  return host.toLowerCase().replace(/\.$/, '');
}

/** True when the domain's DNS leads to our host (CNAME match, or shared A records for apex/flattened setups). */
export async function checkRouting(domain: string, cnameTarget: string | null | undefined): Promise<boolean> {
  const targets = [cnameTarget, process.env.RAILWAY_PUBLIC_DOMAIN]
    .filter((t): t is string => !!t)
    .map(clean);
  if (targets.length === 0) return false;

  try {
    const cnames = (await resolveCname(domain)).map(clean);
    if (cnames.some((c) => targets.includes(c))) return true;
  } catch {
    // no CNAME (apex or flattened) — fall through to A-record comparison
  }

  try {
    const mine = await resolve4(domain);
    for (const target of targets) {
      try {
        const theirs = await resolve4(target);
        if (mine.some((ip) => theirs.includes(ip))) return true;
      } catch { /* target not resolvable */ }
    }
  } catch { /* domain has no A records */ }
  return false;
}

/** End-to-end probe: certificate valid and the request reaches this app. */
export async function checkHttps(domain: string): Promise<boolean> {
  try {
    const res = await fetch(`https://${domain}/health`, {
      redirect: 'manual',
      signal: AbortSignal.timeout(6000),
    });
    return res.headers.get('x-shopsuite') === '1';
  } catch {
    return false;
  }
}

export interface DomainState {
  status: DomainStatus;
  checks: DomainChecks;
  message: string;
}

export async function computeDomainState(input: {
  domain: string;
  verified: boolean;
  token: string | null;
  cnameTarget: string | null;
}): Promise<DomainState> {
  const txt = input.verified ? true : await checkTxt(input.domain, input.token);
  if (!txt) {
    return {
      status: 'awaiting_txt',
      checks: { txt: false, routing: false, https: false },
      message: `We can't see the TXT record yet at ${TXT_HOST_PREFIX}.${input.domain}. DNS changes can take a few minutes to spread — try again shortly.`,
    };
  }

  const routing = await checkRouting(input.domain, input.cnameTarget);
  if (!routing) {
    return {
      status: 'awaiting_dns',
      checks: { txt, routing: false, https: false },
      message: `Ownership confirmed. Now point ${input.domain} at ${input.cnameTarget ?? 'the address shown below'} so visitors reach your store.`,
    };
  }

  const https = await checkHttps(input.domain);
  if (!https) {
    return {
      status: 'provisioning',
      checks: { txt, routing, https: false },
      message: 'DNS is pointing here. Your SSL certificate is being issued — this usually takes a few minutes.',
    };
  }

  return { status: 'active', checks: { txt, routing, https }, message: 'Your domain is live.' };
}
