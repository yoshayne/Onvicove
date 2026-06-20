// NOTE: This theme expects 'Inter' to be loaded via Google Fonts in index.html, e.g.:
// <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap" rel="stylesheet">
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
  const {
    cart, cartOpen, setCartOpen, addToCart, updateCartQuantity, removeFromCart,
    checkoutOpen, openCheckout, closeCheckout, orderStatus, orderError, orderNumber, submitOrder,
    orderClientSecret, orderAmountCents, confirmOrderPayment, cancelOrderPayment,
    bookingService, bookingOpen, openBooking, closeBooking, selectedDate, selectedSlot,
    availableSlots, selectBookingDate, selectBookingSlot, bookingStatus, bookingError,
    confirmBooking, confirmBookingPayment, cancelBookingPayment, dismissBookingStatus,
    bookingClientSecret, bookingAmountCents,
  } = useStorefrontCommerce(theme.slug);

  const displayProducts = products.length > 0 ? products : defaults.products;
  const displayServices = services.length > 0 ? services : defaults.services;
  const heroImage = theme.heroImageUrl || defaults.heroImageUrl;
  const tagline = theme.tagline || defaults.tagline;

  const showProducts = (theme.mode === 'store' || theme.mode === 'both') && displayProducts.length > 0;
  const showServices = (theme.mode === 'book' || theme.mode === 'both') && displayServices.length > 0;

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

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="text-4xl md:text-6xl font-light leading-tight mb-6">{theme.companyName}</h1>
          <p className="text-[#111111]/60 text-lg font-light">{tagline}</p>
        </div>
        <div className="aspect-[4/3] overflow-hidden bg-[#f8f8f8]">
          <img src={heroImage} alt="" className="w-full h-full object-cover" />
        </div>
      </section>

      {/* Products */}
      {showProducts && (
        <section id="products" className="scroll-mt-20 max-w-7xl mx-auto px-6 py-20">
          <h2 className="text-2xl md:text-3xl font-bold mb-12">Shop</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
            {displayProducts.map((product) => (
              <div key={product.id}>
                <div className="aspect-[3/4] overflow-hidden bg-[#f8f8f8] mb-4">
                  <img
                    src={product.imageUrls?.[0] ?? defaults.heroImageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-base font-medium mb-1">{product.name}</h3>
                <p className="text-sm text-[#111111]/60 font-light mb-3">{formatPrice(product.priceCents, theme.currency)}</p>
                <button
                  type="button"
                  onClick={() => addToCart(product)}
                  disabled={!theme.paymentsEnabled}
                  className="text-xs uppercase tracking-[0.2em] font-medium text-[#111111] hover:text-[#111111]/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
        <section id="services" className="scroll-mt-20 bg-[#f8f8f8] py-20">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-2xl md:text-3xl font-bold mb-12">Book a Service</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {displayServices.map((service) => (
                <div key={service.id} className="bg-white p-6 flex flex-col">
                  {service.imageUrls?.[0] && (
                    <div className="aspect-[4/3] overflow-hidden mb-4">
                      <img src={service.imageUrls[0]} alt={service.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <h3 className="text-lg font-medium mb-2">{service.name}</h3>
                  {service.description && (
                    <p className="text-sm text-[#111111]/60 font-light mb-4 flex-1">{service.description}</p>
                  )}
                  <div className="flex items-center justify-between text-sm mb-4">
                    <span className="text-[#111111]/50 font-light">{service.durationMinutes} min</span>
                    <span className="font-bold">{formatPrice(service.priceCents, theme.currency)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openBooking(service)}
                    disabled={!theme.paymentsEnabled}
                    className="uppercase tracking-[0.2em] text-xs font-medium bg-[var(--brand-color,#111111)] text-white py-3 hover:bg-[#333333] transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[var(--brand-color,#111111)]"
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
                    <h4 className="text-lg font-medium">{member.name}</h4>
                    {member.bio && <p className="text-sm text-[#111111]/60 font-light mt-2">{member.bio}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer id="footer" className="scroll-mt-20 bg-white border-t border-[#111111]/10 py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-lg font-bold uppercase tracking-tight mb-2">{theme.companyName}</p>
          {theme.city && <p className="text-[#111111]/60 text-sm font-light">{theme.city}</p>}
          <p className="text-[#111111]/40 text-xs mt-6 uppercase tracking-[0.2em] font-medium">
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
