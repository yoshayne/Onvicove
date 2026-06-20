// NOTE: This theme expects 'Poppins' to be loaded via Google Fonts in index.html, e.g.:
// <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
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

  const displayProducts = products.length > 0 ? products : defaults.products;
  const displayServices = services.length > 0 ? services : defaults.services;
  const heroImage = theme.heroImageUrl || defaults.heroImageUrl;
  const tagline = theme.tagline || defaults.tagline;

  const showProducts = (theme.mode === 'store' || theme.mode === 'both') && displayProducts.length > 0;
  const showServices = (theme.mode === 'book' || theme.mode === 'both') && displayServices.length > 0;

  return (
    <div className="min-h-screen bg-white text-[#111111] font-['Poppins']">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white border-b-4 border-[var(--brand-color,#ff3cac)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="w-10" />
          <span className="font-['Poppins'] font-extrabold text-2xl tracking-wide text-[var(--brand-color,#ff3cac)]">
            {theme.companyName}
          </span>
          <div className="flex items-center gap-8">
            <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-[#111111]/70">
              {showProducts && <a href="#products" className="hover:text-[var(--brand-color,#ff3cac)] transition-colors">Shop</a>}
              {showServices && <a href="#services" className="hover:text-[var(--brand-color,#ff3cac)] transition-colors">Book</a>}
              <a href="#footer" className="hover:text-[var(--brand-color,#ff3cac)] transition-colors">Contact</a>
            </div>
            {showProducts && (
              <button
                type="button"
                aria-label="Open cart"
                onClick={() => setCartOpen(true)}
                className="relative text-[#111111] hover:text-[var(--brand-color,#ff3cac)] transition-colors"
              >
                <ShoppingCart size={20} />
                {cart.reduce((s, i) => s + i.quantity, 0) > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--brand-color,#ff3cac)] text-[9px] font-bold text-white">
                    {cart.reduce((s, i) => s + i.quantity, 0)}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-[480px] flex items-center justify-center text-center overflow-hidden bg-gradient-to-br from-[#f0f0ff] to-[#ffe0f0] py-24">
        <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-[var(--brand-color,#ff3cac)]/10" />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-[#f0f0ff]/60 translate-x-1/3 translate-y-1/3" />
        <div className="relative z-10 px-6 max-w-3xl">
          <h1 className="font-['Poppins'] font-extrabold text-5xl md:text-7xl text-[var(--brand-color,#ff3cac)] mb-6 leading-tight">
            {theme.companyName}
          </h1>
          <p className="text-[#111111]/70 text-lg md:text-xl font-medium">{tagline}</p>
        </div>
      </section>

      {/* Products */}
      {showProducts && (
        <section id="products" className="scroll-mt-20 max-w-7xl mx-auto px-6 py-20">
          <h2 className="font-['Poppins'] font-bold text-3xl md:text-4xl mb-12 text-center text-[var(--brand-color,#ff3cac)]">
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
                  onClick={() => openQuickView(product)}
                  className="bg-[var(--brand-color,#ff3cac)] text-white font-bold text-sm rounded-full py-2 hover:bg-[var(--brand-color,#ff3cac)]/90 transition-colors"
                >
                  {theme.paymentsEnabled ? 'Add to Cart' : 'View Details'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Services */}
      {showServices && (
        <section id="services" className="scroll-mt-20 bg-[#f0f0ff] py-20">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="font-['Poppins'] font-bold text-3xl md:text-4xl mb-12 text-center text-[var(--brand-color,#ff3cac)]">
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
                    <span className="text-[var(--brand-color,#ff3cac)] font-bold">{formatPrice(service.priceCents, theme.currency)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openBooking(service)}
                    disabled={!theme.paymentsEnabled}
                    className="bg-[var(--brand-color,#ff3cac)] text-white font-bold text-sm rounded-full py-3 hover:bg-[var(--brand-color,#ff3cac)]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[var(--brand-color,#ff3cac)]"
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
                        className="w-24 h-24 rounded-full object-cover mx-auto mb-4 border-4 border-[var(--brand-color,#ff3cac)]"
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
      <footer id="footer" className="scroll-mt-20 bg-white border-t-4 border-[var(--brand-color,#ff3cac)] py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="font-['Poppins'] font-extrabold text-2xl text-[var(--brand-color,#ff3cac)] mb-2">{theme.companyName}</p>
          {theme.city && <p className="text-[#111111]/60 text-sm">{theme.city}</p>}
          <p className="text-[#111111]/40 text-xs mt-6">
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
