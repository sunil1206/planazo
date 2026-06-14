import { notFound } from "next/navigation";
import Link from "next/link";
import { Star, MapPin, ShieldCheck } from "lucide-react";
import ProductGrid from "@/components/marketplace/ProductGrid";
import { marketplaceApi } from "@/lib/marketplace/api";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function VendorDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const vendor = await marketplaceApi.getVendor(slug).catch(() => null);
  if (!vendor) return notFound();

  const products = await marketplaceApi.listProducts({ vendor: slug }).catch(() => null);

  return (
    <div>
      {/* Cover header */}
      <div className="relative h-44 sm:h-60 bg-stone-200 overflow-hidden">
        {vendor.cover_url ? (
          <img src={vendor.cover_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-stone-200 to-stone-300" />
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-12">
        {/* Vendor card overlap */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-stone-100 overflow-hidden border-4 border-white -mt-12 sm:mt-0">
            {vendor.logo_url ? (
              <img src={vendor.logo_url} alt={vendor.business_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl text-stone-400 font-semibold">
                {vendor.business_name[0]}
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-stone-900">{vendor.business_name}</h1>
              {vendor.is_verified && (
                <ShieldCheck className="w-5 h-5 text-emerald-600" aria-label="Verified" />
              )}
            </div>
            {vendor.tagline && <p className="text-sm text-stone-600">{vendor.tagline}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-stone-500">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {vendor.city}{vendor.state ? `, ${vendor.state}` : ""}
              </span>
              {vendor.review_count > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  {Number(vendor.avg_rating).toFixed(1)} ({vendor.review_count} reviews)
                </span>
              )}
              {vendor.year_established && (
                <span>Est. {vendor.year_established}</span>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {vendor.description && (
          <div className="mt-6 prose prose-stone max-w-none">
            <p className="text-stone-700 whitespace-pre-line">{vendor.description}</p>
          </div>
        )}

        {/* Products */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold text-stone-900 mb-4">Products from this vendor</h2>
          {products ? <ProductGrid products={products.results} /> : (
            <p className="text-stone-500">Loading products...</p>
          )}
        </section>
      </div>
    </div>
  );
}
