"use client";
/**
 * /dashboard/vendor-manager — WeddingWire-inspired My Vendors page
 * Tabs: All / Favorites / Booked
 * Add vendors (business name, category, contact, status, notes, budget)
 * Search, filter by category, status pills
 */
import { useState, useEffect } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
type VendorStatus = "researching" | "contacted" | "meeting" | "booked" | "paid";

interface MyVendor {
  id: string;
  name: string;
  category: string;
  phone: string;
  email: string;
  website: string;
  city: string;
  budget: string;
  status: VendorStatus;
  notes: string;
  isFavorite: boolean;
  createdAt: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const VENDOR_CATEGORIES = [
  { name: "Photography",    emoji: "📷" },
  { name: "Videography",    emoji: "🎥" },
  { name: "Venue",          emoji: "🏛️" },
  { name: "Catering",       emoji: "🍽️" },
  { name: "Décor & Flowers",emoji: "🌸" },
  { name: "Bridal Makeup",  emoji: "💄" },
  { name: "Mehndi Artist",  emoji: "🌿" },
  { name: "DJ / Music",     emoji: "🎵" },
  { name: "Bridal Wear",    emoji: "👗" },
  { name: "Groom Wear",     emoji: "🤵" },
  { name: "Jewellery",      emoji: "💎" },
  { name: "Wedding Cake",   emoji: "🎂" },
  { name: "Transport",      emoji: "🚗" },
  { name: "Invitations",    emoji: "💌" },
  { name: "Pandit / Priest",emoji: "🙏" },
  { name: "Event Mgmt",     emoji: "🎪" },
  { name: "Choreographer",  emoji: "💃" },
  { name: "Tent & Lighting",emoji: "💡" },
  { name: "Honeymoon",      emoji: "✈️" },
  { name: "Gifts & Favors", emoji: "🎁" },
  { name: "Other",          emoji: "📦" },
];

const STATUS_CONFIG: Record<VendorStatus, { label: string; color: string; bg: string }> = {
  researching: { label: "Researching",  color: "#6B7280", bg: "#F3F4F6" },
  contacted:   { label: "Contacted",    color: "#D97706", bg: "#FEF3C7" },
  meeting:     { label: "Meeting Set",  color: "#7C3AED", bg: "#EDE9FE" },
  booked:      { label: "Booked ✓",    color: "#059669", bg: "#D1FAE5" },
  paid:        { label: "Paid ✓",      color: "#10B981", bg: "#A7F3D0" },
};

const STORAGE_KEY = "snapshare_my_vendors";

function load(): MyVendor[] {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}

function save(vendors: MyVendor[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(vendors)); } catch {}
}

// ── Empty form ─────────────────────────────────────────────────────────────────
const EMPTY: Omit<MyVendor, "id" | "isFavorite" | "createdAt"> = {
  name: "", category: "Photography", phone: "", email: "", website: "",
  city: "", budget: "", status: "researching", notes: "",
};

const inp = "w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-rose-300 bg-white";

// ── Main component ────────────────────────────────────────────────────────────
export default function VendorManagerPage() {
  const [vendors,    setVendors]    = useState<MyVendor[]>([]);
  const [tab,        setTab]        = useState<"all" | "favorites" | "booked">("all");
  const [catFilter,  setCatFilter]  = useState("all");
  const [search,     setSearch]     = useState("");
  const [showForm,   setShowForm]   = useState(false);
  const [editId,     setEditId]     = useState<string | null>(null);
  const [form,       setForm]       = useState({ ...EMPTY });

  useEffect(() => { setVendors(load()); }, []);
  useEffect(() => { save(vendors); }, [vendors]);

  // Filtered view
  const visible = vendors.filter(v => {
    if (tab === "favorites" && !v.isFavorite) return false;
    if (tab === "booked" && v.status !== "booked" && v.status !== "paid") return false;
    if (catFilter !== "all" && v.category !== catFilter) return false;
    if (search && !v.name.toLowerCase().includes(search.toLowerCase()) && !v.city.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openNew = () => {
    setEditId(null);
    setForm({ ...EMPTY });
    setShowForm(true);
  };

  const openEdit = (v: MyVendor) => {
    setEditId(v.id);
    setForm({ name: v.name, category: v.category, phone: v.phone, email: v.email, website: v.website, city: v.city, budget: v.budget, status: v.status, notes: v.notes });
    setShowForm(true);
  };

  const saveForm = () => {
    if (!form.name.trim()) return;
    if (editId) {
      setVendors(vs => vs.map(v => v.id === editId ? { ...v, ...form } : v));
    } else {
      const nv: MyVendor = { ...form, id: `v-${Date.now()}`, isFavorite: false, createdAt: new Date().toISOString() };
      setVendors(vs => [...vs, nv]);
    }
    setShowForm(false);
  };

  const del = (id: string) => setVendors(vs => vs.filter(v => v.id !== id));
  const toggleFav = (id: string) => setVendors(vs => vs.map(v => v.id === id ? { ...v, isFavorite: !v.isFavorite } : v));
  const updateStatus = (id: string, status: VendorStatus) => setVendors(vs => vs.map(v => v.id === id ? { ...v, status } : v));

  const booked = vendors.filter(v => v.status === "booked" || v.status === "paid").length;
  const totalBudget = vendors
    .filter(v => v.budget)
    .reduce((s, v) => s + (parseFloat(v.budget.replace(/[^0-9.]/g, "")) || 0), 0);

  const catEmoji = (cat: string) => VENDOR_CATEGORIES.find(c => c.name === cat)?.emoji || "📦";

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🤝 My Vendors</h1>
          <p className="text-sm text-gray-400 mt-0.5">Track all your wedding vendors in one place</p>
        </div>
        <button onClick={openNew}
          className="px-4 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition shadow-sm">
          + Add Vendor
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Vendors",   value: vendors.length,     color: "#6B7280" },
          { label: "Booked",          value: booked,             color: "#059669" },
          { label: "Favorites",       value: vendors.filter(v => v.isFavorite).length, color: "#E91E63" },
          { label: "Est. Budget",     value: totalBudget > 0 ? `₹${totalBudget.toLocaleString("en-IN")}` : "—", color: "#8B1A4A" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
            <p className="text-lg font-bold" style={{ color }}>{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs + Search */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-5 p-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {(["all","favorites","booked"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition ${tab === t ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>
                {t === "all" ? `All (${vendors.length})` : t === "favorites" ? `❤️ Favorites` : `✅ Booked`}
              </button>
            ))}
          </div>
          <input
            type="text" placeholder="Search vendors…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-rose-300 w-48"
          />
        </div>

        {/* Category filter pills */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          <button onClick={() => setCatFilter("all")}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition ${catFilter === "all" ? "bg-rose-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            All Categories
          </button>
          {VENDOR_CATEGORIES.map(c => (
            <button key={c.name} onClick={() => setCatFilter(c.name)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition whitespace-nowrap ${catFilter === c.name ? "bg-rose-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {c.emoji} {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Vendor List */}
      {visible.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <div className="text-5xl mb-3">🤝</div>
          <p className="text-gray-500 font-medium">No vendors yet</p>
          <p className="text-gray-400 text-sm mt-1">Add your first vendor to start tracking</p>
          <button onClick={openNew} className="mt-4 px-5 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition">
            + Add Vendor
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(v => {
            const st = STATUS_CONFIG[v.status];
            return (
              <div key={v.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-rose-100 transition group">
                <div className="flex items-start gap-4">
                  {/* Emoji icon */}
                  <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-xl flex-shrink-0">
                    {catEmoji(v.category)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <h3 className="font-semibold text-gray-900 text-base">{v.name}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">{v.category}{v.city ? ` · ${v.city}` : ""}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Status pill */}
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{ color: st.color, background: st.bg }}>
                          {st.label}
                        </span>
                        {/* Favorite */}
                        <button onClick={() => toggleFav(v.id)}
                          className={`text-lg transition ${v.isFavorite ? "text-rose-500" : "text-gray-200 hover:text-rose-300"}`}>
                          ♥
                        </button>
                      </div>
                    </div>

                    {/* Details row */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                      {v.phone  && <span>📞 {v.phone}</span>}
                      {v.email  && <span>✉️ {v.email}</span>}
                      {v.budget && <span>💰 ₹{v.budget}</span>}
                      {v.website && <a href={v.website} target="_blank" rel="noopener" className="text-blue-500 hover:underline">🔗 Website</a>}
                    </div>
                    {v.notes && <p className="text-xs text-gray-400 mt-2 italic">"{v.notes}"</p>}

                    {/* Status update + actions */}
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <select
                        value={v.status}
                        onChange={e => updateStatus(v.id, e.target.value as VendorStatus)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-rose-300"
                      >
                        {Object.entries(STATUS_CONFIG).map(([k, cfg]) => (
                          <option key={k} value={k}>{cfg.label}</option>
                        ))}
                      </select>
                      <button onClick={() => openEdit(v)}
                        className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50 transition">
                        Edit
                      </button>
                      <button onClick={() => del(v.id)}
                        className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition">
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Category Quick-Add Grid */}
      {vendors.length === 0 && (
        <div className="mt-8">
          <p className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">Start by adding vendors for:</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {VENDOR_CATEGORIES.slice(0, 14).map(c => (
              <button key={c.name} onClick={() => { setForm({ ...EMPTY, category: c.name }); setEditId(null); setShowForm(true); }}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white border border-gray-100 hover:border-rose-200 hover:bg-rose-50 transition text-xs text-gray-600 font-medium shadow-sm">
                <span className="text-2xl">{c.emoji}</span>
                <span className="text-center leading-tight">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 w-full sm:max-w-lg shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between mb-5">
              <h3 className="text-lg font-bold">{editId ? "Edit Vendor" : "Add Vendor"}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 text-2xl leading-none">×</button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Vendor / Business Name *</label>
                  <input placeholder="e.g. Rajan Studio, Grand Palace Hotel" value={form.name}
                    onChange={e => setForm(f => ({...f, name: e.target.value}))} className={inp} />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} className={inp}>
                    {VENDOR_CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.emoji} {c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value as VendorStatus}))} className={inp}>
                    {Object.entries(STATUS_CONFIG).map(([k, cfg]) => <option key={k} value={k}>{cfg.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Phone</label>
                  <input placeholder="+91 98765 43210" value={form.phone}
                    onChange={e => setForm(f => ({...f, phone: e.target.value}))} className={inp} />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">City</label>
                  <input placeholder="e.g. Kochi" value={form.city}
                    onChange={e => setForm(f => ({...f, city: e.target.value}))} className={inp} />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Email</label>
                <input type="email" placeholder="vendor@example.com" value={form.email}
                  onChange={e => setForm(f => ({...f, email: e.target.value}))} className={inp} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Website / Instagram</label>
                  <input placeholder="https://..." value={form.website}
                    onChange={e => setForm(f => ({...f, website: e.target.value}))} className={inp} />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Budget (₹)</label>
                  <input placeholder="e.g. 45000" value={form.budget}
                    onChange={e => setForm(f => ({...f, budget: e.target.value}))} className={inp} />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Notes</label>
                <textarea rows={2} placeholder="Availability, package details, contact person…"
                  value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} className={inp} />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={saveForm} disabled={!form.name.trim()}
                className="flex-1 py-3 rounded-xl bg-rose-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-rose-700 transition">
                {editId ? "Save Changes" : "Add Vendor"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
