import { useAuth } from '@clerk/clerk-react';
import { useImpersonation } from '../contexts/ImpersonationContext';

export type TokenGetter = () => Promise<string | null>;

async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  getToken?: TokenGetter,
  impersonateToken?: string | null
): Promise<T> {
  const headers: Record<string, string> = {};
  let payload: BodyInit | undefined;
  if (impersonateToken) headers['X-Impersonate-Token'] = impersonateToken;

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

export function apiGet<T>(path: string, getToken?: TokenGetter, impersonateToken?: string | null): Promise<T> {
  return request<T>('GET', path, undefined, getToken, impersonateToken);
}

export function apiPost<T>(path: string, body?: unknown, getToken?: TokenGetter, impersonateToken?: string | null): Promise<T> {
  return request<T>('POST', path, body, getToken, impersonateToken);
}

export function apiPut<T>(path: string, body?: unknown, getToken?: TokenGetter, impersonateToken?: string | null): Promise<T> {
  return request<T>('PUT', path, body, getToken, impersonateToken);
}

export function apiPatch<T>(path: string, body?: unknown, getToken?: TokenGetter, impersonateToken?: string | null): Promise<T> {
  return request<T>('PATCH', path, body, getToken, impersonateToken);
}

export function apiDelete<T>(path: string, getToken?: TokenGetter, impersonateToken?: string | null): Promise<T> {
  return request<T>('DELETE', path, undefined, getToken, impersonateToken);
}

export function apiUpload<T>(path: string, file: File, getToken?: TokenGetter, impersonateToken?: string | null): Promise<T> {
  const formData = new FormData();
  formData.append('image', file);
  return request<T>('POST', path, formData, getToken, impersonateToken);
}

export function useApi() {
  const { getToken } = useAuth();
  const { impersonation } = useImpersonation();
  const imp = impersonation?.token ?? null;

  return {
    get: <T>(path: string) => apiGet<T>(path, getToken, imp),
    post: <T>(path: string, body?: unknown) => apiPost<T>(path, body, getToken, imp),
    put: <T>(path: string, body?: unknown) => apiPut<T>(path, body, getToken, imp),
    patch: <T>(path: string, body?: unknown) => apiPatch<T>(path, body, getToken, imp),
    delete: <T>(path: string) => apiDelete<T>(path, getToken, imp),
    upload: <T>(path: string, file: File) => apiUpload<T>(path, file, getToken, imp),
  };
}
