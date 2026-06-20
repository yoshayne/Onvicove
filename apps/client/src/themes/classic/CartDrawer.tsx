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
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemove,
  onCheckout,
}: CartDrawerProps) {
  const subtotal = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
      aria-hidden={!isOpen}
    >
      <div
        className={`absolute inset-0 bg-[#1a3a5c]/60 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div
        className={`absolute right-0 top-0 h-full w-full max-w-md bg-white text-[#1a3a5c] flex flex-col border-l-2 border-[#1a3a5c] transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-6 border-b-2 border-[#1a3a5c]">
          <h2 className="font-['Merriweather'] text-2xl font-bold uppercase tracking-wide text-[#1a3a5c]">
            Your Cart
          </h2>
          <button type="button" aria-label="Close cart" onClick={onClose} className="text-[#1a3a5c]/60 hover:text-[var(--brand-color,#c8a850)]">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {items.length === 0 ? (
            <p className="text-[#1a3a5c]/50 text-sm font-serif">Your cart is empty.</p>
          ) : (
            items.map((item) => (
              <div key={item.cartKey} className="flex gap-4 border-b border-[#1a3a5c]/10 pb-4">
                {item.imageUrl && (
                  <img src={item.imageUrl} alt={item.name} className="w-20 h-24 object-cover border border-[#1a3a5c]/10" />
                )}
                <div className="flex-1 flex flex-col">
                  <div className="flex justify-between">
                    <span className="text-sm font-serif">{item.name}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${item.name}`}
                      onClick={() => onRemove(item.cartKey)}
                      className="text-[#1a3a5c]/40 hover:text-[var(--brand-color,#c8a850)]"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <span className="text-[var(--brand-color,#c8a850)] text-sm font-bold mt-1">{formatPrice(item.priceCents)}</span>
                  <div className="flex items-center gap-3 mt-auto">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      onClick={() => onUpdateQuantity(item.cartKey, Math.max(1, item.quantity - 1))}
                      className="p-1 border border-[#1a3a5c]/30 hover:border-[var(--brand-color,#c8a850)]"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="text-sm w-6 text-center font-serif">{item.quantity}</span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      onClick={() => onUpdateQuantity(item.cartKey, item.quantity + 1)}
                      className="p-1 border border-[#1a3a5c]/30 hover:border-[var(--brand-color,#c8a850)]"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t-2 border-[#1a3a5c]">
          <div className="flex justify-between text-sm font-bold uppercase tracking-wide mb-4">
            <span>Subtotal</span>
            <span className="font-['Merriweather'] text-lg text-[var(--brand-color,#c8a850)]">{formatPrice(subtotal)}</span>
          </div>
          <button
            type="button"
            disabled={items.length === 0}
            onClick={onCheckout}
            className="w-full bg-[#1a3a5c] text-white uppercase tracking-wide text-sm font-bold py-3 hover:bg-[var(--brand-color,#c8a850)] hover:text-[#1a3a5c] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
