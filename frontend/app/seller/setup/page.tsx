"use client";
import { useState, useEffect } from "react";
import { sellerApi } from "@/lib/api";

function isDevMode() {
  if (typeof window === "undefined") return false;
  const t = localStorage.getItem("access_token");
  return !!t && t.startsWith("dev_");
}

export default function SellerSetupPage() {
  const [profile, setProfile]   = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);
  const [saved,   setSaved]     = useState(false);
  const [form, setForm]         = useState({
    business_name: "", description: "", phone: "", email: "",
    gstin: "", bank_account: "", ifsc: "",
  });

  useEffect(() => {
    sellerApi.getProfile()
      .then((d: any) => {
        setProfile(d);
        setForm({
          business_name: d.business_name || "",
          description:   d.description   || "",
          phone:         d.phone         || "",
          email:         d.email         || "",
          gstin:         d.gstin         || "",
          bank_account:  d.bank_account  || "",
          ifsc:          d.ifsc          || "",
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (profile) {
        await sellerApi.updateProfile(profile.id, form);
      } else {
        const d: any = await sellerApi.createProfile(form);
        setProfile(d);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      alert(err?.message || "Failed to save.");
    }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center h-full py-40 text-purple-400 text-4xl animate-pulse">⚙️</div>;

  // Dev mode notice — seller profile requires real auth
  if (isDevMode()) {
    return (
      <div className="p-8 max-w-xl">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">⚙️ Seller Setup</h1>
        <div className="mt-6 p-5 rounded-2xl border border-amber-200 bg-amber-50">
          <p className="text-sm font-semibold text-amber-800 mb-1">Dev mode active</p>
          <p className="text-sm text-amber-700">
            Seller setup requires a real account because it saves your profile under your user ID.
            Sign in with <strong>seller@test.com</strong> / <strong>test1234</strong> to test this page.
          </p>
        </div>
      </div>
    );
  }

  const inp = "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-purple-400 bg-white";

  const STATUS_INFO: Record<string, { label: string; color: string; desc: string }> = {
    PENDING:  { label: "Under Review",   color: "#F59E0B", desc: "Your application is being reviewed. Usually takes 24 hours." },
    APPROVED: { label: "Approved ✓",     color: "#10B981", desc: "You are fully verified! Your products are live." },
    REJECTED: { label: "Action Needed",  color: "#EF4444", desc: "Your application was rejected. Please update your details and resubmit." },
  };

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">⚙️ Seller Setup</h1>
      <p className="text-gray-400 text-sm mb-8">Complete your seller profile to start selling gift products.</p>

      {/* Status banner */}
      {profile && (
        <div className="mb-6 p-4 rounded-2xl flex items-start gap-3"
          style={{ background: STATUS_INFO[profile.status]?.color + "15", border: `1px solid ${STATUS_INFO[profile.status]?.color}30` }}>
          <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: STATUS_INFO[profile.status]?.color }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: STATUS_INFO[profile.status]?.color }}>
              {STATUS_INFO[profile.status]?.label}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{STATUS_INFO[profile.status]?.desc}</p>
          </div>
        </div>
      )}

      <form onSubmit={save} className="space-y-6">
        {/* Business Info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-700">Business Information</h2>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Business / Store Name *</label>
            <input required placeholder="e.g. Bloom Gifts India" value={form.business_name}
              onChange={e=>setForm(f=>({...f,business_name:e.target.value}))} className={inp} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">About Your Store</label>
            <textarea rows={3} placeholder="Describe what you sell…" value={form.description}
              onChange={e=>setForm(f=>({...f,description:e.target.value}))} className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Contact Phone</label>
              <input placeholder="+91 9876543210" value={form.phone}
                onChange={e=>setForm(f=>({...f,phone:e.target.value}))} className={inp} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Business Email</label>
              <input type="email" placeholder="store@example.com" value={form.email}
                onChange={e=>setForm(f=>({...f,email:e.target.value}))} className={inp} />
            </div>
          </div>
        </div>

        {/* Tax & Banking */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-700">Tax & Banking</h2>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">GSTIN (optional)</label>
            <input placeholder="27AAPFU0939F1ZV" value={form.gstin}
              onChange={e=>setForm(f=>({...f,gstin:e.target.value}))} className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Bank Account Number</label>
              <input placeholder="1234567890" value={form.bank_account}
                onChange={e=>setForm(f=>({...f,bank_account:e.target.value}))} className={inp} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">IFSC Code</label>
              <input placeholder="HDFC0001234" value={form.ifsc}
                onChange={e=>setForm(f=>({...f,ifsc:e.target.value}))} className={inp} />
            </div>
          </div>
          <p className="text-xs text-gray-400">
            Bank details are required for payout. Planazo deducts a {profile?.commission_pct || 10}% platform commission on each order.
          </p>
        </div>

        <button type="submit" disabled={saving}
          className="w-full py-4 rounded-2xl text-white font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #9B59B6, #C9952A)" }}>
          {saving ? "Saving…" : saved ? "✓ Saved!" : profile ? "Save Changes" : "Create Seller Account"}
        </button>
      </form>
    </div>
  );
}
