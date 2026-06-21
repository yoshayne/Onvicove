import { useState } from 'react';
import { ShoppingCart, Leaf, Heart, Star } from 'lucide-react';
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
  const heroImage = theme.heroImageUrl || defaults.heroImageUrl;
  const tagline = theme.tagline || defaults.tagline;
  const showProducts = (theme.mode === 'store' || theme.mode === 'both') && displayProducts.length > 0;
  const showServices = (theme.mode === 'book' || theme.mode === 'both') && displayServices.length > 0;
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const glass = { background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' };

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d1a', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        @keyframes aurora-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .aurora-bg {
          background: linear-gradient(-45deg, #0d0d1a, #1a0533, #0a2040, #150d2e, #1a0a20);
          background-size: 400% 400%;
          animation: aurora-shift 15s ease infinite;
        }
      `}</style>

      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 40, backdropFilter: 'blur(20px)', background: 'rgba(13,13,26,0.8)', borderBottom: '1px solid rgba(167,139,250,0.15)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', background: 'linear-gradient(90deg, #a78bfa, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {theme.companyName}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 32, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
            {showProducts && <a href="#products" style={{ textDecoration: 'none', color: 'inherit' }}>Shop</a>}
            {showServices && <a href="#services" style={{ textDecoration: 'none', color: 'inherit' }}>Sessions</a>}
            <a href="#footer" style={{ textDecoration: 'none', color: 'inherit' }}>Contact</a>
            {showProducts && (
              <button type="button" aria-label="Open cart" onClick={() => setCartOpen(true)} style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', padding: 0 }}>
                <ShoppingCart size={20} />
                {cartCount > 0 && <span style={{ position: 'absolute', top: -6, right: -6, background: 'var(--brand-color, #a78bfa)', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff' }}>{cartCount}</span>}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="aurora-bg" style={{ position: 'relative', minHeight: '85vh', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        <img src={heroImage} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.15, mixBlendMode: 'screen' }} />
        <div style={{ position: 'relative', zIndex: 10, maxWidth: 1280, margin: '0 auto', padding: '80px 24px', display: 'grid', gridTemplateColumns: showServices ? '1fr 1fr' : '1fr', gap: 48, alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 12, letterSpacing: '0.2em', color: 'var(--brand-color, #a78bfa)', marginBottom: 16, textTransform: 'uppercase', opacity: 0.8 }}>Holistic Wellness</p>
            <h1 style={{ fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 700, lineHeight: 1.1, marginBottom: 20, letterSpacing: '-0.02em' }}>{tagline}</h1>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', marginBottom: 32, lineHeight: 1.7, maxWidth: 480 }}>Holistic treatments and products to help you glow from within.</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {showServices && <a href="#services" style={{ display: 'inline-block', padding: '14px 28px', fontSize: 14, fontWeight: 600, background: 'rgba(167,139,250,0.15)', backdropFilter: 'blur(10px)', border: '1px solid rgba(167,139,250,0.4)', color: 'var(--brand-color, #a78bfa)', borderRadius: 50, textDecoration: 'none' }}>Book a Session</a>}
              {showProducts && <a href="#products" style={{ display: 'inline-block', padding: '14px 28px', fontSize: 14, fontWeight: 600, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: 50, textDecoration: 'none' }}>Shop Products</a>}
              <button type="button" onClick={() => setCustomOrderOpen(true)} style={{ display: 'inline-block', padding: '14px 28px', fontSize: 14, fontWeight: 600, background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', borderRadius: 50, cursor: 'pointer' }}>Custom Order</button>
            </div>
          </div>
          {showServices && (
            <div style={{ ...glass, borderRadius: 20, padding: 24 }}>
              <p style={{ fontSize: 12, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)', marginBottom: 16, textTransform: 'uppercase' }}>Upcoming</p>
              {displayServices.slice(0, 3).map((s) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(167,139,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Star size={14} style={{ color: 'var(--brand-color, #a78bfa)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{s.name}</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{s.durationMinutes} min • {formatPrice(s.priceCents, theme.currency)}</p>
                  </div>
                  <button type="button" onClick={() => openBooking(s)} disabled={!theme.paymentsEnabled}
                    style={{ fontSize: 11, padding: '6px 14px', borderRadius: 50, background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', color: 'var(--brand-color, #a78bfa)', cursor: 'pointer', flexShrink: 0 }}>
                    Book
                  </button>
                </div>
              ))}
              <a href="#services" style={{ display: 'block', textAlign: 'center', marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>View full calendar →</a>
            </div>
          )}
        </div>
      </section>

      {/* Products */}
      {showProducts && (
        <section id="products" style={{ maxWidth: 1280, margin: '0 auto', padding: '80px 24px' }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 40, textAlign: 'center' }}>Ritual Essentials</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
            {displayProducts.map((product) => (
              <div key={product.id} style={{ ...glass, borderRadius: 20, overflow: 'hidden' }}>
                <div style={{ aspectRatio: '1/1', overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
                  <img src={product.imageUrls?.[0] ?? defaults.heroImageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.06)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')} />
                </div>
                <div style={{ padding: 20 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{product.name}</h3>
                  {product.description && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 12, lineHeight: 1.5 }}>{product.description}</p>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--brand-color, #a78bfa)', fontSize: 15, fontWeight: 600 }}>{formatPrice(product.priceCents, theme.currency)}</span>
                    <button type="button" onClick={() => openQuickView(product)}
                      style={{ fontSize: 12, padding: '6px 16px', borderRadius: 50, background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', color: 'var(--brand-color, #a78bfa)', cursor: 'pointer' }}>
                      {theme.paymentsEnabled ? 'Add' : 'View'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Services full list */}
      {showServices && (
        <section id="services" style={{ padding: '80px 24px', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 40, textAlign: 'center' }}>Healing Sessions</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
              {displayServices.map((service) => (
                <div key={service.id} style={{ ...glass, borderRadius: 20, padding: 28 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>{service.name}</h3>
                  {service.description && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 20, lineHeight: 1.6 }}>{service.description}</p>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{service.durationMinutes} min</span>
                    <span style={{ color: 'var(--brand-color, #a78bfa)', fontWeight: 600 }}>{formatPrice(service.priceCents, theme.currency)}</span>
                  </div>
                  <button type="button" onClick={() => openBooking(service)} disabled={!theme.paymentsEnabled}
                    style={{ width: '100%', padding: '12px', borderRadius: 12, fontSize: 13, fontWeight: 600, background: 'linear-gradient(135deg, rgba(167,139,250,0.2), rgba(96,165,250,0.2))', border: '1px solid rgba(167,139,250,0.3)', color: 'var(--brand-color, #a78bfa)', cursor: theme.paymentsEnabled ? 'pointer' : 'not-allowed', opacity: theme.paymentsEnabled ? 1 : 0.4 }}>
                    {theme.paymentsEnabled ? 'Book Session' : 'Coming Soon'}
                  </button>
                </div>
              ))}
            </div>
            {staff.length > 0 && (
              <div style={{ marginTop: 64, display: 'flex', justifyContent: 'center', gap: 48, flexWrap: 'wrap' }}>
                {staff.map((member) => (
                  <div key={member.id} style={{ textAlign: 'center' }}>
                    {member.avatarUrl && <img src={member.avatarUrl} alt={member.name} style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 16px', border: '2px solid rgba(167,139,250,0.4)' }} />}
                    <p style={{ fontSize: 15, fontWeight: 600 }}>{member.name}</p>
                    {member.bio && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{member.bio}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Badges */}
      <div style={{ padding: '40px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', justifyContent: 'center', gap: 48, flexWrap: 'wrap' }}>
          {[{ icon: Leaf, text: 'Natural Ingredients', sub: 'Clean & conscious' },
            { icon: Heart, text: 'Holistic Approach', sub: 'Mind, body, soul' },
            { icon: Star, text: 'Safe & Effective', sub: 'Backed by science' }
          ].map(({ icon: Icon, text, sub }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Icon size={20} style={{ color: 'var(--brand-color, #a78bfa)', opacity: 0.7 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{text}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer id="footer" style={{ padding: '48px 24px', textAlign: 'center', borderTop: '1px solid rgba(167,139,250,0.1)' }}>
        <p style={{ fontSize: 18, fontWeight: 700, background: 'linear-gradient(90deg, #a78bfa, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 8 }}>{theme.companyName}</p>
        {theme.city && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{theme.city}</p>}
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
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 24 }}>&copy; {new Date().getFullYear()} {theme.companyName}</p>
      </footer>

      <ProductQuickView product={quickViewProduct} onClose={closeQuickView} onAddToCart={(p, v) => { addToCart(p, v); closeQuickView(); }} currency={theme.currency} paymentsEnabled={theme.paymentsEnabled} />
      {showProducts && <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} items={cart} onUpdateQuantity={updateCartQuantity} onRemove={removeFromCart} onCheckout={openCheckout} />}
      <CheckoutModal isOpen={checkoutOpen} onClose={closeCheckout} items={cart} status={orderStatus} error={orderError} orderNumber={orderNumber} clientSecret={orderClientSecret} amountCents={orderAmountCents} stripeAccountId={theme.stripeAccountId} currency={theme.currency} onSubmit={submitOrder} onPaymentSuccess={confirmOrderPayment} onPaymentCancel={cancelOrderPayment} />
      <BookingModal isOpen={bookingOpen} onClose={closeBooking} service={bookingService} selectedDate={selectedDate} selectedSlot={selectedSlot} availableSlots={availableSlots} onSelectDate={selectBookingDate} onSelectSlot={selectBookingSlot} onConfirm={confirmBooking} />
      <BookingStatusOverlay status={bookingStatus} error={bookingError} clientSecret={bookingClientSecret} amountCents={bookingAmountCents} stripeAccountId={theme.stripeAccountId} currency={theme.currency} onClose={closeBooking} onDismiss={dismissBookingStatus} onPaymentSuccess={confirmBookingPayment} onPaymentCancel={cancelBookingPayment} />
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
