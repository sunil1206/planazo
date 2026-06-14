import BannerCarousel from "@/components/marketplace/BannerCarousel";
import CategoryGrid from "@/components/marketplace/CategoryGrid";
import ProductGrid from "@/components/marketplace/ProductGrid";
import { marketplaceApi } from "@/lib/marketplace/api";
import Link from "next/link";

// ISR — rebuild the home every 60 seconds in the background
export const revalidate = 60;

export default async function MarketplaceHomePage() {
  const [summary, banners] = await Promise.all([
    marketplaceApi.summary().catch(() => null),
    marketplaceApi.getBanners("HOME_HERO").catch(() => null),
  ]);

  if (!summary) {
    return (
      <div className="max-w-5xl mx-auto py-20 text-center text-stone-500">
        <p>Marketplace temporarily unavailable. Please refresh in a moment.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-12">

      {/* Hero banner */}
      {banners?.results && banners.results.length > 0 && (
        <section>
          <BannerCarousel banners={banners.results} />
        </section>
      )}

      {/* Categories */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <h2 className="text-xl sm:text-2xl font-semibold text-stone-900">Shop by category</h2>
          <Link href="/marketplace/products" className="text-sm text-stone-500 hover:text-stone-900">
            View all
          </Link>
        </div>
        <CategoryGrid categories={summary.categories} />
      </section>

      {/* Featured products */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <h2 className="text-xl sm:text-2xl font-semibold text-stone-900">Featured products</h2>
          <Link
            href="/marketplace/products?featured=true"
            className="text-sm text-stone-500 hover:text-stone-900"
          >
            See more
          </Link>
        </div>
        <ProductGrid products={summary.featured_products} />
      </section>

      {/* Featured vendors */}
      {summary.featured_vendors.length > 0 && (
        <section>
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-xl sm:text-2xl font-semibold text-stone-900">Featured vendors</h2>
            <Link href="/marketplace/vendors" className="text-sm text-stone-500 hover:text-stone-900">
              All vendors
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {summary.featured_vendors.map((v) => (
              <Link
                key={v.id}
                href={`/marketplace/vendors/${v.slug}`}
                className="group p-4 bg-white rounded-2xl border border-stone-200 hover:shadow-md transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-stone-100 overflow-hidden flex items-center justify-center">
                    {v.logo_url ? (
                      <img src={v.logo_url} alt={v.business_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-stone-400 font-semibold">{v.business_name[0]}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-900 truncate">{v.business_name}</p>
                    <p className="text-xs text-stone-500 truncate">{v.city}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs text-stone-500">
                  <span>{Number(v.avg_rating).toFixed(1)} {"\u2605"}</span>
                  <span>{v.total_products} products</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Footer stats */}
      <section className="py-8 border-t border-stone-200 grid grid-cols-3 text-center">
        <div>
          <div className="text-2xl font-semibold text-stone-900">{summary.totals.vendors}</div>
          <div className="text-xs uppercase tracking-wider text-stone-500 mt-1">Vendors</div>
        </div>
        <div>
          <div className="text-2xl font-semibold text-stone-900">{summary.totals.products}</div>
          <div className="text-xs uppercase tracking-wider text-stone-500 mt-1">Products</div>
        </div>
        <div>
          <div className="text-2xl font-semibold text-stone-900">{summary.totals.categories}</div>
          <div className="text-xs uppercase tracking-wider text-stone-500 mt-1">Categories</div>
        </div>
      </section>
    </div>
  );
}
