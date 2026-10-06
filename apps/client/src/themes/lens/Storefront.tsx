// Lens theme — photo-forward dark storefront for photographers & creatives
// Fonts: DM Serif Display (headings) + DM Sans (body) — load via index.html
import { useState } from 'react';
import { ShoppingCart, Menu, X as XIcon } from 'lucide-react';
import type { ThemeProps } from '../types';
import { formatPrice } from '../types';
import { defaults } from './config';
import CartDrawer from './CartDrawer';
import BookingModal from './BookingModal';
import CheckoutModal from '../shared/CheckoutModal';
import BookingStatusOverlay from '../shared/BookingStatusOverlay';
import ProductQuickView from '../shared/ProductQuickView';
import CustomOrderModal from '../shared/CustomOrderModal';
import { useStorefrontCommerce } from '../shared/useStorefrontCommerce';
import { useStorefrontForms } from '../shared/useStorefrontForms';

export default function Storefront({ theme, products, services, staff }: ThemeProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [customOrderOpen, setCustomOrderOpen] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const { subscribe, subscribeStatus, submitCustomOrder, customOrderStatus } = useStorefrontForms(theme.slug ?? '');
  const commerce = useStorefrontCommerce(theme.slug);
  const {
    cart, cartOpen, setCartOpen, addToCart, updateCartQuantity, removeFromCart,
    quickViewProduct, openQuickView, closeQuickView,
    checkoutOpen, openCheckout, closeCheckout, orderStatus, orderError, orderNumber, submitOrder,
    orderClientSecret, orderAmountCents, confirmOrderPayment, cancelOrderPayment,
    bookingService, bookingOpen, openBooking, closeBooking, selectedDate, selectedSlot,
    availableSlots, selectBookingDate, selectBookingSlot, bookingStatus, bookingError,
    confirmBooking, confirmBookingPayment, cancelBookingPayment, dismissBookingStatus,
    bookingClientSecret, bookingAmountCents,
  } = commerce;

  const displayProducts = products.length > 0 ? products : defaults.products;
  const displayServices = services.length > 0 ? services : defaults.services;
  const displayStaff    = staff.length > 0 ? staff : defaults.staff;
  const heroImage = theme.heroImageUrl || defaults.heroImageUrl;
  const tagline   = theme.tagline || defaults.tagline;

  const showProducts = (theme.mode === 'store' || theme.mode === 'both') && displayProducts.length > 0;
  const showServices = (theme.mode === 'book'  || theme.mode === 'both') && displayServices.length > 0;

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const navLinks = [
    showProducts && { href: '#work', label: 'Work' },
    showServices && { href: '#sessions', label: 'Sessions' },
    { href: '#about', label: 'About' },
    { href: '#contact', label: 'Contact' },
  ].filter(Boolean) as { href: string; label: string }[];

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-[#f0ede8] font-['DM_Sans']">

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-4 bg-[#0d0d0d]/90 backdrop-blur-sm border-b border-white/5">
        <a href="#" className="font-['DM_Serif_Display'] text-xl tracking-wide text-[#f0ede8]">
          {theme.companyName}
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <a key={l.href} href={l.href}
              className="text-xs uppercase tracking-[0.2em] text-white/50 hover:text-[var(--brand-color,#c8b8a2)] transition-colors">
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {showProducts && (
            <button
              type="button"
              aria-label="Open cart"
              onClick={() => setCartOpen(true)}
              className="relative text-white/60 hover:text-[var(--brand-color,#c8b8a2)] transition-colors"
            >
              <ShoppingCart size={18} />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center bg-[var(--brand-color,#c8b8a2)] text-[#0d0d0d] text-[9px] font-bold rounded-full">
                  {cartCount}
                </span>
              )}
            </button>
          )}
          <button
            type="button"
            className="md:hidden text-white/60 hover:text-white transition-colors"
            aria-label="Menu"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu size={20} />
          </button>
        </div>
      </nav>

      {/* Mobile nav overlay */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 bg-[#0d0d0d] flex flex-col p-8">
          <div className="flex items-center justify-between mb-12">
            <span className="font-['DM_Serif_Display'] text-xl">{theme.companyName}</span>
            <button type="button" onClick={() => setMobileNavOpen(false)} aria-label="Close" className="text-white/50 hover:text-white">
              <XIcon size={22} />
            </button>
          </div>
          <nav className="flex flex-col gap-8">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href}
                onClick={() => setMobileNavOpen(false)}
                className="font-['DM_Serif_Display'] text-4xl text-white/80 hover:text-[var(--brand-color,#c8b8a2)] transition-colors">
                {l.label}
              </a>
            ))}
          </nav>
        </div>
      )}

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="relative min-h-[600px] overflow-hidden bg-[#0d0d0d] pt-16">
        <img
          src={heroImage}
          alt=""
          className="w-full h-auto block"
        />
        {/* dual gradient: bottom-up fade + subtle top-down */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d]/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d0d0d]/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 pb-16 px-8 max-w-5xl z-10">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--brand-color,#c8b8a2)] mb-4">
            {theme.city || 'Photography'}
          </p>
          <h1 className="font-['DM_Serif_Display'] text-5xl sm:text-7xl md:text-8xl leading-[0.9] text-white mb-6">
            {theme.companyName}
          </h1>
          <p className="text-white/60 text-base md:text-lg max-w-lg leading-relaxed">
            {tagline}
          </p>
          <div className="flex items-center gap-5 mt-8">
            {showServices && (
              <a href="#sessions"
                className="bg-[var(--brand-color,#c8b8a2)] text-[#0d0d0d] text-xs uppercase tracking-[0.2em] px-6 py-3 font-medium hover:bg-white transition-colors">
                Book a Session
              </a>
            )}
            {showProducts && (
              <a href="#work"
                className="border border-white/30 text-white/80 text-xs uppercase tracking-[0.2em] px-6 py-3 hover:border-white hover:text-white transition-colors">
                View Work
              </a>
            )}
          </div>
        </div>

        {/* scroll indicator */}
        <div className="absolute bottom-8 right-8 flex flex-col items-center gap-2 text-white/30">
          <div className="h-12 w-px bg-gradient-to-b from-transparent to-white/30" />
          <span className="text-[9px] uppercase tracking-[0.3em] rotate-90 origin-center translate-y-3">Scroll</span>
        </div>
      </section>

      {/* ── Products / Work ─────────────────────────────────────────── */}
      {showProducts && (
        <section id="work" className="scroll-mt-16 py-20 px-6 max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <h2 className="font-['DM_Serif_Display'] text-4xl md:text-5xl">Work</h2>
            <span className="text-xs uppercase tracking-[0.2em] text-white/30 hidden sm:block">
              {displayProducts.length} pieces
            </span>
          </div>

          {/* Asymmetric masonry-style grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-white/5">
            {displayProducts.map((product, idx) => {
              // Make every 5th item span 2 cols on desktop
              const isWide = idx % 5 === 0;
              return (
                <div
                  key={product.id}
                  className={`group relative overflow-hidden bg-[#0d0d0d] cursor-pointer ${
                    isWide ? 'md:col-span-2' : ''
                  }`}
                  onClick={() => openQuickView(product)}
                >
                  <div className={`${isWide ? 'aspect-[2/1]' : 'aspect-square'} overflow-hidden`}>
                    <img
                      src={product.imageUrls?.[0] ?? defaults.heroImageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                  </div>
                  {/* hover overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-5">
                    <p className="text-white text-sm font-medium">{product.name}</p>
                    <p className="text-[var(--brand-color,#c8b8a2)] text-sm mt-1">{formatPrice(product.priceCents, theme.currency)}</p>
                    <p className="text-white/60 text-xs mt-1 uppercase tracking-widest">
                      {theme.paymentsEnabled ? 'Add to cart →' : 'View →'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Services / Sessions ─────────────────────────────────────── */}
      {showServices && (
        <section id="sessions" className="scroll-mt-16 py-20 bg-[#111] border-y border-white/5">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="font-['DM_Serif_Display'] text-4xl md:text-5xl mb-2">Sessions</h2>
            <p className="text-white/40 text-sm mb-12 max-w-xl">
              Every shoot is a collaboration. Tell me what you're after.
            </p>

            <div className="grid md:grid-cols-3 gap-px bg-white/5">
              {displayServices.map((service) => (
                <div key={service.id} className="bg-[#111] p-8 flex flex-col group">
                  {service.imageUrls?.[0] && (
                    <div className="aspect-[4/3] overflow-hidden mb-6">
                      <img
                        src={service.imageUrls[0]}
                        alt={service.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    </div>
                  )}
                  <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--brand-color,#c8b8a2)] mb-2">
                    {service.durationMinutes < 60
                      ? `${service.durationMinutes} min`
                      : `${service.durationMinutes / 60}h`}
                  </p>
                  <h3 className="font-['DM_Serif_Display'] text-2xl mb-3">{service.name}</h3>
                  {service.description && (
                    <p className="text-sm text-white/50 leading-relaxed mb-6 flex-1">{service.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-auto">
                    <span className="font-['DM_Serif_Display'] text-2xl text-[var(--brand-color,#c8b8a2)]">
                      {formatPrice(service.priceCents, theme.currency)}
                    </span>
                    <button
                      type="button"
                      onClick={() => openBooking(service)}
                      disabled={!theme.paymentsEnabled}
                      className="text-xs uppercase tracking-[0.2em] border border-white/20 px-5 py-2.5 hover:border-[var(--brand-color,#c8b8a2)] hover:text-[var(--brand-color,#c8b8a2)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {theme.paymentsEnabled ? 'Book' : 'Enquire'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── About / Team ────────────────────────────────────────────── */}
      <section id="about" className="scroll-mt-16 py-24 px-6 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--brand-color,#c8b8a2)] mb-4">About</p>
            <h2 className="font-['DM_Serif_Display'] text-4xl md:text-5xl mb-6 leading-tight">
              {theme.companyName}
            </h2>
            {theme.city && (
              <p className="text-white/40 text-sm mb-6 uppercase tracking-[0.15em]">{theme.city}</p>
            )}
            <p className="text-white/60 text-base leading-relaxed max-w-md">
              {tagline}
            </p>
          </div>

          {displayStaff.length > 0 && (
            <div className="flex flex-col gap-8">
              {displayStaff.map((member) => (
                <div key={member.id} className="flex items-start gap-5">
                  {member.avatarUrl && (
                    <img
                      src={member.avatarUrl}
                      alt={member.name}
                      className="w-20 h-20 object-cover shrink-0 grayscale hover:grayscale-0 transition-all duration-500"
                    />
                  )}
                  <div>
                    <h4 className="font-['DM_Serif_Display'] text-xl mb-1">{member.name}</h4>
                    {member.bio && <p className="text-sm text-white/50 leading-relaxed">{member.bio}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Contact / Footer ────────────────────────────────────────── */}
      <footer id="contact" className="scroll-mt-16 bg-[#080808] border-t border-white/5 py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12 mb-16">
            <div>
              <p className="font-['DM_Serif_Display'] text-2xl mb-2">{theme.companyName}</p>
              {theme.city && <p className="text-white/40 text-sm">{theme.city}</p>}
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-4">Stay in touch</p>
              <form onSubmit={(e) => { e.preventDefault(); subscribe(emailInput); }} className="flex gap-2">
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[var(--brand-color,#c8b8a2)] transition-colors"
                />
                <button
                  type="submit"
                  disabled={subscribeStatus === 'loading' || subscribeStatus === 'success'}
                  className="bg-[var(--brand-color,#c8b8a2)] text-[#0d0d0d] px-4 text-xs font-medium uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-40"
                >
                  {subscribeStatus === 'success' ? '✓' : '→'}
                </button>
              </form>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-4">Enquiries</p>
              <button
                type="button"
                onClick={() => setCustomOrderOpen(true)}
                className="text-sm text-white/60 hover:text-[var(--brand-color,#c8b8a2)] transition-colors underline underline-offset-4"
              >
                Send a project brief →
              </button>
            </div>
          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row justify-between gap-4">
            <p className="text-white/20 text-xs uppercase tracking-[0.2em]">
              &copy; {new Date().getFullYear()} {theme.companyName}
            </p>
            <p className="text-white/20 text-xs">All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* ── Modals & overlays ───────────────────────────────────────── */}
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
