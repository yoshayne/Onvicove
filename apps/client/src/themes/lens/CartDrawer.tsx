import { X, Plus, Minus } from 'lucide-react';
import type { CartItem } from '../types';
import { formatPrice } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (cartKey: string, qty: number) => void;
  onRemove: (cartKey: string) => void;
  onCheckout: () => void;
}

export default function CartDrawer({
  isOpen, onClose, items, onUpdateQuantity, onRemove, onCheckout,
}: CartDrawerProps) {
  const subtotal = items.reduce((s, i) => s + i.priceCents * i.quantity, 0);

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity font-['DM_Sans'] ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
      aria-hidden={!isOpen}
    >
      <div
        className={`absolute inset-0 bg-black/70 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div
        className={`absolute right-0 top-0 h-full w-full max-w-sm bg-[#0d0d0d] border-l border-white/10 text-[#f0ede8] flex flex-col transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <h2 className="text-xs uppercase tracking-[0.2em] text-white/60">Cart ({items.reduce((s, i) => s + i.quantity, 0)})</h2>
          <button type="button" aria-label="Close cart" onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
          {items.length === 0 ? (
            <p className="text-sm text-white/30 italic mt-4">Your cart is empty.</p>
          ) : (
            items.map((item) => (
              <div key={item.cartKey} className="flex gap-4">
                {item.imageUrl && (
                  <img src={item.imageUrl} alt={item.name} className="w-16 h-20 object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-sm text-white/90 leading-tight">{item.name}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${item.name}`}
                      onClick={() => onRemove(item.cartKey)}
                      className="text-white/25 hover:text-white/70 shrink-0 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  {item.variantName && (
                    <span className="text-xs text-white/40 mt-0.5">{item.variantName}</span>
                  )}
                  <span className="text-sm text-[var(--brand-color,#c8b8a2)] mt-1">{formatPrice(item.priceCents)}</span>
                  <div className="flex items-center gap-2 mt-auto pt-2">
                    <button
                      type="button"
                      aria-label="Decrease"
                      onClick={() => onUpdateQuantity(item.cartKey, Math.max(1, item.quantity - 1))}
                      className="w-6 h-6 border border-white/15 flex items-center justify-center text-white/50 hover:border-white/40 hover:text-white transition-colors"
                    >
                      <Minus size={10} />
                    </button>
                    <span className="text-xs w-5 text-center text-white/70">{item.quantity}</span>
                    <button
                      type="button"
                      aria-label="Increase"
                      onClick={() => onUpdateQuantity(item.cartKey, item.quantity + 1)}
                      className="w-6 h-6 border border-white/15 flex items-center justify-center text-white/50 hover:border-white/40 hover:text-white transition-colors"
                    >
                      <Plus size={10} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-6 py-5 border-t border-white/10">
          <div className="flex justify-between items-baseline mb-5">
            <span className="text-xs uppercase tracking-[0.2em] text-white/40">Total</span>
            <span className="font-['DM_Serif_Display'] text-xl text-[var(--brand-color,#c8b8a2)]">{formatPrice(subtotal)}</span>
          </div>
          <button
            type="button"
            disabled={items.length === 0}
            onClick={onCheckout}
            className="w-full bg-[var(--brand-color,#c8b8a2)] text-[#0d0d0d] text-xs uppercase tracking-[0.2em] py-3 font-medium hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
