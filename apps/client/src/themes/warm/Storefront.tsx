import { useState } from 'react';
// NOTE: This theme expects 'Lora' and 'Inter' to be loaded via
// Google Fonts in index.html, e.g.:
// <link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
import { ShoppingBag } from 'lucide-react';
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
  const [customOrderOpen, setCustomOrderOpen] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const { subscribe, subscribeStatus, submitCustomOrder, customOrderStatus } = useStorefrontForms(theme.slug ?? '');
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
    <div className="min-h-screen bg-[#fdf8f3] text-[#3d2314] font-['Inter']">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-[#fdf8f3] border-b border-[#3d2314]/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="w-10" />
          <span className="font-['Lora'] text-2xl text-[#3d2314]">{theme.companyName}</span>
          <div className="flex items-center gap-8">
            <div className="hidden md:flex items-center gap-8 text-sm text-[#3d2314]/70">
              {showProducts && <a href="#products" className="hover:text-[var(--brand-color,#8b5e3c)] transition-colors">Shop</a>}
              {showServices && <a href="#services" className="hover:text-[var(--brand-color,#8b5e3c)] transition-colors">Book</a>}
              <a href="#footer" className="hover:text-[var(--brand-color,#8b5e3c)] transition-colors">Contact</a>
            </div>
            {showProducts && (
              <button
                type="button"
                aria-label="Open cart"
                onClick={() => setCartOpen(true)}
                className="relative text-[#3d2314] hover:text-[var(--brand-color,#8b5e3c)] transition-colors"
              >
                <ShoppingBag size={20} />
                {cart.reduce((s, i) => s + i.quantity, 0) > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--brand-color,#8b5e3c)] text-[9px] font-bold text-white">
                    {cart.reduce((s, i) => s + i.quantity, 0)}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero - split layout */}
      <section className="bg-[#f5e8d8]">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 items-center min-h-[70vh]">
          <div className="py-16 md:py-0 md:pr-12">
            <h1 className="font-['Lora'] text-4xl md:text-6xl text-[#3d2314] mb-6 leading-tight">
              {theme.companyName}
            </h1>
            <p className="text-[#3d2314]/70 text-lg md:text-xl">{tagline}</p>
          </div>
          <div className="h-64 md:h-[70vh] rounded-2xl overflow-hidden">
            <img src={heroImage} alt="" className="w-full h-full object-cover" />
          </div>
        </div>
      </section>

      {/* Products */}
      {showProducts && (
        <section id="products" className="scroll-mt-20 max-w-7xl mx-auto px-6 py-20">
          <h2 className="font-['Lora'] text-3xl md:text-4xl mb-12 text-center text-[#3d2314]">Shop</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {displayProducts.map((product) => (
              <div key={product.id} className="rounded-2xl bg-[#f5e8d8] overflow-hidden flex flex-col">
                <div className="aspect-square overflow-hidden">
                  <img
                    src={product.imageUrls?.[0] ?? defaults.heroImageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-['Lora'] text-lg mb-1 text-[#3d2314]">{product.name}</h3>
                  <p className="text-sm text-[#3d2314]/60 mb-3">{formatPrice(product.priceCents, theme.currency)}</p>
                  <button
                    type="button"
                    onClick={() => openQuickView(product)}
                    className="mt-auto rounded-full bg-[var(--brand-color,#8b5e3c)] text-white text-sm py-2 hover:bg-[#3d2314] transition-colors"
                  >
                    {theme.paymentsEnabled ? 'Add to Cart' : 'View Details'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Services */}
      {showServices && (
        <section id="services" className="scroll-mt-20 bg-[#f5e8d8] py-20">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="font-['Lora'] text-3xl md:text-4xl mb-12 text-center text-[#3d2314]">Book</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayServices.map((service) => (
                <div key={service.id} className="bg-[#fdf8f3] rounded-2xl p-6 flex flex-col">
                  {service.imageUrls?.[0] && (
                    <div className="aspect-[4/3] overflow-hidden mb-4 rounded-xl">
                      <img src={service.imageUrls[0]} alt={service.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <h3 className="font-['Lora'] text-xl mb-2 text-[#3d2314]">{service.name}</h3>
                  {service.description && (
                    <p className="text-sm text-[#3d2314]/60 mb-4 flex-1">{service.description}</p>
                  )}
                  <div className="flex items-center justify-between text-sm mb-4">
                    <span className="text-[#3d2314]/50">{service.durationMinutes} min</span>
                    <span className="text-[var(--brand-color,#8b5e3c)] font-medium">{formatPrice(service.priceCents, theme.currency)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openBooking(service)}
                    disabled={!theme.paymentsEnabled}
                    className="rounded-full bg-[var(--brand-color,#8b5e3c)] text-white text-sm py-3 hover:bg-[#3d2314] transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[var(--brand-color,#8b5e3c)]"
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
                    <h4 className="font-['Lora'] text-lg text-[#3d2314]">{member.name}</h4>
                    {member.bio && <p className="text-sm text-[#3d2314]/60 mt-2">{member.bio}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer id="footer" className="scroll-mt-20 bg-[#3d2314] text-[#fdf8f3] py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="font-['Lora'] text-2xl mb-2">{theme.companyName}</p>
          {theme.city && <p className="text-[#fdf8f3]/60 text-sm">{theme.city}</p>}
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
          <p className="text-[#fdf8f3]/40 text-xs mt-6">
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
