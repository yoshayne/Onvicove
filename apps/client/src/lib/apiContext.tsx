import { createContext, useContext, type ReactNode } from 'react';
import { useApi } from './api';

type ApiInstance = ReturnType<typeof useApi>;

const ApiContext = createContext<ApiInstance | null>(null);

export function ApiProvider({ children }: { children: ReactNode }) {
  // useApi() already picks up the active impersonation token via ImpersonationContext.
  const api = useApi();

  return (
    <ApiContext.Provider value={api}>
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
