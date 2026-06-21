import { useState } from 'react';
import { ShoppingCart, ChevronRight, Star, ArrowRight } from 'lucide-react';
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

const G = {
  bg: '#0a0a0f',
  surface: '#12121a',
  card: 'rgba(255,255,255,0.04)',
  cardBorder: 'rgba(255,255,255,0.08)',
  cardHover: 'rgba(255,255,255,0.07)',
  gold: '#c9a84c',
  goldMuted: 'rgba(201,168,76,0.15)',
  goldGlow: 'rgba(201,168,76,0.25)',
  text: '#f0ede8',
  textMuted: 'rgba(240,237,232,0.45)',
  textDim: 'rgba(240,237,232,0.25)',
  glass: 'rgba(255,255,255,0.06)',
  glassBorder: 'rgba(255,255,255,0.12)',
};

const serif = 'Playfair Display, Georgia, serif';
const sans = 'Inter, system-ui, sans-serif';

export default function Storefront({ theme, products, services, staff }: ThemeProps) {
  const [customOrderOpen, setCustomOrderOpen] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [hoveredProduct, setHoveredProduct] = useState<string | null>(null);
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
  const brandColor = theme.brandColor || G.gold;

  return (
    <div style={{ minHeight: '100vh', background: G.bg, color: G.text, fontFamily: sans }}>

      {/* ── Nav ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,10,15,0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${G.glassBorder}`,
      }}>
        <div style={{ maxWidth: 1320, margin: '0 auto', padding: '0 28px', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
          {/* Left links */}
          <div style={{ display: 'flex', gap: 4 }}>
            {showProducts && (
              <a href="#products" style={{
                textDecoration: 'none', color: G.textMuted,
                fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase',
                padding: '6px 14px', borderRadius: 8,
                transition: 'color 0.2s, background 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.color = G.text; e.currentTarget.style.background = G.glass; }}
                onMouseLeave={e => { e.currentTarget.style.color = G.textMuted; e.currentTarget.style.background = 'transparent'; }}
              >Shop</a>
            )}
            {showServices && (
              <a href="#services" style={{
                textDecoration: 'none', color: G.textMuted,
                fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase',
                padding: '6px 14px', borderRadius: 8,
                transition: 'color 0.2s, background 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.color = G.text; e.currentTarget.style.background = G.glass; }}
                onMouseLeave={e => { e.currentTarget.style.color = G.textMuted; e.currentTarget.style.background = 'transparent'; }}
              >Services</a>
            )}
            <a href="#footer" style={{
              textDecoration: 'none', color: G.textMuted,
              fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase',
              padding: '6px 14px', borderRadius: 8,
              transition: 'color 0.2s, background 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.color = G.text; e.currentTarget.style.background = G.glass; }}
              onMouseLeave={e => { e.currentTarget.style.color = G.textMuted; e.currentTarget.style.background = 'transparent'; }}
            >Contact</a>
          </div>

          {/* Brand */}
          <span style={{
            fontFamily: serif, fontSize: 20, letterSpacing: '0.25em',
            textTransform: 'uppercase', color: brandColor,
            position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          }}>
            {theme.companyName}
          </span>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              onClick={() => setCustomOrderOpen(true)}
              style={{
                background: 'transparent', border: `1px solid ${G.glassBorder}`,
                borderRadius: 8, padding: '7px 18px',
                fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
                color: G.textMuted, cursor: 'pointer',
                transition: 'border-color 0.2s, color 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = brandColor; e.currentTarget.style.color = brandColor; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = G.glassBorder; e.currentTarget.style.color = G.textMuted; }}
            >
              Custom Order
            </button>
            {showProducts && (
              <button
                type="button"
                aria-label="Open cart"
                onClick={() => setCartOpen(true)}
                style={{
                  position: 'relative', background: G.glass,
                  border: `1px solid ${G.glassBorder}`, borderRadius: 8,
                  padding: '7px 10px', cursor: 'pointer', color: G.text,
                  display: 'flex', alignItems: 'center',
                }}
              >
                <ShoppingCart size={18} />
                {cartCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -5, right: -5,
                    background: brandColor, color: '#000', borderRadius: '50%',
                    width: 17, height: 17, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 9, fontWeight: 700,
                  }}>{cartCount}</span>
                )}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ position: 'relative', height: '88vh', minHeight: 560, overflow: 'hidden' }}>
        <img
          src={heroImage}
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4 }}
        />
        {/* Gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${G.bg} 0%, rgba(10,10,15,0.6) 50%, rgba(10,10,15,0.85) 100%)` }} />
        {/* Bottom fade */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 200, background: `linear-gradient(to top, ${G.bg}, transparent)` }} />

        <div style={{ position: 'relative', zIndex: 10, maxWidth: 1320, margin: '0 auto', padding: '0 28px', height: '100%', display: 'flex', alignItems: 'center' }}>
          <div style={{ maxWidth: 640 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <div style={{ width: 32, height: 1, background: brandColor }} />
              <span style={{ fontSize: 11, letterSpacing: '0.3em', color: brandColor, textTransform: 'uppercase' }}>Premium Collection</span>
            </div>
            <h1 style={{
              fontFamily: serif, fontSize: 'clamp(42px, 6vw, 80px)',
              fontWeight: 400, lineHeight: 1.1, color: G.text, marginBottom: 24,
            }}>
              {tagline}
            </h1>
            <p style={{ fontSize: 15, color: G.textMuted, lineHeight: 1.7, marginBottom: 36, maxWidth: 460 }}>
              {theme.city ? `Crafted in ${theme.city} · ` : ''}Exceptional quality meets refined taste.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {showProducts && (
                <a href="#products" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '13px 28px', borderRadius: 10,
                  background: brandColor, color: '#000',
                  fontSize: 12, fontWeight: 600, letterSpacing: '0.1em',
                  textTransform: 'uppercase', textDecoration: 'none',
                  transition: 'opacity 0.2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                >
                  Shop Collection <ArrowRight size={14} />
                </a>
              )}
              {showServices && (
                <a href="#services" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '13px 28px', borderRadius: 10,
                  background: G.glass, color: G.text,
                  border: `1px solid ${G.glassBorder}`,
                  backdropFilter: 'blur(8px)',
                  fontSize: 12, fontWeight: 500, letterSpacing: '0.1em',
                  textTransform: 'uppercase', textDecoration: 'none',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = G.glass; }}
                >
                  Book Appointment
                </a>
              )}
            </div>
          </div>

          {/* Floating stats card */}
          <div style={{
            position: 'absolute', right: 28, top: '50%', transform: 'translateY(-50%)',
            background: G.glass, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            border: `1px solid ${G.glassBorder}`, borderRadius: 20,
            padding: '32px 28px', minWidth: 200,
            display: 'flex', flexDirection: 'column', gap: 24,
          }}>
            {[
              { value: displayProducts.length || '20+', label: 'Products' },
              { value: displayServices.length || '5+', label: 'Services' },
              { value: '★ 4.9', label: 'Rating' },
            ].map(({ value, label }) => (
              <div key={label}>
                <p style={{ fontFamily: serif, fontSize: 28, fontWeight: 400, color: brandColor, lineHeight: 1 }}>{value}</p>
                <p style={{ fontSize: 11, color: G.textMuted, marginTop: 4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Products ── */}
      {showProducts && (
        <section id="products" style={{ maxWidth: 1320, margin: '0 auto', padding: '96px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 48 }}>
            <div>
              <p style={{ fontSize: 11, letterSpacing: '0.3em', color: brandColor, marginBottom: 10, textTransform: 'uppercase' }}>The Collection</p>
              <h2 style={{ fontFamily: serif, fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 400, color: G.text }}>Curated Excellence</h2>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: brandColor }} />
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: G.goldMuted, border: `1px solid ${brandColor}` }} />
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: G.goldMuted, border: `1px solid ${brandColor}` }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 20 }}>
            {displayProducts.map((product) => {
              const isHovered = hoveredProduct === product.id;
              return (
                <div
                  key={product.id}
                  onMouseEnter={() => setHoveredProduct(product.id)}
                  onMouseLeave={() => setHoveredProduct(null)}
                  style={{
                    background: isHovered ? G.cardHover : G.card,
                    border: `1px solid ${isHovered ? 'rgba(201,168,76,0.3)' : G.cardBorder}`,
                    borderRadius: 20,
                    overflow: 'hidden',
                    transition: 'all 0.3s ease',
                    boxShadow: isHovered ? `0 8px 40px ${G.goldGlow}` : '0 2px 12px rgba(0,0,0,0.4)',
                    cursor: 'pointer',
                  }}
                  onClick={() => openQuickView(product)}
                >
                  {/* Image */}
                  <div style={{ aspectRatio: '1', overflow: 'hidden', background: '#0d0d14', position: 'relative' }}>
                    <img
                      src={product.imageUrls?.[0] ?? defaults.heroImageUrl}
                      alt={product.name}
                      style={{
                        width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                        transition: 'transform 0.5s ease',
                        transform: isHovered ? 'scale(1.06)' : 'scale(1)',
                      }}
                    />
                    {product.isFeatured && (
                      <div style={{
                        position: 'absolute', top: 12, left: 12,
                        background: brandColor, color: '#000',
                        borderRadius: 6, padding: '3px 10px',
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                      }}>
                        Featured
                      </div>
                    )}
                    {isHovered && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'rgba(0,0,0,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'opacity 0.2s',
                      }}>
                        <span style={{
                          background: brandColor, color: '#000',
                          borderRadius: 8, padding: '10px 22px',
                          fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                        }}>
                          {theme.paymentsEnabled ? 'Add to Cart' : 'Quick View'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ padding: '18px 18px 20px' }}>
                    <div style={{ display: 'flex', gap: 2, marginBottom: 8 }}>
                      {[1,2,3,4,5].map(s => <Star key={s} size={10} fill={brandColor} color={brandColor} />)}
                    </div>
                    <h3 style={{ fontFamily: serif, fontSize: 16, fontWeight: 400, color: G.text, marginBottom: 6 }}>{product.name}</h3>
                    {product.description && (
                      <p style={{ fontSize: 12, color: G.textMuted, lineHeight: 1.5, marginBottom: 14, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {product.description}
                      </p>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: serif, fontSize: 18, color: brandColor }}>{formatPrice(product.priceCents, theme.currency)}</span>
                      {product.compareAtPriceCents && (
                        <span style={{ fontSize: 12, color: G.textDim, textDecoration: 'line-through' }}>{formatPrice(product.compareAtPriceCents, theme.currency)}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Services ── */}
      {showServices && (
        <section id="services" style={{ background: G.surface, padding: '96px 28px', position: 'relative', overflow: 'hidden' }}>
          {/* Decorative blur */}
          <div style={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, borderRadius: '50%', background: `radial-gradient(circle, ${G.goldGlow} 0%, transparent 70%)`, pointerEvents: 'none' }} />

          <div style={{ maxWidth: 1320, margin: '0 auto', position: 'relative', zIndex: 1 }}>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <p style={{ fontSize: 11, letterSpacing: '0.3em', color: brandColor, marginBottom: 10, textTransform: 'uppercase' }}>By Appointment</p>
              <h2 style={{ fontFamily: serif, fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 400, color: G.text }}>Private Services</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
              {displayServices.map((service) => (
                <div
                  key={service.id}
                  style={{
                    background: G.card,
                    border: `1px solid ${G.cardBorder}`,
                    borderRadius: 20,
                    padding: '32px 28px',
                    backdropFilter: 'blur(8px)',
                    transition: 'border-color 0.3s, box-shadow 0.3s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `rgba(201,168,76,0.3)`; e.currentTarget.style.boxShadow = `0 8px 40px ${G.goldGlow}`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = G.cardBorder; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <h3 style={{ fontFamily: serif, fontSize: 20, fontWeight: 400, color: G.text, lineHeight: 1.3 }}>{service.name}</h3>
                    <span style={{
                      background: G.goldMuted, border: `1px solid ${G.goldGlow}`,
                      borderRadius: 8, padding: '4px 10px',
                      fontSize: 10, color: brandColor, letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap', marginLeft: 12,
                    }}>
                      {service.durationMinutes} min
                    </span>
                  </div>
                  {service.description && (
                    <p style={{ fontSize: 13, color: G.textMuted, lineHeight: 1.65, marginBottom: 28 }}>{service.description}</p>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20, borderTop: `1px solid ${G.cardBorder}` }}>
                    <span style={{ fontFamily: serif, fontSize: 22, color: brandColor }}>{formatPrice(service.priceCents, theme.currency)}</span>
                    <button
                      type="button"
                      onClick={() => openBooking(service)}
                      disabled={!theme.paymentsEnabled}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '9px 20px', borderRadius: 8,
                        background: 'transparent', border: `1px solid ${brandColor}`,
                        color: brandColor, fontSize: 11, letterSpacing: '0.12em',
                        textTransform: 'uppercase', cursor: theme.paymentsEnabled ? 'pointer' : 'not-allowed',
                        opacity: theme.paymentsEnabled ? 1 : 0.4,
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={e => { if (theme.paymentsEnabled) e.currentTarget.style.background = G.goldMuted; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      {theme.paymentsEnabled ? <>Book <ChevronRight size={12} /></> : 'Coming Soon'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Staff */}
            {staff.length > 0 && (
              <div style={{ marginTop: 72, display: 'flex', justifyContent: 'center', gap: 40, flexWrap: 'wrap' }}>
                {staff.map((member) => (
                  <div key={member.id} style={{ textAlign: 'center' }}>
                    {member.avatarUrl ? (
                      <img src={member.avatarUrl} alt={member.name} style={{
                        width: 72, height: 72, borderRadius: '50%', objectFit: 'cover',
                        margin: '0 auto 14px',
                        border: `2px solid ${G.glassBorder}`,
                        boxShadow: `0 0 0 1px ${brandColor}40`,
                      }} />
                    ) : (
                      <div style={{
                        width: 72, height: 72, borderRadius: '50%', background: G.card,
                        border: `2px solid ${G.glassBorder}`, margin: '0 auto 14px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 22, color: G.textMuted,
                      }}>
                        {member.name[0]}
                      </div>
                    )}
                    <p style={{ fontFamily: serif, fontSize: 15, color: G.text }}>{member.name}</p>
                    {member.bio && <p style={{ fontSize: 12, color: G.textMuted, marginTop: 6, maxWidth: 180, margin: '6px auto 0' }}>{member.bio}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Newsletter + CTA ── */}
      <section style={{ padding: '80px 28px', background: G.bg, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 400, borderRadius: '50%', background: `radial-gradient(circle, ${G.goldGlow} 0%, transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{
          maxWidth: 560, margin: '0 auto', position: 'relative', zIndex: 1,
          background: G.glass, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          border: `1px solid ${G.glassBorder}`, borderRadius: 24,
          padding: '48px 40px', textAlign: 'center',
        }}>
          <p style={{ fontSize: 11, letterSpacing: '0.3em', color: brandColor, marginBottom: 12, textTransform: 'uppercase' }}>Stay in the Know</p>
          <h2 style={{ fontFamily: serif, fontSize: 28, fontWeight: 400, color: G.text, marginBottom: 8 }}>The Private List</h2>
          <p style={{ fontSize: 13, color: G.textMuted, marginBottom: 28, lineHeight: 1.6 }}>Early access to new arrivals, exclusive offers, and private events.</p>
          <form
            onSubmit={(e) => { e.preventDefault(); subscribe(emailInput); }}
            style={{ display: 'flex', gap: 8, maxWidth: 380, margin: '0 auto' }}
          >
            <input
              type="email"
              placeholder="Your email address"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              style={{
                flex: 1, background: 'rgba(0,0,0,0.4)', border: `1px solid ${G.glassBorder}`,
                borderRadius: 8, padding: '11px 14px',
                fontSize: 13, color: G.text, outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={subscribeStatus === 'loading' || subscribeStatus === 'success'}
              style={{
                background: brandColor, color: '#000', border: 'none',
                borderRadius: 8, padding: '11px 20px',
                fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer',
                whiteSpace: 'nowrap', opacity: subscribeStatus === 'loading' || subscribeStatus === 'success' ? 0.7 : 1,
              }}
            >
              {subscribeStatus === 'success' ? '✓ Done' : subscribeStatus === 'loading' ? '...' : 'Join'}
            </button>
          </form>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer id="footer" style={{ background: G.surface, borderTop: `1px solid ${G.glassBorder}`, padding: '52px 28px 36px' }}>
        <div style={{ maxWidth: 1320, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, textAlign: 'center' }}>
          <span style={{ fontFamily: serif, fontSize: 22, letterSpacing: '0.3em', textTransform: 'uppercase', color: brandColor }}>{theme.companyName}</span>
          {theme.city && <p style={{ fontSize: 12, color: G.textDim, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{theme.city}</p>}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            {showProducts && <a href="#products" style={{ fontSize: 11, color: G.textMuted, textDecoration: 'none', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Shop</a>}
            {showServices && <a href="#services" style={{ fontSize: 11, color: G.textMuted, textDecoration: 'none', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Services</a>}
            <button
              type="button"
              onClick={() => setCustomOrderOpen(true)}
              style={{ fontSize: 11, color: G.textMuted, background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}
            >
              Custom Order
            </button>
          </div>
          <p style={{ fontSize: 10, color: G.textDim, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 8 }}>
            &copy; {new Date().getFullYear()} {theme.companyName}. All rights reserved.
          </p>
        </div>
      </footer>

      {/* ── Modals ── */}
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
