import { X, Plus, Minus } from 'lucide-react';
import type { CartItem } from '../types';
import { formatPrice } from '../types';
import type { BookingFirstPreset } from './presets';

interface Props {
  preset: BookingFirstPreset;
  currency?: string;
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (cartKey: string, qty: number) => void;
  onRemove: (cartKey: string) => void;
  onCheckout: () => void;
}

export default function PresetCartDrawer({ preset: p, currency, isOpen, onClose, items, onUpdateQuantity, onRemove, onCheckout }: Props) {
  const subtotal = items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);
  const accent = `var(--brand-color, ${p.accent})`;
  return (
    <div className={`fixed inset-0 z-50 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`} aria-hidden={!isOpen}>
      <div className={`absolute inset-0 bg-black/60 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <div
        className={`absolute right-0 top-0 flex h-full w-full max-w-md transform flex-col transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ background: p.bg, color: p.text, fontFamily: p.bodyFont }}
      >
        <div className="flex items-center justify-between p-5" style={{ borderBottom: `1px solid ${p.border}` }}>
          <h2 className="text-xl" style={{ fontFamily: p.headingFont, textTransform: p.uppercaseHeadings ? 'uppercase' : undefined }}>Cart</h2>
          <button type="button" aria-label="Close cart" onClick={onClose} style={{ color: p.muted }}><X size={22} /></button>
        </div>
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5">
          {items.length === 0 ? (
            <p className="text-sm" style={{ color: p.muted }}>Your cart is empty.</p>
          ) : (
            items.map((item) => (
              <div key={item.cartKey} className="flex gap-3">
                {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="h-20 w-16 object-cover" style={{ borderRadius: Math.min(p.radius, 8) }} />}
                <div className="flex flex-1 flex-col">
                  <div className="flex justify-between gap-2">
                    <span className="text-sm font-medium">{item.name}</span>
                    <button type="button" aria-label={`Remove ${item.name}`} onClick={() => onRemove(item.cartKey)} style={{ color: p.muted }}><X size={16} /></button>
                  </div>
                  {item.variantName && <span className="text-xs" style={{ color: p.muted }}>{item.variantName}</span>}
                  <div className="mt-auto flex items-center justify-between">
                    <div className="flex items-center gap-2" style={{ border: `1px solid ${p.border}`, borderRadius: Math.min(p.radius, 8) }}>
                      <button type="button" aria-label="Fewer" className="p-1.5" onClick={() => onUpdateQuantity(item.cartKey, item.quantity - 1)}><Minus size={14} /></button>
                      <span className="w-5 text-center text-sm">{item.quantity}</span>
                      <button type="button" aria-label="More" className="p-1.5" onClick={() => onUpdateQuantity(item.cartKey, item.quantity + 1)}><Plus size={14} /></button>
                    </div>
                    <span className="text-sm font-semibold">{formatPrice(item.priceCents * item.quantity, currency)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-5" style={{ borderTop: `1px solid ${p.border}` }}>
          <div className="mb-3 flex justify-between text-sm"><span style={{ color: p.muted }}>Subtotal</span><span className="font-semibold">{formatPrice(subtotal, currency)}</span></div>
          <button
            type="button"
            disabled={items.length === 0}
            onClick={onCheckout}
            className="w-full py-3.5 text-sm font-bold uppercase tracking-widest disabled:opacity-40"
            style={{ background: accent, color: p.onAccent, borderRadius: Math.min(p.radius * 2, 999) }}
          >
            Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
