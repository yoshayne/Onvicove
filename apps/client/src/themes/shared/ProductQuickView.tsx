import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react';
import type { ProductData, ProductVariantData } from '../types';
import { formatPrice } from '../types';

interface ProductQuickViewProps {
  product: ProductData | null;
  onClose: () => void;
  onAddToCart: (product: ProductData, variant?: ProductVariantData) => void;
  currency?: string;
  paymentsEnabled?: boolean;
}

export default function ProductQuickView({
  product,
  onClose,
  onAddToCart,
  currency,
  paymentsEnabled,
}: ProductQuickViewProps) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariantData | null>(null);
  const [imageIndex, setImageIndex] = useState(0);

  if (!product) return null;

  const images = product.imageUrls ?? [];
  const hasImages = images.length > 0;

  const variants = product.variants ?? [];
  const colorVariants = variants.filter((v) => v.option_type === 'color');
  const sizeVariants = variants.filter((v) => v.option_type === 'size');
  const customVariants = variants.filter((v) => v.option_type === 'custom');
  const hasVariants = variants.length > 0;

  const displayPrice = selectedVariant?.price_cents ?? product.priceCents;

  function handleAddToCart() {
    if (hasVariants && !selectedVariant) return;
    // product is guaranteed non-null here (early return above handles null)
    onAddToCart(product!, selectedVariant ?? undefined);
    onClose();
  }

  const canAdd = paymentsEnabled && (!hasVariants || !!selectedVariant);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white text-gray-900 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-sm shadow-2xl flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image pane */}
        <div className="md:w-1/2 bg-gray-50 relative aspect-square md:aspect-auto shrink-0">
          {hasImages ? (
            <>
              <img
                src={images[imageIndex]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous image"
                    onClick={() => setImageIndex((i) => (i - 1 + images.length) % images.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-1.5 rounded-full shadow"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label="Next image"
                    onClick={() => setImageIndex((i) => (i + 1) % images.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-1.5 rounded-full shadow"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                    {images.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        aria-label={`Image ${idx + 1}`}
                        onClick={() => setImageIndex(idx)}
                        className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === imageIndex ? 'bg-gray-900' : 'bg-gray-400'}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center min-h-[200px]">
              <ShoppingCart size={48} className="text-gray-300" />
            </div>
          )}

          {/* Sale badge */}
          {product.compareAtPriceCents && (
            <div className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-sm">
              Sale
            </div>
          )}
        </div>

        {/* Details pane */}
        <div className="flex-1 p-6 flex flex-col gap-4 min-w-0">
          {/* Close */}
          <div className="flex items-start justify-between gap-2">
            <div>
              {product.category && (
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">{product.category}</p>
              )}
              <h2 className="text-xl font-bold leading-tight">{product.name}</h2>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="shrink-0 p-1.5 text-gray-400 hover:text-gray-900 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold" style={{ color: 'var(--brand-color, #111)' }}>
              {formatPrice(displayPrice, currency)}
            </span>
            {product.compareAtPriceCents && (
              <span className="text-sm text-gray-400 line-through">
                {formatPrice(product.compareAtPriceCents, currency)}
              </span>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <p className="text-sm text-gray-500 leading-relaxed">{product.description}</p>
          )}

          {/* Color variants */}
          {colorVariants.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">
                Color
                {selectedVariant && colorVariants.some(v => v.id === selectedVariant.id) && (
                  <span className="ml-2 normal-case tracking-normal font-normal text-gray-700">
                    — {selectedVariant.option_name ?? selectedVariant.name}
                  </span>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {colorVariants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    aria-label={v.option_name ?? v.name}
                    title={v.option_name ?? v.name}
                    onClick={() => setSelectedVariant(v.id === selectedVariant?.id ? null : v)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      selectedVariant?.id === v.id
                        ? 'border-gray-900 scale-110 shadow-md'
                        : 'border-transparent hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: v.color_hex ?? '#ccc' }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Size variants */}
          {sizeVariants.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">
                Size
                {selectedVariant && sizeVariants.some(v => v.id === selectedVariant.id) && (
                  <span className="ml-2 normal-case tracking-normal font-normal text-gray-700">
                    — {selectedVariant.option_name ?? selectedVariant.name}
                  </span>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {sizeVariants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVariant(v.id === selectedVariant?.id ? null : v)}
                    className={`px-3 py-1.5 text-xs font-semibold border transition-all ${
                      selectedVariant?.id === v.id
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-300 text-gray-700 hover:border-gray-900'
                    } ${v.stock_quantity === 0 ? 'opacity-40 cursor-not-allowed line-through' : ''}`}
                    disabled={v.stock_quantity === 0}
                  >
                    {v.option_name ?? v.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom variants */}
          {customVariants.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Options</p>
              <div className="flex flex-wrap gap-2">
                {customVariants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVariant(v.id === selectedVariant?.id ? null : v)}
                    className={`px-3 py-1.5 text-xs font-semibold border transition-all ${
                      selectedVariant?.id === v.id
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-300 text-gray-700 hover:border-gray-900'
                    }`}
                  >
                    {v.option_name ?? v.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Variant prompt */}
          {hasVariants && !selectedVariant && (
            <p className="text-xs text-amber-600 font-medium">Please select an option above</p>
          )}

          {/* Stock */}
          {product.stockQuantity !== undefined && product.stockQuantity <= 5 && product.stockQuantity > 0 && (
            <p className="text-xs text-orange-600 font-medium">Only {product.stockQuantity} left in stock</p>
          )}

          {/* CTA */}
          <div className="mt-auto pt-2">
            {!paymentsEnabled ? (
              <button
                type="button"
                disabled
                className="w-full py-3.5 text-sm font-bold uppercase tracking-widest bg-gray-100 text-gray-400 cursor-not-allowed"
              >
                Coming Soon
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!canAdd}
                className="w-full py-3.5 text-sm font-bold uppercase tracking-widest transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: canAdd ? 'var(--brand-color, #111)' : undefined,
                  color: canAdd ? 'white' : undefined,
                  border: canAdd ? 'none' : '1px solid #d1d5db',
                }}
              >
                {canAdd ? 'Add to Cart' : hasVariants ? 'Select an Option' : 'Add to Cart'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
