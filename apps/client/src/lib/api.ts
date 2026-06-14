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
  formData.append('file', file);
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
