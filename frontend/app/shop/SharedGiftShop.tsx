"use client";
/**
 * SharedGiftShop — unified gift marketplace UI
 * Used by both /shop (standalone) and /invite/[slug]/gifts (wedding-linked)
 *
 * Mode "shop":   standalone marketplace with login, cart, Razorpay checkout
 * Mode "invite": wedding gift list — same look, cart stored, links to couple
 */
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search, ShoppingCart, Star, X, ChevronRight,
  Minus, Plus, Trash2, ShoppingBag, Menu, ArrowLeft,
  Gift, Heart, Package, Truck, Shield, Tag,
  Eye, EyeOff, Lock, Mail, User, LayoutDashboard,
} from "lucide-react";
import { giftApi, authApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import toast from "react-hot-toast";

// ── Brand colours ─────────────────────────────────────────────────────────────
const TEAL    = "#0D9488";
const TEAL_DK = "#0F766E";
const GOLD    = "#C9952A";
const ROSE    = "#B76E79";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface Product {
  id: number; slug: string; name: string; short_desc: string;
  price: string; compare_price: string | null; image: string | null;
  avg_rating: number | null; review_count: number; discount_pct: number;
  is_featured: boolean; is_cod: boolean; stock: number;
  category_name: string; category_emoji: string; category_icon_url?: string | null;
  seller_name: string;
}

interface Category {
  id: number; name: string; emoji: string; icon_url?: string | null; order: number;
}

export interface CartItem { product: Product; qty: number; }

export interface SharedGiftShopProps {
  mode: "shop" | "invite";
  inviteSlug?: string;          // for mode="invite"
  coupleName?: string;          // display header e.g. "Sunil & Varsha's Gifts"
  weddingDate?: string;
  accentColor?: string;         // override teal with wedding theme
  isLoggedIn?: boolean;         // for mode="shop" auth check
  onLoginRequired?: () => void; // called when guest tries to checkout
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const API = typeof window !== "undefined"
  ? (process.env.NEXT_PUBLIC_API_URL || "")
  : (process.env.NEXT_PUBLIC_API_URL || "");

const imgUrl = (src: string | null) =>
  src ? (src.startsWith("http") ? src : `${API}${src}`) : null;

const fmt = (n: string | number) =>
  `₹${parseFloat(String(n)).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;

const SORT_OPTIONS = [
  { value: "",            label: "Relevance" },
  { value: "price",       label: "Price: Low → High" },
  { value: "-price",      label: "Price: High → Low" },
  { value: "-created_at", label: "Newest First" },
];

const PRICE_RANGES = [
  { label: "Under ₹500",       min: 0,    max: 499  },
  { label: "₹500 – ₹1,000",   min: 500,  max: 999  },
  { label: "₹1,000 – ₹2,500", min: 1000, max: 2499 },
  { label: "₹2,500 – ₹5,000", min: 2500, max: 4999 },
  { label: "₹5,000+",          min: 5000, max: 0    },
];

// ── Shop Login Modal ──────────────────────────────────────────────────────────
/**
 * Inline login / register modal that appears when a guest tries to checkout.
 * On success it sets localStorage tokens and calls onSuccess so the parent can
 * update its auth state without any page redirect.
 */
function ShopLoginModal({
  onSuccess, onClose, accentColor,
}: {
  onSuccess: (token: string) => void;
  onClose: () => void;
  accentColor: string;
}) {
  const setAuth = useAuthStore(s => s.setAuth);
  const [mode,     setMode]     = useState<"login" | "register">("login");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [form,     setForm]     = useState({ name: "", email: "", password: "" });

  const upd = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      if (mode === "login") {
        const data: any = await authApi.login({ email: form.email, password: form.password });
        localStorage.setItem("access_token",  data.access);
        localStorage.setItem("refresh_token", data.refresh);
        if (data.user) setAuth(data.user, data.access, data.refresh);
        toast.success("Welcome back! 🎉");
        onSuccess(data.access);
      } else {
        await authApi.register({
          email:    form.email,
          password: form.password,
          name:     form.name,
          role:     "COUPLE",
        });
        toast.success("Account created! Signing you in…");
        // auto-login after register
        const data: any = await authApi.login({ email: form.email, password: form.password });
        localStorage.setItem("access_token",  data.access);
        localStorage.setItem("refresh_token", data.refresh);
        if (data.user) setAuth(data.user, data.access, data.refresh);
        onSuccess(data.access);
      }
    } catch (err: any) {
      const json = await (err?.response?.json() as Promise<any> | undefined)?.catch(() => null) as any;
      setError(
        json?.detail ||
        json?.non_field_errors?.[0] ||
        json?.email?.[0] ||
        (mode === "login" ? "Invalid email or password" : "Registration failed. Try again.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm pointer-events-auto overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 text-center relative"
            style={{ background: `linear-gradient(135deg, ${accentColor}18 0%, white 60%)` }}>
            <button onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
              <X size={18} />
            </button>
            <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
              style={{ background: accentColor }}>
              <Gift size={22} className="text-white" />
            </div>
            <h2 className="font-bold text-gray-800 text-lg">
              {mode === "login" ? "Sign in to continue" : "Create an account"}
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              {mode === "login"
                ? "Sign in to place your order and track deliveries"
                : "Join Planazo to order gifts & schedule deliveries"}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100 mx-6">
            {(["login", "register"] as const).map(m => (
              <button key={m}
                onClick={() => { setMode(m); setError(""); }}
                className="flex-1 py-3 text-sm font-semibold transition-colors"
                style={{
                  color: mode === m ? accentColor : "#9CA3AF",
                  borderBottom: mode === m ? `2px solid ${accentColor}` : "2px solid transparent",
                }}>
                {m === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
                {error}
              </div>
            )}

            {mode === "register" && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Full Name</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" required placeholder="Sunil Varma"
                    value={form.name} onChange={e => upd("name", e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none"
                    onFocus={e => (e.target.style.borderColor = accentColor)}
                    onBlur={e => (e.target.style.borderColor = "#E5E7EB")} />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="email" required placeholder="you@example.com"
                  value={form.email} onChange={e => upd("email", e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none"
                  onFocus={e => (e.target.style.borderColor = accentColor)}
                  onBlur={e => (e.target.style.borderColor = "#E5E7EB")} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-gray-500">Password</label>
                {mode === "login" && (
                  <a href="/forgot-password" className="text-xs text-gray-400 hover:underline">Forgot?</a>
                )}
              </div>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPass ? "text" : "password"}
                  required minLength={mode === "register" ? 6 : 1}
                  placeholder={mode === "register" ? "Min. 6 characters" : "••••••••"}
                  value={form.password} onChange={e => upd("password", e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none"
                  onFocus={e => (e.target.style.borderColor = accentColor)}
                  onBlur={e => (e.target.style.borderColor = "#E5E7EB")} />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: accentColor }}>
              {loading
                ? <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> {mode === "login" ? "Signing in…" : "Creating account…"}</>
                : mode === "login" ? "Sign In →" : "Create Account →"}
            </button>

            {/* Google OAuth */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100" />
              </div>
              <div className="relative flex justify-center text-xs text-gray-400 bg-white px-2">or</div>
            </div>

            <a href={`/api/auth/signin/google?callbackUrl=${encodeURIComponent("/shop")}`}
              className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-2.5 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </a>
          </form>
        </div>
      </div>
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Stars({ rating, count }: { rating: number | null; count: number }) {
  if (!rating) return <span className="text-xs text-gray-400">No reviews yet</span>;
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1,2,3,4,5].map(s => (
          <Star key={s} size={11}
            fill={s <= Math.round(rating) ? "#F59E0B" : "none"}
            className={s <= Math.round(rating) ? "text-amber-400" : "text-gray-300"} />
        ))}
      </div>
      <span className="text-xs text-gray-500">({count})</span>
    </div>
  );
}

function CategoryIcon({ cat, size = 28 }: { cat: Category; size?: number }) {
  if (cat.icon_url) {
    return (
      <img src={imgUrl(cat.icon_url) || ""} alt={cat.name}
        className="object-contain" style={{ width: size, height: size }} />
    );
  }
  return <span style={{ fontSize: size * 0.9 }}>{cat.emoji || "🎁"}</span>;
}

function ProductImage({ product, height = 200 }: { product: Product; height?: number }) {
  const src = imgUrl(product.image);
  const iconSrc = imgUrl(product.category_icon_url || null);
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100"
      style={{ height }}>
      {src ? (
        <img src={src} alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      ) : iconSrc ? (
        <div className="w-full h-full flex items-center justify-center">
          <img src={iconSrc} alt={product.category_name}
            className="w-20 h-20 object-contain opacity-30" />
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-5xl opacity-25">
          {product.category_emoji || "🎁"}
        </div>
      )}
      {product.is_featured && (
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-semibold text-white"
          style={{ background: GOLD }}>Featured</span>
      )}
      {product.discount_pct > 0 && (
        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold text-white bg-red-500">
          -{product.discount_pct}%
        </span>
      )}
    </div>
  );
}

// ── Cart Drawer ───────────────────────────────────────────────────────────────

function CartDrawer({
  cart, open, onClose, accentColor,
  onQtyChange, onRemove, onCheckout,
  mode, inviteSlug,
}: {
  cart: CartItem[]; open: boolean; onClose: () => void; accentColor: string;
  onQtyChange: (id: number, qty: number) => void;
  onRemove: (id: number) => void;
  onCheckout: () => void;
  mode: "shop" | "invite";
  inviteSlug?: string;
}) {
  const total = cart.reduce((s, i) => s + parseFloat(i.product.price) * i.qty, 0);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
          onClick={onClose} />
      )}
      {/* Drawer */}
      <div className={`fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col
        transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b"
          style={{ background: accentColor }}>
          <div className="flex items-center gap-2 text-white">
            <ShoppingBag size={20} />
            <span className="font-bold">Cart ({cart.reduce((s, i) => s + i.qty, 0)})</span>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <ShoppingBag size={48} className="mx-auto mb-3 opacity-30" />
              <p>Your cart is empty</p>
              <p className="text-sm mt-1">Add gifts and they'll appear here</p>
            </div>
          ) : cart.map(item => {
            const src = imgUrl(item.product.image);
            return (
              <div key={item.product.id}
                className="flex gap-3 bg-gray-50 rounded-xl p-3 items-start">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-white flex-shrink-0 border border-gray-100">
                  {src ? (
                    <img src={src} alt={item.product.name}
                      className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">
                      {item.product.category_emoji || "🎁"}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.product.name}</p>
                  <p className="text-sm font-bold mt-0.5" style={{ color: accentColor }}>
                    {fmt(item.product.price)}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <button onClick={() => onQtyChange(item.product.id, item.qty - 1)}
                      className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-100">
                      <Minus size={12} />
                    </button>
                    <span className="text-sm font-semibold w-5 text-center">{item.qty}</span>
                    <button onClick={() => onQtyChange(item.product.id, item.qty + 1)}
                      className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-100">
                      <Plus size={12} />
                    </button>
                    <button onClick={() => onRemove(item.product.id)}
                      className="ml-auto text-red-400 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="border-t p-4 space-y-3">
            <div className="flex justify-between font-bold text-gray-800 text-lg">
              <span>Total</span>
              <span style={{ color: accentColor }}>{fmt(total)}</span>
            </div>
            <button onClick={onCheckout}
              className="w-full py-3 rounded-xl text-white font-bold text-base transition-all hover:opacity-90 active:scale-95"
              style={{ background: accentColor }}>
              Proceed to Pay
            </button>
            {mode === "invite" && inviteSlug && (
              <Link href={`/invite/${inviteSlug}`}
                className="block text-center text-sm text-gray-500 hover:text-gray-700">
                ← Back to invitation
              </Link>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ── Checkout Modal ─────────────────────────────────────────────────────────────

function CheckoutModal({
  cart, onClose, accentColor, mode, inviteSlug, isLoggedIn, onLoginRequired,
}: {
  cart: CartItem[];
  onClose: () => void;
  accentColor: string;
  mode: "shop" | "invite";
  inviteSlug?: string;
  isLoggedIn?: boolean;
  onLoginRequired?: () => void;
}) {
  const [step, setStep] = useState<"details" | "payment" | "success">("details");
  const [form, setForm] = useState({
    name: "", email: "", phone: "",
    address: "", city: "", state: "", pincode: "", country: "India",
  });
  const [loading, setLoading] = useState(false);
  const total = cart.reduce((s, i) => s + parseFloat(i.product.price) * i.qty, 0);

  const handlePay = async () => {
    if (mode === "shop" && !isLoggedIn) {
      onLoginRequired?.();
      return;
    }
    setLoading(true);
    try {
      // Build cart payload for marketplace order
      const payload = {
        buyer_name:    form.name,
        buyer_email:   form.email,
        buyer_phone:   form.phone,
        address_line1: form.address,
        city:          form.city,
        state:         form.state,
        pincode:       form.pincode,
        country:       form.country,
        ...(inviteSlug ? { website_slug: inviteSlug } : {}),
      };
      const orderRes = await giftApi.createMarketplaceOrder(payload) as any;
      const { razorpay_order_id, amount, key_id } = orderRes;

      // Open Razorpay
      const Razorpay = (window as any).Razorpay;
      if (!Razorpay) { toast.error("Payment gateway not loaded"); return; }

      const rzp = new Razorpay({
        key:      key_id,
        amount,
        currency: "INR",
        order_id: razorpay_order_id,
        name:     "Planazo Gifts",
        description: "Gift Order",
        handler: async (response: any) => {
          await giftApi.verifyMarketplacePayment({
            razorpay_order_id:   response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature:  response.razorpay_signature,
          });
          setStep("success");
        },
        prefill:  { name: form.name, email: form.email, contact: form.phone },
        theme:    { color: accentColor },
      });
      rzp.open();
    } catch (e: any) {
      toast.error(e?.message || "Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b"
          style={{ background: accentColor }}>
          <h2 className="text-white font-bold text-lg">
            {step === "success" ? "Order Placed!" : "Checkout"}
          </h2>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {step === "success" ? (
          <div className="p-8 text-center space-y-4">
            <div className="text-6xl">🎉</div>
            <h3 className="text-xl font-bold text-gray-800">Thank you!</h3>
            <p className="text-gray-600">
              Your gift order has been placed successfully.
              You'll receive a confirmation email shortly.
            </p>
            <button onClick={onClose}
              className="mt-4 px-6 py-3 rounded-xl text-white font-semibold"
              style={{ background: accentColor }}>
              Continue Shopping
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Order summary */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              {cart.map(item => (
                <div key={item.product.id} className="flex justify-between text-sm text-gray-600">
                  <span className="truncate">{item.product.name} × {item.qty}</span>
                  <span className="font-medium ml-2">
                    {fmt(parseFloat(item.product.price) * item.qty)}
                  </span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between font-bold text-gray-800">
                <span>Total</span>
                <span style={{ color: accentColor }}>{fmt(total)}</span>
              </div>
            </div>

            {/* Delivery details */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-700">Delivery Details</h3>
              {[
                { key: "name",    label: "Full Name",  type: "text" },
                { key: "email",   label: "Email",      type: "email" },
                { key: "phone",   label: "Phone",      type: "tel" },
                { key: "address", label: "Address",    type: "text" },
                { key: "city",    label: "City",       type: "text" },
                { key: "state",   label: "State",      type: "text" },
                { key: "pincode", label: "PIN Code",   type: "text" },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                  <input
                    type={f.type}
                    value={(form as any)[f.key]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={handlePay}
              disabled={loading || !form.name || !form.email || !form.address}
              className="w-full py-3 rounded-xl text-white font-bold text-base transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
              style={{ background: accentColor }}>
              {loading ? "Processing…" : `Pay ${fmt(total)}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SharedGiftShop({
  mode,
  inviteSlug,
  coupleName,
  weddingDate,
  accentColor,
  isLoggedIn: isLoggedInProp = false,
  onLoginRequired,
}: SharedGiftShopProps) {
  const accent = accentColor || (mode === "invite" ? ROSE : TEAL);
  const router = useRouter();

  // State
  const [products, setProducts]     = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [sortBy, setSortBy]         = useState("");
  const [priceRange, setPriceRange] = useState<{ min: number; max: number } | null>(null);
  const [minRating, setMinRating]   = useState<number | null>(null);
  const [cart, setCart]             = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen]     = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [mobileFilters, setMobileFilters] = useState(false);
  // Auth state — managed internally so login modal can update it without page reload
  const [isLoggedIn, setIsLoggedIn] = useState(isLoggedInProp);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // Load categories
  useEffect(() => {
    giftApi.getCategories()
      .then((res: unknown) => {
        const arr = Array.isArray(res) ? res : ((res as { results?: Category[] })?.results ?? []);
        setCategories(arr);
      })
      .catch(() => setCategories([]));
  }, []);

  // Load products
  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {};
      if (selectedCat)      params.category  = selectedCat;
      if (priceRange?.min)  params.min_price = priceRange.min;
      if (priceRange?.max)  params.max_price = priceRange.max;
      if (minRating)        params.min_rating = minRating;
      if (sortBy)           params.ordering  = sortBy;
      if (search)           params.search    = search;
      const res = await giftApi.getProducts(params) as any;
      const list = Array.isArray(res) ? res : (res?.results ?? []);
      setProducts(list);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCat, priceRange, minRating, sortBy, search]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  // Cart helpers
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { product, qty: 1 }];
    });
    toast.success(`${product.name} added to cart!`);
    setCartOpen(true);
  };

  const changeQty = (id: number, qty: number) => {
    if (qty <= 0) { setCart(prev => prev.filter(i => i.product.id !== id)); return; }
    setCart(prev => prev.map(i => i.product.id === id ? { ...i, qty } : i));
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(i => i.product.id !== id));
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    if (mode === "shop" && !isLoggedIn) {
      // Show inline login modal instead of redirecting
      setCartOpen(false);
      setLoginModalOpen(true);
      return;
    }
    setCartOpen(false);
    setCheckoutOpen(true);
  };

  const handleLoginSuccess = (token: string) => {
    setIsLoggedIn(true);
    setLoginModalOpen(false);
    // Proceed directly to checkout after login
    setCheckoutOpen(true);
  };

  // ── Filters panel (shared for sidebar + mobile drawer) ──────────────────────
  const FiltersPanel = () => (
    <div className="space-y-6">
      {/* Category */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Category</h4>
        <div className="space-y-1">
          <button
            onClick={() => { setSelectedCat(null); setMobileFilters(false); }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors
              ${selectedCat === null ? "text-white font-semibold" : "text-gray-700 hover:bg-gray-50"}`}
            style={selectedCat === null ? { background: accent } : {}}>
            <Gift size={15} /> All Gifts
          </button>
          {categories.map(cat => (
            <button key={cat.id}
              onClick={() => { setSelectedCat(cat.id); setMobileFilters(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors
                ${selectedCat === cat.id ? "text-white font-semibold" : "text-gray-700 hover:bg-gray-50"}`}
              style={selectedCat === cat.id ? { background: accent } : {}}>
              <CategoryIcon cat={cat} size={16} />
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Price */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Price Range</h4>
        <div className="space-y-1">
          <button
            onClick={() => setPriceRange(null)}
            className={`w-full px-3 py-2 rounded-lg text-sm text-left transition-colors
              ${!priceRange ? "text-white font-semibold" : "text-gray-700 hover:bg-gray-50"}`}
            style={!priceRange ? { background: accent } : {}}>
            Any Price
          </button>
          {PRICE_RANGES.map(r => (
            <button key={r.label}
              onClick={() => setPriceRange({ min: r.min, max: r.max })}
              className={`w-full px-3 py-2 rounded-lg text-sm text-left transition-colors
                ${priceRange?.min === r.min ? "text-white font-semibold" : "text-gray-700 hover:bg-gray-50"}`}
              style={priceRange?.min === r.min ? { background: accent } : {}}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rating */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Min Rating</h4>
        <div className="space-y-1">
          {[null, 4, 3, 2].map(r => (
            <button key={String(r)}
              onClick={() => setMinRating(r)}
              className={`w-full px-3 py-2 rounded-lg text-sm text-left transition-colors
                ${minRating === r ? "text-white font-semibold" : "text-gray-700 hover:bg-gray-50"}`}
              style={minRating === r ? { background: accent } : {}}>
              {r ? `${r}★ & above` : "Any Rating"}
            </button>
          ))}
        </div>
      </div>

      {/* Clear */}
      {(selectedCat || priceRange || minRating) && (
        <button
          onClick={() => { setSelectedCat(null); setPriceRange(null); setMinRating(null); }}
          className="w-full text-sm text-red-500 hover:text-red-700 font-medium py-2 border border-red-200 rounded-lg">
          Clear All Filters
        </button>
      )}
    </div>
  );

  // ── Header ──────────────────────────────────────────────────────────────────
  const headerBg = mode === "invite"
    ? `linear-gradient(135deg, ${accent}15 0%, white 60%)`
    : "white";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          {/* Back link (invite mode) */}
          {mode === "invite" && inviteSlug && (
            <Link href={`/invite/${inviteSlug}`}
              className="flex items-center gap-1 text-gray-500 hover:text-gray-800 text-sm mr-2">
              <ArrowLeft size={16} /> Back
            </Link>
          )}

          {/* Logo / Title */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: accent }}>
              <Gift size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-gray-900 text-sm truncate leading-tight">
                {mode === "invite" && coupleName
                  ? `${coupleName}'s Gift Registry`
                  : "Planazo Gifts"}
              </h1>
              {mode === "invite" && weddingDate && (
                <p className="text-xs text-gray-400">{weddingDate}</p>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="hidden md:flex flex-1 max-w-xs items-center bg-gray-100 rounded-xl px-3 py-2 gap-2">
            <Search size={16} className="text-gray-400 flex-shrink-0" />
            <input
              className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400"
              placeholder="Search gifts…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="hidden md:block border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none bg-white">
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Auth button (shop mode only) */}
          {mode === "shop" && (
            isLoggedIn ? (
              <Link href="/shop/dashboard"
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
                <LayoutDashboard size={15} /> My Dashboard
              </Link>
            ) : (
              <button
                onClick={() => setLoginModalOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border text-white transition-all hover:opacity-90"
                style={{ background: accent, borderColor: accent }}>
                <User size={15} /> Sign In
              </button>
            )
          )}

          {/* Mobile filter button */}
          <button onClick={() => setMobileFilters(true)}
            className="md:hidden flex items-center gap-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600">
            <Menu size={16} />
          </button>

          {/* Cart */}
          <button onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-1 px-3 py-2 rounded-xl text-white text-sm font-medium"
            style={{ background: accent }}>
            <ShoppingCart size={17} />
            <span className="hidden sm:inline">Cart</span>
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                {cartCount}
              </span>
            )}
          </button>
        </div>

        {/* Mobile search bar */}
        <div className="md:hidden px-4 pb-3">
          <div className="flex items-center bg-gray-100 rounded-xl px-3 py-2 gap-2">
            <Search size={16} className="text-gray-400" />
            <input
              className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400"
              placeholder="Search gifts…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-gray-400">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Hero banner (invite mode) ─────────────────────────────────────────── */}
      {mode === "invite" && coupleName && (
        <div className="text-center py-8 px-4" style={{ background: headerBg }}>
          <p className="text-3xl" style={{ color: accent }}>💝</p>
          <h2 className="text-2xl font-bold text-gray-800 mt-2">
            {coupleName}&rsquo;s Gift Registry
          </h2>
          <p className="text-gray-500 mt-1 text-sm max-w-md mx-auto">
            Choose a gift to celebrate their special day. Gifts are delivered directly to the couple.
          </p>
        </div>
      )}

      {/* ── Trust strip ─────────────────────────────────────────────────────── */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-center gap-6 flex-wrap">
          {[
            { icon: <Shield size={14} />, text: "Secure Payment" },
            { icon: <Truck size={14} />, text: "Free Delivery ₹999+" },
            { icon: <Package size={14} />, text: "Gift Wrapped" },
            { icon: <Tag size={14} />, text: "Best Prices" },
          ].map(item => (
            <div key={item.text} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span style={{ color: accent }}>{item.icon}</span>
              {item.text}
            </div>
          ))}
        </div>
      </div>

      {/* ── Layout ──────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">

          {/* Sidebar filters (desktop) */}
          <aside className="hidden md:block w-56 flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sticky top-24">
              <FiltersPanel />
            </div>
          </aside>

          {/* Product grid */}
          <main className="flex-1 min-w-0">
            {/* Active filters + count */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <p className="text-sm text-gray-500">
                {loading ? "Loading…" : `${products.length} product${products.length !== 1 ? "s" : ""}`}
                {selectedCat && categories.find(c => c.id === selectedCat) && (
                  <> in <strong>{categories.find(c => c.id === selectedCat)?.name}</strong></>
                )}
              </p>
              {/* Mobile sort */}
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="md:hidden border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none bg-white">
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Grid */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                    <div className="h-44 bg-gray-100" />
                    <div className="p-3 space-y-2">
                      <div className="h-3 bg-gray-100 rounded w-3/4" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <Gift size={48} className="mx-auto text-gray-200 mb-3" />
                <p className="text-gray-400 font-medium">No gifts found</p>
                <p className="text-gray-300 text-sm mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map(product => {
                  const href = mode === "invite"
                    ? `/invite/${inviteSlug}/gifts/${product.id}`
                    : `/shop/product/${product.slug}`;

                  const inCart = cart.find(i => i.product.id === product.id);

                  return (
                    <div key={product.id}
                      className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 flex flex-col">

                      <Link href={href}>
                        <ProductImage product={product} height={180} />
                      </Link>

                      <div className="p-3 flex-1 flex flex-col gap-1">
                        <Link href={href}>
                          <p className="text-xs text-gray-400 font-medium">
                            {product.category_name}
                          </p>
                          <h3 className="text-sm font-semibold text-gray-800 leading-tight line-clamp-2 group-hover:opacity-80 transition-opacity">
                            {product.name}
                          </h3>
                        </Link>
                        <Stars rating={product.avg_rating} count={product.review_count} />

                        {/* Price row */}
                        <div className="flex items-baseline gap-1.5 mt-auto pt-1">
                          <span className="font-bold text-base" style={{ color: accent }}>
                            {fmt(product.price)}
                          </span>
                          {product.compare_price && (
                            <span className="text-xs text-gray-400 line-through">
                              {fmt(product.compare_price)}
                            </span>
                          )}
                        </div>

                        {/* Trust badges */}
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          {product.is_cod && <span className="flex items-center gap-0.5"><Package size={10} /> COD</span>}
                          {product.stock <= 5 && product.stock > 0 && (
                            <span className="text-orange-500 font-medium">Only {product.stock} left</span>
                          )}
                        </div>

                        {/* CTA */}
                        {inCart ? (
                          <div className="flex items-center justify-between mt-2 border border-gray-200 rounded-lg overflow-hidden">
                            <button onClick={() => changeQty(product.id, inCart.qty - 1)}
                              className="px-3 py-1.5 text-gray-600 hover:bg-gray-50 text-sm">
                              <Minus size={12} />
                            </button>
                            <span className="text-sm font-bold" style={{ color: accent }}>
                              {inCart.qty}
                            </span>
                            <button onClick={() => changeQty(product.id, inCart.qty + 1)}
                              className="px-3 py-1.5 text-gray-600 hover:bg-gray-50 text-sm">
                              <Plus size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(product)}
                            className="mt-2 w-full py-2 rounded-xl text-white text-xs font-semibold transition-all hover:opacity-90 active:scale-95"
                            style={{ background: accent }}>
                            Add to Cart
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ── Schedule a Gift CTA (invite mode) ────────────────────────────────── */}
      {mode === "invite" && (
        <div className="max-w-7xl mx-auto px-4 pb-8">
          <div className="rounded-2xl p-6 text-center"
            style={{ background: `linear-gradient(135deg, ${accent}15, ${accent}08)`,
                     border: `1px solid ${accent}30` }}>
            <p className="text-2xl mb-2">📬</p>
            <h3 className="font-bold text-gray-800 text-lg">Can't be there in person?</h3>
            <p className="text-gray-500 text-sm mt-1 mb-4">
              Schedule a postcard or gift to be delivered on the wedding day — we'll handle the rest.
            </p>
            <Link href="/gift-login"
              className="inline-block px-6 py-2.5 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90"
              style={{ background: accent }}>
              Schedule a Postcard or Gift →
            </Link>
          </div>
        </div>
      )}

      {/* ── Mobile filter drawer ──────────────────────────────────────────────── */}
      {mobileFilters && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setMobileFilters(false)} />
          <div className="fixed left-0 top-0 h-full w-72 bg-white z-50 overflow-y-auto p-5 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-800">Filters</h3>
              <button onClick={() => setMobileFilters(false)} className="text-gray-400">
                <X size={20} />
              </button>
            </div>
            <FiltersPanel />
          </div>
        </>
      )}

      {/* ── Cart Drawer ────────────────────────────────────────────────────────── */}
      <CartDrawer
        cart={cart}
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        accentColor={accent}
        onQtyChange={changeQty}
        onRemove={removeFromCart}
        onCheckout={handleCheckout}
        mode={mode}
        inviteSlug={inviteSlug}
      />

      {/* ── Checkout Modal ────────────────────────────────────────────────────── */}
      {checkoutOpen && (
        <CheckoutModal
          cart={cart}
          onClose={() => { setCheckoutOpen(false); if (cart.length === 0) {} }}
          accentColor={accent}
          mode={mode}
          inviteSlug={inviteSlug}
          isLoggedIn={isLoggedIn}
          onLoginRequired={() => {
            setCheckoutOpen(false);
            setLoginModalOpen(true);
          }}
        />
      )}

      {/* ── Inline Login Modal ─────────────────────────────────────────────────── */}
      {loginModalOpen && (
        <ShopLoginModal
          accentColor={accent}
          onSuccess={handleLoginSuccess}
          onClose={() => setLoginModalOpen(false)}
        />
      )}

      {/* Razorpay SDK */}
      <script src="https://checkout.razorpay.com/v1/checkout.js" async />
    </div>
  );
}
