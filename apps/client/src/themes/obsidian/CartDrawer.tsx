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
      <div className={`absolute inset-0 bg-black/80 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <div className={`absolute right-0 top-0 h-full w-full max-w-md flex flex-col transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`} style={{ background: '#000', borderLeft: '1px solid #c9a84c33' }}>
        <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid #c9a84c22' }}>
          <h2 className="font-['Playfair_Display'] text-xl uppercase tracking-[0.2em] text-white">Your Collection</h2>
          <button type="button" aria-label="Close cart" onClick={onClose} className="text-white/40 hover:text-[var(--brand-color,#c9a84c)] transition-colors"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {items.length === 0 ? (
            <p className="text-white/30 text-sm font-['Playfair_Display'] italic">Your collection is empty.</p>
          ) : items.map((item) => (
            <div key={item.cartKey} className="flex gap-4" style={{ borderBottom: '1px solid #ffffff0d', paddingBottom: '1.5rem' }}>
              {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="w-18 h-22 object-cover" style={{ width: 72, height: 88 }} />}
              <div className="flex-1 flex flex-col">
                <div className="flex justify-between">
                  <span className="text-sm text-white font-['Playfair_Display']">{item.name}</span>
                  <button type="button" aria-label={`Remove ${item.name}`} onClick={() => onRemove(item.cartKey)} className="text-white/30 hover:text-[var(--brand-color,#c9a84c)]"><X size={14} /></button>
                </div>
                <span className="text-[var(--brand-color,#c9a84c)] text-sm mt-1">{formatPrice(item.priceCents)}</span>
                <div className="flex items-center gap-3 mt-auto pt-2">
                  <button type="button" aria-label="Decrease quantity" onClick={() => onUpdateQuantity(item.cartKey, Math.max(1, item.quantity - 1))} className="p-1 border border-white/10 text-white/50 hover:border-[var(--brand-color,#c9a84c)] hover:text-[var(--brand-color,#c9a84c)]"><Minus size={10} /></button>
                  <span className="text-sm text-white w-5 text-center">{item.quantity}</span>
                  <button type="button" aria-label="Increase quantity" onClick={() => onUpdateQuantity(item.cartKey, item.quantity + 1)} className="p-1 border border-white/10 text-white/50 hover:border-[var(--brand-color,#c9a84c)] hover:text-[var(--brand-color,#c9a84c)]"><Plus size={10} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="p-6" style={{ borderTop: '1px solid #c9a84c22' }}>
          <div className="flex justify-between items-baseline mb-5">
            <span className="text-xs uppercase tracking-[0.2em] text-white/40">Subtotal</span>
            <span className="font-['Playfair_Display'] text-xl text-[var(--brand-color,#c9a84c)]">{formatPrice(subtotal)}</span>
          </div>
          <button type="button" disabled={items.length === 0} onClick={onCheckout}
            className="w-full py-3 text-xs uppercase tracking-[0.2em] font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: '#c9a84c', color: '#000' }}>
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
