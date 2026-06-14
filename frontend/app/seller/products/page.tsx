"use client";
/**
 * /seller/products — Amazon/Flipkart-style seller product management
 * Supports: name, description, price, MRP (compare_price), stock, SKU,
 *           category, COD, availability, featured, variants, short_desc, tags
 */
import { useState, useEffect, useRef } from "react";
import { sellerApi, giftApi } from "@/lib/api";
import { api } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Variant { id?: number; name: string; price: string; stock: string; sku: string; }
interface Product {
  id: number; name: string; short_desc: string; description: string;
  price: string; compare_price: string; stock: number; sku: string;
  category: number | null; category_name: string;
  is_featured: boolean; is_available: boolean; is_cod: boolean;
  tags: string; image: string | null; avg_rating: number; review_count: number;
  discount_pct: number; variants?: Variant[];
}
interface FormState {
  name: string; short_desc: string; description: string;
  price: string; compare_price: string; stock: string; sku: string;
  category: string; is_featured: boolean; is_available: boolean; is_cod: boolean;
  tags: string;
}

const EMPTY_FORM: FormState = {
  name: "", short_desc: "", description: "", price: "", compare_price: "",
  stock: "0", sku: "", category: "", is_featured: false, is_available: true,
  is_cod: true, tags: "",
};
const EMPTY_VARIANT: Variant = { name: "", price: "", stock: "0", sku: "" };

const inp = "w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-purple-400 bg-white transition";
const label = "text-xs font-semibold text-gray-500 mb-1 block uppercase tracking-wide";

// ── Stock badge ────────────────────────────────────────────────────────────────
function StockBadge({ stock }: { stock: number }) {
  if (stock === 0)   return <span className="px-2 py-0.5 rounded-full text-xs bg-red-50 text-red-500 font-medium">Out of Stock</span>;
  if (stock <= 5)    return <span className="px-2 py-0.5 rounded-full text-xs bg-orange-50 text-orange-500 font-medium">Low ({stock})</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs bg-green-50 text-green-600 font-medium">{stock} in stock</span>;
}

// ── Rating stars ───────────────────────────────────────────────────────────────
function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-xs text-amber-400">
      {"★".repeat(Math.round(rating))}{"☆".repeat(5 - Math.round(rating))}
    </span>
  );
}

// ── Variant row ────────────────────────────────────────────────────────────────
function VariantRow({ v, idx, onChange, onRemove }: {
  v: Variant; idx: number;
  onChange: (idx: number, field: keyof Variant, val: string) => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <div className="grid grid-cols-12 gap-2 items-center p-2 bg-gray-50 rounded-xl border border-gray-100">
      <div className="col-span-4">
        <input placeholder="Variant name (e.g. Small)" value={v.name}
          onChange={e => onChange(idx, "name", e.target.value)}
          className="w-full px-2.5 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:border-purple-400" />
      </div>
      <div className="col-span-3">
        <input type="number" min="0" placeholder="Price ₹" value={v.price}
          onChange={e => onChange(idx, "price", e.target.value)}
          className="w-full px-2.5 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:border-purple-400" />
      </div>
      <div className="col-span-2">
        <input type="number" min="0" placeholder="Stock" value={v.stock}
          onChange={e => onChange(idx, "stock", e.target.value)}
          className="w-full px-2.5 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:border-purple-400" />
      </div>
      <div className="col-span-2">
        <input placeholder="SKU" value={v.sku}
          onChange={e => onChange(idx, "sku", e.target.value)}
          className="w-full px-2.5 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:border-purple-400" />
      </div>
      <div className="col-span-1 flex justify-center">
        <button type="button" onClick={() => onRemove(idx)} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function SellerProductsPage() {
  const [products,   setProducts]   = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [editProd,   setEditProd]   = useState<Product | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [search,     setSearch]     = useState("");
  const [stockFilter, setStockFilter] = useState<"all"|"low"|"out">("all");
  const [activeTab,  setActiveTab]  = useState<"details"|"variants"|"images">("details");

  const [form,     setForm]     = useState<FormState>(EMPTY_FORM);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([
        sellerApi.listProducts().then((d: any) => Array.isArray(d) ? d : d.results || []),
        giftApi.categories().then((d: any) => Array.isArray(d) ? d : d.results || []),
      ]);
      setProducts(p);
      setCategories(c);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditProd(null);
    setForm(EMPTY_FORM);
    setVariants([]);
    setImageFile(null);
    setImagePreview(null);
    setActiveTab("details");
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditProd(p);
    setForm({
      name: p.name, short_desc: p.short_desc || "", description: p.description,
      price: p.price, compare_price: p.compare_price || "",
      stock: String(p.stock ?? 0), sku: p.sku || "",
      category: p.category ? String(p.category) : "",
      is_featured: p.is_featured, is_available: p.is_available, is_cod: p.is_cod ?? true,
      tags: Array.isArray(p.tags) ? p.tags.join(", ") : (p.tags || ""),
    });
    setVariants(p.variants?.map(v => ({
      id: v.id, name: v.name, price: String(v.price), stock: String(v.stock), sku: v.sku || "",
    })) || []);
    setImageFile(null);
    setImagePreview(null);
    setActiveTab("details");
    setShowForm(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {
        ...form,
        price: parseFloat(form.price),
        compare_price: form.compare_price ? parseFloat(form.compare_price) : null,
        stock: parseInt(form.stock) || 0,
        category: form.category ? parseInt(form.category) : null,
        tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        variants: variants.map(v => ({
          ...(v.id ? { id: v.id } : {}),
          name: v.name,
          price: v.price ? parseFloat(v.price) : null,
          stock: parseInt(v.stock) || 0,
          sku: v.sku,
        })),
      };
      let savedId: number;
      if (editProd) {
        await sellerApi.updateProduct(editProd.id, payload);
        savedId = editProd.id;
      } else {
        const created: any = await sellerApi.createProduct(payload);
        savedId = created.id;
      }
      // Upload image separately if one was selected
      if (imageFile && savedId) {
        const fd = new FormData();
        fd.append("image", imageFile);
        await sellerApi.uploadProductImage(savedId, fd);
      }
      setShowForm(false);
      load();
    } catch (err: any) {
      alert("Failed to save product. Please check the fields and try again.");
    } finally { setSaving(false); }
  };

  const del = async (id: number) => {
    if (!confirm("Delete this product permanently?")) return;
    await sellerApi.deleteProduct(id);
    load();
  };

  const toggleAvailable = async (p: Product) => {
    await sellerApi.updateProduct(p.id, { is_available: !p.is_available });
    load();
  };

  // Variant helpers
  const addVariant = () => setVariants(v => [...v, { ...EMPTY_VARIANT }]);
  const updateVariant = (idx: number, field: keyof Variant, val: string) => {
    setVariants(vs => vs.map((v, i) => i === idx ? { ...v, [field]: val } : v));
  };
  const removeVariant = (idx: number) => setVariants(vs => vs.filter((_, i) => i !== idx));

  // Image pick
  const pickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  };

  // Filter
  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchStock  = stockFilter === "all" ? true
      : stockFilter === "out" ? p.stock === 0
      : stockFilter === "low" ? p.stock > 0 && p.stock <= 5
      : true;
    return matchSearch && matchStock;
  });

  // Stats
  const totalStock    = products.reduce((a, p) => a + (p.stock || 0), 0);
  const outOfStock    = products.filter(p => p.stock === 0).length;
  const lowStock      = products.filter(p => p.stock > 0 && p.stock <= 5).length;
  const avgRating     = products.length ? (products.reduce((a, p) => a + (p.avg_rating || 0), 0) / products.length).toFixed(1) : "—";

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🎁 My Products</h1>
          <p className="text-sm text-gray-400 mt-0.5">{products.length} products · {totalStock} units total</p>
        </div>
        <button onClick={openNew}
          className="px-5 py-2.5 rounded-xl text-white font-semibold text-sm shadow-md hover:opacity-90 transition"
          style={{ background: "linear-gradient(135deg, #9B59B6, #C9952A)" }}>
          + Add Product
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Products",  value: products.length, color: "#6B7280" },
          { label: "Total Stock",     value: totalStock,      color: "#9B59B6" },
          { label: "Low Stock",       value: lowStock,        color: "#F59E0B" },
          { label: "Out of Stock",    value: outOfStock,      color: "#EF4444" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl p-4 border border-gray-100 text-center shadow-sm">
            <div className="text-2xl font-bold" style={{ color }}>{value}</div>
            <div className="text-xs text-gray-400 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap items-center">
        <input
          placeholder="Search products…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-48 px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-purple-400 bg-white"
        />
        {(["all", "low", "out"] as const).map(f => (
          <button key={f} onClick={() => setStockFilter(f)}
            className={`px-4 py-2 rounded-full text-xs font-medium transition ${
              stockFilter === f ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
            {f === "all" ? "All" : f === "low" ? "⚠️ Low Stock" : "❌ Out of Stock"}
          </button>
        ))}
      </div>

      {/* Product grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
              <div className="h-44 bg-gray-200" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-2/3" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🎁</div>
          <p className="text-gray-400 mb-4">No products found.</p>
          <button onClick={openNew} className="px-6 py-3 rounded-xl text-white font-medium" style={{ background: "#9B59B6" }}>
            Add your first product
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(p => {
            const imgSrc = p.image ? (p.image.startsWith("http") ? p.image : `${API}${p.image}`) : null;
            const discountPct = p.discount_pct || (
              p.compare_price && parseFloat(p.compare_price) > parseFloat(p.price)
                ? Math.round((1 - parseFloat(p.price) / parseFloat(p.compare_price)) * 100)
                : 0
            );
            return (
              <div key={p.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col">
                {/* Product image */}
                <div className="relative">
                  {imgSrc ? (
                    <img src={imgSrc} alt={p.name} className="w-full h-44 object-cover" />
                  ) : (
                    <div className="w-full h-44 flex items-center justify-center text-5xl" style={{ background: "#F5F0FF" }}>🎁</div>
                  )}
                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {discountPct > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white">{discountPct}% OFF</span>
                    )}
                    {p.is_featured && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-amber-400 text-white font-medium">⭐ Featured</span>
                    )}
                  </div>
                  {/* Toggle available */}
                  <button
                    onClick={() => toggleAvailable(p)}
                    className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-sm shadow transition ${
                      p.is_available ? "bg-green-500 text-white" : "bg-gray-300 text-gray-600"
                    }`}
                    title={p.is_available ? "Click to hide from shop" : "Click to show in shop"}>
                    {p.is_available ? "✓" : "✗"}
                  </button>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-gray-800 text-sm line-clamp-1 flex-1">{p.name}</h3>
                    {p.is_cod && <span className="text-xs bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded font-medium whitespace-nowrap">COD</span>}
                  </div>

                  {/* Rating */}
                  {p.review_count > 0 && (
                    <div className="flex items-center gap-1 mb-1">
                      <Stars rating={p.avg_rating} />
                      <span className="text-xs text-gray-400">({p.review_count})</span>
                    </div>
                  )}

                  {/* Pricing */}
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-base font-bold" style={{ color: "#9B59B6" }}>
                      ₹{parseFloat(p.price).toLocaleString("en-IN")}
                    </span>
                    {p.compare_price && parseFloat(p.compare_price) > parseFloat(p.price) && (
                      <span className="text-xs text-gray-400 line-through">₹{parseFloat(p.compare_price).toLocaleString("en-IN")}</span>
                    )}
                  </div>

                  {/* Stock + SKU */}
                  <div className="flex items-center justify-between mb-3">
                    <StockBadge stock={p.stock} />
                    {p.sku && <span className="text-xs text-gray-400 font-mono">SKU: {p.sku}</span>}
                  </div>

                  {/* Category + variants count */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    {p.category_name && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-purple-50 text-purple-500">{p.category_name}</span>
                    )}
                    {p.variants && p.variants.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-500">{p.variants.length} variants</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-auto">
                    <button onClick={() => openEdit(p)}
                      className="flex-1 py-2 rounded-xl text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition">
                      ✏️ Edit
                    </button>
                    <button onClick={() => del(p.id)}
                      className="px-3 py-2 rounded-xl text-xs font-medium bg-red-50 text-red-400 border border-red-100 hover:bg-red-100 transition">
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add / Edit Modal ─────────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" style={{ background: "rgba(0,0,0,0.55)" }}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-2xl flex flex-col" style={{ maxHeight: "94vh" }}>
            {/* Modal header */}
            <div className="px-5 sm:px-7 pt-5 sm:pt-6 pb-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <h2 className="text-base sm:text-lg font-bold text-gray-900">{editProd ? "Edit Product" : "Add New Product"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>

            {/* Tabs */}
            <div className="px-5 sm:px-7 pt-3 pb-0 border-b border-gray-100 flex gap-4 sm:gap-6 flex-shrink-0">
              {(["details", "variants", "images"] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`pb-3 text-xs sm:text-sm font-medium capitalize transition border-b-2 ${
                    activeTab === tab ? "border-purple-500 text-purple-600" : "border-transparent text-gray-400 hover:text-gray-700"
                  }`}>
                  {tab === "details" ? "📋 Details" : tab === "variants" ? "🔀 Variants" : "🖼 Images"}
                </button>
              ))}
            </div>

            {/* Form body */}
            <form onSubmit={save} className="flex-1 overflow-y-auto px-5 sm:px-7 py-5 space-y-4">

              {/* ── DETAILS TAB ── */}
              {activeTab === "details" && (
                <>
                  {/* Name + short desc */}
                  <div>
                    <label className={label}>Product Name *</label>
                    <input required placeholder="e.g. Rose Bouquet – 50 stems" value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inp} />
                  </div>
                  <div>
                    <label className={label}>Short Description (shown in listings)</label>
                    <input placeholder="One-line tagline for the product" value={form.short_desc}
                      onChange={e => setForm(f => ({ ...f, short_desc: e.target.value }))} className={inp} />
                  </div>
                  <div>
                    <label className={label}>Full Description *</label>
                    <textarea required rows={4} placeholder="Detailed product description…" value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inp} />
                  </div>

                  {/* Price + MRP */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={label}>Selling Price (₹) *</label>
                      <input required type="number" min="1" step="0.01" placeholder="999.00" value={form.price}
                        onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className={inp} />
                    </div>
                    <div>
                      <label className={label}>MRP / Compare Price (₹)</label>
                      <input type="number" min="1" step="0.01" placeholder="1299.00 (shows strikethrough)" value={form.compare_price}
                        onChange={e => setForm(f => ({ ...f, compare_price: e.target.value }))} className={inp} />
                    </div>
                  </div>

                  {/* Stock + SKU */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={label}>Stock Quantity</label>
                      <input type="number" min="0" placeholder="0" value={form.stock}
                        onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} className={inp} />
                    </div>
                    <div>
                      <label className={label}>SKU / Item Code</label>
                      <input placeholder="e.g. ROSE-50-RED" value={form.sku}
                        onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} className={inp} />
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    <label className={label}>Category</label>
                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inp + " bg-white"}>
                      <option value="">— Select category —</option>
                      {categories.map((c: any) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
                    </select>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className={label}>Tags (comma-separated)</label>
                    <input placeholder="e.g. roses, wedding, romantic, bouquet" value={form.tags}
                      onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} className={inp} />
                  </div>

                  {/* Toggles */}
                  <div className="flex flex-wrap gap-6 pt-1">
                    {([
                      { key: "is_available", label: "Available in shop" },
                      { key: "is_featured",  label: "Featured product" },
                      { key: "is_cod",       label: "Cash on Delivery (COD)" },
                    ] as { key: keyof FormState; label: string }[]).map(({ key, label: lbl }) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox"
                          checked={Boolean(form[key])}
                          onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                          className="w-4 h-4 accent-purple-600" />
                        <span className="text-sm text-gray-600">{lbl}</span>
                      </label>
                    ))}
                  </div>

                  {/* Discount preview */}
                  {form.price && form.compare_price && parseFloat(form.compare_price) > parseFloat(form.price) && (
                    <div className="p-3 bg-green-50 rounded-xl text-xs text-green-700 font-medium">
                      ✅ Discount: {Math.round((1 - parseFloat(form.price) / parseFloat(form.compare_price)) * 100)}% off — shoppers will see
                      ₹{parseFloat(form.price).toLocaleString("en-IN")} <span className="line-through opacity-60">₹{parseFloat(form.compare_price).toLocaleString("en-IN")}</span>
                    </div>
                  )}
                </>
              )}

              {/* ── VARIANTS TAB ── */}
              {activeTab === "variants" && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">
                    Add variants like sizes, colours, or quantities. Each variant can have its own price and stock.
                  </p>
                  {/* Header */}
                  {variants.length > 0 && (
                    <div className="grid grid-cols-12 gap-2 px-2">
                      {["Name", "Price ₹", "Stock", "SKU", ""].map((h, i) => (
                        <div key={i} className={`text-xs font-semibold text-gray-400 uppercase tracking-wide ${
                          i === 0 ? "col-span-4" : i === 1 ? "col-span-3" : i === 2 ? "col-span-2" : i === 3 ? "col-span-2" : "col-span-1"
                        }`}>{h}</div>
                      ))}
                    </div>
                  )}
                  {variants.map((v, i) => (
                    <VariantRow key={i} v={v} idx={i} onChange={updateVariant} onRemove={removeVariant} />
                  ))}
                  <button type="button" onClick={addVariant}
                    className="w-full py-2.5 rounded-xl border-2 border-dashed border-purple-200 text-xs font-medium text-purple-400 hover:bg-purple-50 transition">
                    + Add Variant
                  </button>
                  {variants.length === 0 && (
                    <p className="text-center py-6 text-gray-300 text-sm">No variants yet. Click above to add one.</p>
                  )}
                </div>
              )}

              {/* ── IMAGES TAB ── */}
              {activeTab === "images" && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500">Upload a primary product image. Additional gallery images can be added after saving.</p>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-purple-300 hover:bg-purple-50 transition">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="max-h-48 rounded-xl object-contain" />
                    ) : editProd?.image ? (
                      <img
                        src={editProd.image.startsWith("http") ? editProd.image : `${API}${editProd.image}`}
                        alt="Current" className="max-h-48 rounded-xl object-contain mb-2" />
                    ) : (
                      <>
                        <div className="text-4xl mb-3">🖼</div>
                        <p className="text-sm text-gray-400">Click to upload image</p>
                        <p className="text-xs text-gray-300 mt-1">PNG, JPG up to 5MB</p>
                      </>
                    )}
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickImage} />
                  </div>
                  {imagePreview && (
                    <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                      className="text-xs text-red-400 hover:text-red-600">× Remove selected image</button>
                  )}
                </div>
              )}

            </form>

            {/* Modal footer */}
            <div className="px-7 py-5 border-t border-gray-100 flex gap-3 flex-shrink-0">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 py-3 rounded-xl text-white font-semibold text-sm shadow transition hover:opacity-90 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #9B59B6, #C9952A)" }}>
                {saving ? "Saving…" : editProd ? "Save Changes" : "Create Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
