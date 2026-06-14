"use client";
/**
 * /vendor/packages — Vendor manages their pricing packages
 * Create · Edit · Mark popular · Delete
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { vendorApi } from "@/lib/api";
import toast from "react-hot-toast";
import { Plus, Trash2, Edit3, Star, Loader2, CheckCircle2 } from "lucide-react";

// Popular pre-set templates vendors can quick-fill
const TEMPLATES: Record<string, any> = {
  PHOTOGRAPHER: [
    { name: "Essential",  price: 15000, features: ["4 hours coverage","300+ edited photos","Online gallery","1 photographer"], delivery_days: 20, max_hours: 4 },
    { name: "Classic",    price: 30000, features: ["8 hours coverage","700+ edited photos","Cinematic reel","2 photographers","Same-day previews"], delivery_days: 30, max_hours: 8, is_popular: true },
    { name: "Elite",      price: 60000, features: ["Full day coverage","1500+ photos","Drone shots","Highlights film","Printed album","Unlimited photographers"], delivery_days: 45, max_hours: 14 },
  ],
  DECOR: [
    { name: "Simple",    price: 25000, features: ["Basic florals","Stage backdrop","2 colour scheme","Setup & teardown"] },
    { name: "Grand",     price: 75000, features: ["Premium florals","LED lighting","Stage + entrance","Custom centrepieces","Props included"], is_popular: true },
    { name: "Luxe",      price: 150000, features: ["Imported florals","Chandelier lighting","360° decor","Drone stage","Full venue transformation","On-site coordinator"] },
  ],
  CATERING: [
    { name: "Veg Basic",    price: 400,  features: ["Per plate","South Indian menu","3 curries","Dessert","Water"] },
    { name: "Multi-Cuisine", price: 700,  features: ["Per plate","6 cuisines","Live counters","Mocktails","Dessert station"], is_popular: true },
    { name: "Royal Feast",  price: 1200, features: ["Per plate","10 cuisines","Live kitchen","Premium desserts","Dedicated service staff","Custom menu"] },
  ],
};

const GOLD  = "#C9952A";
const BRAND = "#8B1A4A";

const FEATURE_SUGGESTIONS: Record<string, string[]> = {
  PHOTOGRAPHER: ["Full day coverage","Edited photos","Online gallery","Drone shots","Highlights film","Printed album","Same-day previews","2nd photographer","Engagement session"],
  DECOR: ["Stage backdrop","Floral arrangements","LED lighting","Centrepieces","Entrance decor","Photo booth","Drone stage","Custom props","Setup & teardown"],
  CATERING: ["Per plate pricing","Live counters","Dessert station","Mocktail bar","Buffet service","Dedicated staff","Custom menu","Veg & Non-veg","Continental"],
  DEFAULT: ["Customisation available","1-on-1 consultation","2 revisions","Quick delivery","Premium materials","Dedicated coordinator"],
};

export default function VendorPackagesPage() {
  const qc = useQueryClient();

  // Fetch vendor me
  const { data: vendor, isLoading: vendorLoading } = useQuery<any>({
    queryKey: ["vendor-me"],
    queryFn:  () => vendorApi.me(),
    retry: 1,
  });

  const { data: packages = [], isLoading } = useQuery<any[]>({
    queryKey: ["vendor-packages", vendor?.slug],
    queryFn:  () => vendorApi.getPackages(vendor!.slug),
    enabled:  !!vendor?.slug,
  });

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<any>(null);
  const [form, setForm]         = useState<any>({
    name: "", price: "", description: "", features: [], is_popular: false,
    allows_custom: true, max_hours: "", delivery_days: "",
  });
  const [newFeature, setNewFeature] = useState("");

  const accent = vendor?.theme_color || "#C9952A";
  const catTemplates = TEMPLATES[vendor?.category] || [];
  const suggestions  = FEATURE_SUGGESTIONS[vendor?.category] || FEATURE_SUGGESTIONS.DEFAULT;

  const createMutation = useMutation({
    mutationFn: (d: any) => vendorApi.createPackage(vendor.slug, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vendor-packages", vendor.slug] }); toast.success("Package created!"); closeForm(); },
    onError:   () => toast.error("Failed to create package."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, d }: any) => vendorApi.updatePackage(vendor.slug, id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vendor-packages", vendor.slug] }); toast.success("Package updated!"); closeForm(); },
    onError:   () => toast.error("Failed to update."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => vendorApi.deletePackage(vendor.slug, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vendor-packages", vendor.slug] }); toast.success("Package deleted."); },
    onError:   () => toast.error("Failed to delete."),
  });

  const closeForm = () => { setShowForm(false); setEditing(null); setForm({ name: "", price: "", description: "", features: [], is_popular: false, allows_custom: true, max_hours: "", delivery_days: "" }); };

  const openEdit = (pkg: any) => {
    setEditing(pkg);
    setForm({ ...pkg, price: String(pkg.price), features: [...(pkg.features || [])], max_hours: pkg.max_hours || "", delivery_days: pkg.delivery_days || "" });
    setShowForm(true);
  };

  const fillTemplate = (t: any) => {
    setForm({ ...form, ...t, price: String(t.price), features: [...t.features], max_hours: t.max_hours || "", delivery_days: t.delivery_days || "" });
  };

  const addFeature = (feat: string) => {
    if (!feat.trim() || form.features.includes(feat.trim())) return;
    setForm({ ...form, features: [...form.features, feat.trim()] });
    setNewFeature("");
  };

  const removeFeature = (f: string) => {
    setForm({ ...form, features: form.features.filter((x: string) => x !== f) });
  };

  const save = () => {
    const payload = {
      ...form,
      price:        parseFloat(form.price) || 0,
      max_hours:    form.max_hours ? parseInt(form.max_hours) : null,
      delivery_days: form.delivery_days ? parseInt(form.delivery_days) : null,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, d: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (vendorLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="max-w-md py-16 text-center">
        <div className="text-5xl mb-4">🎪</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Set up your vendor profile first</h2>
        <p className="text-gray-400 text-sm mb-6">You need a vendor profile before adding packages.</p>
        <a href="/vendor/portfolio" className="px-6 py-3 rounded-xl text-white text-sm font-medium"
          style={{ background: accent }}>
          Go to Portfolio Setup →
        </a>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pricing Packages</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Define your service packages so clients know exactly what they're getting.
          </p>
        </div>
        <button onClick={() => { closeForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white"
          style={{ background: accent }}>
          <Plus size={15} /> Add Package
        </button>
      </div>

      {/* Templates strip */}
      {!showForm && catTemplates.length > 0 && packages.length === 0 && (
        <div className="mb-6 p-5 bg-amber-50 border border-amber-100 rounded-2xl">
          <p className="text-sm font-semibold text-amber-800 mb-3">
            ⚡ Quick start — add typical packages for your category:
          </p>
          <div className="flex flex-wrap gap-2">
            {catTemplates.map((t: any) => (
              <button key={t.name}
                onClick={() => { fillTemplate(t); setShowForm(true); }}
                className="px-3 py-1.5 rounded-lg text-xs border border-amber-300 bg-white text-amber-700 hover:bg-amber-50 transition-colors">
                {t.name} · ₹{t.price.toLocaleString("en-IN")}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Packages grid */}
      {packages.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
          {packages.map((pkg: any) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              accent={accent}
              onEdit={() => openEdit(pkg)}
              onDelete={() => deleteMutation.mutate(pkg.id)}
            />
          ))}
        </div>
      )}

      {packages.length === 0 && !showForm && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-4">💼</div>
          <p className="font-medium text-gray-500 mb-1">No packages yet</p>
          <p className="text-sm">Add your first pricing package to show clients what you offer.</p>
        </div>
      )}

      {/* Create / Edit form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-gray-900">{editing ? "Edit Package" : "New Package"}</h3>
            <button onClick={closeForm} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>

          {/* Template quick-fill (for new packages) */}
          {!editing && catTemplates.length > 0 && (
            <div className="mb-5">
              <p className="text-xs text-gray-400 mb-2">Fill from template:</p>
              <div className="flex flex-wrap gap-2">
                {catTemplates.map((t: any) => (
                  <button key={t.name} onClick={() => fillTemplate(t)}
                    className="px-3 py-1.5 rounded-lg text-xs border border-dashed border-gray-300 text-gray-500 hover:border-gray-400 transition-colors">
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Package Name *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Classic, Premium, Elite"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Price (₹) *</label>
              <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
                placeholder="e.g. 30000"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-1">Short Description</label>
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="What makes this package special?"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Coverage Hours</label>
              <input type="number" value={form.max_hours} onChange={e => setForm({ ...form, max_hours: e.target.value })}
                placeholder="e.g. 8"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Delivery Days</label>
              <input type="number" value={form.delivery_days} onChange={e => setForm({ ...form, delivery_days: e.target.value })}
                placeholder="e.g. 30"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
            </div>
          </div>

          {/* Features */}
          <div className="mb-5">
            <label className="block text-xs font-medium text-gray-600 mb-2">
              What's included? <span className="text-gray-400">({form.features.length} items)</span>
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {(form.features as string[]).map((f: string) => (
                <span key={f}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-white"
                  style={{ background: accent }}>
                  {f}
                  <button onClick={() => removeFeature(f)} className="opacity-70 hover:opacity-100">✕</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2 mb-3">
              <input
                value={newFeature}
                onChange={e => setNewFeature(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addFeature(newFeature); } }}
                placeholder="Type a feature and press Enter…"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
              />
              <button onClick={() => addFeature(newFeature)}
                className="px-4 py-2 rounded-xl text-sm text-white"
                style={{ background: accent }}>
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {suggestions
                .filter(s => !form.features.includes(s))
                .map(s => (
                  <button key={s} onClick={() => addFeature(s)}
                    className="px-2.5 py-1 rounded-full text-xs border border-dashed border-gray-300 text-gray-500 hover:border-gray-400 transition-colors">
                    + {s}
                  </button>
                ))}
            </div>
          </div>

          {/* Flags */}
          <div className="flex gap-6 mb-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_popular}
                onChange={e => setForm({ ...form, is_popular: e.target.checked })}
                className="rounded" />
              <span className="text-sm text-gray-700 flex items-center gap-1">
                <Star size={13} style={{ color: GOLD }} fill={GOLD} /> Mark as Most Popular
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.allows_custom}
                onChange={e => setForm({ ...form, allows_custom: e.target.checked })}
                className="rounded" />
              <span className="text-sm text-gray-700">Allow Custom Requests</span>
            </label>
          </div>

          <div className="flex gap-3">
            <button onClick={closeForm}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={save} disabled={!form.name || !form.price || isPending}
              className="px-6 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50"
              style={{ background: accent }}>
              {isPending
                ? <span className="flex items-center gap-2"><Loader2 size={13} className="animate-spin" /> Saving…</span>
                : editing ? "Save Changes" : "Create Package"
              }
            </button>
          </div>
        </div>
      )}

      {/* Tip card */}
      {packages.length > 0 && !showForm && (
        <div className="mt-4 p-4 rounded-2xl border border-amber-100 bg-amber-50 text-sm text-amber-700">
          💡 <strong>Tip:</strong> Packages with a &ldquo;Most Popular&rdquo; badge get 3× more enquiries.
          Aim for 3 packages: a starter option, a mid-range value pack, and a premium option.
        </div>
      )}
    </div>
  );
}

// ── Package Card ──────────────────────────────────────────────────────────────
function PackageCard({ pkg, accent, onEdit, onDelete }: {
  pkg: any; accent: string; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <div className={`relative bg-white rounded-2xl border-2 p-5 ${pkg.is_popular ? "" : "border-gray-100"}`}
      style={pkg.is_popular ? { borderColor: accent } : {}}>
      {pkg.is_popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold text-white flex items-center gap-1"
          style={{ background: accent }}>
          <Star size={10} fill="white" /> Most Popular
        </div>
      )}

      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-gray-900">{pkg.name}</h3>
          {pkg.description && <p className="text-xs text-gray-400 mt-0.5">{pkg.description}</p>}
        </div>
        <div className="flex gap-1.5">
          <button onClick={onEdit}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
            <Edit3 size={13} />
          </button>
          <button onClick={onDelete}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="text-2xl font-bold mb-3" style={{ color: accent }}>
        ₹{parseInt(pkg.price).toLocaleString("en-IN")}
      </div>

      <div className="flex gap-3 text-xs text-gray-400 mb-4">
        {pkg.max_hours    && <span>⏱ {pkg.max_hours}h coverage</span>}
        {pkg.delivery_days && <span>📦 {pkg.delivery_days} days delivery</span>}
      </div>

      <ul className="space-y-1.5">
        {(pkg.features || []).map((f: string) => (
          <li key={f} className="flex items-start gap-2 text-xs text-gray-600">
            <CheckCircle2 size={12} className="mt-0.5 shrink-0" style={{ color: accent }} />
            {f}
          </li>
        ))}
      </ul>

      {pkg.allows_custom && (
        <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-50">
          + Custom add-ons available
        </p>
      )}
    </div>
  );
}
