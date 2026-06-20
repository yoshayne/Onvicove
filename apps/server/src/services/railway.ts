const RAILWAY_API = 'https://backboard.railway.app/graphql/v2';

function getToken(): string {
  const token = process.env.RAILWAY_API_TOKEN;
  if (!token) throw new Error('RAILWAY_API_TOKEN env var not set');
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
  });

  const json = await res.json() as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '));
  }
  return json.data as T;
}

interface CreatedDomain {
  customDomainCreate: {
    id: string;
    domain: string;
    cnameTarget: string;
  };
}

export async function railwayAddDomain(domain: string): Promise<{ id: string; cnameTarget: string }> {
  const serviceId = process.env.RAILWAY_SERVICE_ID;
  const environmentId = process.env.RAILWAY_ENVIRONMENT_ID;

  if (!serviceId || !environmentId) {
    throw new Error('RAILWAY_SERVICE_ID and RAILWAY_ENVIRONMENT_ID env vars must be set');
  }

  const data = await gql<CreatedDomain>(
    `mutation customDomainCreate($input: CustomDomainCreateInput!) {
      customDomainCreate(input: $input) {
        id
        domain
        cnameTarget
      }
    }`,
    { input: { domain, serviceId, environmentId } },
  );

  return {
    id: data.customDomainCreate.id,
    cnameTarget: data.customDomainCreate.cnameTarget,
  };
}

export async function railwayRemoveDomain(railwayDomainId: string): Promise<void> {
  await gql<unknown>(
    `mutation customDomainDelete($id: String!) {
      customDomainDelete(id: $id)
    }`,
    { id: railwayDomainId },
  );
}
