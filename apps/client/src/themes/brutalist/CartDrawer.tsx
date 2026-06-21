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
      <div className={`absolute inset-0 bg-black/50 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <div className={`absolute right-0 top-0 h-full w-full max-w-md bg-white flex flex-col transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`} style={{ borderLeft: '3px solid #000' }}>
        <div className="flex items-center justify-between p-6 border-b-3 border-b-[3px] border-black">
          <h2 className="font-black text-xl uppercase tracking-widest">YOUR CART (0)</h2>
          <button type="button" aria-label="Close cart" onClick={onClose} className="font-black text-xl hover:text-[var(--brand-color,#0000ff)]"><X size={22} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          {items.length === 0 ? (
            <p className="font-mono text-sm text-black/50">CART IS EMPTY.</p>
          ) : items.map((item) => (
            <div key={item.cartKey} className="flex gap-4 pb-4 border-b-2 border-black">
              {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="w-16 h-20 object-cover border-2 border-black" />}
              <div className="flex-1 flex flex-col">
                <div className="flex justify-between">
                  <span className="text-sm font-black uppercase">{item.name}</span>
                  <button type="button" aria-label={`Remove ${item.name}`} onClick={() => onRemove(item.cartKey)} className="text-black/40 hover:text-[var(--brand-color,#0000ff)] font-black"><X size={14} /></button>
                </div>
                <span className="font-mono font-bold text-sm mt-1">{formatPrice(item.priceCents)}</span>
                <div className="flex items-center gap-2 mt-auto pt-2">
                  <button type="button" aria-label="Decrease" onClick={() => onUpdateQuantity(item.cartKey, Math.max(1, item.quantity - 1))} className="p-1 border-2 border-black font-black hover:bg-black hover:text-white"><Minus size={10} /></button>
                  <span className="text-sm font-black w-6 text-center">{item.quantity}</span>
                  <button type="button" aria-label="Increase" onClick={() => onUpdateQuantity(item.cartKey, item.quantity + 1)} className="p-1 border-2 border-black font-black hover:bg-black hover:text-white"><Plus size={10} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="p-6 border-t-[3px] border-black">
          <div className="flex justify-between mb-4">
            <span className="font-black uppercase tracking-widest text-sm">TOTAL</span>
            <span className="font-black text-xl">{formatPrice(subtotal)}</span>
          </div>
          <button type="button" disabled={items.length === 0} onClick={onCheckout}
            className="w-full py-3 font-black text-sm uppercase tracking-widest bg-black text-white border-2 border-black hover:bg-[var(--brand-color,#0000ff)] hover:border-[var(--brand-color,#0000ff)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            CHECKOUT →
          </button>
        </div>
      </div>
    </div>
  );
}
