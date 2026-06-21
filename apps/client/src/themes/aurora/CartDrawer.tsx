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

export default function CartDrawer({ isOpen, onClose, items, onUpdateQuantity, onRemove, onCheckout }: CartDrawerProps) {
  const subtotal = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);

  return (
    <div className={`fixed inset-0 z-50 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`} aria-hidden={!isOpen}>
      <div className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <div className={`absolute right-0 top-0 h-full w-full max-w-md flex flex-col transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ background: 'rgba(13,13,26,0.95)', backdropFilter: 'blur(20px)', borderLeft: '1px solid rgba(167,139,250,0.2)' }}>
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Your Cart</h2>
          <button type="button" aria-label="Close cart" onClick={onClose} className="text-white/40 hover:text-[var(--brand-color,#a78bfa)]"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          {items.length === 0 ? (
            <p className="text-white/30 text-sm">Your cart is empty.</p>
          ) : items.map((item) => (
            <div key={item.cartKey} className="flex gap-4 pb-5 border-b border-white/10">
              {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="w-16 h-20 object-cover rounded-xl" />}
              <div className="flex-1 flex flex-col">
                <div className="flex justify-between">
                  <span className="text-sm text-white">{item.name}</span>
                  <button type="button" aria-label={`Remove ${item.name}`} onClick={() => onRemove(item.cartKey)} className="text-white/30 hover:text-red-400"><X size={14} /></button>
                </div>
                <span className="text-[var(--brand-color,#a78bfa)] text-sm mt-1">{formatPrice(item.priceCents)}</span>
                <div className="flex items-center gap-3 mt-auto pt-2">
                  <button type="button" aria-label="Decrease" onClick={() => onUpdateQuantity(item.cartKey, Math.max(1, item.quantity - 1))} className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center text-white/50 hover:border-[var(--brand-color,#a78bfa)]"><Minus size={10} /></button>
                  <span className="text-sm text-white w-5 text-center">{item.quantity}</span>
                  <button type="button" aria-label="Increase" onClick={() => onUpdateQuantity(item.cartKey, item.quantity + 1)} className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center text-white/50 hover:border-[var(--brand-color,#a78bfa)]"><Plus size={10} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="p-6 border-t border-white/10">
          <div className="flex justify-between mb-5">
            <span className="text-sm text-white/50">Subtotal</span>
            <span className="text-lg font-semibold text-[var(--brand-color,#a78bfa)]">{formatPrice(subtotal)}</span>
          </div>
          <button type="button" disabled={items.length === 0} onClick={onCheckout}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #a78bfa, #7c3aed)' }}>
            Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
