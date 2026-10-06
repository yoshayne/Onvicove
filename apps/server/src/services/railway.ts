const RAILWAY_API = 'https://backboard.railway.app/graphql/v2';

export interface DnsRecordInstruction {
  type: string;
  host: string;
  value: string;
}

export interface RailwayDomain {
  id: string;
  cnameTarget: string | null;
  records: DnsRecordInstruction[];
}

export function isRailwayConfigured(): boolean {
  return !!(process.env.RAILWAY_TOKEN && process.env.RAILWAY_SERVICE_ID && process.env.RAILWAY_ENVIRONMENT_ID);
}

function getToken(): string {
  const token = process.env.RAILWAY_TOKEN;
  if (!token) throw new Error('RAILWAY_TOKEN env var not set');
  return token;
}

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(RAILWAY_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(15000),
  });

  const json = await res.json() as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '));
  }
  return json.data as T;
}

// GraphQL schema errors are raised before anything executes, so retrying a leaner query is safe.
function isSchemaError(err: unknown): boolean {
  return err instanceof Error && /cannot query field|unknown (argument|type)|validation/i.test(err.message);
}

interface RawDnsRecord {
  hostlabel?: string | null;
  fqdn?: string | null;
  recordType?: string | null;
  requiredValue?: string | null;
}

function recordType(raw: string | null | undefined): string {
  const t = (raw ?? '').toUpperCase();
  if (t.includes('TXT')) return 'TXT';
  if (t.includes('CNAME')) return 'CNAME';
  return /(^|_)A$/.test(t) ? 'A' : 'CNAME';
}

function toInstructions(raw: RawDnsRecord[] | undefined | null): DnsRecordInstruction[] {
  return (raw ?? [])
    .filter((r) => r.requiredValue)
    .map((r) => ({
      type: recordType(r.recordType),
      host: r.fqdn || r.hostlabel || '',
      value: r.requiredValue as string,
    }));
}

function cnameFrom(records: DnsRecordInstruction[]): string | null {
  return records.find((r) => r.type === 'CNAME')?.value.replace(/\.$/, '') ?? null;
}

export async function railwayAddDomain(domain: string): Promise<RailwayDomain> {
  const serviceId = process.env.RAILWAY_SERVICE_ID;
  const environmentId = process.env.RAILWAY_ENVIRONMENT_ID;

  if (!serviceId || !environmentId) {
    throw new Error('RAILWAY_SERVICE_ID and RAILWAY_ENVIRONMENT_ID env vars must be set');
  }
  const input = { domain, serviceId, environmentId };

  const run = <T>(selection: string) =>
    gql<{ customDomainCreate: T }>(
      `mutation customDomainCreate($input: CustomDomainCreateInput!) {
        customDomainCreate(input: $input) { ${selection} }
      }`,
      { input },
    ).then((d) => d.customDomainCreate);

  try {
    const d = await run<{ id: string; status?: { dnsRecords?: RawDnsRecord[] } }>(
      'id status { dnsRecords { hostlabel fqdn recordType requiredValue } }',
    );
    const records = toInstructions(d.status?.dnsRecords);
    return { id: d.id, cnameTarget: cnameFrom(records), records };
  } catch (err) {
    if (!isSchemaError(err)) throw err;
  }

  try {
    const d = await run<{ id: string; cnameTarget?: string | null }>('id cnameTarget');
    return { id: d.id, cnameTarget: d.cnameTarget ?? null, records: [] };
  } catch (err) {
    if (!isSchemaError(err)) throw err;
  }

  const d = await run<{ id: string }>('id');
  return { id: d.id, cnameTarget: null, records: [] };
}

export async function railwayRemoveDomain(railwayDomainId: string): Promise<void> {
  await gql<unknown>(
    `mutation customDomainDelete($id: String!) {
      customDomainDelete(id: $id)
    }`,
    { id: railwayDomainId },
  );
}
