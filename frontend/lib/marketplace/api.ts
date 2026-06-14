/**
 * Marketplace API client — thin fetch wrapper.
 * All read calls are public (no auth required).
 */
import type {
  Banner, Category, MarketplaceSummary, Paginated,
  ProductDetail, ProductListItem,
} from "./types";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const BASE = `${API}/api/marketplace`;

async function get<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Accept": "application/json", ...(init?.headers || {}) },
    // ISR-style — revalidate on the server every 60s
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    throw new Error(`API ${res.status} on ${path}`);
  }
  return res.json();
}

export const marketplaceApi = {
  // Summary for home page
  summary: () => get<MarketplaceSummary>("/summary/"),

  // Categories
  listCategories: () => get<Paginated<Category>>("/categories/"),
  getCategory: (slug: string) => get<Category>(`/categories/${slug}/`),

  // Products
  listProducts: (params: Record<string, string | number | boolean> = {}) => {
    const q = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ).toString();
    return get<Paginated<ProductListItem>>(`/products/${q ? `?${q}` : ""}`);
  },
  getProduct: (slug: string) => get<ProductDetail>(`/products/${slug}/`),
  getFeaturedProducts: () => get<ProductListItem[]>("/products/featured/"),
  getRelatedProducts: (slug: string) => get<ProductListItem[]>(`/products/related/?slug=${slug}`),

  // Vendors
  listVendors: (params: Record<string, string> = {}) => {
    const q = new URLSearchParams(params).toString();
    return get<Paginated<any>>(`/vendors/${q ? `?${q}` : ""}`);
  },
  getVendor: (slug: string) => get<any>(`/vendors/${slug}/`),

  // Banners
  getBanners: (placement: string) =>
    get<Paginated<Banner>>(`/banners/?placement=${placement}`),
};
