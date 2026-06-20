import { useState } from 'react';
import { X } from 'lucide-react';
import type { CartItem } from '../types';
import { formatPrice } from '../types';
import StripePaymentForm from './StripePaymentForm';
import type { ShippingAddress } from './useStorefrontCommerce';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  status: 'idle' | 'submitting' | 'payment' | 'success' | 'error';
  error: string | null;
  orderNumber: string | null;
  clientSecret?: string | null;
  amountCents?: number;
  stripeAccountId?: string;
  currency?: string;
  onSubmit: (info: { name: string; email: string; phone: string; shippingAddress?: ShippingAddress }) => void;
  onPaymentSuccess?: () => void;
  onPaymentCancel?: () => void;
}

export default function CheckoutModal({
  isOpen,
  onClose,
  items,
  status,
  error,
  orderNumber,
  clientSecret,
  amountCents,
  stripeAccountId,
  currency,
  onSubmit,
  onPaymentSuccess,
  onPaymentCancel,
}: CheckoutModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('US');

  if (!isOpen) return null;

  const needsShipping = items.some((i) => i.requiresShipping !== false);
  const subtotal = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const shippingAddress: ShippingAddress | undefined = needsShipping
      ? { line1, line2: line2 || undefined, city, state, postal_code: postalCode, country }
      : undefined;
    onSubmit({ name, email, phone, shippingAddress });
  }

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

  if (status === 'payment' && clientSecret) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-6 text-[#111111]">
          <h2 className="mb-4 text-lg font-semibold">Payment</h2>
          <StripePaymentForm
            clientSecret={clientSecret}
            amountCents={amountCents ?? subtotal}
            currency={currency}
            stripeAccountId={stripeAccountId}
            onSuccess={() => onPaymentSuccess?.()}
            onCancel={() => onPaymentCancel?.()}
          />
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
          <span className="text-gray-500">Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)</span>
          <span className="font-medium">{formatPrice(subtotal, currency)}</span>
        </div>

        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Contact info</p>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500" htmlFor="co-name">Name</label>
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
            <label className="mb-1 block text-xs font-medium text-gray-500" htmlFor="co-email">Email</label>
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
            <label className="mb-1 block text-xs font-medium text-gray-500" htmlFor="co-phone">Phone (optional)</label>
            <input
              id="co-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--brand-color,#111111)] focus:outline-none"
            />
          </div>

          {needsShipping && (
            <>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Shipping address</p>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500" htmlFor="co-line1">Address</label>
                <input
                  id="co-line1"
                  type="text"
                  required
                  placeholder="123 Main St"
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--brand-color,#111111)] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500" htmlFor="co-line2">Apt / Suite (optional)</label>
                <input
                  id="co-line2"
                  type="text"
                  value={line2}
                  onChange={(e) => setLine2(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--brand-color,#111111)] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500" htmlFor="co-city">City</label>
                  <input
                    id="co-city"
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--brand-color,#111111)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500" htmlFor="co-state">State</label>
                  <input
                    id="co-state"
                    type="text"
                    required
                    placeholder="CA"
                    maxLength={2}
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--brand-color,#111111)] focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500" htmlFor="co-zip">ZIP code</label>
                  <input
                    id="co-zip"
                    type="text"
                    required
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--brand-color,#111111)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500" htmlFor="co-country">Country</label>
                  <input
                    id="co-country"
                    type="text"
                    required
                    placeholder="US"
                    maxLength={2}
                    value={country}
                    onChange={(e) => setCountry(e.target.value.toUpperCase())}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--brand-color,#111111)] focus:outline-none"
                  />
                </div>
              </div>
            </>
          )}

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
