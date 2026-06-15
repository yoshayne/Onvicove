// NOTE: This theme expects 'Playfair Display' and 'Inter' to be loaded via
// Google Fonts in index.html, e.g.:
// <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
import { ShoppingCart } from 'lucide-react';
import type { ThemeProps } from '../types';
import { formatPrice } from '../types';
import { defaults } from './config';
import CartDrawer from './CartDrawer';
import BookingModal from './BookingModal';
import CheckoutModal from '../shared/CheckoutModal';
import BookingStatusOverlay from '../shared/BookingStatusOverlay';
import { useStorefrontCommerce } from '../shared/useStorefrontCommerce';

export default function Storefront({ theme, products, services, staff }: ThemeProps) {
  const commerce = useStorefrontCommerce(theme.slug);
  const {
    cart, cartOpen, setCartOpen, addToCart, updateCartQuantity, removeFromCart,
    checkoutOpen, openCheckout, closeCheckout, orderStatus, orderError, orderNumber, submitOrder,
    orderClientSecret, orderAmountCents, confirmOrderPayment, cancelOrderPayment,
    bookingService, bookingOpen, openBooking, closeBooking, selectedDate, selectedSlot,
    availableSlots, selectBookingDate, selectBookingSlot, bookingStatus, bookingError,
    confirmBooking, confirmBookingPayment, cancelBookingPayment, dismissBookingStatus,
    bookingClientSecret, bookingAmountCents,
  } = commerce;

  const displayProducts = products.length > 0 ? products : defaults.products;
  const displayServices = services.length > 0 ? services : defaults.services;
  const heroImage = theme.heroImageUrl || defaults.heroImageUrl;
  const tagline = theme.tagline || defaults.tagline;

  const showProducts = (theme.mode === 'store' || theme.mode === 'both') && displayProducts.length > 0;
  const showServices = (theme.mode === 'book' || theme.mode === 'both') && displayServices.length > 0;

  return (
    <div className="min-h-screen bg-white text-[#111111] font-['Inter']">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-[#1a1a1a] text-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="w-10" />
          <span className="font-['Playfair_Display'] text-2xl tracking-wide uppercase">{theme.companyName}</span>
          <div className="flex items-center gap-8">
            <div className="hidden md:flex items-center gap-8 text-xs uppercase tracking-[0.2em] text-white/70">
              {showProducts && <a href="#products" className="hover:text-[var(--brand-color,#d4a96a)] transition-colors">Shop</a>}
              {showServices && <a href="#services" className="hover:text-[var(--brand-color,#d4a96a)] transition-colors">Book</a>}
              <a href="#footer" className="hover:text-[var(--brand-color,#d4a96a)] transition-colors">Contact</a>
            </div>
            {showProducts && (
              <button
                type="button"
                aria-label="Open cart"
                onClick={() => setCartOpen(true)}
                className="text-white hover:text-[var(--brand-color,#d4a96a)] transition-colors"
              >
                <ShoppingCart size={20} />
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative h-[80vh] min-h-[480px] flex items-center justify-center text-center overflow-hidden bg-[#1a1a1a]">
        <img src={heroImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-[#1a1a1a]/40 to-[#1a1a1a]/10" />
        <div className="relative z-10 px-6 max-w-3xl">
          <h1 className="font-['Playfair_Display'] text-5xl md:text-7xl text-white mb-6 leading-tight">
            {theme.companyName}
          </h1>
          <p className="text-white/80 text-lg md:text-xl tracking-wide">{tagline}</p>
        </div>
      </section>

      {/* Products */}
      {showProducts && (
        <section id="products" className="max-w-7xl mx-auto px-6 py-20">
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
                  onClick={() => addToCart(product)}
                  disabled={!theme.paymentsEnabled}
                  className="text-xs uppercase tracking-[0.2em] border-b border-[#111111] pb-1 hover:text-[var(--brand-color,#d4a96a)] hover:border-[var(--brand-color,#d4a96a)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-[#111111] disabled:hover:border-[#111111]"
                >
                  {theme.paymentsEnabled ? 'Add to Cart' : 'Coming Soon'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Services */}
      {showServices && (
        <section id="services" className="bg-[#f5f5f5] py-20">
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
                    <h4 className="font-['Playfair_Display'] text-lg">{member.name}</h4>
                    {member.bio && <p className="text-sm text-[#111111]/60 mt-2">{member.bio}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer id="footer" className="bg-[#1a1a1a] text-white py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="font-['Playfair_Display'] text-2xl uppercase tracking-wide mb-2">{theme.companyName}</p>
          {theme.city && <p className="text-white/60 text-sm">{theme.city}</p>}
          <p className="text-white/40 text-xs mt-6 uppercase tracking-[0.2em]">
            &copy; {new Date().getFullYear()} {theme.companyName}. All rights reserved.
          </p>
        </div>
      </footer>

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
    </div>
  );
}
