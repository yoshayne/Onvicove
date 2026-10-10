// NOTE: This theme expects 'Playfair Display' and 'Inter' to be loaded via
// Google Fonts in index.html, e.g.:
// <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
import { useState } from 'react';
import { staffForService } from '../shared/bookingFlow';
import { ShoppingCart } from 'lucide-react';
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
import Gallery from '../shared/Gallery';
import { makeSectionOrder } from '../shared/sectionOrder';
import type { GallerySectionData } from '../shared/Gallery';
import TestimonialsBlock from '../shared/TestimonialsBlock';
import FaqBlock from '../shared/FaqBlock';
import AboutBlock from '../shared/AboutBlock';
import ContactBlock from '../shared/ContactBlock';

export default function Storefront({ theme, products, services, staff, galleries = [], visibleSections }: ThemeProps) {
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
    selectedStaffId, setSelectedStaffId, isDateClosed, bookingCityLabel,
  } = commerce;

  const displayProducts = products.length > 0 ? products : defaults.products;
  const displayServices = services.length > 0 ? services : defaults.services;
  const heroImage = theme.heroImageUrl || defaults.heroImageUrl;
  const tagline = theme.tagline || defaults.tagline;

  const sec = (id: string) => !visibleSections || visibleSections.includes(id);
  const showProducts = (theme.mode === 'store' || theme.mode === 'both') && products.length > 0 && sec('featured-products');
  const showServices = (theme.mode === 'book' || theme.mode === 'both') && services.length > 0 && sec('services');
  const ord = makeSectionOrder(visibleSections);

  return (
    <div className="flex flex-col min-h-screen bg-white text-[#111111] font-['Inter']">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-[#1a1a1a] text-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="w-10" />
          <span className="font-['Playfair_Display'] text-2xl tracking-wide uppercase">{theme.companyName}</span>
          <div className="flex items-center gap-8">
            <div className="hidden md:flex items-center gap-8 text-xs uppercase tracking-[0.2em] text-white/70">
              {showProducts && <a href="#products" className="hover:text-[var(--brand-color,#d4a96a)] transition-colors">Shop</a>}
              {showServices && <a href="#services" className="hover:text-[var(--brand-color,#d4a96a)] transition-colors">Book</a>}
              {sec('contact') && <a href="#footer" className="hover:text-[var(--brand-color,#d4a96a)] transition-colors">Contact</a>}
            </div>
            {showProducts && (
              <button
                type="button"
                aria-label="Open cart"
                onClick={() => setCartOpen(true)}
                className="relative text-white hover:text-[var(--brand-color,#d4a96a)] transition-colors"
              >
                <ShoppingCart size={20} />
                {cart.reduce((s, i) => s + i.quantity, 0) > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--brand-color,#d4a96a)] text-[9px] font-bold text-white">
                    {cart.reduce((s, i) => s + i.quantity, 0)}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      {sec('hero') && (
      <section className="relative md:h-[80vh] md:min-h-[480px] flex flex-col md:flex-row md:items-center md:justify-center text-center overflow-hidden bg-[#1a1a1a]" style={ord('hero')}>
        <img src={heroImage} alt="" className="block w-full h-auto md:absolute md:inset-0 md:h-full md:object-cover opacity-80" />
        <div className="absolute inset-0 hidden md:block bg-gradient-to-t from-[#1a1a1a] via-[#1a1a1a]/40 to-[#1a1a1a]/10" />
        <div className="relative z-10 px-6 py-10 md:py-0 max-w-3xl mx-auto md:mx-0">
          <h1 className="font-['Playfair_Display'] text-5xl md:text-7xl text-white mb-6 leading-tight">
            {theme.companyName}
          </h1>
          <p className="text-white/80 text-lg md:text-xl tracking-wide">{tagline}</p>
        </div>
      </section>
      )}

      {sec('about') && (
        <AboutBlock text={theme.aboutText} style={{ ...ord('about'), background:'#fff',color:'#111111' }} headingStyle={{ fontFamily:'Playfair Display, serif',fontWeight:400 }} />
      )}
      {/* Products */}
      {showProducts && sec('featured-products') && (
        <section id="products" className="scroll-mt-20 max-w-7xl mx-auto w-full px-6 py-20" style={ord('featured-products')}>
          <h2 className="font-['Playfair_Display'] text-3xl md:text-4xl mb-12 text-center">Shop the Collection</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {displayProducts.map((product) => (
              <div key={product.id} className="group">
                <div className="aspect-[3/4] overflow-hidden bg-[#f5f5f5] mb-4">
                  <img
                    src={product.imageUrls?.[0] ?? defaults.heroImageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <h3 className="font-['Playfair_Display'] text-lg mb-1">{product.name}</h3>
                <p className="text-sm text-[#111111]/60 mb-3">{formatPrice(product.priceCents, theme.currency)}</p>
                <button
                  type="button"
                  onClick={() => openQuickView(product)}
                  className="text-xs uppercase tracking-[0.2em] border-b border-[#111111] pb-1 hover:text-[var(--brand-color,#d4a96a)] hover:border-[var(--brand-color,#d4a96a)] transition-colors"
                >
                  {theme.paymentsEnabled ? 'Add to Cart' : 'View Details'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Services */}
      {showServices && sec('services') && (
        <section id="services" className="scroll-mt-20 bg-[#f5f5f5] py-20" style={ord('services')}>
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="font-['Playfair_Display'] text-3xl md:text-4xl mb-12 text-center">Reservations</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {displayServices.map((service) => (
                <div key={service.id} className="bg-white p-6 flex flex-col">
                  {service.imageUrls?.[0] && (
                    <div className="aspect-[4/3] overflow-hidden mb-4">
                      <img src={service.imageUrls[0]} alt={service.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <h3 className="font-['Playfair_Display'] text-xl mb-2">{service.name}</h3>
                  {service.description && (
                    <p className="text-sm text-[#111111]/60 mb-4 flex-1">{service.description}</p>
                  )}
                  <div className="flex items-center justify-between text-sm mb-4">
                    <span className="text-[#111111]/50">{service.durationMinutes} min</span>
                    <span className="text-[var(--brand-color,#d4a96a)] font-medium">{formatPrice(service.priceCents, theme.currency)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openBooking(service)}
                    disabled={!theme.paymentsEnabled}
                    className="uppercase tracking-[0.2em] text-xs bg-[#1a1a1a] text-white py-3 hover:bg-[var(--brand-color,#d4a96a)] hover:text-[#111111] transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#1a1a1a] disabled:hover:text-white"
                  >
                    {theme.paymentsEnabled ? 'Book Now' : 'Coming Soon'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Staff ── */}
      {sec('staff') && staff.length > 0 && (
      <section className="max-w-7xl mx-auto w-full px-6 py-20" style={ord('staff')}>
        <div className="flex flex-wrap justify-center gap-12">
          {staff.map((member) => (
            <div key={member.id} className="text-center max-w-xs">
              {member.avatarUrl && (
                <img
                  src={member.avatarUrl}
                  alt={member.name}
                  className="w-24 h-24 rounded-full object-cover mx-auto mb-4"
                />
              )}
              <h4 className="font-['Playfair_Display'] text-lg">{member.name}</h4>
              {member.bio && <p className="text-sm text-[#111111]/60 mt-2">{member.bio}</p>}
            </div>
          ))}
        </div>
      </section>
      )}

      {sec('contact') && (
        <ContactBlock email={theme.contactEmail} phone={theme.contactPhone} address={theme.contactAddress} hours={theme.contactHours} style={{ ...ord('contact'), background:'#f5f5f5',color:'#111111' }} headingStyle={{ fontFamily:'Playfair Display, serif',fontWeight:400 }} />
      )}
      {/* Footer */}
      {sec('contact') && (
      <footer id="footer" className="scroll-mt-20 bg-[#1a1a1a] text-white py-12" style={ord('contact')}>
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="font-['Playfair_Display'] text-2xl uppercase tracking-wide mb-2">{theme.companyName}</p>
          {theme.city && <p className="text-white/60 text-sm">{theme.city}</p>}
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
          <button type="button" onClick={() => setCustomOrderOpen(true)} className="mt-4 inline-block border border-white/60 px-6 py-2 text-xs uppercase tracking-[0.2em] text-white hover:bg-white hover:text-[#111111] transition-colors">Custom Order</button>
          <p className="text-white/40 text-xs mt-6 uppercase tracking-[0.2em]">
            &copy; {new Date().getFullYear()} {theme.companyName}. All rights reserved.
          </p>
        </div>
      </footer>
      )}

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
          slug={theme.slug}
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
        staff={staffForService(staff, bookingService)}
        selectedStaffId={selectedStaffId}
        onSelectStaff={setSelectedStaffId}
        isDateClosed={isDateClosed}
        cityLabel={bookingCityLabel}
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
      {/* ── Testimonials ── */}
      {sec('testimonials') && (
        <div style={ord('testimonials')}><TestimonialsBlock testimonials={theme.testimonials} /></div>
      )}

      {/* ── FAQ ── */}
      {sec('faq') && (
        <div style={ord('faq')}><FaqBlock faqs={theme.faqs} /></div>
      )}

      {/* ── Galleries ── */}
      {galleries.filter(g => g.enabled && g.images.length > 0).map(g => (
        <div key={g.id} style={ord(g.id)}><Gallery layout={g.layout} images={g.images} title={g.title} /></div>
      ))}
    </div>
  );
}
