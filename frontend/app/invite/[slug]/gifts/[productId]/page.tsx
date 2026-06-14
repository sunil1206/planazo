"use client";
/**
 * /invite/[slug]/gifts/[productId]  — Gift order page
 * Delivery options: Couple's address OR custom address
 * Razorpay payment flow
 */
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { giftApi, invitationApi } from "@/lib/api";
import toast from "react-hot-toast";

declare global { interface Window { Razorpay: any; } }

interface Product {
  id: number; name: string; description: string; price: string;
  image: string | null; category_name: string; category_emoji: string;
}

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa",
  "Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala",
  "Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland",
  "Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura",
  "Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Jammu & Kashmir",
  "Ladakh","Puducherry","Chandigarh",
];

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window.Razorpay !== "undefined") return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function GiftOrderPage() {
  const params    = useParams();
  const router    = useRouter();
  const slug      = params?.slug as string;
  const productId = params?.productId as string;
  const API       = process.env.NEXT_PUBLIC_API_URL || "";

  const [product,  setProduct]  = useState<Product | null>(null);
  const [couple,   setCouple]   = useState<string>("");
  const [websiteId, setWebsiteId] = useState<number | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [paying,   setPaying]   = useState(false);
  const [success,  setSuccess]  = useState(false);

  const [delivery, setDelivery] = useState<"COUPLE" | "CUSTOM">("COUPLE");
  const [form, setForm] = useState({
    sender_name:    "",
    sender_email:   "",
    sender_phone:   "",
    message:        "",
    recipient_name: "",
    address_line1:  "",
    address_line2:  "",
    city:           "",
    state:          "",
    pincode:        "",
    country:        "India",
  });

  useEffect(() => {
    Promise.all([
      giftApi.getProduct(productId),
      invitationApi.getPublic(slug),
    ]).then(([prod, inv]: any[]) => {
      setProduct(prod);
      setCouple(inv.couple || "");
      setWebsiteId(inv.id);
    }).catch(() => {
      toast.error("Gift not found");
    }).finally(() => setLoading(false));
  }, [slug, productId]);

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setPaying(true);

    try {
      // Step 1 — create order in backend
      const orderData: any = {
        product:       product.id,
        website:       websiteId,
        sender_name:   form.sender_name,
        sender_email:  form.sender_email,
        sender_phone:  form.sender_phone,
        message:       form.message,
        delivery_type: delivery,
      };
      if (delivery === "CUSTOM") {
        Object.assign(orderData, {
          recipient_name: form.recipient_name,
          address_line1:  form.address_line1,
          address_line2:  form.address_line2,
          city:           form.city,
          state:          form.state,
          pincode:        form.pincode,
          country:        form.country,
        });
      }

      const order: any = await giftApi.createOrder(orderData);

      // If no Razorpay order (dev mode without keys), skip payment
      if (!order.rzp_order_id) {
        setSuccess(true);
        setPaying(false);
        return;
      }

      // Step 2 — load Razorpay and open checkout
      const loaded = await loadRazorpay();
      if (!loaded) {
        toast.error("Could not load payment gateway. Please try again.");
        setPaying(false);
        return;
      }

      const rzp = new window.Razorpay({
        key:         order.key_id,
        amount:      order.amount,
        currency:    "INR",
        order_id:    order.rzp_order_id,
        name:        "Planazo Gifts",
        description: `Gift for ${couple} — ${product.name}`,
        image:       "/logo.png",
        prefill: {
          name:  form.sender_name,
          email: form.sender_email,
          contact: form.sender_phone,
        },
        theme: { color: "#8B1A4A" },
        handler: async (response: any) => {
          try {
            await giftApi.verifyPayment({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
            });
            setSuccess(true);
          } catch {
            toast.error("Payment verification failed. Contact support.");
          } finally {
            setPaying(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPaying(false);
            toast("Payment cancelled.");
          },
        },
      });
      rzp.open();
    } catch (err: any) {
      const msg = await (err?.response?.json() as Promise<any> | undefined)?.catch(() => null) as any;
      toast.error(msg?.error || "Failed to place order. Please try again.");
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#FDF8F4" }}>
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-4 border-t-[#8B1A4A] border-gray-200 animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">Loading gift…</p>
        </div>
      </div>
    );
  }

  if (!product) return null;

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6"
        style={{ background: "linear-gradient(135deg, #FDF8F4, #FFF0F5)" }}>
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4 animate-bounce">🎉</div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Gift Sent!</h2>
          <p className="text-gray-500 mb-2">
            Your gift of <strong>{product.name}</strong> is on its way to{" "}
            <strong>{delivery === "COUPLE" ? couple : form.recipient_name}</strong>!
          </p>
          <p className="text-sm text-gray-400 mb-6">
            A confirmation has been sent to {form.sender_email}
          </p>
          <div className="bg-white rounded-2xl p-5 border border-gray-100 mb-6 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Gift</span>
              <span className="font-medium">{product.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Amount</span>
              <span className="font-medium" style={{ color: "#8B1A4A" }}>
                ₹{parseFloat(product.price).toLocaleString("en-IN")}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Delivery</span>
              <span className="font-medium">
                {delivery === "COUPLE" ? `To ${couple}` : form.city}
              </span>
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <Link href={`/invite/${slug}`}
              className="px-5 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50">
              ← Back to Invitation
            </Link>
            <Link href={`/invite/${slug}/gifts`}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-white"
              style={{ background: "#8B1A4A" }}>
              Send More Gifts
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const imgSrc = product.image
    ? (product.image.startsWith("http") ? product.image : `${API}${product.image}`)
    : null;

  return (
    <div className="min-h-screen" style={{ background: "#FDF8F4" }}>
      {/* Back */}
      <div className="max-w-4xl mx-auto px-4 pt-6">
        <Link href={`/invite/${slug}/gifts`}
          className="text-sm text-gray-500 hover:text-gray-800">
          ← Back to gift store
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid md:grid-cols-2 gap-8">

          {/* Product card */}
          <div>
            <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
              <div className="h-64 bg-gradient-to-br from-rose-50 to-amber-50 flex items-center justify-center">
                {imgSrc ? (
                  <img src={imgSrc} alt={product.name}
                    className="w-full h-full object-cover" />
                ) : (
                  <span className="text-7xl opacity-50">{product.category_emoji || "🎁"}</span>
                )}
              </div>
              <div className="p-5">
                <span className="text-xs font-medium px-2 py-1 rounded-full mb-2 inline-block"
                  style={{ background: "#FFF0F5", color: "#8B1A4A" }}>
                  {product.category_emoji} {product.category_name}
                </span>
                <h1 className="text-xl font-semibold text-gray-900 mb-2">{product.name}</h1>
                <p className="text-sm text-gray-500 mb-4 leading-relaxed">{product.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold" style={{ color: "#8B1A4A" }}>
                    ₹{parseFloat(product.price).toLocaleString("en-IN")}
                  </span>
                  <div className="text-xs text-gray-400">incl. free delivery</div>
                </div>
              </div>
            </div>

            {/* Why send */}
            <div className="mt-4 space-y-2">
              {[
                ["🎁", "Delivered as a surprise to the couple"],
                ["💌", "Your message printed on a gift card"],
                ["🚚", "Free delivery within 3–5 business days"],
                ["↩️",  "Easy returns within 7 days if damaged"],
              ].map(([icon, text]) => (
                <div key={text} className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{icon}</span><span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Order form */}
          <div>
            <form onSubmit={handleOrder} className="space-y-5">

              {/* ── Delivery type ─────────────── */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <h2 className="font-semibold text-gray-800 mb-3">📦 Delivery Option</h2>
                <div className="space-y-2">
                  <label className={
                    "flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all " +
                    (delivery === "COUPLE"
                      ? "border-[#8B1A4A] bg-rose-50"
                      : "border-gray-200 hover:border-gray-300")
                  }>
                    <input type="radio" name="delivery" value="COUPLE"
                      checked={delivery === "COUPLE"}
                      onChange={() => setDelivery("COUPLE")}
                      className="mt-0.5 accent-[#8B1A4A]" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        💑 Send directly to {couple || "the couple"}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        We'll deliver to their registered wedding address — as a complete surprise!
                      </p>
                    </div>
                  </label>

                  <label className={
                    "flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all " +
                    (delivery === "CUSTOM"
                      ? "border-[#8B1A4A] bg-rose-50"
                      : "border-gray-200 hover:border-gray-300")
                  }>
                    <input type="radio" name="delivery" value="CUSTOM"
                      checked={delivery === "CUSTOM"}
                      onChange={() => setDelivery("CUSTOM")}
                      className="mt-0.5 accent-[#8B1A4A]" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        📍 Deliver to a custom address
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Enter any delivery address — great for sending ahead of the wedding
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* ── Custom address ────────────── */}
              {delivery === "CUSTOM" && (
                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                  <h2 className="font-semibold text-gray-800 mb-3">📍 Delivery Address</h2>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1">Recipient Name *</label>
                      <input required value={form.recipient_name}
                        onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
                        placeholder="Who will receive this gift?"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#8B1A4A]" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1">Address Line 1 *</label>
                      <input required value={form.address_line1}
                        onChange={(e) => setForm({ ...form, address_line1: e.target.value })}
                        placeholder="House/Flat no., Street, Area"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#8B1A4A]" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1">Address Line 2</label>
                      <input value={form.address_line2}
                        onChange={(e) => setForm({ ...form, address_line2: e.target.value })}
                        placeholder="Landmark, Colony (optional)"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#8B1A4A]" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-500 block mb-1">City *</label>
                        <input required value={form.city}
                          onChange={(e) => setForm({ ...form, city: e.target.value })}
                          placeholder="Mumbai"
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#8B1A4A]" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 block mb-1">PIN Code *</label>
                        <input required value={form.pincode}
                          onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                          placeholder="400001" maxLength={6} pattern="[0-9]{6}"
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#8B1A4A]" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1">State *</label>
                      <select required value={form.state}
                        onChange={(e) => setForm({ ...form, state: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#8B1A4A] bg-white">
                        <option value="">— Select state —</option>
                        {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Sender details ────────────── */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <h2 className="font-semibold text-gray-800 mb-3">👤 Your Details</h2>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Your Name *</label>
                    <input required value={form.sender_name}
                      onChange={(e) => setForm({ ...form, sender_name: e.target.value })}
                      placeholder="Your full name"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#8B1A4A]" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1">Email *</label>
                      <input required type="email" value={form.sender_email}
                        onChange={(e) => setForm({ ...form, sender_email: e.target.value })}
                        placeholder="you@email.com"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#8B1A4A]" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1">Phone</label>
                      <input type="tel" value={form.sender_phone}
                        onChange={(e) => setForm({ ...form, sender_phone: e.target.value })}
                        placeholder="+91 XXXXX XXXXX"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#8B1A4A]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Gift message card ─────────── */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <h2 className="font-semibold text-gray-800 mb-1">💌 Gift Message Card</h2>
                <p className="text-xs text-gray-400 mb-3">
                  Write a personal message — it will be printed on a beautiful card and included with the gift.
                </p>
                <textarea value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder={`Wishing ${couple || "you"} a lifetime of love and happiness! 💍`}
                  rows={4}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#8B1A4A] resize-none" />
              </div>

              {/* ── Order summary + Pay ────────── */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <h2 className="font-semibold text-gray-800 mb-3">🛒 Order Summary</h2>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{product.name}</span>
                    <span className="font-medium">₹{parseFloat(product.price).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Delivery</span>
                    <span className="font-medium text-green-600">FREE</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Gift card message</span>
                    <span className="font-medium text-green-600">FREE</span>
                  </div>
                  <div className="border-t border-gray-100 pt-2 flex justify-between">
                    <span className="font-semibold text-gray-800">Total</span>
                    <span className="font-bold text-lg" style={{ color: "#8B1A4A" }}>
                      ₹{parseFloat(product.price).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                <button type="submit" disabled={paying}
                  className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #8B1A4A, #C9952A)" }}>
                  {paying ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                        <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Processing payment…
                    </span>
                  ) : (
                    `Pay ₹${parseFloat(product.price).toLocaleString("en-IN")} & Send Gift 🎁`
                  )}
                </button>
                <p className="text-xs text-gray-400 text-center mt-2">
                  Secured by Razorpay · UPI, Cards, Net Banking accepted
                </p>
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
