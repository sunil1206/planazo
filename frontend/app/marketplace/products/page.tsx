import ProductGrid from "@/components/marketplace/ProductGrid";
import { marketplaceApi } from "@/lib/marketplace/api";
import Link from "next/link";

export const revalidate = 60;

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filterParams: Record<string, string> = {};

  if (params.category) filterParams.category = params.category;
  if (params.min_price) filterParams.min_price = params.min_price;
  if (params.max_price) filterParams.max_price = params.max_price;
  if (params.search) filterParams.search = params.search;
  if (params.featured) filterParams.featured = params.featured;
  if (params.customizable) filterParams.customizable = params.customizable;
  if (params.ordering) filterParams.ordering = params.ordering;

  const data = await marketplaceApi.listProducts(filterParams).catch(() => null);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold text-stone-900">
          {params.category ? `${params.category}` : "All products"}
        </h1>
        {data && (
          <p className="text-sm text-stone-500 mt-1">
            {data.count} {data.count === 1 ? "product" : "products"}
          </p>
        )}
      </header>

      {/* Quick filter chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        <FilterChip href="/marketplace/products" label="All" active={!params.featured && !params.customizable} />
        <FilterChip href="/marketplace/products?featured=true" label="Featured" active={params.featured === "true"} />
        <FilterChip href="/marketplace/products?customizable=true" label="Customizable" active={params.customizable === "true"} />
        <FilterChip href="/marketplace/products?ordering=-avg_rating" label="Top rated" active={params.ordering === "-avg_rating"} />
        <FilterChip href="/marketplace/products?ordering=price" label="Price: low to high" active={params.ordering === "price"} />
        <FilterChip href="/marketplace/products?ordering=-price" label="Price: high to low" active={params.ordering === "-price"} />
      </div>

      {data ? <ProductGrid products={data.results} /> : (
        <div className="text-center py-20 text-stone-500">
          <p>Unable to load products. Refresh to retry.</p>
        </div>
      )}
    </div>
  );
}

function FilterChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-full text-sm border transition ${
        active
          ? "bg-stone-900 text-white border-stone-900"
          : "bg-white text-stone-700 border-stone-200 hover:border-stone-300"
      }`}
    >
      {label}
    </Link>
  );
}
