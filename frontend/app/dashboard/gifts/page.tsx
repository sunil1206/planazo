"use client";
/**
 * /dashboard/gifts — Schedule & manage postcard and gift deliveries
 * Users can:
 *   - View all their scheduled deliveries
 *   - Schedule a new postcard or gift
 *   - Track fulfilment status
 *   - Pay via Razorpay
 */
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Gift, Mail, Plus, Search, Filter, Clock, Truck, CheckCircle,
  XCircle, AlertCircle, Package, Calendar, MapPin, User,
  ChevronRight, ChevronDown, ArrowLeft, Send, CreditCard,
} from "lucide-react";
import { giftApi } from "@/lib/api";
import toast from "react-hot-toast";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ScheduledDelivery {
  id: number;
  delivery_type: "GIFT" | "POSTCARD";
  delivery_type_display: string;
  product_name?: string;
  product_image_url?: string;
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

// ── Colours ───────────────────────────────────────────────────────────────────
const ACCENT   = "#0D9488";  // teal — gift pillar
const GOLD     = "#C9952A";
const ROSE     = "#B76E79";

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  SCHEDULED:   { icon: <Clock size={12} />,       color: "#1D4ED8", bg: "#DBEAFE" },
  IN_PROGRESS: { icon: <Package size={12} />,     color: "#92400E", bg: "#FEF3C7" },
  DISPATCHED:  { icon: <Truck size={12} />,       color: "#065F46", bg: "#D1FAE5" },
  DELIVERED:   { icon: <CheckCircle size={12} />, color: "#065F46", bg: "#D1FAE5" },
  CANCELLED:   { icon: <XCircle size={12} />,     color: "#991B1B", bg: "#FEE2E2" },
};

const PAY_MAP: Record<string, { color: string; bg: string }> = {
  PENDING:  { color: "#92400E", bg: "#FEF3C7" },
  PAID:     { color: "#065F46", bg: "#D1FAE5" },
  REFUNDED: { color: "#1D4ED8", bg: "#DBEAFE" },
};

function StatusBadge({ status, map }: { status: string; map: typeof STATUS_MAP | typeof PAY_MAP }) {
  const cfg = map[status] || { icon: null, color: "#374151", bg: "#F3F4F6" };
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ color: cfg.color, background: cfg.bg }}>
      {(cfg as any).icon} {status.replace("_", " ")}
    </span>
  );
}

// ── Schedule Form ─────────────────────────────────────────────────────────────
function ScheduleForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [step, setStep] = useState<"type" | "details" | "address" | "payment">("type");
  const [form, setForm] = useState({
    delivery_type:    "GIFT",
    postcard_message: "",
    postcard_template: "classic",
    occasion:         "",
    scheduled_date:   "",
    // Sender
    sender_name:    "", sender_email:  "", sender_phone: "",
    sender_address_line1: "", sender_city: "", sender_state: "", sender_pincode: "",
    // Recipient
    recipient_name:  "", recipient_email: "", recipient_phone: "",
    recipient_address_line1: "", recipient_address_line2: "",
    recipient_city:  "", recipient_state: "", recipient_pincode: "",
    // Amount (manual entry for gift price)
    amount: "",
  });
  const [loading, setLoading] = useState(false);
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [payDone, setPayDone] = useState(false);

  const updateForm = (key: string, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await giftApi.createScheduledDelivery(form) as any;
      setCreatedId(res.id);
      toast.success("Delivery scheduled! Proceeding to payment…");
      setStep("payment");
    } catch (e: any) {
      toast.error(e?.message || "Failed to create delivery. Check all fields.");
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    if (!createdId) return;
    setLoading(true);
    try {
      const res = await giftApi.createScheduledDeliveryPayment(createdId) as any;
      const Razorpay = (window as any).Razorpay;
      if (!Razorpay) { toast.error("Payment gateway not loaded"); return; }

      const rzp = new Razorpay({
        key:      res.key_id,
        amount:   res.amount,
        currency: "INR",
        order_id: res.razorpay_order_id,
        name:     "Planazo — Scheduled Delivery",
        description: `${form.delivery_type === "GIFT" ? "Gift" : "Postcard"} for ${form.recipient_name}`,
        handler: async (response: any) => {
          await giftApi.verifyScheduledDeliveryPayment(createdId, response);
          setPayDone(true);
          toast.success("Payment confirmed! We'll dispatch on schedule.");
          onSuccess();
        },
        prefill:  { name: form.sender_name, email: form.sender_email, contact: form.sender_phone },
        theme:    { color: ACCENT },
      });
      rzp.open();
    } catch (e: any) {
      toast.error(e?.message || "Payment initiation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b"
          style={{ background: ACCENT }}>
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <Gift size={20} />
            Schedule a {form.delivery_type === "GIFT" ? "Gift" : "Postcard"}
          </h2>
          <button onClick={onClose} className="text-white/80 hover:text-white text-xl">×</button>
        </div>

        {/* Steps indicator */}
        <div className="flex border-b">
          {["type", "details", "address", "payment"].map((s, i) => (
            <div key={s} className="flex-1 text-center py-2 text-xs font-medium"
              style={{
                color: step === s ? ACCENT : "#9CA3AF",
                borderBottom: step === s ? `2px solid ${ACCENT}` : "2px solid transparent",
              }}>
              {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
            </div>
          ))}
        </div>

        <div className="p-5">
          {/* Step 1: Type */}
          {step === "type" && (
            <div className="space-y-4">
              <p className="text-gray-500 text-sm">What would you like to send?</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { type: "GIFT",     icon: "🎁", label: "Physical Gift",    desc: "We pick, pack & ship a gift product" },
                  { type: "POSTCARD", icon: "📬", label: "Printed Postcard",  desc: "A beautiful printed card with your message" },
                ].map(opt => (
                  <button key={opt.type}
                    onClick={() => updateForm("delivery_type", opt.type)}
                    className={`p-4 rounded-xl border-2 text-left transition-all
                      ${form.delivery_type === opt.type
                        ? "border-teal-500 bg-teal-50"
                        : "border-gray-200 hover:border-teal-300"}`}>
                    <div className="text-3xl mb-2">{opt.icon}</div>
                    <p className="font-semibold text-sm text-gray-800">{opt.label}</p>
                    <p className="text-xs text-gray-500 mt-1">{opt.desc}</p>
                  </button>
                ))}
              </div>

              {form.delivery_type === "POSTCARD" && (
                <div className="space-y-3">
                  <label className="block text-xs text-gray-500">Postcard Message</label>
                  <textarea
                    rows={4}
                    placeholder="Write your heartfelt message here…"
                    value={form.postcard_message}
                    onChange={e => updateForm("postcard_message", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400 resize-none"
                  />
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Card Design</label>
                    <select value={form.postcard_template}
                      onChange={e => updateForm("postcard_template", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                      {["classic", "floral", "modern", "traditional", "cinematic"].map(t => (
                        <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Occasion</label>
                  <select value={form.occasion}
                    onChange={e => updateForm("occasion", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    <option value="">Select occasion</option>
                    {["Wedding", "Birthday", "Anniversary", "Baby Shower", "Diwali", "Christmas", "Other"].map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Dispatch Date</label>
                  <input type="date"
                    value={form.scheduled_date}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={e => updateForm("scheduled_date", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              {form.delivery_type === "GIFT" && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Gift Value (₹)</label>
                  <input type="number"
                    placeholder="e.g. 999"
                    value={form.amount}
                    onChange={e => updateForm("amount", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  <p className="text-xs text-gray-400 mt-1">
                    Our team will select a suitable gift within this budget
                  </p>
                </div>
              )}

              {form.delivery_type === "POSTCARD" && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Postcard Price (₹)</label>
                  <input type="number"
                    placeholder="e.g. 99"
                    value={form.amount}
                    onChange={e => updateForm("amount", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              )}

              <button onClick={() => setStep("details")}
                disabled={!form.scheduled_date || !form.occasion || !form.amount}
                className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-50"
                style={{ background: ACCENT }}>
                Next: Your Details →
              </button>
            </div>
          )}

          {/* Step 2: Sender Details */}
          {step === "details" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <button onClick={() => setStep("type")}
                  className="text-gray-400 hover:text-gray-600">
                  <ArrowLeft size={16} />
                </button>
                <h3 className="font-semibold text-gray-700">Your Details (Sender)</h3>
              </div>
              {[
                { key: "sender_name",  label: "Full Name",    type: "text" },
                { key: "sender_email", label: "Email",        type: "email" },
                { key: "sender_phone", label: "Phone",        type: "tel" },
                { key: "sender_address_line1", label: "Address", type: "text" },
                { key: "sender_city",  label: "City",         type: "text" },
                { key: "sender_state", label: "State",        type: "text" },
                { key: "sender_pincode", label: "PIN Code",   type: "text" },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                  <input type={f.type}
                    value={(form as any)[f.key]}
                    onChange={e => updateForm(f.key, e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400"
                  />
                </div>
              ))}
              <button onClick={() => setStep("address")}
                disabled={!form.sender_name || !form.sender_email}
                className="w-full py-3 rounded-xl text-white font-semibold mt-4 disabled:opacity-50"
                style={{ background: ACCENT }}>
                Next: Recipient Address →
              </button>
            </div>
          )}

          {/* Step 3: Recipient Address */}
          {step === "address" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <button onClick={() => setStep("details")} className="text-gray-400 hover:text-gray-600">
                  <ArrowLeft size={16} />
                </button>
                <h3 className="font-semibold text-gray-700">Recipient Details</h3>
              </div>
              {[
                { key: "recipient_name",  label: "Recipient Name", type: "text" },
                { key: "recipient_email", label: "Email (optional)", type: "email" },
                { key: "recipient_phone", label: "Phone (optional)", type: "tel" },
                { key: "recipient_address_line1", label: "Address Line 1", type: "text" },
                { key: "recipient_address_line2", label: "Address Line 2 (optional)", type: "text" },
                { key: "recipient_city",   label: "City",    type: "text" },
                { key: "recipient_state",  label: "State",   type: "text" },
                { key: "recipient_pincode",label: "PIN Code",type: "text" },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                  <input type={f.type}
                    value={(form as any)[f.key]}
                    onChange={e => updateForm(f.key, e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400"
                  />
                </div>
              ))}
              <button onClick={handleCreate}
                disabled={loading || !form.recipient_name || !form.recipient_address_line1 || !form.recipient_city || !form.recipient_pincode}
                className="w-full py-3 rounded-xl text-white font-semibold mt-4 disabled:opacity-50"
                style={{ background: ACCENT }}>
                {loading ? "Creating…" : "Confirm & Pay →"}
              </button>
            </div>
          )}

          {/* Step 4: Payment */}
          {step === "payment" && (
            <div className="text-center space-y-4 py-4">
              {payDone ? (
                <>
                  <div className="text-6xl">🎉</div>
                  <h3 className="text-xl font-bold text-gray-800">All Set!</h3>
                  <p className="text-gray-500 text-sm">
                    Your {form.delivery_type === "GIFT" ? "gift" : "postcard"} has been scheduled.
                    Our team will dispatch it on {form.scheduled_date}.
                  </p>
                  <button onClick={onClose}
                    className="px-6 py-3 rounded-xl text-white font-semibold"
                    style={{ background: ACCENT }}>
                    Done
                  </button>
                </>
              ) : (
                <>
                  <div className="text-5xl">💳</div>
                  <h3 className="font-bold text-gray-800 text-lg">Payment Required</h3>
                  <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Type</span>
                      <span className="font-medium">{form.delivery_type === "GIFT" ? "Physical Gift" : "Postcard"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>For</span>
                      <span className="font-medium">{form.recipient_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Date</span>
                      <span className="font-medium">{form.scheduled_date}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-bold text-gray-800">
                      <span>Total</span>
                      <span style={{ color: ACCENT }}>₹{parseFloat(form.amount).toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                  <button onClick={handlePay}
                    disabled={loading}
                    className="w-full py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: ACCENT }}>
                    <CreditCard size={18} />
                    {loading ? "Opening payment…" : `Pay ₹${parseFloat(form.amount).toLocaleString("en-IN")}`}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <script src="https://checkout.razorpay.com/v1/checkout.js" async />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function GiftsDashboardPage() {
  const router = useRouter();
  const [deliveries, setDeliveries] = useState<ScheduledDelivery[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState<string>("");
  const [showForm, setShowForm]     = useState(false);
  const [search, setSearch]         = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await giftApi.getScheduledDeliveries() as any;
      setDeliveries(Array.isArray(res) ? res : res?.results ?? []);
    } catch {
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const displayed = deliveries.filter(d => {
    if (filter && d.fulfilment_status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return d.recipient_name.toLowerCase().includes(q) ||
             d.occasion.toLowerCase().includes(q) ||
             d.sender_name.toLowerCase().includes(q);
    }
    return true;
  });

  const stats = {
    total:      deliveries.length,
    scheduled:  deliveries.filter(d => d.fulfilment_status === "SCHEDULED").length,
    dispatched: deliveries.filter(d => d.fulfilment_status === "DISPATCHED").length,
    delivered:  deliveries.filter(d => d.fulfilment_status === "DELIVERED").length,
    unpaid:     deliveries.filter(d => d.payment_status === "PENDING").length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: ACCENT }}>
              <Gift size={22} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-xl">My Scheduled Deliveries</h1>
              <p className="text-gray-400 text-sm">Manage your gift & postcard schedules</p>
            </div>
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold text-sm"
            style={{ background: ACCENT }}>
            <Plus size={16} />
            Schedule Delivery
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total",      value: stats.total,      icon: <Package size={18} />,      color: "#374151" },
            { label: "Scheduled",  value: stats.scheduled,  icon: <Clock size={18} />,         color: "#1D4ED8" },
            { label: "Dispatched", value: stats.dispatched, icon: <Truck size={18} />,         color: "#065F46" },
            { label: "Unpaid",     value: stats.unpaid,     icon: <AlertCircle size={18} />,   color: "#DC2626" },
          ].map(s => (
            <div key={s.label}
              className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-50"
                style={{ color: s.color }}>
                {s.icon}
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{s.value}</p>
                <p className="text-xs text-gray-400">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters & Search */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center bg-white border border-gray-200 rounded-xl px-3 py-2 gap-2 flex-1 min-w-48">
            <Search size={16} className="text-gray-400" />
            <input
              className="flex-1 text-sm outline-none placeholder-gray-400"
              placeholder="Search by name, occasion…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {["", "SCHEDULED", "IN_PROGRESS", "DISPATCHED", "DELIVERED", "CANCELLED"].map(f => (
              <button key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all
                  ${filter === f
                    ? "text-white border-transparent"
                    : "text-gray-600 bg-white border-gray-200 hover:bg-gray-50"}`}
                style={filter === f ? { background: ACCENT } : {}}>
                {f || "All"}
              </button>
            ))}
          </div>
        </div>

        {/* Deliveries List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 animate-pulse border border-gray-100">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-1/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
            <Gift size={48} className="mx-auto text-gray-200 mb-4" />
            <h3 className="font-semibold text-gray-600 text-lg">No deliveries found</h3>
            <p className="text-gray-400 text-sm mt-1 mb-6">
              Schedule a gift or postcard to surprise your loved ones!
            </p>
            <button onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-sm"
              style={{ background: ACCENT }}>
              <Plus size={15} /> Schedule First Delivery
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {displayed.map(d => (
              <div key={d.id}
                className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  {/* Type icon */}
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl"
                    style={{ background: d.delivery_type === "GIFT" ? "#F3E8FF" : "#E0F2FE" }}>
                    {d.delivery_type === "GIFT" ? "🎁" : "📬"}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className="font-semibold text-gray-800">
                          {d.delivery_type_display} → {d.recipient_name}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {d.occasion} · Dispatch: {new Date(d.scheduled_date).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </p>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <MapPin size={11} />
                          {d.recipient_city}, {d.recipient_state}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-gray-800">
                          ₹{parseFloat(d.amount).toLocaleString("en-IN")}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          #{d.id} · {new Date(d.created_at).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap mt-3">
                      <StatusBadge status={d.fulfilment_status} map={STATUS_MAP} />
                      <StatusBadge status={d.payment_status} map={PAY_MAP} />
                      {d.tracking_info && (
                        <span className="text-xs text-teal-600 flex items-center gap-1">
                          <Truck size={11} /> {d.tracking_info}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upgrade CTA */}
        <div className="rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4"
          style={{ background: `linear-gradient(135deg, ${ACCENT}15, ${GOLD}15)`,
                   border: `1px solid ${ACCENT}30` }}>
          <div className="flex-1">
            <h3 className="font-bold text-gray-800">Unlimited Scheduled Deliveries</h3>
            <p className="text-gray-500 text-sm mt-1">
              Upgrade to the Annual Plan for unlimited gift & postcard scheduling,
              priority dispatch, and a dedicated fulfilment manager.
            </p>
          </div>
          <Link href="/dashboard/settings"
            className="flex-shrink-0 px-5 py-2.5 rounded-xl text-white font-semibold text-sm whitespace-nowrap"
            style={{ background: GOLD }}>
            Upgrade Plan →
          </Link>
        </div>
      </div>

      {/* Schedule Form Modal */}
      {showForm && (
        <ScheduleForm
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}
