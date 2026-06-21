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
      <div className={`absolute inset-0 bg-[#2c1f14]/40 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <div className={`absolute right-0 top-0 h-full w-full max-w-md flex flex-col transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`} style={{ background: '#f5f0e8', borderLeft: '1px solid #c4b49a' }}>
        <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid #c4b49a' }}>
          <h2 className="font-['Playfair_Display'] text-xl text-[#2c1f14]">Your Basket</h2>
          <button type="button" aria-label="Close cart" onClick={onClose} className="text-[#5c4a32]/40 hover:text-[#2c1f14]"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          {items.length === 0 ? (
            <p className="text-[#5c4a32]/40 text-sm font-['Playfair_Display'] italic">Your basket is empty.</p>
          ) : items.map((item) => (
            <div key={item.cartKey} className="flex gap-4 pb-5" style={{ borderBottom: '1px solid #c4b49a' }}>
              {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="w-16 h-20 object-cover rounded-lg" />}
              <div className="flex-1 flex flex-col">
                <div className="flex justify-between">
                  <span className="text-sm text-[#2c1f14] font-['Playfair_Display']">{item.name}</span>
                  <button type="button" aria-label={`Remove ${item.name}`} onClick={() => onRemove(item.cartKey)} className="text-[#5c4a32]/30 hover:text-red-700"><X size={14} /></button>
                </div>
                <span className="text-[#5c4a32] text-sm mt-1">{formatPrice(item.priceCents)}</span>
                <div className="flex items-center gap-3 mt-auto pt-2">
                  <button type="button" aria-label="Decrease" onClick={() => onUpdateQuantity(item.cartKey, Math.max(1, item.quantity - 1))} className="w-6 h-6 rounded-full border border-[#5c4a32]/30 text-[#5c4a32]/50 flex items-center justify-center hover:border-[#5c4a32]"><Minus size={10} /></button>
                  <span className="text-sm text-[#2c1f14] w-5 text-center">{item.quantity}</span>
                  <button type="button" aria-label="Increase" onClick={() => onUpdateQuantity(item.cartKey, item.quantity + 1)} className="w-6 h-6 rounded-full border border-[#5c4a32]/30 text-[#5c4a32]/50 flex items-center justify-center hover:border-[#5c4a32]"><Plus size={10} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="p-6" style={{ borderTop: '1px solid #c4b49a' }}>
          <div className="flex justify-between mb-5">
            <span className="text-xs uppercase tracking-widest text-[#5c4a32]/60">Subtotal</span>
            <span className="font-['Playfair_Display'] text-xl text-[#2c1f14]">{formatPrice(subtotal)}</span>
          </div>
          <button type="button" disabled={items.length === 0} onClick={onCheckout}
            className="w-full py-3 text-xs uppercase tracking-[0.15em] font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: '#5c4a32', color: '#f5f0e8' }}>
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
