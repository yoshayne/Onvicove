import { useState } from 'react';
import { X } from 'lucide-react';
import type { CartItem } from '../types';
import { formatPrice } from '../types';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  status: 'idle' | 'submitting' | 'success' | 'error';
  error: string | null;
  orderNumber: string | null;
  onSubmit: (info: { name: string; email: string; phone: string }) => void;
}

export default function CheckoutModal({
  isOpen,
  onClose,
  items,
  status,
  error,
  orderNumber,
  onSubmit,
}: CheckoutModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  if (!isOpen) return null;

  const subtotal = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);

  if (status === 'success') {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-6 text-center text-[#111111]">
          <p className="mb-2 text-lg font-semibold">Order placed!</p>
          {orderNumber && (
            <p className="mb-4 text-sm text-gray-600">
              Your order number is <span className="font-medium">{orderNumber}</span>. You'll
              receive a confirmation by email.
            </p>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[var(--brand-color,#111111)] px-5 py-2 text-sm font-medium text-white"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 text-[#111111]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Checkout</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <div className="mb-4 flex items-center justify-between text-sm">
          <span className="text-gray-500">Subtotal</span>
          <span className="font-medium">{formatPrice(subtotal)}</span>
        </div>

        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({ name, email, phone });
          }}
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500" htmlFor="co-name">
              Name
            </label>
            <input
              id="co-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--brand-color,#111111)] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500" htmlFor="co-email">
              Email
            </label>
            <input
              id="co-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--brand-color,#111111)] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500" htmlFor="co-phone">
              Phone (optional)
            </label>
            <input
              id="co-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--brand-color,#111111)] focus:outline-none"
            />
          </div>

          {status === 'error' && error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={status === 'submitting'}
            className="mt-2 rounded-lg bg-[var(--brand-color,#111111)] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {status === 'submitting' ? 'Placing order…' : 'Place order'}
          </button>
        </form>
      </div>
    </div>
  );
}
