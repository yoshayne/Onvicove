import { useState } from 'react';
// NOTE: This theme expects 'Inter' to be loaded via Google Fonts in index.html, e.g.:
// <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap" rel="stylesheet">
import { ShoppingCart } from 'lucide-react';
import type { ThemeProps } from '../types';
import ContactBlock from '../shared/ContactBlock';
import Gallery from '../shared/Gallery';
import type { GallerySectionData } from '../shared/Gallery';
import { formatPrice } from '../types';
import { ProductCatalog, ServiceCatalog } from '../shared/CatalogGrid';
import { defaults } from './config';
import CartDrawer from './CartDrawer';
import BookingModal from './BookingModal';
import CheckoutModal from '../shared/CheckoutModal';
import BookingStatusOverlay from '../shared/BookingStatusOverlay';
import ProductQuickView from '../shared/ProductQuickView';
import { useStorefrontCommerce } from '../shared/useStorefrontCommerce';
import { useStorefrontForms } from '../shared/useStorefrontForms';
import CustomOrderModal from '../shared/CustomOrderModal';
import TestimonialsBlock from '../shared/TestimonialsBlock';
import FaqBlock from '../shared/FaqBlock';
function ServiceDesc({ desc }: { desc: string }) {
  const LIMIT = 120;
  const [expanded, setExpanded] = useState(false);
  if (desc.length <= LIMIT) {
    return <p className="text-sm text-[#111111]/60 font-light mb-2 flex-1">{desc}</p>;
  }
  return (
    <>
      <p className="text-sm text-[#111111]/60 font-light mb-2 flex-1">
        {expanded ? desc : desc.slice(0, LIMIT) + '…'}
      </p>
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="text-xs font-light text-[#111111]/40 hover:text-[#111111]/70 underline mb-2"
      >
        {expanded ? 'Show less' : 'Read more'}
      </button>
    </>
  );
}

export default function Storefront({ theme, products, services, staff, visibleSections, galleries }: ThemeProps) {
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

  const displayProducts = products.length > 0 ? products : defaults.products;
  const displayServices = services.length > 0 ? services : defaults.services;
  const heroImage = theme.heroImageUrl || defaults.heroImageUrl;
  const heroOpacity = theme.heroImageOpacity !== undefined ? theme.heroImageOpacity / 100 : 1;
  const tagline = theme.tagline || defaults.tagline;

  const isVis = (s: string) => !visibleSections || visibleSections.includes(s);
  const secOrder = (s: string) => visibleSections ? (visibleSections.indexOf(s) + 1 || 99) : 0;
  const showProducts = isVis('featured-products') && (theme.mode === 'store' || theme.mode === 'both') && displayProducts.length > 0;
  const showServices = isVis('services') && (theme.mode === 'book' || theme.mode === 'both') && displayServices.length > 0;

  return (
    <div className="min-h-screen bg-white text-[#111111] font-['Inter']">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white border-b border-[#111111]/10">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <span className="text-lg font-bold uppercase tracking-tight">{theme.companyName}</span>
          <div className="flex items-center gap-8">
            <div className="hidden md:flex items-center gap-8 text-xs uppercase tracking-[0.2em] font-medium text-[#111111]/60">
              {showProducts && <a href="#products" className="hover:text-[#111111] transition-colors">Shop</a>}
              {showServices && <a href="#services" className="hover:text-[#111111] transition-colors">Book</a>}
              <a href="#footer" className="hover:text-[#111111] transition-colors">Contact</a>
            </div>
            {showProducts && (
              <button
                type="button"
                aria-label="Open cart"
                onClick={() => setCartOpen(true)}
                className="relative text-[#111111] hover:text-[#111111]/60 transition-colors"
              >
                <ShoppingCart size={20} />
                {cart.reduce((s, i) => s + i.quantity, 0) > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#111111] text-[9px] font-bold text-white">
                    {cart.reduce((s, i) => s + i.quantity, 0)}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </nav>

      <div style={{ display: 'flex', flexDirection: 'column' }}>

      {/* ── Hero — layout variants ──────────────────────────── */}
      {isVis('hero') && theme.layoutId === 'list' ? (
        /* List: minimal text-only hero, no image */
        <section style={{ order: secOrder('hero') }} className="border-b border-[#111111]/10 px-6 py-16 md:py-24 max-w-7xl mx-auto w-full">
          <p className="text-xs uppercase tracking-[0.3em] text-[#111111]/40 mb-4">{theme.city || 'Studio'}</p>
          <h1 className="text-5xl md:text-8xl font-light leading-none tracking-tight mb-6">{theme.companyName}</h1>
          <p className="text-[#111111]/50 text-lg font-light max-w-md">{tagline}</p>
        </section>
      ) : isVis('hero') && theme.layoutId === 'centered' ? (
        /* Centered: full-width image, centered overlay text */
        <section style={{ order: secOrder('hero'), position: 'relative' }}>
          <img src={heroImage} alt="" data-hero-img="1" style={{ display: 'block', width: '100%', height: 'auto', opacity: heroOpacity }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6" style={{ background: 'rgba(255,255,255,0.55)' }}>
            <h1 className="text-5xl md:text-7xl font-light leading-tight text-[#111111] mb-4">{theme.companyName}</h1>
            <p className="text-[#111111]/60 text-lg font-light">{tagline}</p>
          </div>
        </section>
      ) : isVis('hero') ? (
        /* Classic (default): side-by-side split */
        <section style={{ order: secOrder('hero') }} className="max-w-7xl mx-auto px-6 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-6xl font-light leading-tight mb-6">{theme.companyName}</h1>
            <p className="text-[#111111]/60 text-lg font-light">{tagline}</p>
          </div>
          <div className="aspect-[4/3] overflow-hidden bg-[#f8f8f8]">
            <img src={heroImage} alt="" data-hero-img="1" className="w-full h-full object-cover" style={{ opacity: heroOpacity }} />
          </div>
        </section>
      ) : null}

      {/* ── Products ─────────────────────────────────────────── */}
      {showProducts && (
        <section id="products" style={{ order: secOrder('featured-products') }} className="scroll-mt-20 max-w-7xl mx-auto px-6 py-20">
          <h2 className="text-2xl md:text-3xl font-bold mb-8">Shop</h2>
          <ProductCatalog
            products={displayProducts}
            layout={theme.productLayout ?? 'grid-4'}
            currency={theme.currency}
            paymentsEnabled={theme.paymentsEnabled}
            accentColor={theme.brandColor ?? '#111111'}
            textColor="#111111"
            surfaceColor="#f8f8f8"
            slug={theme.slug}
            onSelect={openQuickView}
          />
        </section>
      )}

      {/* Services */}
      {showServices && (
        <section id="services" style={{ order: secOrder('services') }} className="scroll-mt-20 bg-[#f8f8f8] py-20">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-2xl md:text-3xl font-bold mb-8">Book</h2>
            <ServiceCatalog
              services={displayServices}
              layout={theme.serviceLayout ?? 'cards'}
              currency={theme.currency}
              paymentsEnabled={theme.paymentsEnabled}
              accentColor={theme.brandColor ?? '#111111'}
              textColor="#111111"
              surfaceColor="#ffffff"
              slug={theme.slug}
              onBook={openBooking}
            />

            {staff.length > 0 && (
              <div className="mt-16 flex flex-wrap justify-center gap-12">
                {staff.map((member) => (
                  <div key={member.id} className="text-center max-w-xs">
                    {member.avatarUrl && (
                      <img
                        src={member.avatarUrl}
                        alt={member.name}
                        className="w-24 h-24 rounded-full object-cover mx-auto mb-4"
                      />
                    )}
                    <h4 className="text-lg font-medium">{member.name}</h4>
                    {member.bio && <p className="text-sm text-[#111111]/60 font-light mt-2">{member.bio}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {galleries && galleries.length > 0 && galleries.map((g) => (
        <div key={g.id} style={{ order: secOrder(g.id) }}>
          <Gallery layout={g.layout} images={g.images ?? []} title={g.title} />
        </div>
      ))}

      {visibleSections?.includes('testimonials') && (
        <section style={{ order: secOrder('testimonials') }} className="py-20 bg-[#f8f8f8]">
          <TestimonialsBlock
            testimonials={theme.testimonials}
            headingStyle={{ fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 300, letterSpacing: '0.04em' }}
            cardStyle={{ background: '#ffffff', border: '1px solid #eeeeee' }}
            starColor="#111111"
          />
        </section>
      )}

      {visibleSections?.includes('faq') && (
        <section style={{ order: secOrder('faq') }} className="py-20 bg-white">
          <FaqBlock
            faqs={theme.faqs}
            headingStyle={{ fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 300, letterSpacing: '0.04em' }}
            itemStyle={{ borderColor: '#eeeeee', background: '#ffffff' }}
          />
        </section>
      )}

      </div>{/* end ordered sections */}

      {/* Footer */}
      <footer id="footer" className="scroll-mt-20 bg-white border-t border-[#111111]/10 py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-lg font-bold uppercase tracking-tight mb-2">{theme.companyName}</p>
          {theme.city && <p className="text-[#111111]/60 text-sm font-light">{theme.city}</p>}
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
          <ContactBlock theme={theme} textColor="rgba(17,17,17,0.5)" />
          <p className="text-[#111111]/40 text-xs mt-6 uppercase tracking-[0.2em] font-medium">
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
