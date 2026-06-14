// NOTE: This theme expects 'Poppins' to be loaded via Google Fonts in index.html, e.g.:
// <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
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
    <div className="min-h-screen bg-white text-[#111111] font-['Poppins']">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white border-b-4 border-[#ff3cac]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="w-10" />
          <span className="font-['Poppins'] font-extrabold text-2xl tracking-wide text-[#ff3cac]">
            {theme.companyName}
          </span>
          <div className="flex items-center gap-8">
            <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-[#111111]/70">
              {showProducts && <a href="#products" className="hover:text-[#ff3cac] transition-colors">Shop</a>}
              {showServices && <a href="#services" className="hover:text-[#ff3cac] transition-colors">Book</a>}
              <a href="#footer" className="hover:text-[#ff3cac] transition-colors">Contact</a>
            </div>
            {showProducts && (
              <button
                type="button"
                aria-label="Open cart"
                onClick={() => setCartOpen(true)}
                className="text-[#111111] hover:text-[#ff3cac] transition-colors"
              >
                <ShoppingCart size={20} />
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-[480px] flex items-center justify-center text-center overflow-hidden bg-gradient-to-br from-[#f0f0ff] to-[#ffe0f0] py-24">
        <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-[#ff3cac]/10" />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-[#f0f0ff]/60 translate-x-1/3 translate-y-1/3" />
        <div className="relative z-10 px-6 max-w-3xl">
          <h1 className="font-['Poppins'] font-extrabold text-5xl md:text-7xl text-[#ff3cac] mb-6 leading-tight">
            {theme.companyName}
          </h1>
          <p className="text-[#111111]/70 text-lg md:text-xl font-medium">{tagline}</p>
        </div>
      </section>

      {/* Products */}
      {showProducts && (
        <section id="products" className="max-w-7xl mx-auto px-6 py-20">
          <h2 className="font-['Poppins'] font-bold text-3xl md:text-4xl mb-12 text-center text-[#ff3cac]">
            Shop Our Faves
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {displayProducts.map((product) => (
              <div key={product.id} className="bg-[#f0f0ff] rounded-2xl p-4 flex flex-col">
                <div className="aspect-square overflow-hidden rounded-2xl bg-white mb-4">
                  <img
                    src={product.imageUrls?.[0] ?? defaults.heroImageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <h3 className="font-['Poppins'] font-semibold text-lg mb-1">{product.name}</h3>
                <p className="text-sm text-[#111111]/60 mb-3 flex-1">{formatPrice(product.priceCents, theme.currency)}</p>
                <button
                  type="button"
                  onClick={() => onAddToCart?.(product)}
                  className="bg-[#ff3cac] text-white font-bold text-sm rounded-full py-2 hover:bg-[#ff3cac]/90 transition-colors"
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
        <section id="services" className="bg-[#f0f0ff] py-20">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="font-['Poppins'] font-bold text-3xl md:text-4xl mb-12 text-center text-[#ff3cac]">
              Book a Session
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {displayServices.map((service) => (
                <div key={service.id} className="bg-white p-6 rounded-2xl flex flex-col">
                  {service.imageUrls?.[0] && (
                    <div className="aspect-[4/3] overflow-hidden rounded-2xl mb-4">
                      <img src={service.imageUrls[0]} alt={service.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <h3 className="font-['Poppins'] font-semibold text-xl mb-2">{service.name}</h3>
                  {service.description && (
                    <p className="text-sm text-[#111111]/60 mb-4 flex-1">{service.description}</p>
                  )}
                  <div className="flex items-center justify-between text-sm mb-4">
                    <span className="text-[#111111]/50 font-medium">{service.durationMinutes} min</span>
                    <span className="text-[#ff3cac] font-bold">{formatPrice(service.priceCents, theme.currency)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onBookService?.(service)}
                    className="bg-[#ff3cac] text-white font-bold text-sm rounded-full py-3 hover:bg-[#ff3cac]/90 transition-colors"
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
                        className="w-24 h-24 rounded-full object-cover mx-auto mb-4 border-4 border-[#ff3cac]"
                      />
                    )}
                    <h4 className="font-['Poppins'] font-semibold text-lg">{member.name}</h4>
                    {member.bio && <p className="text-sm text-[#111111]/60 mt-2">{member.bio}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer id="footer" className="bg-white border-t-4 border-[#ff3cac] py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="font-['Poppins'] font-extrabold text-2xl text-[#ff3cac] mb-2">{theme.companyName}</p>
          {theme.city && <p className="text-[#111111]/60 text-sm">{theme.city}</p>}
          <p className="text-[#111111]/40 text-xs mt-6">
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
