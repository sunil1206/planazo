import { notFound } from "next/navigation";
import Link from "next/link";
import { Star, MapPin, Check, X, Sparkles } from "lucide-react";
import ProductGrid from "@/components/marketplace/ProductGrid";
import { marketplaceApi } from "@/lib/marketplace/api";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  try {
    const p = await marketplaceApi.getProduct(slug);
    return {
      title: `${p.name} · Planazo Marketplace`,
      description: p.short_description || p.description.slice(0, 160),
    };
  } catch {
    return { title: "Product · Planazo Marketplace" };
  }
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await marketplaceApi.getProduct(slug).catch(() => null);
  if (!product) return notFound();

  const related = await marketplaceApi.getRelatedProducts(slug).catch(() => []);

  const formattedPrice = (v: string) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: product.currency || "INR",
      maximumFractionDigits: 0,
    }).format(Number(v));

  const cover = product.images.find((i) => i.is_cover) || product.images[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Breadcrumb */}
      <nav className="text-xs text-stone-500 mb-4">
        <Link href="/marketplace" className="hover:text-stone-900">Marketplace</Link>
        {" / "}
        <Link href={`/marketplace/products?category=${product.category.slug}`} className="hover:text-stone-900">
          {product.category.name}
        </Link>
        {" / "}
        <span className="text-stone-700">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Gallery */}
        <div>
          <div className="aspect-square bg-stone-100 rounded-2xl overflow-hidden">
            {cover && <img src={cover.url} alt={cover.alt_text || product.name} className="w-full h-full object-cover" />}
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {product.images.slice(0, 5).map((img) => (
                <div key={img.id} className="aspect-square bg-stone-100 rounded-lg overflow-hidden cursor-pointer">
                  <img src={img.url} alt={img.alt_text} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-stone-900">{product.name}</h1>

          {/* Vendor + rating */}
          <div className="mt-2 flex items-center gap-4 text-sm">
            <Link href={`/marketplace/vendors/${product.vendor.slug}`} className="flex items-center gap-1 text-stone-600 hover:text-stone-900">
              <MapPin className="w-4 h-4" />
              {product.vendor.name} · {product.vendor.city}
            </Link>
            {product.review_count > 0 && (
              <span className="flex items-center gap-1 text-stone-700">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                {Number(product.avg_rating).toFixed(1)}
                <span className="text-stone-400">({product.review_count})</span>
              </span>
            )}
          </div>

          {/* Price */}
          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-3xl font-semibold text-stone-900">{formattedPrice(product.price)}</span>
            {product.is_on_sale && product.compare_at_price && (
              <>
                <span className="text-lg text-stone-400 line-through">{formattedPrice(product.compare_at_price)}</span>
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-medium">
                  Save {product.discount_percent}%
                </span>
              </>
            )}
          </div>

          {/* Stock */}
          <div className="mt-3 flex items-center gap-2 text-sm">
            {product.is_in_stock ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">In stock</span>
              </>
            ) : (
              <>
                <X className="w-4 h-4 text-rose-600" />
                <span className="text-rose-700">Out of stock</span>
              </>
            )}
          </div>

          {/* Customizable badge */}
          {product.is_customizable && (
            <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 text-sm">
              <Sparkles className="w-4 h-4" />
              Personalize this item
            </div>
          )}

          {/* Short description */}
          {product.short_description && (
            <p className="mt-6 text-stone-700">{product.short_description}</p>
          )}

          {/* CTA */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button
              disabled={!product.is_in_stock}
              className="flex-1 px-6 py-3 rounded-full bg-stone-900 text-white font-medium hover:bg-stone-800 transition disabled:bg-stone-300 disabled:cursor-not-allowed"
            >
              Add to cart
            </button>
            <button className="px-6 py-3 rounded-full border border-stone-300 text-stone-900 font-medium hover:bg-stone-50 transition">
              Save
            </button>
          </div>

          {/* Description */}
          {product.description && (
            <div className="mt-8 pt-8 border-t border-stone-200">
              <h2 className="text-lg font-semibold text-stone-900 mb-3">About this product</h2>
              <p className="text-stone-700 whitespace-pre-line leading-relaxed">{product.description}</p>
            </div>
          )}

          {/* Specs */}
          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {product.sku && <><dt className="text-stone-500">SKU</dt><dd className="text-stone-900">{product.sku}</dd></>}
            {product.weight_grams && <><dt className="text-stone-500">Weight</dt><dd className="text-stone-900">{product.weight_grams} g</dd></>}
            {product.dimensions_cm && <><dt className="text-stone-500">Dimensions</dt><dd className="text-stone-900">{product.dimensions_cm}</dd></>}
          </dl>
        </div>
      </div>

      {/* Related */}
      {related && related.length > 0 && (
        <section className="mt-16 pt-8 border-t border-stone-200">
          <h2 className="text-xl font-semibold text-stone-900 mb-4">You may also like</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
