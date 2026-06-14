import Link from "next/link";
import { Star, ShoppingBag, MapPin } from "lucide-react";
import type { ProductListItem } from "@/lib/marketplace/types";

/**
 * Compact product card for grid listings. Server-rendered (no client state).
 */
export default function ProductCard({ product }: { product: ProductListItem }) {
  const hasDiscount = product.discount_percent > 0;
  const formattedPrice = (v: string) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: product.currency || "INR",
      maximumFractionDigits: 0,
    }).format(Number(v));

  return (
    <Link
      href={`/marketplace/products/${product.slug}`}
      className="group block bg-white rounded-2xl overflow-hidden border border-stone-200 hover:shadow-md transition"
    >
      {/* Image */}
      <div className="relative aspect-square bg-stone-100 overflow-hidden">
        {product.cover_image ? (
          <img
            src={product.cover_image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-stone-300">
            <ShoppingBag className="w-12 h-12" />
          </div>
        )}
        {hasDiscount && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-rose-600 text-white text-xs font-medium">
            -{product.discount_percent}%
          </span>
        )}
        {!product.is_in_stock && (
          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-stone-900/80 text-white text-xs">
            Out of stock
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-3">
        <h3 className="text-sm font-medium text-stone-900 line-clamp-2 leading-snug">
          {product.name}
        </h3>

        <div className="mt-1 flex items-center gap-1 text-xs text-stone-500">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{product.vendor.name} · {product.vendor.city}</span>
        </div>

        {/* Rating */}
        {product.review_count > 0 && (
          <div className="mt-1 flex items-center gap-1 text-xs">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-stone-700">{Number(product.avg_rating).toFixed(1)}</span>
            <span className="text-stone-400">({product.review_count})</span>
          </div>
        )}

        {/* Price */}
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-base font-semibold text-stone-900">
            {formattedPrice(product.price)}
          </span>
          {hasDiscount && product.compare_at_price && (
            <span className="text-xs text-stone-400 line-through">
              {formattedPrice(product.compare_at_price)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
