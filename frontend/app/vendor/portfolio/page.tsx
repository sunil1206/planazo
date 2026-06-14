"use client";
/**
 * /vendor/portfolio — Full portfolio designer
 * • Profile editor with theme colour picker
 * • Portfolio categories (add / delete)
 * • Photo upload per category
 * • Wedding gallery link via token
 */
import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { vendorApi, invitationApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import toast from "react-hot-toast";
import {
  Upload, MapPin, Phone, Mail, Globe, Instagram,
  Loader2, Edit3, Camera, Palette, Plus, Trash2, Link2,
  CheckCircle2, AlertCircle,
} from "lucide-react";

// ── Theme colour presets ───────────────────────────────────────────────────────
const THEME_PRESETS = [
  { color: "#C9952A", label: "Gold Rose"      },
  { color: "#8B1A4A", label: "Burgundy"       },
  { color: "#1A2B4A", label: "Deep Navy"      },
  { color: "#2D6A4F", label: "Forest Green"   },
  { color: "#6B2FA0", label: "Royal Purple"   },
  { color: "#1C1C1E", label: "Cinematic Dark" },
  { color: "#C0392B", label: "Classic Red"    },
  { color: "#2C3E50", label: "Slate"          },
];

const CATEGORIES_PRESET = [
  { name: "Weddings",       emoji: "💍" },
  { name: "Portraits",      emoji: "📷" },
  { name: "Receptions",     emoji: "🥂" },
  { name: "Engagements",    emoji: "💑" },
  { name: "Haldi / Mehendi",emoji: "🌿" },
  { name: "Decor",          emoji: "🌸" },
];

const VENDOR_CATEGORIES = [
  { value: "PHOTOGRAPHER", label: "Photographer",  emoji: "📷" },
  { value: "EVENT",        label: "Event Manager",  emoji: "🎪" },
  { value: "DECOR",        label: "Decorator",      emoji: "🌸" },
  { value: "CATERING",     label: "Caterer",        emoji: "🍽️" },
  { value: "MAKEUP",       label: "Makeup Artist",  emoji: "💄" },
  { value: "MUSIC",        label: "DJ / Music",     emoji: "🎵" },
];

// ── Tabs ─────────────────────────────────────────────────────────────────────
type Tab = "profile" | "portfolio" | "link";

export default function VendorPortfolioPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [tab, setTab]         = useState<Tab>("profile");
  const [editMode, setEditMode] = useState(false);

  // Fetch vendor profile (me endpoint)
  const { data: vendor, isLoading, error } = useQuery<any>({
    queryKey: ["vendor-me"],
    queryFn:  () => vendorApi.me(),
    retry: 1,
  });

  const [profileForm, setProfileForm] = useState<any>({});
  useEffect(() => {
    if (vendor && !profileForm.title) setProfileForm(vendor);
  }, [vendor]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => vendorApi.update(vendor?.slug, data),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ["vendor-me"] });
      toast.success("Profile updated!");
      setEditMode(false);
    },
    onError: () => toast.error("Failed to update."),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => vendorApi.create(data),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ["vendor-me"] });
      toast.success("Vendor profile created!");
      setEditMode(false);
    },
    onError: () => toast.error("Failed to create profile."),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-gray-400" />
      </div>
    );
  }

  // Dev bypass tokens can't reach the backend — show a clear message
  const devToken = typeof window !== "undefined" &&
    (localStorage.getItem("access_token") || "").startsWith("dev_");

  if (devToken) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-5xl mb-4">🔐</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Real Login Required</h2>
        <p className="text-sm text-gray-500 max-w-sm mb-6">
          Vendor profile management requires a real account. The dev bypass token cannot make
          authenticated API calls. Please sign in with your email/password or Google account.
        </p>
        <a href="/login"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #8B1A4A, #C9952A)" }}>
          Sign In Properly →
        </a>
      </div>
    );
  }

  // No vendor profile yet
  if (!vendor || error) {
    return (
      <SetupForm
        initialEmail={user?.email || ""}
        onSubmit={(data: any) => createMutation.mutate(data)}
        isPending={createMutation.isPending}
      />
    );
  }

  const accent = vendor.theme_color || "#C9952A";

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{vendor.title}</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-sm text-gray-500 flex items-center gap-1">
              <MapPin size={13} /> {vendor.city || "City not set"}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: `${accent}18`, color: accent }}>
              {VENDOR_CATEGORIES.find((c) => c.value === vendor.category)?.label}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              vendor.is_verified ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
            }`}>
              {vendor.is_verified ? "✓ Verified" : "Pending Verification"}
            </span>
          </div>
        </div>
        <a href={`/vendors/${vendor.slug}`} target="_blank"
          className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium hover:bg-gray-50 transition-colors">
          <Globe size={14} /> View Public Page
        </a>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 rounded-xl mb-6 w-fit" style={{ background: "#F3F4F6" }}>
        {([
          { id: "profile",   label: "Profile & Theme", icon: "🎨" },
          { id: "portfolio", label: "Portfolio",        icon: "📸" },
          { id: "link",      label: "Wedding Link",     icon: "🔗" },
        ] as { id: Tab; label: string; icon: string }[]).map(({ id, label, icon }) => (
          <button key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === id ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Profile & Theme ─────────────────────────────────────────────── */}
      {tab === "profile" && (
        <div className="space-y-6">
          {/* Theme colour picker */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <Palette size={18} style={{ color: accent }} /> Portfolio Theme Colour
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              This colour is used as the accent across your public portfolio page.
            </p>
            <div className="flex flex-wrap gap-3">
              {THEME_PRESETS.map(({ color, label }) => (
                <button key={color} title={label}
                  onClick={() => {
                    updateMutation.mutate({ theme_color: color });
                    setProfileForm({ ...profileForm, theme_color: color });
                  }}
                  className="w-10 h-10 rounded-full border-4 transition-transform hover:scale-110"
                  style={{
                    background:   color,
                    borderColor:  vendor.theme_color === color ? color : "transparent",
                    outline:      vendor.theme_color === color ? `3px solid ${color}40` : "none",
                  }}
                />
              ))}
              {/* Custom colour */}
              <label title="Custom colour" className="w-10 h-10 rounded-full border-2 border-dashed border-gray-300 cursor-pointer flex items-center justify-center hover:border-gray-400 transition-colors">
                <span className="text-lg">+</span>
                <input type="color" className="sr-only"
                  defaultValue={vendor.theme_color || "#C9952A"}
                  onChange={(e) => updateMutation.mutate({ theme_color: e.target.value })}
                />
              </label>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="w-5 h-5 rounded-full border border-gray-200"
                style={{ background: vendor.theme_color || "#C9952A" }} />
              <span className="text-xs text-gray-500">Current: {vendor.theme_color || "#C9952A"}</span>
            </div>
          </div>

          {/* Stats */}
          {!editMode && (
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Portfolio Photos", value: vendor.portfolio_count || 0, icon: "📸" },
                { label: "Total Enquiries",  value: vendor.enquiries?.length || 0,  icon: "💌" },
                { label: "Reviews",          value: vendor.review_count || 0,    icon: "⭐" },
              ].map(({ label, value, icon }) => (
                <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className="text-2xl mb-1">{icon}</div>
                  <div className="text-2xl font-bold text-gray-900">{value}</div>
                  <div className="text-xs text-gray-500">{label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Edit toggle */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Profile Details</h3>
              <button
                onClick={() => { setEditMode(!editMode); if (!editMode) setProfileForm(vendor); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm hover:bg-gray-50">
                <Edit3 size={14} /> {editMode ? "Cancel" : "Edit"}
              </button>
            </div>

            {editMode ? (
              <VendorProfileForm
                form={profileForm}
                setForm={setProfileForm}
                onSubmit={() => updateMutation.mutate(profileForm)}
                isPending={updateMutation.isPending}
                submitLabel="Save Changes"
                accent={accent}
              />
            ) : (
              <div className="space-y-3">
                {[
                  { label: "Business Name",  val: vendor.title    },
                  { label: "Category",       val: VENDOR_CATEGORIES.find(c => c.value === vendor.category)?.label },
                  { label: "Tagline",        val: vendor.tagline  },
                  { label: "City",           val: vendor.city     },
                  { label: "Phone",          val: vendor.phone    },
                  { label: "Email",          val: vendor.email    },
                ].map(({ label, val }) => val ? (
                  <div key={label} className="flex items-start gap-3">
                    <span className="text-xs font-medium text-gray-400 w-28 pt-0.5">{label}</span>
                    <span className="text-sm text-gray-700">{val}</span>
                  </div>
                ) : null)}
                <div className="pt-3 border-t border-gray-50">
                  <p className="text-sm text-gray-600 leading-relaxed">{vendor.bio}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Portfolio ──────────────────────────────────────────────────── */}
      {tab === "portfolio" && (
        <PortfolioTab vendor={vendor} accent={accent} qc={qc} />
      )}

      {/* ── Tab: Wedding Link ───────────────────────────────────────────────── */}
      {tab === "link" && (
        <WeddingLinkTab accent={accent} />
      )}
    </div>
  );
}

// ── Portfolio Tab ─────────────────────────────────────────────────────────────
function PortfolioTab({ vendor, accent, qc }: { vendor: any; accent: string; qc: any }) {
  const [uploading, setUploading]   = useState(false);
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [showAddCat, setShowAddCat] = useState(false);
  const [newCat, setNewCat]         = useState({ name: "", emoji: "📸" });

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["vendor-categories", vendor.slug],
    queryFn:  () => vendorApi.getCategories(vendor.slug),
  });

  const createCatMutation = useMutation({
    mutationFn: (d: any) => vendorApi.createCategory(vendor.slug, d),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ["vendor-categories", vendor.slug] });
      setShowAddCat(false);
      setNewCat({ name: "", emoji: "📸" });
      toast.success("Category created!");
    },
    onError: () => toast.error("Failed to create category."),
  });

  const deleteCatMutation = useMutation({
    mutationFn: (id: number) => vendorApi.deleteCategory(vendor.slug, id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ["vendor-categories", vendor.slug] });
      if (selectedCat !== null) setSelectedCat(null);
      toast.success("Category deleted.");
    },
    onError: () => toast.error("Failed to delete."),
  });

  const deleteImgMutation = useMutation({
    mutationFn: (imgId: number) => vendorApi.deletePortfolio(vendor.slug, imgId),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ["vendor-me"] });
      toast.success("Photo removed.");
    },
    onError: () => toast.error("Failed to delete photo."),
  });

  const onDrop = useCallback(async (files: File[]) => {
    setUploading(true);
    for (const file of files) {
      const fd = new FormData();
      fd.append("picture", file);
      if (selectedCat !== null) fd.append("category", String(selectedCat));
      try {
        await vendorApi.addPortfolio(vendor.slug, fd);
      } catch {
        toast.error(`Failed: ${file.name}`);
      }
    }
    setUploading(false);
    qc.invalidateQueries({ queryKey: ["vendor-me"] });
    toast.success("Photos uploaded!");
  }, [vendor.slug, selectedCat, qc]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: true,
  });

  // Filter photos by category
  const photos = vendor.portfolio || [];
  const displayPhotos = selectedCat === null
    ? photos
    : photos.filter((p: any) => p.category === selectedCat);

  return (
    <div className="space-y-6">
      {/* Categories */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Categories</h3>
          <button onClick={() => setShowAddCat(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
            style={{ background: accent }}>
            <Plus size={13} /> Add Category
          </button>
        </div>

        {/* Category filter pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setSelectedCat(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedCat === null ? "text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            style={selectedCat === null ? { background: accent } : {}}>
            All Photos ({photos.length})
          </button>
          {categories.map((c: any) => (
            <div key={c.id} className="flex items-center gap-1">
              <button
                onClick={() => setSelectedCat(selectedCat === c.id ? null : c.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedCat === c.id ? "text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                style={selectedCat === c.id ? { background: accent } : {}}>
                {c.emoji} {c.name}
              </button>
              <button
                onClick={() => deleteCatMutation.mutate(c.id)}
                className="p-1 rounded-full text-gray-400 hover:text-red-400 hover:bg-red-50 transition-colors">
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>

        {/* Quick-add presets */}
        {categories.length === 0 && (
          <div>
            <p className="text-xs text-gray-400 mb-3">Quick-add popular categories:</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES_PRESET.map(({ name, emoji }) => (
                <button key={name}
                  onClick={() => createCatMutation.mutate({ name, emoji })}
                  className="px-3 py-1.5 rounded-full text-xs border border-dashed border-gray-300 text-gray-500 hover:border-gray-400 transition-colors">
                  {emoji} {name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Add category form */}
        {showAddCat && (
          <div className="mt-4 p-4 rounded-xl border border-gray-200 bg-gray-50">
            <p className="text-xs font-medium text-gray-600 mb-3">New Category</p>
            <div className="flex gap-2">
              <input
                placeholder="Category name"
                value={newCat.name}
                onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
              />
              <input
                placeholder="📸"
                value={newCat.emoji}
                onChange={(e) => setNewCat({ ...newCat, emoji: e.target.value })}
                className="w-14 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 text-center"
              />
              <button
                onClick={() => createCatMutation.mutate(newCat)}
                disabled={!newCat.name || createCatMutation.isPending}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{ background: accent }}>
                Add
              </button>
              <button onClick={() => setShowAddCat(false)}
                className="px-3 py-2 rounded-lg text-sm border border-gray-200 text-gray-500">
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Upload zone */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <Camera size={18} style={{ color: accent }} /> Upload Photos
          {selectedCat !== null && (
            <span className="text-xs font-normal text-gray-400 ml-1">
              → uploading to "{categories.find((c: any) => c.id === selectedCat)?.name}"
            </span>
          )}
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          {selectedCat === null
            ? "Select a category above to organise, or upload uncategorised."
            : "Photos will be added to the selected category."}
        </p>

        <div {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
            isDragActive ? "" : "hover:border-gray-300"
          }`}
          style={isDragActive ? { borderColor: accent, background: `${accent}08` } : { borderColor: "#E5E7EB" }}>
          <input {...getInputProps()} />
          {uploading ? (
            <div className="flex flex-col items-center gap-2" style={{ color: accent }}>
              <Loader2 size={24} className="animate-spin" />
              <p className="text-sm font-medium">Uploading…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <Upload size={24} />
              <p className="text-sm font-medium text-gray-600">
                {isDragActive ? "Drop photos here" : "Drag & drop portfolio photos"}
              </p>
              <p className="text-xs">or click to browse · Multiple files supported</p>
            </div>
          )}
        </div>
      </div>

      {/* Photo grid */}
      {displayPhotos.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {displayPhotos.map((img: any) => (
            <div key={img.id} className="group aspect-square rounded-xl overflow-hidden bg-gray-100 relative">
              <img
                src={`${process.env.NEXT_PUBLIC_API_URL}${img.picture}`}
                className="w-full h-full object-cover"
                alt={img.title || ""}
              />
              <button
                onClick={() => deleteImgMutation.mutate(img.id)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                <Trash2 size={12} />
              </button>
              {img.category_name && (
                <div className="absolute bottom-0 left-0 right-0 text-xs text-white px-2 py-1 truncate"
                  style={{ background: "linear-gradient(to top, #00000080, transparent)" }}>
                  {img.category_name}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400 text-sm">
          {selectedCat !== null ? "No photos in this category yet." : "No portfolio photos yet. Upload your best work above!"}
        </div>
      )}
    </div>
  );
}

// ── Wedding Link Tab ──────────────────────────────────────────────────────────
function WeddingLinkTab({ accent }: { accent: string }) {
  const [token, setToken]       = useState("");
  const [status, setStatus]     = useState<"idle" | "loading" | "success" | "error">("idle");
  const [wedding, setWedding]   = useState<any>(null);
  const [savedLinks, setSavedLinks] = useState<any[]>([]);

  // Load saved links from localStorage
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("vendor_wedding_links") || "[]");
      setSavedLinks(stored);
    } catch {}
  }, []);

  const verifyToken = async () => {
    if (!token.trim()) return;
    setStatus("loading");
    setWedding(null);
    try {
      const data: any = await invitationApi.verifyGalleryToken(token.toUpperCase().trim());
      setWedding(data);
      setStatus("success");

      // Save to localStorage
      const existing: any[] = JSON.parse(localStorage.getItem("vendor_wedding_links") || "[]");
      const already = existing.find((l) => l.website_id === data.website_id);
      if (!already) {
        const updated = [...existing, { ...data, linked_at: new Date().toISOString() }];
        localStorage.setItem("vendor_wedding_links", JSON.stringify(updated));
        setSavedLinks(updated);
      }
      toast.success(`Linked to ${data.couple}'s wedding!`);
    } catch {
      setStatus("error");
    }
  };

  const removeLink = (websiteId: number) => {
    const updated = savedLinks.filter((l) => l.website_id !== websiteId);
    localStorage.setItem("vendor_wedding_links", JSON.stringify(updated));
    setSavedLinks(updated);
    toast.success("Wedding link removed.");
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <Link2 size={18} style={{ color: accent }} /> Link to a Wedding
        </h3>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          Ask the couple to share their 6-digit gallery token from their wedding dashboard.
          Enter it below to link your uploads to their wedding gallery.
        </p>

        <div className="flex gap-2 mb-4">
          <input
            placeholder="Enter 6-digit token e.g. A1B2C3"
            value={token}
            onChange={(e) => { setToken(e.target.value.toUpperCase()); setStatus("idle"); setWedding(null); }}
            maxLength={12}
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm font-mono tracking-widest uppercase focus:outline-none focus:border-gray-400"
          />
          <button
            onClick={verifyToken}
            disabled={!token.trim() || status === "loading"}
            className="px-5 py-3 rounded-xl text-sm font-medium text-white disabled:opacity-50"
            style={{ background: accent }}>
            {status === "loading" ? <Loader2 size={16} className="animate-spin" /> : "Verify"}
          </button>
        </div>

        {status === "success" && wedding && (
          <div className="flex items-center gap-3 p-4 rounded-xl"
            style={{ background: "#ECFDF5", border: "1px solid #D1FAE5" }}>
            <CheckCircle2 size={20} className="text-green-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">Token verified!</p>
              <p className="text-xs text-green-600 mt-0.5">
                Linked to <strong>{wedding.couple}</strong>'s wedding.
                Photos you upload will appear in their gallery.
              </p>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="flex items-center gap-3 p-4 rounded-xl"
            style={{ background: "#FEF2F2", border: "1px solid #FEE2E2" }}>
            <AlertCircle size={20} className="text-red-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700">Invalid token</p>
              <p className="text-xs text-red-500 mt-0.5">
                Please check the token with the couple and try again.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Saved links */}
      {savedLinks.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Linked Weddings</h3>
          <div className="space-y-3">
            {savedLinks.map((link) => (
              <div key={link.website_id}
                className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-800">{link.couple}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Linked {new Date(link.linked_at).toLocaleDateString("en-IN")}
                  </p>
                </div>
                <button onClick={() => removeLink(link.website_id)}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-50 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instruction card */}
      <div className="rounded-2xl p-5 border"
        style={{ background: `${accent}08`, borderColor: `${accent}20` }}>
        <h4 className="text-sm font-semibold mb-3" style={{ color: accent }}>
          📋 How it works
        </h4>
        <ol className="space-y-2 text-xs text-gray-600">
          <li className="flex gap-2"><span style={{ color: accent }} className="font-bold">1.</span> Ask the couple for their gallery token — they find it on their wedding dashboard.</li>
          <li className="flex gap-2"><span style={{ color: accent }} className="font-bold">2.</span> Enter the token above to link your account to their wedding.</li>
          <li className="flex gap-2"><span style={{ color: accent }} className="font-bold">3.</span> When uploading photos to the gallery, select the linked wedding to attach them.</li>
          <li className="flex gap-2"><span style={{ color: accent }} className="font-bold">4.</span> Photos appear in the couple's wedding gallery for their guests to view.</li>
        </ol>
      </div>
    </div>
  );
}

// ── Setup Form (first time) ───────────────────────────────────────────────────
function SetupForm({ initialEmail, onSubmit, isPending }: {
  initialEmail: string; onSubmit: (data: any) => void; isPending: boolean;
}) {
  const [form, setForm] = useState({
    category: "PHOTOGRAPHER", title: "", bio: "", tagline: "",
    phone: "", email: initialEmail, city: "", theme_color: "#C9952A",
  });
  const f = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Set Up Your Vendor Profile</h1>
      <p className="text-gray-500 mb-8">
        Create your professional profile to get discovered by couples planning their weddings.
      </p>

      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
            <select value={form.category} onChange={f("category")}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none">
              {VENDOR_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
            <input value={form.title} onChange={f("title")} placeholder="e.g. Royal Frames Photography"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tagline</label>
          <input value={form.tagline} onChange={f("tagline")} placeholder="e.g. Capturing love, one frame at a time"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">About Your Services *</label>
          <textarea value={form.bio} onChange={f("bio")} rows={3}
            placeholder="Describe your services, experience, and style…"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none resize-none" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { k: "phone", label: "Phone *",  ph: "+91 98765 43210" },
            { k: "email", label: "Email *",  ph: "you@example.com" },
            { k: "city",  label: "City",     ph: "e.g. Kochi"      },
          ].map(({ k, label, ph }) => (
            <div key={k}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input value={(form as any)[k]} onChange={f(k)} placeholder={ph}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none" />
            </div>
          ))}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Portfolio Theme Colour</label>
          <div className="flex flex-wrap gap-3">
            {THEME_PRESETS.map(({ color, label }) => (
              <button key={color} type="button" title={label}
                onClick={() => setForm({ ...form, theme_color: color })}
                className="w-9 h-9 rounded-full border-4 transition-transform hover:scale-110"
                style={{
                  background:  color,
                  borderColor: form.theme_color === color ? "#fff" : "transparent",
                  outline:     form.theme_color === color ? `2px solid ${color}` : "none",
                }}
              />
            ))}
          </div>
        </div>

        <button onClick={() => onSubmit(form)}
          disabled={!form.title || !form.bio || !form.phone || isPending}
          className="w-full py-3.5 rounded-xl text-white font-semibold disabled:opacity-50 transition"
          style={{ background: `linear-gradient(135deg, ${form.theme_color}, ${form.theme_color}CC)` }}>
          {isPending ? "Creating…" : "Create Profile & Start Designing →"}
        </button>
      </div>
    </div>
  );
}

// ── Profile edit form ─────────────────────────────────────────────────────────
function VendorProfileForm({ form, setForm, onSubmit, isPending, submitLabel, accent }: {
  form: any; setForm: (v: any) => void;
  onSubmit: () => void; isPending: boolean;
  submitLabel: string; accent: string;
}) {
  const f = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select value={form.category || ""} onChange={f("category")}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
            {VENDOR_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
          <input value={form.title || ""} onChange={f("title")}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tagline</label>
        <input value={form.tagline || ""} onChange={f("tagline")}
          placeholder="Short catchphrase for your portfolio page"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
        <textarea value={form.bio || ""} onChange={f("bio")} rows={3}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none resize-none" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { k: "phone", label: "Phone" },
          { k: "email", label: "Email" },
          { k: "city",  label: "City"  },
        ].map(({ k, label }) => (
          <div key={k}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input value={(form as any)[k] || ""} onChange={f(k)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { k: "website",   label: "Website URL",   ph: "https://yourwebsite.com" },
          { k: "instagram", label: "Instagram URL",  ph: "https://instagram.com/…" },
        ].map(({ k, label, ph }) => (
          <div key={k}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input value={(form as any)[k] || ""} onChange={f(k)} placeholder={ph}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
          </div>
        ))}
      </div>

      <button onClick={onSubmit} disabled={!form.title || !form.bio || isPending}
        className="px-6 py-3 rounded-xl text-white font-medium disabled:opacity-50 transition text-sm"
        style={{ background: accent }}>
        {isPending ? "Saving…" : submitLabel}
      </button>
    </div>
  );
}
