import { useState, useEffect } from 'react';
import { ShoppingCart, Star, Package, Calendar, Mail, X, Menu } from 'lucide-react';
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
  gold: '#c9a84c',
  goldMuted: 'rgba(201,168,76,0.12)',
  goldGlow: 'rgba(201,168,76,0.2)',
  text: '#f0ede8',
  textMuted: 'rgba(240,237,232,0.42)',
  textDim: 'rgba(240,237,232,0.22)',
  glass: 'rgba(255,255,255,0.05)',
  glassBorder: 'rgba(255,255,255,0.10)',
};

const serif = 'Playfair Display, Georgia, serif';
const SIDEBAR_W = 72;

export default function Storefront({ theme, products, services, staff }: ThemeProps) {
  const [customOrderOpen, setCustomOrderOpen] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [hoveredProduct, setHoveredProduct] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

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
  const brand = theme.brandColor || G.gold;

  const featuredProduct = displayProducts.find(p => p.isFeatured) ?? displayProducts[0];
  const restProducts = displayProducts.filter(p => p.id !== featuredProduct?.id);

  const navItems = [
    ...(showProducts ? [{ href: '#products', icon: Package, label: 'Shop' }] : []),
    ...(showServices ? [{ href: '#services', icon: Calendar, label: 'Services' }] : []),
    { href: '#footer', icon: Mail, label: 'Contact' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: G.bg, color: G.text, fontFamily: 'Inter, system-ui, sans-serif', display: 'flex' }}>

      {/* ── LEFT SIDEBAR (desktop) ── */}
      {!isMobile && (
        <aside style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, width: SIDEBAR_W,
          background: G.surface, borderRight: `1px solid ${G.glassBorder}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '28px 0', zIndex: 50,
          backdropFilter: 'blur(20px)',
        }}>
          {/* Brand — rotated vertical */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{
              fontFamily: serif, fontSize: 11, letterSpacing: '0.35em',
              textTransform: 'uppercase', color: brand,
              writingMode: 'vertical-rl', transform: 'rotate(180deg)',
              whiteSpace: 'nowrap',
            }}>
              {theme.companyName}
            </span>
          </div>

          {/* Nav icons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
            {navItems.map(({ href, icon: Icon, label }) => (
              <a key={href} href={href} title={label} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                padding: '10px 8px', borderRadius: 10, textDecoration: 'none',
                color: G.textMuted, transition: 'color 0.2s, background 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.color = brand; e.currentTarget.style.background = G.goldMuted; }}
                onMouseLeave={e => { e.currentTarget.style.color = G.textMuted; e.currentTarget.style.background = 'transparent'; }}
              >
                <Icon size={16} />
                <span style={{ fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}</span>
              </a>
            ))}
          </div>

          {/* Cart */}
          {showProducts && (
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              style={{
                position: 'relative', background: 'none', border: 'none', cursor: 'pointer',
                color: G.textMuted, padding: '10px 8px', borderRadius: 10, marginBottom: 4,
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = brand; }}
              onMouseLeave={e => { e.currentTarget.style.color = G.textMuted; }}
            >
              <ShoppingCart size={18} />
              {cartCount > 0 && (
                <span style={{
                  position: 'absolute', top: 6, right: 4,
                  background: brand, color: '#000', borderRadius: '50%',
                  width: 15, height: 15, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 8, fontWeight: 700,
                }}>{cartCount}</span>
              )}
            </button>
          )}
        </aside>
      )}

      {/* ── MOBILE TOP BAR ── */}
      {isMobile && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
          background: 'rgba(10,10,15,0.9)', backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${G.glassBorder}`,
          height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px',
        }}>
          <span style={{ fontFamily: serif, fontSize: 14, letterSpacing: '0.25em', textTransform: 'uppercase', color: brand }}>{theme.companyName}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {showProducts && (
              <button type="button" onClick={() => setCartOpen(true)} style={{ background: 'none', border: 'none', color: G.text, cursor: 'pointer', position: 'relative' }}>
                <ShoppingCart size={20} />
                {cartCount > 0 && (
                  <span style={{ position: 'absolute', top: -4, right: -4, background: brand, color: '#000', borderRadius: '50%', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700 }}>{cartCount}</span>
                )}
              </button>
            )}
            <button type="button" onClick={() => setMobileNavOpen(!mobileNavOpen)} style={{ background: 'none', border: 'none', color: G.text, cursor: 'pointer' }}>
              {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      )}

      {/* Mobile nav drawer */}
      {isMobile && mobileNavOpen && (
        <div style={{
          position: 'fixed', top: 56, left: 0, right: 0, zIndex: 49,
          background: G.surface, borderBottom: `1px solid ${G.glassBorder}`,
          padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          {navItems.map(({ href, label }) => (
            <a key={href} href={href} onClick={() => setMobileNavOpen(false)} style={{
              padding: '12px 0', color: G.text, textDecoration: 'none',
              fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase',
              borderBottom: `1px solid ${G.glassBorder}`,
            }}>{label}</a>
          ))}
          <button type="button" onClick={() => { setMobileNavOpen(false); setCustomOrderOpen(true); }} style={{
            padding: '12px 0', color: brand, background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: 'left',
          }}>Custom Order</button>
        </div>
      )}

      {/* ── MAIN CONTENT (offset by sidebar) ── */}
      <main style={{ flex: 1, marginLeft: isMobile ? 0 : SIDEBAR_W, paddingTop: isMobile ? 56 : 0, minWidth: 0 }}>

        {/* ── HERO: Split screen ── */}
        <section style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
          {/* Left: text panel */}
          <div style={{
            width: isMobile ? '100%' : '45%',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            padding: isMobile ? '60px 24px 80px' : '80px 56px',
            position: 'relative', zIndex: 2,
            background: isMobile ? 'linear-gradient(to bottom, rgba(10,10,15,0.95), rgba(10,10,15,0.85))' : G.bg,
          }}>
            {/* Eyebrow */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
              <div style={{ width: 24, height: 1, background: brand, opacity: 0.8 }} />
              <span style={{ fontSize: 10, letterSpacing: '0.4em', color: brand, textTransform: 'uppercase' }}>Est. Collection</span>
            </div>

            <h1 style={{
              fontFamily: serif, fontSize: isMobile ? 'clamp(36px,9vw,52px)' : 'clamp(40px,4.5vw,68px)',
              fontWeight: 400, lineHeight: 1.12, color: G.text, marginBottom: 24,
            }}>
              {tagline}
            </h1>
            <p style={{ fontSize: 14, color: G.textMuted, lineHeight: 1.75, marginBottom: 40, maxWidth: 380 }}>
              {theme.city ? `Based in ${theme.city}. ` : ''}Exceptional quality for those who know the difference.
            </p>

            {/* CTAs */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {showProducts && (
                <a href="#products" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '14px 30px', borderRadius: 12,
                  background: brand, color: '#000',
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                  textDecoration: 'none',
                }}>
                  Shop Collection
                </a>
              )}
              <button type="button" onClick={() => setCustomOrderOpen(true)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '14px 30px', borderRadius: 12,
                background: 'transparent', color: G.text,
                border: `1px solid ${G.glassBorder}`,
                fontSize: 11, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer',
              }}>
                Custom Order
              </button>
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: 36, marginTop: 56, paddingTop: 36, borderTop: `1px solid ${G.glassBorder}` }}>
              {[
                { v: displayProducts.length || '20+', l: 'Products' },
                { v: displayServices.length || '5+', l: 'Services' },
                { v: '★ 4.9', l: 'Rating' },
              ].map(({ v, l }) => (
                <div key={l}>
                  <p style={{ fontFamily: serif, fontSize: 26, color: brand, lineHeight: 1 }}>{v}</p>
                  <p style={{ fontSize: 10, color: G.textMuted, marginTop: 4, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: full bleed image */}
          {!isMobile && (
            <div style={{ flex: 1, position: 'relative' }}>
              <img src={heroImage} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              {/* Inner shadow left edge */}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(10,10,15,0.6) 0%, transparent 40%)' }} />
              {/* Bottom scrim */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 160, background: `linear-gradient(to top, ${G.bg}, transparent)` }} />

              {/* Floating product card on image */}
              {featuredProduct && (
                <div style={{
                  position: 'absolute', bottom: 40, right: 40,
                  background: 'rgba(10,10,15,0.75)', backdropFilter: 'blur(24px)',
                  border: `1px solid ${G.glassBorder}`, borderRadius: 16,
                  padding: '20px 22px', minWidth: 200, maxWidth: 240,
                }}>
                  <p style={{ fontSize: 9, letterSpacing: '0.3em', color: brand, textTransform: 'uppercase', marginBottom: 8 }}>Featured</p>
                  <p style={{ fontFamily: serif, fontSize: 15, color: G.text, marginBottom: 6 }}>{featuredProduct.name}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: serif, fontSize: 18, color: brand }}>{formatPrice(featuredProduct.priceCents, theme.currency)}</span>
                    <button type="button" onClick={() => openQuickView(featuredProduct)} style={{
                      background: brand, color: '#000', border: 'none', borderRadius: 6,
                      padding: '6px 12px', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
                      textTransform: 'uppercase', cursor: 'pointer',
                    }}>
                      View
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mobile: hero image as bg */}
          {isMobile && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
              <img src={heroImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.25 }} />
            </div>
          )}
        </section>

        {/* ── PRODUCTS ── */}
        {showProducts && (
          <section id="products" style={{ padding: isMobile ? '64px 20px' : '96px 56px', background: G.bg }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 48 }}>
              <div>
                <p style={{ fontSize: 10, letterSpacing: '0.4em', color: brand, marginBottom: 10, textTransform: 'uppercase' }}>The Collection</p>
                <h2 style={{ fontFamily: serif, fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: 400 }}>Curated Excellence</h2>
              </div>
            </div>

            {/* Featured product — large spotlight */}
            {featuredProduct && (
              <div
                onClick={() => openQuickView(featuredProduct)}
                style={{
                  display: 'flex', flexDirection: isMobile ? 'column' : 'row',
                  gap: 0, borderRadius: 20, overflow: 'hidden',
                  border: `1px solid ${G.glassBorder}`,
                  marginBottom: 20, cursor: 'pointer',
                  background: G.card,
                  transition: 'border-color 0.3s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `rgba(201,168,76,0.35)`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = G.glassBorder; }}
              >
                {/* Image */}
                <div style={{ flex: isMobile ? 'none' : '0 0 55%', aspectRatio: isMobile ? '16/9' : '16/10', overflow: 'hidden', position: 'relative' }}>
                  <img
                    src={featuredProduct.imageUrls?.[0] ?? defaults.heroImageUrl}
                    alt={featuredProduct.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  <div style={{ position: 'absolute', top: 16, left: 16, background: brand, color: '#000', borderRadius: 6, padding: '4px 12px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Featured
                  </div>
                </div>
                {/* Details */}
                <div style={{ flex: 1, padding: isMobile ? '28px 24px' : '48px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0 }}>
                  <div style={{ display: 'flex', gap: 2, marginBottom: 16 }}>
                    {[1,2,3,4,5].map(s => <Star key={s} size={12} fill={brand} color={brand} />)}
                  </div>
                  <h3 style={{ fontFamily: serif, fontSize: isMobile ? 22 : 30, fontWeight: 400, marginBottom: 12, lineHeight: 1.2 }}>{featuredProduct.name}</h3>
                  {featuredProduct.description && (
                    <p style={{ fontSize: 14, color: G.textMuted, lineHeight: 1.7, marginBottom: 28, maxWidth: 360 }}>{featuredProduct.description}</p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <span style={{ fontFamily: serif, fontSize: 28, color: brand }}>{formatPrice(featuredProduct.priceCents, theme.currency)}</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); theme.paymentsEnabled ? addToCart(featuredProduct, undefined) : openQuickView(featuredProduct); }}
                      style={{
                        background: brand, color: '#000', border: 'none', borderRadius: 10,
                        padding: '12px 24px', fontSize: 11, fontWeight: 700,
                        letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer',
                      }}
                    >
                      {theme.paymentsEnabled ? 'Add to Cart' : 'View Details'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Rest of products — card grid */}
            {restProducts.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? '160px' : '230px'}, 1fr))`, gap: 16 }}>
                {restProducts.map((product) => {
                  const hovered = hoveredProduct === product.id;
                  return (
                    <div
                      key={product.id}
                      onMouseEnter={() => setHoveredProduct(product.id)}
                      onMouseLeave={() => setHoveredProduct(null)}
                      onClick={() => openQuickView(product)}
                      style={{
                        background: hovered ? 'rgba(255,255,255,0.06)' : G.card,
                        border: `1px solid ${hovered ? 'rgba(201,168,76,0.3)' : G.cardBorder}`,
                        borderRadius: 16, overflow: 'hidden', cursor: 'pointer',
                        transition: 'all 0.25s ease',
                        boxShadow: hovered ? `0 8px 32px ${G.goldGlow}` : 'none',
                      }}
                    >
                      <div style={{ aspectRatio: '1', overflow: 'hidden', background: '#0d0d14', position: 'relative' }}>
                        <img
                          src={product.imageUrls?.[0] ?? defaults.heroImageUrl}
                          alt={product.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.4s', transform: hovered ? 'scale(1.07)' : 'scale(1)' }}
                        />
                        {hovered && (
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ background: brand, color: '#000', borderRadius: 8, padding: '9px 18px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                              {theme.paymentsEnabled ? 'Add to Cart' : 'Quick View'}
                            </span>
                          </div>
                        )}
                      </div>
                      <div style={{ padding: '16px 16px 18px' }}>
                        <h3 style={{ fontFamily: serif, fontSize: 14, fontWeight: 400, marginBottom: 8, lineHeight: 1.3 }}>{product.name}</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontFamily: serif, fontSize: 16, color: brand }}>{formatPrice(product.priceCents, theme.currency)}</span>
                          {product.compareAtPriceCents && (
                            <span style={{ fontSize: 11, color: G.textDim, textDecoration: 'line-through' }}>{formatPrice(product.compareAtPriceCents, theme.currency)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ── SERVICES ── */}
        {showServices && (
          <section id="services" style={{ background: G.surface, padding: isMobile ? '64px 20px' : '96px 56px', position: 'relative', overflow: 'hidden' }}>
            {/* Gold glow */}
            <div style={{ position: 'absolute', top: -80, right: -80, width: 360, height: 360, borderRadius: '50%', background: `radial-gradient(circle, ${G.goldGlow} 0%, transparent 70%)`, pointerEvents: 'none' }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ marginBottom: 56 }}>
                <p style={{ fontSize: 10, letterSpacing: '0.4em', color: brand, marginBottom: 10, textTransform: 'uppercase' }}>By Appointment Only</p>
                <h2 style={{ fontFamily: serif, fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: 400 }}>Private Services</h2>
              </div>

              {/* Numbered list layout */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {displayServices.map((service, i) => (
                  <div
                    key={service.id}
                    style={{
                      display: 'flex', flexDirection: isMobile ? 'column' : 'row',
                      alignItems: isMobile ? 'flex-start' : 'center',
                      gap: isMobile ? 16 : 40, padding: '32px 0',
                      borderBottom: `1px solid ${G.glassBorder}`,
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = G.card; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                  >
                    {/* Number */}
                    <span style={{
                      fontFamily: serif, fontSize: 48, fontWeight: 400, lineHeight: 1,
                      color: G.goldMuted, minWidth: 56, textAlign: 'center',
                      flexShrink: 0,
                    }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                        <h3 style={{ fontFamily: serif, fontSize: 20, fontWeight: 400 }}>{service.name}</h3>
                        <span style={{
                          background: G.goldMuted, border: `1px solid ${G.goldGlow}`,
                          borderRadius: 6, padding: '3px 9px',
                          fontSize: 9, color: brand, letterSpacing: '0.12em', textTransform: 'uppercase',
                        }}>
                          {service.durationMinutes} min
                        </span>
                      </div>
                      {service.description && (
                        <p style={{ fontSize: 13, color: G.textMuted, lineHeight: 1.65, maxWidth: 480 }}>{service.description}</p>
                      )}
                    </div>
                    {/* Price + action */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'flex-start' : 'flex-end', gap: 12, flexShrink: 0 }}>
                      <span style={{ fontFamily: serif, fontSize: 24, color: brand }}>{formatPrice(service.priceCents, theme.currency)}</span>
                      <button
                        type="button"
                        onClick={() => openBooking(service)}
                        disabled={!theme.paymentsEnabled}
                        style={{
                          padding: '10px 22px', borderRadius: 8,
                          background: 'transparent', border: `1px solid ${brand}`,
                          color: brand, fontSize: 10, letterSpacing: '0.15em',
                          textTransform: 'uppercase', cursor: theme.paymentsEnabled ? 'pointer' : 'not-allowed',
                          opacity: theme.paymentsEnabled ? 1 : 0.4,
                          whiteSpace: 'nowrap',
                          transition: 'background 0.2s',
                        }}
                        onMouseEnter={e => { if (theme.paymentsEnabled) e.currentTarget.style.background = G.goldMuted; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        {theme.paymentsEnabled ? 'Book Now' : 'Coming Soon'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Staff */}
              {staff.length > 0 && (
                <div style={{ marginTop: 64, display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                  {staff.map((member) => (
                    <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt={member.name} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: `1px solid ${G.glassBorder}` }} />
                      ) : (
                        <div style={{ width: 56, height: 56, borderRadius: '50%', background: G.card, border: `1px solid ${G.glassBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: G.textMuted }}>
                          {member.name[0]}
                        </div>
                      )}
                      <div>
                        <p style={{ fontFamily: serif, fontSize: 15, color: G.text }}>{member.name}</p>
                        {member.bio && <p style={{ fontSize: 12, color: G.textMuted, marginTop: 3 }}>{member.bio}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── EMAIL CAPTURE ── */}
        <section style={{ padding: isMobile ? '64px 20px' : '96px 56px', background: G.bg, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 300, borderRadius: '50%', background: `radial-gradient(circle, ${G.goldGlow} 0%, transparent 70%)`, pointerEvents: 'none' }} />
          <div style={{
            position: 'relative', zIndex: 1,
            maxWidth: 520, margin: '0 auto',
            background: G.glass, backdropFilter: 'blur(24px)',
            border: `1px solid ${G.glassBorder}`, borderRadius: 24,
            padding: isMobile ? '36px 24px' : '48px 44px', textAlign: 'center',
          }}>
            <p style={{ fontSize: 10, letterSpacing: '0.4em', color: brand, marginBottom: 12, textTransform: 'uppercase' }}>Private List</p>
            <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 400, marginBottom: 8 }}>Stay in the Know</h2>
            <p style={{ fontSize: 13, color: G.textMuted, marginBottom: 28, lineHeight: 1.65 }}>
              Early access to new arrivals, exclusive offers, and private events.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); subscribe(emailInput); }} style={{ display: 'flex', gap: 8 }}>
              <input
                type="email"
                placeholder="Your email address"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                style={{
                  flex: 1, background: 'rgba(0,0,0,0.4)', border: `1px solid ${G.glassBorder}`,
                  borderRadius: 8, padding: '12px 14px', fontSize: 13, color: G.text, outline: 'none',
                  minWidth: 0,
                }}
              />
              <button type="submit" disabled={subscribeStatus === 'loading' || subscribeStatus === 'success'} style={{
                background: brand, color: '#000', border: 'none', borderRadius: 8,
                padding: '12px 20px', fontSize: 11, fontWeight: 700,
                letterSpacing: '0.1em', cursor: 'pointer', whiteSpace: 'nowrap',
                opacity: subscribeStatus === 'loading' || subscribeStatus === 'success' ? 0.7 : 1,
              }}>
                {subscribeStatus === 'success' ? '✓' : subscribeStatus === 'loading' ? '...' : 'Join'}
              </button>
            </form>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer id="footer" style={{ background: G.surface, borderTop: `1px solid ${G.glassBorder}`, padding: isMobile ? '40px 20px 32px' : '52px 56px 36px' }}>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: 24 }}>
            <div>
              <p style={{ fontFamily: serif, fontSize: 18, letterSpacing: '0.25em', textTransform: 'uppercase', color: brand, marginBottom: 4 }}>{theme.companyName}</p>
              {theme.city && <p style={{ fontSize: 11, color: G.textDim, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{theme.city}</p>}
            </div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {showProducts && <a href="#products" style={{ fontSize: 11, color: G.textMuted, textDecoration: 'none', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Shop</a>}
              {showServices && <a href="#services" style={{ fontSize: 11, color: G.textMuted, textDecoration: 'none', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Services</a>}
              <button type="button" onClick={() => setCustomOrderOpen(true)} style={{ fontSize: 11, color: G.textMuted, background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Custom Order</button>
            </div>
          </div>
          <p style={{ fontSize: 10, color: G.textDim, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 32 }}>
            &copy; {new Date().getFullYear()} {theme.companyName}. All rights reserved.
          </p>
        </footer>

      </main>

      {/* ── Modals ── */}
      <ProductQuickView product={quickViewProduct} onClose={closeQuickView} onAddToCart={(p, v) => { addToCart(p, v); closeQuickView(); }} currency={theme.currency} paymentsEnabled={theme.paymentsEnabled} />
      {showProducts && <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} items={cart} onUpdateQuantity={updateCartQuantity} onRemove={removeFromCart} onCheckout={openCheckout} />}
      <CheckoutModal isOpen={checkoutOpen} onClose={closeCheckout} items={cart} status={orderStatus} error={orderError} orderNumber={orderNumber} clientSecret={orderClientSecret} amountCents={orderAmountCents} stripeAccountId={theme.stripeAccountId} currency={theme.currency} onSubmit={submitOrder} onPaymentSuccess={confirmOrderPayment} onPaymentCancel={cancelOrderPayment} />
      <BookingModal isOpen={bookingOpen} onClose={closeBooking} service={bookingService} selectedDate={selectedDate} selectedSlot={selectedSlot} availableSlots={availableSlots} onSelectDate={selectBookingDate} onSelectSlot={selectBookingSlot} onConfirm={confirmBooking} />
      <BookingStatusOverlay status={bookingStatus} error={bookingError} clientSecret={bookingClientSecret} amountCents={bookingAmountCents} stripeAccountId={theme.stripeAccountId} currency={theme.currency} onClose={closeBooking} onDismiss={dismissBookingStatus} onPaymentSuccess={confirmBookingPayment} onPaymentCancel={cancelBookingPayment} />
      <CustomOrderModal isOpen={customOrderOpen} onClose={() => setCustomOrderOpen(false)} companyName={theme.companyName} status={customOrderStatus} onSubmit={submitCustomOrder} />
    </div>
  );
}
