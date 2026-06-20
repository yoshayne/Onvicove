import { ShoppingCart, Calendar as CalendarIcon } from 'lucide-react';
import type { ThemeProps } from '../types';
import { formatPrice } from '../types';
import { config, defaults } from './config';
import CartDrawer from './CartDrawer';
import BookingModal from './BookingModal';
import CheckoutModal from '../shared/CheckoutModal';
import BookingStatusOverlay from '../shared/BookingStatusOverlay';
import ProductQuickView from '../shared/ProductQuickView';
import { useStorefrontCommerce } from '../shared/useStorefrontCommerce';

// Heading font "Merriweather" requires loading Google Fonts in index.html.
// Body font "Georgia" is a system font (font-serif fallback is fine).

export default function Storefront({
  theme,
  products,
  services,
  staff,
}: ThemeProps) {
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
  const showProducts = (theme.mode === 'store' || theme.mode === 'both');
  const showServices = (theme.mode === 'book' || theme.mode === 'both');

  const displayProducts = products.length > 0 ? products : defaults.products;
  const displayServices = services.length > 0 ? services : defaults.services;
  const displayStaff = staff.length > 0 ? staff : defaults.staff;
  const heroImage = theme.heroImageUrl || defaults.heroImageUrl;
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
              {showServices && <a href="#services" className="hover:text-[var(--brand-color,#c8a850)]">Services</a>}
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

      {/* Hero */}
      <section
        className="relative flex min-h-[480px] items-center justify-center bg-[#1a3a5c] bg-cover bg-center text-center"
        style={{ backgroundImage: `linear-gradient(rgba(26,58,92,0.75), rgba(26,58,92,0.75)), url(${heroImage})` }}
      >
        <div className="px-6 py-24">
          <h1 className="font-['Merriweather'] text-4xl font-bold text-white sm:text-5xl md:text-6xl">
            {theme.companyName}
          </h1>
          <p className="mx-auto mt-4 max-w-xl font-serif text-lg text-white/90">{tagline}</p>
          <a
            href={showProducts ? '#products' : '#services'}
            className="mt-8 inline-block rounded-sm bg-[var(--brand-color,#c8a850)] px-8 py-3 font-['Merriweather'] text-sm font-bold uppercase tracking-widest text-[#1a3a5c] transition hover:bg-[#b8983f]"
          >
            {showProducts ? 'Shop the Collection' : 'Book an Appointment'}
          </a>
        </div>
      </section>

      {/* Products */}
      {showProducts && displayProducts.length > 0 && (
        <section id="products" className="scroll-mt-20 mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-center font-['Merriweather'] text-3xl font-bold text-[#1a3a5c]">
            Our Collection
          </h2>
          <div className="mx-auto mt-2 h-1 w-16 bg-[var(--brand-color,#c8a850)]" />
          <div className="mt-10 grid grid-cols-1 gap-px border border-gray-200 bg-gray-200 sm:grid-cols-2 md:grid-cols-3">
            {displayProducts.map((product) => (
              <div key={product.id} className="flex flex-col bg-white p-6">
                {product.imageUrls?.[0] && (
                  <div className="mb-4 aspect-square w-full overflow-hidden border border-gray-200 bg-[#f5f5f5]">
                    <img
                      src={product.imageUrls[0]}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <h3 className="font-['Merriweather'] text-lg font-bold text-[#1a3a5c]">
                  {product.name}
                </h3>
                {product.description && (
                  <p className="mt-2 flex-1 text-sm text-gray-600">{product.description}</p>
                )}
                <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
                  <span className="font-['Merriweather'] text-lg font-bold text-[#1a3a5c]">
                    {formatPrice(product.priceCents, theme.currency)}
                  </span>
                  <button
                    type="button"
                    onClick={() => openQuickView(product)}
                    className="flex items-center gap-2 border border-[#1a3a5c] px-4 py-2 text-sm font-bold uppercase tracking-wide text-[#1a3a5c] transition hover:bg-[#1a3a5c] hover:text-white"
                  >
                    <ShoppingCart size={16} />
                    {theme.paymentsEnabled ? 'Add to Cart' : 'View Details'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Services */}
      {showServices && displayServices.length > 0 && (
        <section id="services" className="scroll-mt-20 mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-center font-['Merriweather'] text-3xl font-bold text-[#1a3a5c]">
            Our Services
          </h2>
          <div className="mx-auto mt-2 h-1 w-16 bg-[var(--brand-color,#c8a850)]" />
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            {displayServices.map((service) => (
              <div
                key={service.id}
                className="flex flex-col border border-gray-200 bg-[#f5f5f5] p-6 sm:flex-row sm:items-center sm:gap-6"
              >
                {service.imageUrls?.[0] && (
                  <div className="mb-4 h-32 w-full overflow-hidden border border-gray-200 sm:mb-0 sm:h-24 sm:w-32 sm:flex-shrink-0">
                    <img
                      src={service.imageUrls[0]}
                      alt={service.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-['Merriweather'] text-lg font-bold text-[#1a3a5c]">
                    {service.name}
                  </h3>
                  {service.description && (
                    <p className="mt-1 text-sm text-gray-600">{service.description}</p>
                  )}
                  <div className="mt-2 text-sm font-bold text-[#1a3a5c]">
                    {formatPrice(service.priceCents, theme.currency)} &middot; {service.durationMinutes} min
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openBooking(service)}
                  disabled={!theme.paymentsEnabled}
                  className="mt-4 flex items-center gap-2 self-start bg-[#1a3a5c] px-4 py-2 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-[#142e49] sm:mt-0 sm:self-center disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#1a3a5c]"
                >
                  <CalendarIcon size={16} />
                  {theme.paymentsEnabled ? 'Book Now' : 'Coming Soon'}
                </button>
              </div>
            ))}
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

      {/* Footer */}
      <footer id="about" className="scroll-mt-20 mt-8 border-t-4 border-[#1a3a5c] bg-[#f5f5f5] py-10">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <div className="font-['Merriweather'] text-lg font-bold text-[#1a3a5c]">
            {theme.companyName}
          </div>
          {theme.city && <p className="mt-2 text-sm text-gray-600">{theme.city}</p>}
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

void config;
