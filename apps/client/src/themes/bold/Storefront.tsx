import { useState, useEffect } from 'react';
import { ShoppingCart, Menu, X, ArrowUp, Clock, ArrowRight } from 'lucide-react';
import type { ThemeProps } from '../types';
import { formatPrice } from '../types';
import { defaults } from './config';
import CartDrawer from './CartDrawer';
import BookingModal from './BookingModal';
import CheckoutModal from '../shared/CheckoutModal';
import BookingStatusOverlay from '../shared/BookingStatusOverlay';
import ProductQuickView from '../shared/ProductQuickView';
import { useStorefrontCommerce } from '../shared/useStorefrontCommerce';
import { useStorefrontForms } from '../shared/useStorefrontForms';
import CustomOrderModal from '../shared/CustomOrderModal';

export default function Storefront({ theme, products, services, staff }: ThemeProps) {
  const {
    cart, cartOpen, setCartOpen, addToCart, updateCartQuantity, removeFromCart,
    quickViewProduct, openQuickView, closeQuickView,
    checkoutOpen, openCheckout, closeCheckout, orderStatus, orderError, orderNumber, submitOrder,
    orderClientSecret, orderAmountCents, confirmOrderPayment, cancelOrderPayment,
    bookingService, bookingOpen, openBooking, closeBooking, selectedDate, selectedSlot,
    availableSlots, selectBookingDate, selectBookingSlot, bookingStatus, bookingError,
    confirmBooking, confirmBookingPayment, cancelBookingPayment, dismissBookingStatus,
    bookingClientSecret, bookingAmountCents,
  } = useStorefrontCommerce(theme.slug);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [customOrderOpen, setCustomOrderOpen] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const { subscribe, subscribeStatus, submitCustomOrder, customOrderStatus } = useStorefrontForms(theme.slug ?? '');

  const displayProducts = products.length > 0 ? products : defaults.products;
  const displayServices = services.length > 0 ? services : defaults.services;
  const heroImage = theme.heroImageUrl || defaults.heroImageUrl;
  const tagline = theme.tagline || defaults.tagline;

  const showProducts = (theme.mode === 'store' || theme.mode === 'both') && displayProducts.length > 0;
  const showServices = (theme.mode === 'book' || theme.mode === 'both') && displayServices.length > 0;
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  // Load Anton font
  useEffect(() => {
    const existing = document.querySelector('link[data-font="anton"]');
    if (existing) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Anton&display=swap';
    link.setAttribute('data-font', 'anton');
    document.head.appendChild(link);
  }, []);

  // Back-to-top visibility
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white scroll-smooth" style={{ fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        .bold-heading { font-family: 'Anton', sans-serif; }
        .product-card:hover .product-overlay { opacity: 1; }
        .product-card:hover .product-overlay-btn { transform: translateY(0); }
        .product-overlay { opacity: 0; transition: opacity 0.3s ease; }
        .product-overlay-btn { transform: translateY(1rem); transition: transform 0.35s ease; }
        .product-card img { transition: transform 0.7s ease; }
        .product-card:hover img { transform: scale(1.08); }
      `}</style>

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Mobile hamburger */}
          <button
            type="button"
            aria-label="Menu"
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden text-white/70 hover:text-white"
          >
            <Menu size={22} />
          </button>

          <span className="bold-heading text-2xl md:text-3xl tracking-widest uppercase">{theme.companyName}</span>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-8 text-[11px] font-bold uppercase tracking-[0.25em] text-white/60">
              {showProducts && (
                <a href="#products" className="hover:text-[var(--brand-color,#e8ff00)] transition-colors">Shop</a>
              )}
              {showServices && (
                <a href="#services" className="hover:text-[var(--brand-color,#e8ff00)] transition-colors">Book</a>
              )}
              {staff.length > 0 && (
                <a href="#team" className="hover:text-[var(--brand-color,#e8ff00)] transition-colors">Team</a>
              )}
              <a href="#footer" className="hover:text-[var(--brand-color,#e8ff00)] transition-colors">Contact</a>
            </div>

            {showProducts && (
              <button
                type="button"
                aria-label="Open cart"
                onClick={() => setCartOpen(true)}
                className="relative p-2 border border-white/20 hover:border-[var(--brand-color,#e8ff00)] hover:text-[var(--brand-color,#e8ff00)] transition-all"
              >
                <ShoppingCart size={18} />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--brand-color,#e8ff00)] text-[9px] font-bold text-black">
                    {cartCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col p-8">
          <div className="flex items-center justify-between mb-12">
            <span className="bold-heading text-2xl tracking-widest uppercase">{theme.companyName}</span>
            <button type="button" onClick={() => setMobileMenuOpen(false)} className="text-white/60 hover:text-white">
              <X size={24} />
            </button>
          </div>
          <nav className="flex flex-col gap-6">
            {showProducts && (
              <a href="#products" onClick={() => setMobileMenuOpen(false)} className="bold-heading text-5xl uppercase text-white/80 hover:text-[var(--brand-color,#e8ff00)] transition-colors">Shop</a>
            )}
            {showServices && (
              <a href="#services" onClick={() => setMobileMenuOpen(false)} className="bold-heading text-5xl uppercase text-white/80 hover:text-[var(--brand-color,#e8ff00)] transition-colors">Book</a>
            )}
            {staff.length > 0 && (
              <a href="#team" onClick={() => setMobileMenuOpen(false)} className="bold-heading text-5xl uppercase text-white/80 hover:text-[var(--brand-color,#e8ff00)] transition-colors">Team</a>
            )}
            <a href="#footer" onClick={() => setMobileMenuOpen(false)} className="bold-heading text-5xl uppercase text-white/80 hover:text-[var(--brand-color,#e8ff00)] transition-colors">Contact</a>
          </nav>
          <div className="mt-auto text-xs text-white/30 uppercase tracking-widest">&copy; {new Date().getFullYear()} {theme.companyName}</div>
        </div>
      )}

      {/* ── Hero ── */}
      <section className="relative h-screen min-h-[600px] flex flex-col items-center justify-center text-center overflow-hidden">
        {/* Background */}
        {heroImage ? (
          <img src={heroImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, #1a1a1a 0, #1a1a1a 1px, transparent 0, transparent 50%)',
              backgroundSize: '14px 14px',
            }}
          />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-[#0a0a0a]" />

        {/* Content */}
        <div className="relative z-10 px-6 max-w-5xl w-full">
          <div className="inline-flex items-center gap-2 border border-[var(--brand-color,#e8ff00)]/60 px-4 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-color,#e8ff00)] animate-pulse" />
            <span className="text-[var(--brand-color,#e8ff00)] text-[10px] font-bold uppercase tracking-[0.35em]">
              {theme.industry || 'New Collection'}
            </span>
          </div>

          <h1 className="bold-heading text-[clamp(4rem,14vw,11rem)] text-white leading-none uppercase mb-4">
            {theme.companyName}
          </h1>

          <p className="text-white/60 text-sm md:text-base uppercase tracking-[0.35em] mb-10">
            {tagline}
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            {showProducts && (
              <a
                href="#products"
                className="bg-[var(--brand-color,#e8ff00)] text-black font-bold uppercase tracking-[0.2em] text-xs px-8 py-4 hover:bg-white transition-colors flex items-center gap-2"
              >
                Shop Now <ArrowRight size={14} />
              </a>
            )}
            {showServices && (
              <a
                href="#services"
                className="border-2 border-white text-white font-bold uppercase tracking-[0.2em] text-xs px-8 py-4 hover:border-[var(--brand-color,#e8ff00)] hover:text-[var(--brand-color,#e8ff00)] transition-colors"
              >
                Book
              </a>
            )}
            <button
              type="button"
              onClick={() => setCustomOrderOpen(true)}
              className="border border-white/40 text-white/80 font-medium uppercase tracking-[0.2em] text-xs px-8 py-4 hover:border-white hover:text-white transition-colors"
            >
              Custom Order
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30">
          <span className="text-[9px] uppercase tracking-[0.4em]">Scroll</span>
          <div className="w-px h-10 bg-gradient-to-b from-white/40 to-transparent" />
        </div>
      </section>

      {/* ── Products ── */}
      {showProducts && (
        <section id="products" className="scroll-mt-20 py-24 bg-[#0a0a0a]">
          <div className="max-w-7xl mx-auto px-6">
            {/* Section header */}
            <div className="flex items-end justify-between mb-14">
              <div>
                <p className="text-[var(--brand-color,#e8ff00)] text-[10px] font-bold uppercase tracking-[0.4em] mb-2">— The Drop</p>
                <h2 className="bold-heading text-5xl md:text-6xl uppercase leading-none">Shop</h2>
              </div>
              <div className="hidden md:block h-px flex-1 bg-white/10 mx-8 mb-3" />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {displayProducts.map((product) => (
                <div key={product.id} className="product-card group relative bg-[#111] overflow-hidden cursor-pointer">
                  {/* Image */}
                  <div className="aspect-[3/4] overflow-hidden bg-[#1a1a1a]">
                    <img
                      src={product.imageUrls?.[0] ?? defaults.heroImageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Hover overlay */}
                  <div className="product-overlay absolute inset-0 bg-black/75 flex flex-col items-center justify-end p-5">
                    {product.description && (
                      <p className="text-white/70 text-xs text-center mb-4 leading-relaxed">{product.description}</p>
                    )}
                    <button
                      type="button"
                      onClick={() => openQuickView(product)}
                      className="product-overlay-btn w-full bg-[var(--brand-color,#e8ff00)] text-black text-xs font-bold uppercase tracking-[0.2em] py-3 hover:bg-white transition-colors"
                    >
                      {theme.paymentsEnabled ? 'Quick View' : 'View Details'}
                    </button>
                  </div>

                  {/* Compare-at badge */}
                  {product.compareAtPriceCents && (
                    <div className="absolute top-3 left-3 bg-[var(--brand-color,#e8ff00)] text-black text-[9px] font-bold uppercase tracking-wide px-2 py-0.5">
                      Sale
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Product info row below grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mt-1">
              {displayProducts.map((product) => (
                <div key={product.id} className="px-1 pt-3 pb-1">
                  <h3 className="font-bold text-sm uppercase tracking-wide leading-tight mb-1">{product.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-bold">{formatPrice(product.priceCents, theme.currency)}</span>
                    {product.compareAtPriceCents && (
                      <span className="text-white/30 text-xs line-through">{formatPrice(product.compareAtPriceCents, theme.currency)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Accent divider */}
      {showProducts && showServices && (
        <div className="h-px bg-gradient-to-r from-transparent via-[var(--brand-color,#e8ff00)] to-transparent" />
      )}

      {/* ── Services ── */}
      {showServices && (
        <section id="services" className="scroll-mt-20 py-24 bg-[#0f0f0f]">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-end justify-between mb-14">
              <div>
                <p className="text-[var(--brand-color,#e8ff00)] text-[10px] font-bold uppercase tracking-[0.4em] mb-2">— Appointments</p>
                <h2 className="bold-heading text-5xl md:text-6xl uppercase leading-none">Book</h2>
              </div>
              <div className="hidden md:block h-px flex-1 bg-white/10 mx-8 mb-3" />
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayServices.map((service) => (
                <div
                  key={service.id}
                  className="group border-l-4 border-[var(--brand-color,#e8ff00)] bg-[#161616] hover:bg-[#1c1c1c] transition-colors overflow-hidden flex flex-col"
                >
                  {service.imageUrls?.[0] && (
                    <div className="aspect-[16/9] overflow-hidden">
                      <img
                        src={service.imageUrls[0]}
                        alt={service.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}

                  <div className="p-6 flex flex-col flex-1 gap-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="bold-heading text-2xl uppercase leading-tight">{service.name}</h3>
                        <span className="inline-flex items-center gap-1.5 text-white/40 text-[10px] uppercase tracking-widest mt-1">
                          <Clock size={10} />
                          {service.durationMinutes} min session
                        </span>
                      </div>
                      <span className="bold-heading text-3xl text-[var(--brand-color,#e8ff00)] shrink-0">
                        {formatPrice(service.priceCents, theme.currency)}
                      </span>
                    </div>

                    {service.description && (
                      <p className="text-white/50 text-sm leading-relaxed flex-1">{service.description}</p>
                    )}

                    <button
                      type="button"
                      onClick={() => openBooking(service)}
                      disabled={!theme.paymentsEnabled}
                      className="flex items-center justify-center gap-2 w-full border-2 border-[var(--brand-color,#e8ff00)] text-[var(--brand-color,#e8ff00)] text-xs font-bold uppercase tracking-[0.25em] py-3 hover:bg-[var(--brand-color,#e8ff00)] hover:text-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {theme.paymentsEnabled ? (
                        <>Book Now <ArrowRight size={12} /></>
                      ) : 'Coming Soon'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Team ── */}
      {staff.length > 0 && (
        <>
          <div className="h-px bg-gradient-to-r from-transparent via-[var(--brand-color,#e8ff00)] to-transparent" />
          <section id="team" className="scroll-mt-20 py-24 bg-[#0a0a0a]">
            <div className="max-w-7xl mx-auto px-6">
              <div className="mb-14 text-center">
                <p className="text-[var(--brand-color,#e8ff00)] text-[10px] font-bold uppercase tracking-[0.4em] mb-2">— The Crew</p>
                <h2 className="bold-heading text-5xl md:text-6xl uppercase leading-none">Meet the Team</h2>
              </div>

              <div className="flex flex-wrap justify-center gap-12 md:gap-16">
                {staff.map((member) => (
                  <div key={member.id} className="text-center group">
                    <div className="relative inline-block mb-5">
                      {member.avatarUrl ? (
                        <img
                          src={member.avatarUrl}
                          alt={member.name}
                          className="w-32 h-32 rounded-full object-cover border-2 border-white/10 group-hover:border-[var(--brand-color,#e8ff00)] transition-colors"
                        />
                      ) : (
                        <div className="w-32 h-32 rounded-full bg-[#1a1a1a] border-2 border-white/10 flex items-center justify-center">
                          <span className="bold-heading text-4xl text-white/20 uppercase">{member.name[0]}</span>
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[var(--brand-color,#e8ff00)]" />
                    </div>
                    <h4 className="bold-heading text-xl uppercase tracking-wide">{member.name}</h4>
                    {member.bio && (
                      <p className="text-white/40 text-xs mt-1 max-w-[160px] mx-auto leading-relaxed">{member.bio}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {/* ── Footer ── */}
      <footer id="footer" className="scroll-mt-20 bg-[#050505] border-t border-white/10">
        {/* Top accent bar */}
        <div className="h-1 bg-[var(--brand-color,#e8ff00)]" />

        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-3 gap-12 mb-12">
            {/* Brand */}
            <div>
              <p className="bold-heading text-4xl uppercase tracking-widest mb-3">{theme.companyName}</p>
              <p className="text-white/40 text-xs uppercase tracking-widest leading-relaxed mb-6">{tagline}</p>
              {theme.city && (
                <p className="text-white/30 text-xs uppercase tracking-[0.2em]">{theme.city}</p>
              )}
            </div>

            {/* Nav links */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-white/30 mb-5">Navigate</p>
              <div className="flex flex-col gap-3">
                {showProducts && <a href="#products" className="text-sm text-white/60 hover:text-[var(--brand-color,#e8ff00)] transition-colors uppercase tracking-wide">Shop</a>}
                {showServices && <a href="#services" className="text-sm text-white/60 hover:text-[var(--brand-color,#e8ff00)] transition-colors uppercase tracking-wide">Book</a>}
                {staff.length > 0 && <a href="#team" className="text-sm text-white/60 hover:text-[var(--brand-color,#e8ff00)] transition-colors uppercase tracking-wide">Team</a>}
              </div>
            </div>

            {/* Newsletter */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-white/30 mb-5">Stay in the loop</p>
              <p className="text-white/40 text-xs mb-4 leading-relaxed">Drop your email for exclusive releases and offers.</p>
              <form onSubmit={(e) => { e.preventDefault(); subscribe(emailInput); }} className="flex">
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="flex-1 bg-[#111] border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[var(--brand-color,#e8ff00)] transition-colors"
                />
                <button
                  type="submit"
                  disabled={subscribeStatus === 'loading' || subscribeStatus === 'success'}
                  className="bg-[var(--brand-color,#e8ff00)] text-black text-xs font-bold uppercase tracking-wide px-5 hover:bg-white transition-colors disabled:opacity-60"
                >
                  {subscribeStatus === 'success' ? '✓' : subscribeStatus === 'loading' ? '...' : 'Join'}
                </button>
              </form>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex items-center justify-between flex-wrap gap-4">
            <p className="text-white/20 text-[10px] uppercase tracking-[0.25em]">
              &copy; {new Date().getFullYear()} {theme.companyName}. All rights reserved.
            </p>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="text-white/20 hover:text-[var(--brand-color,#e8ff00)] transition-colors text-[10px] uppercase tracking-widest flex items-center gap-2"
            >
              <ArrowUp size={12} /> Back to top
            </button>
          </div>
        </div>
      </footer>

      {/* Floating back-to-top */}
      {showBackToTop && (
        <button
          type="button"
          aria-label="Back to top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-30 w-10 h-10 bg-[var(--brand-color,#e8ff00)] text-black flex items-center justify-center hover:bg-white transition-colors shadow-lg"
        >
          <ArrowUp size={16} />
        </button>
      )}

      {/* ── Commerce overlays ── */}
      <ProductQuickView
        product={quickViewProduct}
        onClose={closeQuickView}
        onAddToCart={(product, variant) => { addToCart(product, variant); closeQuickView(); }}
        currency={theme.currency}
        paymentsEnabled={theme.paymentsEnabled}
      />

      {showProducts && (
        <CartDrawer
          isOpen={cartOpen}
          onClose={() => setCartOpen(false)}
          items={cart}
          onUpdateQuantity={updateCartQuantity}
          onRemove={removeFromCart}
          onCheckout={openCheckout}
        />
      )}

      <CheckoutModal
        isOpen={checkoutOpen}
        onClose={closeCheckout}
        items={cart}
        status={orderStatus}
        error={orderError}
        orderNumber={orderNumber}
        clientSecret={orderClientSecret}
        amountCents={orderAmountCents}
        stripeAccountId={theme.stripeAccountId}
        currency={theme.currency}
        onSubmit={submitOrder}
        onPaymentSuccess={confirmOrderPayment}
        onPaymentCancel={cancelOrderPayment}
      />

      <BookingModal
        isOpen={bookingOpen}
        onClose={closeBooking}
        service={bookingService}
        selectedDate={selectedDate}
        selectedSlot={selectedSlot}
        availableSlots={availableSlots}
        onSelectDate={selectBookingDate}
        onSelectSlot={selectBookingSlot}
        onConfirm={confirmBooking}
      />

      <BookingStatusOverlay
        status={bookingStatus}
        error={bookingError}
        clientSecret={bookingClientSecret}
        amountCents={bookingAmountCents}
        stripeAccountId={theme.stripeAccountId}
        currency={theme.currency}
        onClose={closeBooking}
        onDismiss={dismissBookingStatus}
        onPaymentSuccess={confirmBookingPayment}
        onPaymentCancel={cancelBookingPayment}
      />
      <CustomOrderModal
        isOpen={customOrderOpen}
        onClose={() => setCustomOrderOpen(false)}
        companyName={theme.companyName}
        status={customOrderStatus}
        onSubmit={submitCustomOrder}
      />
    </div>
  );
}
