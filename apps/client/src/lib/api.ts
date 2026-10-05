import { useAuth } from '@clerk/clerk-react';

export type TokenGetter = () => Promise<string | null>;

async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  getToken?: TokenGetter
): Promise<T> {
  const headers: Record<string, string> = {};
  let payload: BodyInit | undefined;

  if (body !== undefined && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  } else if (body instanceof FormData) {
    payload = body;
  }

  if (getToken) {
    const token = await getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const url = path.startsWith('/api') ? path : `/api${path}`;

  const res = await fetch(url, {
    method,
    headers,
    body: payload,
  });

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const data = await res.json();
      if (data && typeof data === 'object' && 'error' in data) {
        message = String((data as { error: unknown }).error);
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export function apiGet<T>(path: string, getToken?: TokenGetter): Promise<T> {
  return request<T>('GET', path, undefined, getToken);
}

export function apiPost<T>(path: string, body?: unknown, getToken?: TokenGetter): Promise<T> {
  return request<T>('POST', path, body, getToken);
}

export function apiPut<T>(path: string, body?: unknown, getToken?: TokenGetter): Promise<T> {
  return request<T>('PUT', path, body, getToken);
}

export function apiPatch<T>(path: string, body?: unknown, getToken?: TokenGetter): Promise<T> {
  return request<T>('PATCH', path, body, getToken);
}

export function apiDelete<T>(path: string, getToken?: TokenGetter): Promise<T> {
  return request<T>('DELETE', path, undefined, getToken);
}

export function apiUpload<T>(path: string, file: File, getToken?: TokenGetter): Promise<T> {
  const formData = new FormData();
  formData.append('image', file);
  return request<T>('POST', path, formData, getToken);
}

export function useApi() {
  const { getToken } = useAuth();

  return {
    get: <T>(path: string) => apiGet<T>(path, getToken),
    post: <T>(path: string, body?: unknown) => apiPost<T>(path, body, getToken),
    put: <T>(path: string, body?: unknown) => apiPut<T>(path, body, getToken),
    patch: <T>(path: string, body?: unknown) => apiPatch<T>(path, body, getToken),
    delete: <T>(path: string) => apiDelete<T>(path, getToken),
    upload: <T>(path: string, file: File) => apiUpload<T>(path, file, getToken),
  };
}

// Returns an api instance that attaches X-Impersonate-Token to every request
// instead of a Clerk bearer token. Used when an admin opens a tenant's dashboard.
export function useImpersonateApi(impersonateToken: string) {
  const impersonateGetter = async () => null; // no Clerk token
  const withHeader = (path: string, method: string, body?: unknown): Promise<Response> => {
    const headers: Record<string, string> = { 'X-Impersonate-Token': impersonateToken };
    let payload: BodyInit | undefined;
    if (body !== undefined && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    } else if (body instanceof FormData) {
      payload = body;
    }
    const url = path.startsWith('/api') ? path : `/api${path}`;
    return fetch(url, { method, headers, body: payload });
  };

  async function imp<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await withHeader(path, method, body);
    if (!res.ok) {
      let message = `Request failed with status ${res.status}`;
      try {
        const data = await res.json();
        if (data && typeof data === 'object' && 'error' in data) message = String((data as { error: unknown }).error);
      } catch { /* ignore */ }
      throw new Error(message);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  return {
    get: <T>(path: string) => imp<T>('GET', path),
    post: <T>(path: string, body?: unknown) => imp<T>('POST', path, body),
    put: <T>(path: string, body?: unknown) => imp<T>('PUT', path, body),
    patch: <T>(path: string, body?: unknown) => imp<T>('PATCH', path, body),
    delete: <T>(path: string) => imp<T>('DELETE', path),
    upload: <T>(path: string, file: File) => {
      const fd = new FormData(); fd.append('image', file);
      return imp<T>('POST', path, fd);
    },
    // pass-through so impersonation getter is available to hooks that need it
    getToken: impersonateGetter,
  };
}
