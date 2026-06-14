import { X, Plus, Minus } from 'lucide-react';
import type { CartItem } from '../types';
import { formatPrice } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
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
        className={`absolute inset-0 bg-black/60 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div
        className={`absolute right-0 top-0 h-full w-full max-w-md bg-[#1a1a1a] text-white flex flex-col transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="font-['Playfair_Display'] text-2xl uppercase tracking-wide">Your Bag</h2>
          <button type="button" aria-label="Close cart" onClick={onClose} className="text-white/60 hover:text-white">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {items.length === 0 ? (
            <p className="text-white/40 text-sm">Your bag is empty.</p>
          ) : (
            items.map((item) => (
              <div key={item.productId} className="flex gap-4">
                {item.imageUrl && (
                  <img src={item.imageUrl} alt={item.name} className="w-20 h-24 object-cover" />
                )}
                <div className="flex-1 flex flex-col">
                  <div className="flex justify-between">
                    <span className="text-sm">{item.name}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${item.name}`}
                      onClick={() => onRemove(item.productId)}
                      className="text-white/40 hover:text-[#d4a96a]"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <span className="text-[#d4a96a] text-sm mt-1">{formatPrice(item.priceCents)}</span>
                  <div className="flex items-center gap-3 mt-auto">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      onClick={() => onUpdateQuantity(item.productId, Math.max(1, item.quantity - 1))}
                      className="p-1 border border-white/20 hover:border-[#d4a96a]"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="text-sm w-6 text-center">{item.quantity}</span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                      className="p-1 border border-white/20 hover:border-[#d4a96a]"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t border-white/10">
          <div className="flex justify-between text-sm uppercase tracking-widest mb-4">
            <span>Subtotal</span>
            <span className="font-['Playfair_Display'] text-lg text-[#d4a96a]">{formatPrice(subtotal)}</span>
          </div>
          <button
            type="button"
            disabled={items.length === 0}
            onClick={onCheckout}
            className="w-full bg-[#d4a96a] text-[#111111] uppercase tracking-widest text-sm py-3 hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
