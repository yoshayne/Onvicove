import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface ImpersonationState {
  tenantId: string;
  companyName: string;
  slug: string;
  token: string;
}

interface ImpersonationContextValue {
  impersonation: ImpersonationState | null;
  startImpersonation: (state: ImpersonationState) => void;
  endImpersonation: () => void;
}

const ImpersonationContext = createContext<ImpersonationContextValue>({
  impersonation: null,
  startImpersonation: () => {},
  endImpersonation: () => {},
});

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [impersonation, setImpersonation] = useState<ImpersonationState | null>(() => {
    try {
      const raw = sessionStorage.getItem('impersonation');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const startImpersonation = useCallback((state: ImpersonationState) => {
    sessionStorage.setItem('impersonation', JSON.stringify(state));
    setImpersonation(state);
  }, []);

  const endImpersonation = useCallback(() => {
    sessionStorage.removeItem('impersonation');
    setImpersonation(null);
  }, []);

  return (
    <ImpersonationContext.Provider value={{ impersonation, startImpersonation, endImpersonation }}>
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  return useContext(ImpersonationContext);
}
