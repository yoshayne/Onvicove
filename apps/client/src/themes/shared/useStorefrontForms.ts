import { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export function useStorefrontForms(slug: string) {
  const [subscribeStatus, setSubscribeStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [customOrderStatus, setCustomOrderStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function subscribe(email: string, firstName?: string) {
    if (!email) return;
    setSubscribeStatus('loading');
    try {
      const res = await fetch(`${API_BASE}/api/public/${slug}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, firstName }),
      });
      if (!res.ok) throw new Error();
      setSubscribeStatus('success');
    } catch {
      setSubscribeStatus('error');
    }
  }

  async function submitCustomOrder(name: string, email: string, message: string) {
    setCustomOrderStatus('loading');
    try {
      const res = await fetch(`${API_BASE}/api/public/${slug}/custom-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });
      if (!res.ok) throw new Error();
      setCustomOrderStatus('success');
    } catch {
      setCustomOrderStatus('error');
    }
  }

  return { subscribe, subscribeStatus, submitCustomOrder, customOrderStatus };
}
