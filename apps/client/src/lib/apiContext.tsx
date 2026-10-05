import { createContext, useContext, type ReactNode } from 'react';
import { useApi, useImpersonateApi } from './api';

type ApiInstance = ReturnType<typeof useApi>;

const ApiContext = createContext<ApiInstance | null>(null);

export function ApiProvider({ children }: { children: ReactNode }) {
  const impersonateToken = sessionStorage.getItem('impersonate_token');
  const normalApi = useApi();
  // useImpersonateApi is called unconditionally to satisfy React rules;
  // we only use the result when a token is present.
  const impersonateApi = useImpersonateApi(impersonateToken ?? '');

  return (
    <ApiContext.Provider value={impersonateToken ? impersonateApi : normalApi}>
      {children}
    </ApiContext.Provider>
  );
}

// Drop-in replacement for useApi() — picks up impersonation automatically
export function useApiCtx(): ApiInstance {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error('useApiCtx must be used inside ApiProvider');
  return ctx;
}
