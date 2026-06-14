import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import type { ThemeProps } from '../types';
import { formatPrice } from '../types';
import { defaults } from './config';
import CartDrawer from './CartDrawer';

export default function Storefront({ theme, products, services, staff, onAddToCart, onBookService }: ThemeProps) {
  const [cartOpen, setCartOpen] = useState(false);

  const displayProducts = products.length > 0 ? products : defaults.products;
  const displayServices = services.length > 0 ? services : defaults.services;
  const heroImage = theme.heroImageUrl || defaults.heroImageUrl;
  const tagline = theme.tagline || defaults.tagline;

  const showProducts = (theme.mode === 'store' || theme.mode === 'both') && displayProducts.length > 0;
  const showServices = (theme.mode === 'book' || theme.mode === 'both') && displayServices.length > 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-[#0a0a0a] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="w-10" />
          <span className="font-black text-2xl tracking-widest uppercase">{theme.companyName}</span>
          <div className="flex items-center gap-8">
            <div className="hidden md:flex items-center gap-8 text-xs font-black uppercase tracking-[0.2em] text-white/70">
              {showProducts && <a href="#products" className="hover:text-[#e8ff00] transition-colors">Shop</a>}
              {showServices && <a href="#services" className="hover:text-[#e8ff00] transition-colors">Book</a>}
              <a href="#footer" className="hover:text-[#e8ff00] transition-colors">Contact</a>
            </div>
            {showProducts && (
              <button
                type="button"
                aria-label="Open cart"
                onClick={() => setCartOpen(true)}
                className="text-white hover:text-[#e8ff00] transition-colors"
              >
                <ShoppingCart size={20} />
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative h-[80vh] min-h-[480px] flex items-center justify-center text-center overflow-hidden bg-[#0a0a0a]">
        <img src={heroImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/70 to-[#0a0a0a]/30" />
        <div className="relative z-10 px-6 max-w-4xl">
          <h1 className="font-black text-6xl md:text-8xl text-white mb-6 leading-tight uppercase tracking-tight">
            {theme.companyName}
          </h1>
          <p className="text-[#e8ff00] text-lg md:text-2xl font-bold uppercase tracking-widest">{tagline}</p>
        </div>
      </section>

      {/* Products */}
      {showProducts && (
        <section id="products" className="max-w-7xl mx-auto px-6 py-20">
          <h2 className="font-black text-4xl md:text-5xl mb-12 text-center uppercase tracking-wide">
            Shop The Drop
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {displayProducts.map((product) => (
              <div key={product.id} className="group bg-[#161616] border border-white/10 hover:border-[#e8ff00] transition-colors p-4">
                <div className="aspect-[3/4] overflow-hidden bg-[#0a0a0a] mb-4">
                  <img
                    src={product.imageUrls?.[0] ?? defaults.heroImageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <h3 className="font-black text-lg mb-1 uppercase tracking-wide">{product.name}</h3>
                <p className="text-sm text-[#e8ff00] font-bold mb-3">{formatPrice(product.priceCents, theme.currency)}</p>
                <button
                  type="button"
                  onClick={() => onAddToCart?.(product)}
                  className="w-full bg-[#e8ff00] text-[#0a0a0a] text-xs font-black uppercase tracking-[0.2em] py-3 hover:bg-white transition-colors"
                >
                  Add to Cart
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Services */}
      {showServices && (
        <section id="services" className="bg-[#161616] py-20 border-t border-white/10">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="font-black text-4xl md:text-5xl mb-12 text-center uppercase tracking-wide">
              Book A Session
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {displayServices.map((service) => (
                <div key={service.id} className="bg-[#0a0a0a] border border-white/10 hover:border-[#e8ff00] transition-colors p-6 flex flex-col">
                  {service.imageUrls?.[0] && (
                    <div className="aspect-[4/3] overflow-hidden mb-4">
                      <img src={service.imageUrls[0]} alt={service.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <h3 className="font-black text-xl mb-2 uppercase tracking-wide">{service.name}</h3>
                  {service.description && (
                    <p className="text-sm text-white/60 mb-4 flex-1">{service.description}</p>
                  )}
                  <div className="flex items-center justify-between text-sm mb-4 font-bold">
                    <span className="text-white/50 uppercase tracking-wide">{service.durationMinutes} min</span>
                    <span className="text-[#e8ff00]">{formatPrice(service.priceCents, theme.currency)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onBookService?.(service)}
                    className="uppercase tracking-[0.2em] text-xs font-black bg-[#e8ff00] text-[#0a0a0a] py-3 hover:bg-white transition-colors"
                  >
                    Book Now
                  </button>
                </div>
              ))}
            </div>

            {staff.length > 0 && (
              <div className="mt-16 flex flex-wrap justify-center gap-12">
                {staff.map((member) => (
                  <div key={member.id} className="text-center max-w-xs">
                    {member.avatarUrl && (
                      <img
                        src={member.avatarUrl}
                        alt={member.name}
                        className="w-24 h-24 rounded-full object-cover mx-auto mb-4 border-2 border-[#e8ff00]"
                      />
                    )}
                    <h4 className="font-black text-lg uppercase tracking-wide">{member.name}</h4>
                    {member.bio && <p className="text-sm text-white/60 mt-2">{member.bio}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer id="footer" className="bg-[#0a0a0a] text-white py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="font-black text-3xl uppercase tracking-widest mb-2">{theme.companyName}</p>
          {theme.city && <p className="text-white/60 text-sm uppercase tracking-wide">{theme.city}</p>}
          <p className="text-white/40 text-xs mt-6 uppercase tracking-[0.2em]">
            &copy; {new Date().getFullYear()} {theme.companyName}. All rights reserved.
          </p>
        </div>
      </footer>

      {showProducts && (
        <CartDrawer
          isOpen={cartOpen}
          onClose={() => setCartOpen(false)}
          items={[]}
          onUpdateQuantity={() => {}}
          onRemove={() => {}}
          onCheckout={() => {}}
        />
      )}
    </div>
  );
}
