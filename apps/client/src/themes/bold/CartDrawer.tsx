import { X, Plus, Minus, ShoppingCart } from 'lucide-react';
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
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
      aria-hidden={!isOpen}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`absolute right-0 top-0 h-full w-full max-w-md bg-[#0a0a0a] text-white flex flex-col border-l border-white/10 transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Accent top bar */}
        <div className="h-1 bg-[var(--brand-color,#e8ff00)]" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <ShoppingCart size={18} className="text-[var(--brand-color,#e8ff00)]" />
            <span style={{ fontFamily: 'Anton, sans-serif' }} className="text-xl uppercase tracking-widest">
              Your Cart
            </span>
            {itemCount > 0 && (
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-wide">({itemCount} item{itemCount !== 1 ? 's' : ''})</span>
            )}
          </div>
          <button
            type="button"
            aria-label="Close cart"
            onClick={onClose}
            className="p-1.5 border border-white/10 hover:border-[var(--brand-color,#e8ff00)] hover:text-[var(--brand-color,#e8ff00)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center gap-3">
              <ShoppingCart size={32} className="text-white/10" />
              <p className="text-white/30 text-xs uppercase tracking-[0.3em]">Your cart is empty</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.cartKey} className="flex gap-4 group">
                {item.imageUrl ? (
                  <div className="w-20 h-24 shrink-0 overflow-hidden bg-[#1a1a1a]">
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-20 h-24 shrink-0 bg-[#1a1a1a] flex items-center justify-center">
                    <ShoppingCart size={20} className="text-white/10" />
                  </div>
                )}
                <div className="flex-1 flex flex-col min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-sm font-bold uppercase tracking-wide leading-tight">{item.name}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${item.name}`}
                      onClick={() => onRemove(item.cartKey)}
                      className="shrink-0 text-white/20 hover:text-red-400 transition-colors mt-0.5"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  {item.variantName && (
                    <span className="text-white/40 text-[10px] uppercase tracking-wide">{item.variantName}</span>
                  )}
                  <span className="text-[var(--brand-color,#e8ff00)] text-sm font-bold mt-1">
                    {formatPrice(item.priceCents)}
                  </span>
                  <div className="flex items-center gap-0 mt-auto border border-white/10 self-start">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      onClick={() => onUpdateQuantity(item.cartKey, Math.max(1, item.quantity - 1))}
                      className="px-3 py-2 hover:bg-white/5 hover:text-[var(--brand-color,#e8ff00)] transition-colors"
                    >
                      <Minus size={11} />
                    </button>
                    <span className="text-sm w-8 text-center font-bold border-x border-white/10 py-2">{item.quantity}</span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      onClick={() => onUpdateQuantity(item.cartKey, item.quantity + 1)}
                      className="px-3 py-2 hover:bg-white/5 hover:text-[var(--brand-color,#e8ff00)] transition-colors"
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-6 py-6 border-t border-white/10 flex flex-col gap-4">
            <div className="flex justify-between items-baseline">
              <span className="text-xs uppercase tracking-[0.25em] text-white/40 font-bold">Subtotal</span>
              <span style={{ fontFamily: 'Anton, sans-serif' }} className="text-2xl text-[var(--brand-color,#e8ff00)]">
                {formatPrice(subtotal)}
              </span>
            </div>
            <p className="text-white/25 text-[10px] uppercase tracking-wide">Taxes and shipping calculated at checkout</p>
            <button
              type="button"
              onClick={onCheckout}
              className="w-full bg-[var(--brand-color,#e8ff00)] text-black text-xs font-bold uppercase tracking-[0.25em] py-4 hover:bg-white transition-colors"
            >
              Checkout →
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full text-white/30 text-xs uppercase tracking-widest hover:text-white transition-colors py-1"
            >
              Continue shopping
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
