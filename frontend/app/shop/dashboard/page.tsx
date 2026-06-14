"use client";
/**
 * /shop/dashboard — Standalone Planazo Gift & Postcard Shop Dashboard
 *
 * Completely separate from the couple's /dashboard.
 * Users can:
 *   - Browse / order from the shop  → link to /shop
 *   - View their marketplace orders
 *   - View & track scheduled deliveries
 *   - Schedule a new gift or postcard (product-based flow)
 *   - Upgrade subscription
 */
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Gift, Mail, Package, Truck, CheckCircle, XCircle,
  Clock, Star, ShoppingBag, Calendar, MapPin, User,
  LogOut, ChevronRight, Search, Plus, ArrowLeft,
  CreditCard, RefreshCw, Home, Settings, Sparkles,
  Filter, Heart,
} from "lucide-react";
import { giftApi } from "@/lib/api";
import toast from "react-hot-toast";

// ── Brand ─────────────────────────────────────────────────────────────────────
const TEAL    = "#0D9488";
const TEAL_DK = "#0F766E";
const GOLD    = "#C9952A";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Product {
  id: number; slug: string; name: string; short_desc: string;
  price: string; compare_price: string | null; image: string | null;
  avg_rating: number | null; review_count: number; discount_pct: number;
  is_featured: boolean; stock: number;
  category_name: string; category_emoji: string; category_icon_url?: string | null;
  seller_name: string;
}

interface Category {
  id: number; name: string; emoji: string; order: number;
}

interface MarketplaceOrder {
  id: number;
  product_name: string;
  product_image_url?: string | null;
  quantity: number;
  unit_price: string;
  total: string;
  status: string;
  status_display: string;
  payment_status: string;
  payment_status_display: string;
  buyer_name: string;
  created_at: string;
  tracking_info?: string;
}

interface ScheduledDelivery {
  id: number;
  delivery_type: "GIFT" | "POSTCARD";
  delivery_type_display: string;
  product_name?: string;
  product_image_url?: string | null;
  occasion: string;
  scheduled_date: string;
  sender_name: string;
  recipient_name: string;
  recipient_city: string;
  recipient_state: string;
  amount: string;
  payment_status: string;
  payment_status_display: string;
  fulfilment_status: string;
  fulfilment_status_display: string;
  tracking_info: string;
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const API = process.env.NEXT_PUBLIC_API_URL || "";

const imgUrl = (src: string | null | undefined) =>
  src ? (src.startsWith("http") ? src : `${API}${src}`) : null;

const fmt = (n: string | number) =>
  `₹${parseFloat(String(n)).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

// ── Status Maps ───────────────────────────────────────────────────────────────
const FULFILMENT_MAP: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  SCHEDULED:   { icon: <Clock size={12} />,       color: "#1D4ED8", bg: "#DBEAFE", label: "Scheduled" },
  IN_PROGRESS: { icon: <Package size={12} />,     color: "#92400E", bg: "#FEF3C7", label: "In Progress" },
  DISPATCHED:  { icon: <Truck size={12} />,       color: "#065F46", bg: "#D1FAE5", label: "Dispatched" },
  DELIVERED:   { icon: <CheckCircle size={12} />, color: "#065F46", bg: "#D1FAE5", label: "Delivered" },
  CANCELLED:   { icon: <XCircle size={12} />,     color: "#991B1B", bg: "#FEE2E2", label: "Cancelled" },
};

const PAY_MAP: Record<string, { color: string; bg: string }> = {
  PENDING:  { color: "#92400E", bg: "#FEF3C7" },
  PAID:     { color: "#065F46", bg: "#D1FAE5" },
  REFUNDED: { color: "#1D4ED8", bg: "#DBEAFE" },
};

function StatusBadge({ status, map }: {
  status: string;
  map: typeof FULFILMENT_MAP | typeof PAY_MAP;
}) {
  const cfg = map[status] || { color: "#374151", bg: "#F3F4F6", label: status };
  const label = (cfg as any).label || status.replace(/_/g, " ");
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ color: cfg.color, background: cfg.bg }}>
      {(cfg as any).icon} {label}
    </span>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PRODUCT PICKER — step 1 of scheduling flow
// ══════════════════════════════════════════════════════════════════════════════
function ProductPicker({
  onSelect, onCancel,
}: {
  onSelect: (product: Product) => void;
  onCancel: () => void;
}) {
  const [products, setProducts]     = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [selectedCat, setSelectedCat] = useState<number | null>(null);

  useEffect(() => {
    giftApi.getCategories()
      .then((res: unknown) => {
        const arr = Array.isArray(res) ? res : ((res as any)?.results ?? []);
        setCategories(arr);
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {};
      if (selectedCat) params.category = selectedCat;
      if (search)      params.search   = search;
      const res = await giftApi.getProducts(params);
      const list = Array.isArray(res) ? res : ((res as any)?.results ?? []);
      setProducts(list);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCat, search]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onCancel}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft size={16} /> Back
        </button>
        <h3 className="font-semibold text-gray-800">Choose a product to send</h3>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text" placeholder="Search products…"
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-400"
        />
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedCat(null)}
          className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
          style={selectedCat === null
            ? { background: TEAL, color: "white" }
            : { background: "#F3F4F6", color: "#374151" }}>
          All
        </button>
        {categories.map(cat => (
          <button key={cat.id}
            onClick={() => setSelectedCat(cat.id)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={selectedCat === cat.id
              ? { background: TEAL, color: "white" }
              : { background: "#F3F4F6", color: "#374151" }}>
            {cat.emoji} {cat.name}
          </button>
        ))}
      </div>

      {/* Products grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-xl bg-gray-100 animate-pulse h-48" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <Gift size={36} className="mx-auto mb-2 opacity-40" />
          <p>No products found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
          {products.map(product => {
            const src = imgUrl(product.image);
            return (
              <button key={product.id}
                onClick={() => onSelect(product)}
                className="group bg-white border border-gray-100 rounded-xl overflow-hidden text-left hover:shadow-md hover:border-teal-200 transition-all">
                <div className="h-28 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                  {src ? (
                    <img src={src} alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl opacity-30">
                      {product.category_emoji || "🎁"}
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-tight mb-1">
                    {product.name}
                  </p>
                  <p className="text-sm font-bold" style={{ color: TEAL }}>{fmt(product.price)}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCHEDULE FLOW — full wizard
// ══════════════════════════════════════════════════════════════════════════════
type WizardStep = "product" | "details" | "address" | "payment";

function ScheduleWizard({
  onClose, onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep]             = useState<WizardStep>("product");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading]       = useState(false);
  const [createdId, setCreatedId]   = useState<number | null>(null);

  const [form, setForm] = useState({
    // delivery
    delivery_type:      "GIFT",
    postcard_message:   "",
    postcard_template:  "classic",
    occasion:           "",
    scheduled_date:     "",
    notes_for_team:     "",
    // sender
    sender_name:          "", sender_email:  "", sender_phone: "",
    sender_address_line1: "", sender_address_line2: "",
    sender_city:          "", sender_state: "", sender_pincode: "",
    // recipient
    recipient_name:          "", recipient_email:  "", recipient_phone: "",
    recipient_address_line1: "", recipient_address_line2: "",
    recipient_city:          "", recipient_state: "", recipient_pincode: "",
    recipient_country:       "India",
  });

  const upd = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const STEPS: WizardStep[] = ["product", "details", "address", "payment"];
  const stepIndex = STEPS.indexOf(step);

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    // auto-set delivery_type based on category name
    const cat = product.category_name?.toUpperCase() || "";
    const type = cat.includes("POSTCARD") || cat.includes("CARD") ? "POSTCARD" : "GIFT";
    upd("delivery_type", type);
    setStep("details");
  };

  const handleCreate = async () => {
    if (!selectedProduct) return;
    setLoading(true);
    try {
      const payload = {
        ...form,
        product: selectedProduct.id,
        amount:  selectedProduct.price,
      };
      const res = await giftApi.createScheduledDelivery(payload) as any;
      setCreatedId(res.id);
      toast.success("Delivery scheduled! Proceeding to payment…");
      setStep("payment");
    } catch (e: any) {
      toast.error(e?.message || "Failed to schedule. Please check all fields.");
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    if (!createdId || !selectedProduct) return;
    setLoading(true);
    try {
      const res = await giftApi.createScheduledDeliveryPayment(createdId) as any;
      const Razorpay = (window as any).Razorpay;
      if (!Razorpay) { toast.error("Payment gateway not loaded"); return; }

      const rzp = new Razorpay({
        key:         res.key_id,
        amount:      res.amount,
        currency:    "INR",
        order_id:    res.razorpay_order_id,
        name:        "Planazo — Scheduled Delivery",
        description: `${selectedProduct.name} for ${form.recipient_name}`,
        handler: async (response: any) => {
          await giftApi.verifyScheduledDeliveryPayment(createdId, response);
          toast.success("🎉 Payment confirmed! We'll dispatch on the scheduled date.");
          onSuccess();
        },
        prefill:  { name: form.sender_name, email: form.sender_email, contact: form.sender_phone },
        theme:    { color: TEAL },
      });
      rzp.open();
    } catch (e: any) {
      toast.error(e?.message || "Payment initiation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: TEAL }}>
              <Gift size={18} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800">Schedule a Delivery</h2>
              <p className="text-xs text-gray-400">We pack & ship on the scheduled date</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
        </div>

        {/* Step indicator */}
        <div className="flex border-b">
          {[
            { key: "product", label: "Product" },
            { key: "details", label: "Details" },
            { key: "address", label: "Address" },
            { key: "payment", label: "Payment" },
          ].map((s, i) => (
            <div key={s.key} className="flex-1 text-center py-2.5 text-xs font-semibold transition-colors"
              style={{
                color: step === s.key ? TEAL : stepIndex > i ? "#059669" : "#9CA3AF",
                borderBottom: step === s.key ? `2px solid ${TEAL}` : "2px solid transparent",
              }}>
              {stepIndex > i ? "✓ " : `${i + 1}. `}{s.label}
            </div>
          ))}
        </div>

        <div className="p-5">
          {/* ── Step 1: Product ── */}
          {step === "product" && (
            <ProductPicker
              onSelect={handleSelectProduct}
              onCancel={onClose}
            />
          )}

          {/* ── Step 2: Delivery Details ── */}
          {step === "details" && selectedProduct && (
            <div className="space-y-5">
              {/* Selected product card */}
              <div className="flex items-center gap-3 p-3 bg-teal-50 rounded-xl border border-teal-100">
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-white flex-shrink-0">
                  {imgUrl(selectedProduct.image) ? (
                    <img src={imgUrl(selectedProduct.image)!} alt={selectedProduct.name}
                      className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">
                      {selectedProduct.category_emoji || "🎁"}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-800 truncate">{selectedProduct.name}</p>
                  <p className="text-xs text-gray-500">{selectedProduct.category_name}</p>
                  <p className="font-bold text-sm mt-0.5" style={{ color: TEAL }}>{fmt(selectedProduct.price)}</p>
                </div>
                <button onClick={() => setStep("product")}
                  className="text-xs text-teal-600 hover:underline flex-shrink-0">Change</button>
              </div>

              {/* Postcard message (if postcard type) */}
              {form.delivery_type === "POSTCARD" && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-medium">Your Message</label>
                  <textarea rows={4} placeholder="Write your heartfelt message…"
                    value={form.postcard_message}
                    onChange={e => upd("postcard_message", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-teal-400 resize-none" />
                </div>
              )}

              {/* Occasion & date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-medium">Occasion</label>
                  <select value={form.occasion} onChange={e => upd("occasion", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-teal-400">
                    <option value="">Select occasion</option>
                    {["Wedding", "Birthday", "Anniversary", "Baby Shower", "Diwali", "Christmas", "Holi", "New Year", "Other"].map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-medium">Delivery Date</label>
                  <input type="date" value={form.scheduled_date}
                    min={new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0]}
                    onChange={e => upd("scheduled_date", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-teal-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1 font-medium">Special notes for our team (optional)</label>
                <input type="text" placeholder="Any special requests or wrapping preferences…"
                  value={form.notes_for_team}
                  onChange={e => upd("notes_for_team", e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-teal-400" />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep("product")}
                  className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  ← Back
                </button>
                <button
                  onClick={() => {
                    if (!form.occasion)        return toast.error("Select an occasion");
                    if (!form.scheduled_date)  return toast.error("Pick a delivery date");
                    setStep("address");
                  }}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                  style={{ background: TEAL }}>
                  Next: Address →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Addresses ── */}
          {step === "address" && (
            <div className="space-y-5">
              {/* Sender */}
              <div>
                <h3 className="font-semibold text-gray-700 text-sm mb-3 flex items-center gap-2">
                  <User size={15} style={{ color: TEAL }} /> Sender Details (you)
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "sender_name",  label: "Full Name",   type: "text",  col: 2 },
                    { key: "sender_email", label: "Email",       type: "email", col: 1 },
                    { key: "sender_phone", label: "Phone",       type: "tel",   col: 1 },
                    { key: "sender_address_line1", label: "Address", type: "text", col: 2 },
                    { key: "sender_city",  label: "City",        type: "text",  col: 1 },
                    { key: "sender_state", label: "State",       type: "text",  col: 1 },
                    { key: "sender_pincode", label: "Pincode",   type: "text",  col: 1 },
                  ].map(f => (
                    <div key={f.key} className={f.col === 2 ? "col-span-2" : ""}>
                      <label className="block text-xs text-gray-400 mb-1">{f.label}</label>
                      <input type={f.type}
                        value={(form as any)[f.key]}
                        onChange={e => upd(f.key, e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-teal-400" />
                    </div>
                  ))}
                </div>
              </div>

              <hr className="border-dashed" />

              {/* Recipient */}
              <div>
                <h3 className="font-semibold text-gray-700 text-sm mb-3 flex items-center gap-2">
                  <MapPin size={15} style={{ color: GOLD }} /> Recipient Details
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "recipient_name",  label: "Full Name",  type: "text",  col: 2 },
                    { key: "recipient_email", label: "Email",      type: "email", col: 1 },
                    { key: "recipient_phone", label: "Phone",      type: "tel",   col: 1 },
                    { key: "recipient_address_line1", label: "Address Line 1", type: "text", col: 2 },
                    { key: "recipient_address_line2", label: "Address Line 2 (optional)", type: "text", col: 2 },
                    { key: "recipient_city",  label: "City",       type: "text",  col: 1 },
                    { key: "recipient_state", label: "State",      type: "text",  col: 1 },
                    { key: "recipient_pincode", label: "Pincode",  type: "text",  col: 1 },
                  ].map(f => (
                    <div key={f.key} className={f.col === 2 ? "col-span-2" : ""}>
                      <label className="block text-xs text-gray-400 mb-1">{f.label}</label>
                      <input type={f.type}
                        value={(form as any)[f.key]}
                        onChange={e => upd(f.key, e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-teal-400" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep("details")}
                  className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  ← Back
                </button>
                <button
                  disabled={loading}
                  onClick={() => {
                    const required = ["sender_name","sender_email","sender_phone","sender_address_line1","sender_city","sender_state","sender_pincode",
                                     "recipient_name","recipient_phone","recipient_address_line1","recipient_city","recipient_state","recipient_pincode"];
                    const missing = required.find(k => !(form as any)[k]);
                    if (missing) return toast.error("Please fill all required fields");
                    handleCreate();
                  }}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: TEAL }}>
                  {loading ? <><RefreshCw size={16} className="animate-spin" /> Creating…</> : "→ Pay & Confirm"}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: Payment ── */}
          {step === "payment" && selectedProduct && (
            <div className="space-y-5 text-center">
              <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
                style={{ background: "#F0FDF4" }}>
                <CheckCircle size={32} className="text-green-500" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-800">Delivery Scheduled!</h3>
                <p className="text-gray-500 text-sm mt-1">
                  Complete payment to confirm your order. We'll dispatch it on {fmtDate(form.scheduled_date)}.
                </p>
              </div>

              {/* Order summary */}
              <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Product</span>
                  <span className="font-medium text-gray-800">{selectedProduct.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Recipient</span>
                  <span className="font-medium text-gray-800">{form.recipient_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Occasion</span>
                  <span className="font-medium text-gray-800">{form.occasion}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Delivery Date</span>
                  <span className="font-medium text-gray-800">{fmtDate(form.scheduled_date)}</span>
                </div>
                <hr className="border-dashed" />
                <div className="flex justify-between text-base font-bold">
                  <span className="text-gray-700">Total</span>
                  <span style={{ color: TEAL }}>{fmt(selectedProduct.price)}</span>
                </div>
              </div>

              <button
                disabled={loading}
                onClick={handlePay}
                className="w-full py-4 rounded-xl text-white font-bold text-base transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: TEAL }}>
                {loading
                  ? <><RefreshCw size={18} className="animate-spin" /> Opening payment…</>
                  : <><CreditCard size={18} /> Pay {fmt(selectedProduct.price)}</>}
              </button>

              <p className="text-xs text-gray-400">
                Secured by Razorpay · 256-bit SSL encryption
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MY ORDERS TAB
// ══════════════════════════════════════════════════════════════════════════════
function MyOrdersTab() {
  const [orders, setOrders]   = useState<MarketplaceOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    giftApi.myOrders()
      .then((res: any) => {
        const list = Array.isArray(res) ? res : (res?.results ?? []);
        setOrders(list);
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />
      ))}
    </div>
  );

  if (orders.length === 0) return (
    <div className="text-center py-16 text-gray-400">
      <ShoppingBag size={48} className="mx-auto mb-3 opacity-30" />
      <p className="font-medium">No orders yet</p>
      <p className="text-sm mt-1">Visit the shop to place your first order.</p>
      <Link href="/shop"
        className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
        style={{ background: TEAL }}>
        <ShoppingBag size={16} /> Browse Shop
      </Link>
    </div>
  );

  return (
    <div className="space-y-3">
      {orders.map(order => {
        const src = imgUrl(order.product_image_url);
        return (
          <div key={order.id}
            className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:shadow-sm transition-all">
            <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
              {src ? (
                <img src={src} alt={order.product_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">🎁</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-800 truncate">{order.product_name}</p>
              <p className="text-xs text-gray-400">Qty: {order.quantity} · {fmtDate(order.created_at)}</p>
              <div className="flex gap-2 mt-1.5 flex-wrap">
                <StatusBadge status={order.payment_status} map={PAY_MAP} />
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-bold text-sm" style={{ color: TEAL }}>{fmt(order.total)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCHEDULED DELIVERIES TAB
// ══════════════════════════════════════════════════════════════════════════════
function ScheduledTab({ onScheduleNew }: { onScheduleNew: () => void }) {
  const [deliveries, setDeliveries] = useState<ScheduledDelivery[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");

  const load = useCallback(() => {
    setLoading(true);
    giftApi.getScheduledDeliveries()
      .then((res: any) => {
        const list = Array.isArray(res) ? res : (res?.results ?? []);
        setDeliveries(list);
      })
      .catch(() => setDeliveries([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = deliveries.filter(d =>
    [d.recipient_name, d.product_name, d.occasion, d.sender_name]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search deliveries…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-400" />
        </div>
        <button onClick={onScheduleNew}
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ background: TEAL }}>
          <Plus size={16} /> Schedule
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Calendar size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">{search ? "No matching deliveries" : "No scheduled deliveries yet"}</p>
          {!search && (
            <button onClick={onScheduleNew}
              className="mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: TEAL }}>
              Schedule your first delivery
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(d => {
            const src = imgUrl(d.product_image_url);
            const ff  = FULFILMENT_MAP[d.fulfilment_status];
            return (
              <div key={d.id}
                className="bg-white rounded-xl border border-gray-100 hover:shadow-sm transition-all overflow-hidden">
                <div className="flex items-start gap-4 p-4">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                    {src ? (
                      <img src={src} alt={d.product_name || "delivery"} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">
                        {d.delivery_type === "POSTCARD" ? "📬" : "🎁"}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm text-gray-800">
                          {d.product_name || (d.delivery_type === "POSTCARD" ? "Printed Postcard" : "Gift Delivery")}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          To: <span className="font-medium text-gray-700">{d.recipient_name}</span>
                          {d.recipient_city && ` · ${d.recipient_city}`}
                        </p>
                      </div>
                      <p className="font-bold text-sm flex-shrink-0" style={{ color: TEAL }}>
                        {fmt(d.amount)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <StatusBadge status={d.fulfilment_status} map={FULFILMENT_MAP} />
                      <StatusBadge status={d.payment_status}    map={PAY_MAP} />
                      {d.occasion && (
                        <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                          {d.occasion}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Date & tracking bar */}
                <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={12} /> Delivery: <span className="font-medium text-gray-700">{fmtDate(d.scheduled_date)}</span>
                  </span>
                  {d.tracking_info && (
                    <span className="flex items-center gap-1 text-teal-600 font-medium">
                      <Truck size={12} /> {d.tracking_info}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
type Tab = "orders" | "scheduled" | "schedule";

export default function ShopDashboard() {
  const router = useRouter();
  const [tab, setTab]                 = useState<Tab>("scheduled");
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser]               = useState<{ email: string; name?: string } | null>(null);
  const [wizardOpen, setWizardOpen]   = useState(false);
  const [refresh, setRefresh]         = useState(0);

  // Auth check
  useEffect(() => {
    const token =
      localStorage.getItem("access_token") ||
      sessionStorage.getItem("access_token");
    if (!token) {
      router.replace("/gift-login?next=/shop/dashboard");
      return;
    }
    // Decode basic info from token (JWT payload)
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setUser({ email: payload.email || "User" });
    } catch {
      setUser({ email: "User" });
    }
    setAuthChecked(true);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    sessionStorage.removeItem("access_token");
    router.push("/gift-login");
    toast.success("Logged out successfully");
  };

  const handleWizardSuccess = () => {
    setWizardOpen(false);
    setTab("scheduled");
    setRefresh(r => r + 1);
    toast.success("Your delivery has been confirmed!");
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F0FDFA" }}>
        <div className="animate-pulse text-teal-600">Loading dashboard…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#F8FFFE" }}>
      {/* ── Top Nav ── */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/shop" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DK})` }}>
              <Gift size={18} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-gray-800 text-sm leading-none block">Planazo</span>
              <span className="text-xs leading-none" style={{ color: TEAL }}>Gift Shop</span>
            </div>
          </Link>

          {/* Nav links */}
          <div className="hidden sm:flex items-center gap-1">
            {[
              { href: "/shop",           icon: <Home size={15} />,     label: "Shop" },
              { href: "/shop/dashboard", icon: <Package size={15} />,  label: "Dashboard" },
            ].map(l => (
              <Link key={l.href} href={l.href}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                {l.icon} {l.label}
              </Link>
            ))}
          </div>

          {/* User menu */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setWizardOpen(true)}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: TEAL }}>
              <Plus size={15} /> Schedule Delivery
            </button>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: TEAL }}>
                {(user?.email?.[0] || "U").toUpperCase()}
              </div>
              <span className="hidden sm:block truncate max-w-32">{user?.email}</span>
            </div>
            <button onClick={handleLogout}
              className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Logout">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Body ── */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Scheduled",  icon: <Calendar size={18} />, bg: "#EFF6FF", ic: "#3B82F6", hint: "upcoming deliveries" },
            { label: "Delivered",  icon: <CheckCircle size={18} />, bg: "#F0FDF4", ic: "#22C55E", hint: "completed" },
            { label: "In Transit", icon: <Truck size={18} />, bg: "#FFF7ED", ic: "#F97316", hint: "on the way" },
            { label: "My Orders",  icon: <ShoppingBag size={18} />, bg: "#FDF4FF", ic: "#A855F7", hint: "marketplace orders" },
          ].map(s => (
            <div key={s.label}
              className="rounded-xl p-4 flex items-center gap-3"
              style={{ background: s.bg }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/70"
                style={{ color: s.ic }}>
                {s.icon}
              </div>
              <div>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-lg font-bold text-gray-800">—</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-5 bg-white rounded-xl p-1 border border-gray-100">
          {[
            { key: "scheduled", label: "Scheduled Deliveries", icon: <Calendar size={15} /> },
            { key: "orders",    label: "My Orders",            icon: <ShoppingBag size={15} /> },
          ].map(t => (
            <button key={t.key}
              onClick={() => setTab(t.key as Tab)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all"
              style={tab === t.key
                ? { background: TEAL, color: "white" }
                : { color: "#6B7280" }}>
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.label.split(" ")[0]}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "scheduled" && (
          <ScheduledTab
            key={refresh}
            onScheduleNew={() => setWizardOpen(true)}
          />
        )}
        {tab === "orders" && <MyOrdersTab />}

        {/* Upgrade CTA */}
        <div className="mt-8 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4"
          style={{ background: `linear-gradient(135deg, ${TEAL}18, ${TEAL_DK}10)`, border: `1.5px solid ${TEAL}30` }}>
          <div className="flex-1 text-center sm:text-left">
            <p className="font-bold text-gray-800 flex items-center justify-center sm:justify-start gap-2">
              <Sparkles size={18} style={{ color: GOLD }} />
              Unlock Unlimited Scheduled Deliveries
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Upgrade to Pro and schedule up to 50 gift & postcard deliveries per month.
            </p>
          </div>
          <Link href="/dashboard/settings"
            className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: GOLD }}>
            <Sparkles size={16} /> Upgrade Plan
          </Link>
        </div>
      </div>

      {/* ── Mobile FAB ── */}
      <button
        onClick={() => setWizardOpen(true)}
        className="sm:hidden fixed bottom-6 right-6 z-20 w-14 h-14 rounded-full text-white shadow-lg flex items-center justify-center transition-all hover:opacity-90 active:scale-95"
        style={{ background: TEAL }}>
        <Plus size={24} />
      </button>

      {/* ── Schedule Wizard ── */}
      {wizardOpen && (
        <ScheduleWizard
          onClose={() => setWizardOpen(false)}
          onSuccess={handleWizardSuccess}
        />
      )}
    </div>
  );
}
