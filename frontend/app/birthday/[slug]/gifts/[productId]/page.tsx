"use client";
/**
 * Birthday gift order page — reuses the same gift system as wedding invitations
 * but in birthday context (no "deliver to couple" option, always custom address)
 */
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { giftApi } from "@/lib/api";

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan",
  "Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Delhi","Jammu & Kashmir","Ladakh","Puducherry",
];

function loadRazorpay(): Promise<boolean> {
  return new Promise(resolve => {
    if ((window as any).Razorpay) { resolve(true); return; }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload  = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function BirthdayGiftOrderPage() {
  const params    = useParams();
  const slug      = params?.slug as string;
  const productId = params?.productId as string;

  const [product,  setProduct]  = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const [paying,   setPaying]   = useState(false);
  const [success,  setSuccess]  = useState<any>(null);
  const [celebrant,setCelebrant]= useState("");

  const [form, setForm] = useState({
    sender_name:   "",
    sender_email:  "",
    sender_phone:  "",
    message:       "",
    recipient_name:"",
    address_line1: "",
    address_line2: "",
    city:          "",
    state:         "",
    pincode:       "",
  });

  useEffect(() => {
    giftApi.getProduct(productId)
      .then((d: any) => { setProduct(d); setLoading(false); })
      .catch(() => setLoading(false));

    fetch(`${process.env.NEXT_PUBLIC_API_URL||""}/api/birthday/public/${slug}/`)
      .then(r => r.json())
      .then((d: any) => setCelebrant(d.celebrant || ""))
      .catch(() => {});
  }, [productId, slug]);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setPaying(true);

    try {
      const order: any = await giftApi.createOrder({
        product:        product.id,
        delivery_type:  "CUSTOM",
        ...form,
        country: "India",
      });

      const loaded = await loadRazorpay();
      if (!loaded) { setPaying(false); alert("Payment gateway failed to load."); return; }

      const rzp = new (window as any).Razorpay({
        key:         order.key_id,
        amount:      order.amount,
        currency:    "INR",
        name:        "Planazo Gifts",
        description: `Birthday Gift: ${product.name}`,
        order_id:    order.rzp_order_id,
        prefill:     { name: form.sender_name, email: form.sender_email, contact: form.sender_phone },
        theme:       { color: "#9B59B6" },
        handler: async (response: any) => {
          try {
            const result: any = await giftApi.verifyPayment({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
            });
            setSuccess({ ...result, product_name: product.name, amount: product.price });
          } catch {
            alert("Payment verification failed. Please contact support.");
          } finally {
            setPaying(false);
          }
        },
        modal: { ondismiss: () => setPaying(false) },
      });
      rzp.open();
    } catch (err: any) {
      setPaying(false);
      alert(err?.message || "Failed to create order. Please try again.");
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#FDF8FF" }}>
      <div className="text-purple-400 text-4xl animate-pulse">🎁</div>
    </div>
  );

  if (!product) return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "#FDF8FF" }}>
      <p className="text-gray-400 mb-4">Product not found.</p>
      <Link href={`/birthday/${slug}/gifts`} className="text-purple-600 underline">← Browse gifts</Link>
    </div>
  );

  if (success) return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#FDF8FF" }}>
      <div className="max-w-md w-full text-center p-10 rounded-3xl bg-white shadow-xl border border-purple-100">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Gift Sent!</h2>
        <p className="text-gray-500 mb-6 text-sm">{success.message}</p>
        <div className="text-left space-y-2 p-4 rounded-2xl mb-6" style={{ background: "#F5F0FF" }}>
          <p className="text-sm text-gray-600"><span className="font-medium">Gift:</span> {success.product_name}</p>
          <p className="text-sm text-gray-600"><span className="font-medium">Amount:</span> ₹{parseFloat(success.amount).toLocaleString("en-IN")}</p>
          <p className="text-sm text-gray-600"><span className="font-medium">Order #:</span> {success.order_id}</p>
        </div>
        <Link href={`/birthday/${slug}`}
          className="inline-block px-6 py-3 rounded-2xl text-white font-medium"
          style={{ background: "#9B59B6" }}>
          ← Back to {celebrant}'s Party
        </Link>
      </div>
    </div>
  );

  const API    = process.env.NEXT_PUBLIC_API_URL || "";
  const imgSrc = product.image
    ? (product.image.startsWith("http") ? product.image : `${API}${product.image}`)
    : null;

  const inp = "w-full px-4 py-3 rounded-xl text-sm border border-gray-200 focus:border-purple-400 focus:ring-1 focus:ring-purple-200 outline-none transition-all";

  return (
    <div className="min-h-screen" style={{ background: "#FDF8FF" }}>
      {/* Header */}
      <div className="py-6 px-6 border-b border-gray-100 bg-white">
        <div className="max-w-4xl mx-auto">
          <Link href={`/birthday/${slug}/gifts`} className="text-xs text-gray-400 hover:text-purple-600 flex items-center gap-1 mb-1">
            ← Back to gifts
          </Link>
          <h1 className="text-xl font-semibold text-gray-800">Send a Birthday Gift 🎂</h1>
          {celebrant && <p className="text-sm text-gray-400">to {celebrant}</p>}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 grid md:grid-cols-2 gap-10">
        {/* Product Summary */}
        <div>
          <div className="rounded-2xl overflow-hidden bg-white shadow-sm border border-gray-100 mb-6">
            {imgSrc ? (
              <img src={imgSrc} alt={product.name} className="w-full h-56 object-cover" />
            ) : (
              <div className="w-full h-56 flex items-center justify-center text-6xl" style={{ background: "#F5F0FF" }}>
                {product.category_emoji || "🎁"}
              </div>
            )}
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-semibold text-gray-800 text-lg">{product.name}</h2>
                <span className="text-lg font-bold whitespace-nowrap" style={{ color: "#9B59B6" }}>
                  ₹{parseFloat(product.price).toLocaleString("en-IN")}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">{product.description}</p>
            </div>
          </div>

          {/* Perks */}
          <div className="space-y-3">
            {[["🚚","Free delivery across India"],["🎂","Birthday surprise delivery"],["💌","Personalised card included"],["🔒","Secure Razorpay payment"]].map(([icon,text]) => (
              <div key={text} className="flex items-center gap-3 text-sm text-gray-500">
                <span className="text-base">{icon}</span>{text}
              </div>
            ))}
          </div>
        </div>

        {/* Order Form */}
        <form onSubmit={handlePay} className="space-y-5">
          <div>
            <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Your Details</h3>
            <div className="space-y-3">
              <input required placeholder="Your name *" value={form.sender_name} onChange={e=>setForm(f=>({...f,sender_name:e.target.value}))} className={inp} />
              <input required type="email" placeholder="Email address *" value={form.sender_email} onChange={e=>setForm(f=>({...f,sender_email:e.target.value}))} className={inp} />
              <input placeholder="Phone number" value={form.sender_phone} onChange={e=>setForm(f=>({...f,sender_phone:e.target.value}))} className={inp} />
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">🎂 Birthday Message</h3>
            <textarea rows={3} placeholder="Write a birthday message for the card…"
              value={form.message} onChange={e=>setForm(f=>({...f,message:e.target.value}))} className={inp} />
          </div>

          <div>
            <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Delivery Address</h3>
            <div className="space-y-3">
              <input required placeholder="Recipient name *" value={form.recipient_name} onChange={e=>setForm(f=>({...f,recipient_name:e.target.value}))} className={inp} />
              <input required placeholder="Address line 1 *" value={form.address_line1} onChange={e=>setForm(f=>({...f,address_line1:e.target.value}))} className={inp} />
              <input placeholder="Address line 2" value={form.address_line2} onChange={e=>setForm(f=>({...f,address_line2:e.target.value}))} className={inp} />
              <div className="grid grid-cols-2 gap-3">
                <input required placeholder="City *" value={form.city} onChange={e=>setForm(f=>({...f,city:e.target.value}))} className={inp} />
                <input required placeholder="Pincode *" value={form.pincode} onChange={e=>setForm(f=>({...f,pincode:e.target.value}))} className={inp} />
              </div>
              <select required value={form.state} onChange={e=>setForm(f=>({...f,state:e.target.value}))} className={inp + " bg-white"}>
                <option value="">Select State *</option>
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <button type="submit" disabled={paying}
            className="w-full py-4 rounded-2xl text-white font-semibold text-lg hover:scale-[1.02] active:scale-100 transition-all shadow-lg disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #9B59B6, #C9952A)" }}>
            {paying ? "Processing…" : `Pay ₹${parseFloat(product.price).toLocaleString("en-IN")} 🎂`}
          </button>
        </form>
      </div>
    </div>
  );
}
