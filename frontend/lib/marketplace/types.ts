/**
 * Shared TypeScript types for the marketplace.
 * Mirrors the DRF serializer shapes — keep these in sync with the backend.
 */

export interface Vendor {
  id: number;
  slug: string;
  name: string;
  city: string;
  state?: string;
  avg_rating: string;
  review_count?: number;
  year_established?: number | null;
  logo_url?: string | null;
  description?: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon_url: string | null;
  banner_url: string | null;
  sort_order: number;
  product_count?: number;
}

export interface ProductImage {
  id: number;
  url: string;
  alt_text: string;
  sort_order: number;
  is_cover: boolean;
}

export interface ProductVariant {
  id: number;
  name: string;
  sku: string;
  price_override: string | null;
  effective_price: string;
  stock_quantity: number;
  is_active: boolean;
  attributes: Record<string, string>;
}

export interface ProductListItem {
  id: number;
  slug: string;
  name: string;
  short_description: string;
  category: string;
  price: string;
  compare_at_price: string | null;
  currency: string;
  discount_percent: number;
  cover_image: string | null;
  vendor: Pick<Vendor, "id" | "slug" | "name" | "city" | "avg_rating">;
  avg_rating: string;
  review_count: number;
  is_in_stock: boolean;
  is_featured: boolean;
}

export interface ProductDetail extends Omit<ProductListItem, "category" | "cover_image"> {
  category: Category;
  description: string;
  product_type: string;
  sku: string;
  stock_quantity: number;
  allow_backorder: boolean;
  is_customizable: boolean;
  is_on_sale: boolean;
  view_count: number;
  weight_grams: number | null;
  dimensions_cm: string;
  images: ProductImage[];
  variants: ProductVariant[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Banner {
  id: number;
  title: string;
  placement: string;
  desktop_url: string | null;
  mobile_url: string | null;
  cta_label: string;
  cta_url: string;
  open_in_new_tab: boolean;
  priority: number;
  is_live: boolean;
}

export interface MarketplaceSummary {
  totals: { products: number; vendors: number; categories: number };
  featured_products: ProductListItem[];
  featured_vendors: Array<{
    id: number; slug: string; business_name: string; tagline: string;
    city: string; state?: string;
    is_verified: boolean; is_featured: boolean;
    avg_rating: string; review_count: number; total_products: number;
    logo_url: string | null;
  }>;
  categories: Category[];
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
