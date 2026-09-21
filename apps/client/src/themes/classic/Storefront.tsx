import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import type { ThemeProps } from '../types';
import ContactBlock from '../shared/ContactBlock';
import Gallery from '../shared/Gallery';
import type { GallerySectionData } from '../shared/Gallery';
import { ProductCatalog, ServiceCatalog } from '../shared/CatalogGrid';
import { config, defaults } from './config';
import CartDrawer from './CartDrawer';
import BookingModal from './BookingModal';
import CheckoutModal from '../shared/CheckoutModal';
import BookingStatusOverlay from '../shared/BookingStatusOverlay';
import ProductQuickView from '../shared/ProductQuickView';
import { useStorefrontCommerce } from '../shared/useStorefrontCommerce';
import { useStorefrontForms } from '../shared/useStorefrontForms';
import CustomOrderModal from '../shared/CustomOrderModal';

// Heading font "Merriweather" requires loading Google Fonts in index.html.
// Body font "Georgia" is a system font (font-serif fallback is fine).


export default function Storefront({
  theme,
  products,
  services,
  staff,
  visibleSections,
  galleries,
}: ThemeProps) {
  const [customOrderOpen, setCustomOrderOpen] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const { subscribe, subscribeStatus, submitCustomOrder, customOrderStatus } = useStorefrontForms(theme.slug ?? '');
  const {
    cart, cartOpen, setCartOpen, addToCart, updateCartQuantity, removeFromCart,
    quickViewProduct, openQuickView, closeQuickView,
    checkoutOpen, openCheckout, closeCheckout, orderStatus, orderError, orderNumber, submitOrder,
    orderClientSecret, orderAmountCents, confirmOrderPayment, cancelOrderPayment,
    bookingService, bookingOpen, openBooking, closeBooking, selectedDate, selectedSlot,
    availableSlots, bookingCityLabel, selectBookingDate, selectBookingSlot, bookingStatus, bookingError,
    confirmBooking, confirmBookingPayment, cancelBookingPayment, dismissBookingStatus,
    bookingClientSecret, bookingAmountCents,
  } = useStorefrontCommerce(theme.slug);
  const isVis = (s: string) => !visibleSections || visibleSections.includes(s);
  const secOrder = (s: string) => visibleSections ? (visibleSections.indexOf(s) + 1 || 99) : 0;
  const showProducts = isVis('featured-products') && (theme.mode === 'store' || theme.mode === 'both');
  const showServices = isVis('services') && (theme.mode === 'book' || theme.mode === 'both');

  const displayProducts = products.length > 0 ? products : defaults.products;
  const displayServices = services.length > 0 ? services : defaults.services;
  const displayStaff = staff.length > 0 ? staff : defaults.staff;
  const heroImage = theme.heroImageUrl || defaults.heroImageUrl;
  const heroOpacity = theme.heroImageOpacity !== undefined ? theme.heroImageOpacity / 100 : 1;
  const tagline = theme.tagline || defaults.tagline;

  return (
    <div className="min-h-screen bg-white font-serif text-[#1a3a5c]">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b-4 border-[#1a3a5c] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="font-['Merriweather'] text-xl font-bold text-[#1a3a5c]">
            {theme.companyName}
          </span>
          <div className="flex items-center gap-8">
            <nav className="hidden gap-8 font-['Merriweather'] text-sm font-bold uppercase tracking-wide text-[#1a3a5c] md:flex">
              {showProducts && <a href="#products" className="hover:text-[var(--brand-color,#c8a850)]">Shop</a>}
              {showServices && <a href="#services" className="hover:text-[var(--brand-color,#c8a850)]">Book</a>}
              <a href="#about" className="hover:text-[var(--brand-color,#c8a850)]">About</a>
            </nav>
            {showProducts && (
              <button
                type="button"
                aria-label="Open cart"
                onClick={() => setCartOpen(true)}
                className="relative text-[#1a3a5c] hover:text-[var(--brand-color,#c8a850)] transition-colors"
              >
                <ShoppingCart size={20} />
                {cart.reduce((s, i) => s + i.quantity, 0) > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--brand-color,#c8a850)] text-[9px] font-bold text-white">
                    {cart.reduce((s, i) => s + i.quantity, 0)}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Hero */}
      {isVis('hero') && (
      <section style={{ order: secOrder('hero'), position: 'relative', background: '#1a3a5c' }}>
        <img src={heroImage} alt="" data-hero-img="1" style={{ display: 'block', width: '100%', height: 'auto', opacity: heroOpacity }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,58,92,0.65)', pointerEvents: 'none' }} />
        <div className="absolute bottom-0 left-0 right-0 z-10 flex flex-col items-center text-center px-6 pb-12">
          <h1 className="font-['Merriweather'] text-4xl font-bold text-white sm:text-5xl md:text-6xl">
            {theme.companyName}
          </h1>
          <p className="mx-auto mt-4 max-w-xl font-serif text-lg text-white/90">{tagline}</p>
          <a
            href={showProducts ? '#products' : '#services'}
            className="mt-8 inline-block rounded-sm bg-[var(--brand-color,#c8a850)] px-8 py-3 font-['Merriweather'] text-sm font-bold uppercase tracking-widest text-[#1a3a5c] transition hover:bg-[#b8983f]"
          >
            {showProducts ? 'Shop' : 'Book'}
          </a>
          <button type="button" onClick={() => setCustomOrderOpen(true)} className="mt-3 inline-block border-b border-current pb-1 text-sm text-white hover:opacity-60 transition-opacity">Custom Order</button>
        </div>
      </section>
      )}

      {/* Products */}
      {showProducts && displayProducts.length > 0 && (
        <section id="products" style={{ order: secOrder('featured-products') }} className="scroll-mt-20 mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-center font-['Merriweather'] text-3xl font-bold text-[#1a3a5c]">
            Shop
          </h2>
          <div className="mx-auto mt-2 h-1 w-16 bg-[var(--brand-color,#c8a850)]" />
          <div className="mt-10">
            <ProductCatalog
              products={displayProducts}
              layout={theme.productLayout ?? 'grid-4'}
              currency={theme.currency}
              paymentsEnabled={theme.paymentsEnabled}
              accentColor={theme.brandColor ?? '#c8a850'}
              textColor="#1a3a5c"
              surfaceColor="#f5f5f5"
              slug={theme.slug}
              onSelect={openQuickView}
            />
          </div>
        </section>
      )}

      {/* Services */}
      {showServices && displayServices.length > 0 && (
        <section id="services" style={{ order: secOrder('services') }} className="scroll-mt-20 mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-center font-['Merriweather'] text-3xl font-bold text-[#1a3a5c]">
            Book
          </h2>
          <div className="mx-auto mt-2 h-1 w-16 bg-[var(--brand-color,#c8a850)]" />
          <div className="mt-10">
            <ServiceCatalog
              services={displayServices}
              layout={theme.serviceLayout ?? 'cards'}
              currency={theme.currency}
              paymentsEnabled={theme.paymentsEnabled}
              accentColor={theme.brandColor ?? '#c8a850'}
              textColor="#1a3a5c"
              surfaceColor="#f5f5f5"
              slug={theme.slug}
              onBook={openBooking}
            />
          </div>

          {displayStaff.length > 0 && (
            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
              {displayStaff.map((member) => (
                <div key={member.id} className="flex items-center gap-4 border border-gray-200 p-4">
                  {member.avatarUrl && (
                    <img
                      src={member.avatarUrl}
                      alt={member.name}
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <div className="font-['Merriweather'] font-bold text-[#1a3a5c]">{member.name}</div>
                    {member.bio && <div className="text-sm text-gray-600">{member.bio}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {galleries && galleries.length > 0 && galleries.map((g) => (
        <div key={g.id} style={{ order: secOrder(g.id) }}>
          <Gallery layout={g.layout} images={g.images ?? []} title={g.title} />
        </div>
      ))}
      </div>{/* end ordered sections */}

      {/* Footer */}
      <footer id="about" className="scroll-mt-20 mt-8 border-t-4 border-[#1a3a5c] bg-[#f5f5f5] py-10">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <div className="font-['Merriweather'] text-lg font-bold text-[#1a3a5c]">
            {theme.companyName}
          </div>
          {theme.city && <p className="mt-2 text-sm text-gray-600">{theme.city}</p>}
          <form onSubmit={(e) => { e.preventDefault(); subscribe(emailInput); }} className="mt-6 flex justify-center gap-2">
            <input
              type="email"
              placeholder="Your email"
              value={emailInput}
              onChange={(ev) => setEmailInput(ev.target.value)}
              className="rounded border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/50 focus:outline-none focus:border-white/60"
            />
            <button
              type="submit"
              disabled={subscribeStatus === 'loading' || subscribeStatus === 'success'}
              className="rounded bg-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/30 transition-colors disabled:opacity-50"
            >
              {subscribeStatus === 'success' ? '✓ Subscribed!' : subscribeStatus === 'loading' ? '...' : 'Subscribe'}
            </button>
          </form>
          <button type="button" onClick={() => setCustomOrderOpen(true)} className="mt-4 border border-white/60 px-5 py-2 text-xs uppercase tracking-widest text-white hover:bg-white/10 transition-opacity">Custom Order</button>
          <ContactBlock theme={theme} textColor="rgba(74,85,104,0.7)" />
          <p className="mt-4 text-xs text-gray-500">
            &copy; {new Date().getFullYear()} {theme.companyName}. All rights reserved.
          </p>
        </div>
      </footer>

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
        cityLabel={bookingCityLabel}
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

void config;
