"use client";
/**
 * /dashboard/gallery  — Wedding photo gallery manager
 * Upload · AI Selfie Match · Browse photos · Category management
 */
import { useState, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { invitationApi, galleryApi } from "@/lib/api";
import toast from "react-hot-toast";
import { authApi } from "@/lib/api";

interface Photo {
  id:             number;
  picture?:       string;          // legacy field (relative)
  picture_url:    string;          // ABSOLUTE URL — source of truth for <img src>
  thumbnail_url?: string;          // ABSOLUTE URL — preferred for grid views
  title?:         string;
  category?:      number | null;   // legacy: same as category_id
  category_id?:   number | null;   // ID-only filtering
  category_name?: string;
  gallery_type?:  "INVITATION" | "ALBUM" | "PRIVATE";
  created_at:     string;
}

interface Invitation { id: number; couple: string; slug: string; }

interface Category { id: number; name: string; }

interface CurrentUser {
  id: number;
  role: string;
  full_name: string;
}

// ── Dropzone upload zone ─────────────────────────────────
function UploadZone({
  onUpload,
  disabled,
  categories,
  onCategoryChange,
  selectedCategory,
}: {
  onUpload: (files: File[]) => Promise<void>;
  disabled: boolean;
  categories: Category[];
  onCategoryChange: (categoryId: number | null) => void;
  selectedCategory: number | null;
}) {
  const [uploading, setUploading] = useState(false);
  const onDrop = useCallback(async (accepted: File[]) => {
    if (!accepted.length) return;
    setUploading(true);
    await onUpload(accepted);
    setUploading(false);
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp", ".heic"] },
    disabled: disabled || uploading,
    maxSize: 20 * 1024 * 1024,
  });

  const presetCategories = ["Pre-Wedding", "Engagement", "Ceremony", "Reception", "Candid"];

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-2">
          Category
        </label>
        <select
          value={selectedCategory != null && !isNaN(selectedCategory) ? String(selectedCategory) : ""}
          onChange={(e) => onCategoryChange(e.target.value ? Number(e.target.value) : null)}
          disabled={disabled}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#8B1A4A] bg-white disabled:bg-gray-50">
          <option value="">— No category —</option>
          {categories.length > 0 ? (
            categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))
          ) : (
            presetCategories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))
          )}
        </select>
      </div>

      <div {...getRootProps()}
        className={
          "border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all " +
          (isDragActive
            ? "border-[#8B1A4A] bg-rose-50"
            : disabled
            ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"
            : "border-gray-300 bg-white hover:border-[#8B1A4A] hover:bg-rose-50")
        }>
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-full border-4 border-t-[#8B1A4A] border-gray-200 animate-spin" />
            <p className="text-sm text-gray-500">Uploading…</p>
          </div>
        ) : (
          <>
            <div className="text-4xl mb-2">{isDragActive ? "📂" : "📸"}</div>
            <p className="text-sm font-medium text-gray-700">
              {isDragActive ? "Drop photos here" : "Drag & drop photos or click to browse"}
            </p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP, HEIC · up to 20 MB each</p>
            {disabled && (
              <p className="text-xs text-orange-500 mt-2">Select an invitation first</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Auto-enhance helper (Canvas API) ────────────────────────────────────────
async function enhanceImage(src: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      // Apply brightness + contrast enhancement via CSS filter
      const offCanvas = document.createElement("canvas");
      offCanvas.width  = canvas.width;
      offCanvas.height = canvas.height;
      const off = offCanvas.getContext("2d")!;
      off.filter = "brightness(1.08) contrast(1.1) saturate(1.15)";
      off.drawImage(canvas, 0, 0);

      resolve(offCanvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

// ── ZIP download helper ─────────────────────────────────────────────────────
async function downloadAllAsZip(urls: string[], filename = "my-photos.zip") {
  // Dynamic import of JSZip via npm so webpack/Turbopack can bundle it.
  try {
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    const folder = zip.folder("my-wedding-photos");
    for (let i = 0; i < urls.length; i++) {
      try {
        const response = await fetch(urls[i]);
        const blob = await response.blob();
        folder!.file(`photo_${i + 1}.jpg`, blob);
      } catch {}
    }
    const content = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(content);
    a.download = filename;
    a.click();
  } catch {
    // Fallback: open each photo in new tab
    urls.forEach(url => window.open(url, "_blank"));
  }
}

// ── Selfie Match panel ───────────────────────────────────
function SelfieMatchPanel({ websiteId }: { websiteId: number | null }) {
  const [selfieFile,    setSelfieFile]    = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [matches,       setMatches]       = useState<any[]>([]);
  const [status,        setStatus]        = useState<"idle"|"processing"|"done"|"error">("idle");
  const [enhancing,     setEnhancing]     = useState(false);
  const [enhancedUrls,  setEnhancedUrls]  = useState<Record<number, string>>({});
  const [showGroup,     setShowGroup]     = useState(true);
  const [minConfidence, setMinConfidence] = useState(0.5);
  const API = process.env.NEXT_PUBLIC_API_URL || "";

  const { getRootProps, getInputProps } = useDropzone({
    accept: { "image/*": [] },
    maxFiles: 1,
    onDrop: (f) => {
      const file = f[0];
      if (!file) return;
      setSelfieFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setSelfiePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    },
  });

  const runMatch = async () => {
    if (!selfieFile) return;
    setStatus("processing");
    setMatches([]);
    setEnhancedUrls({});
    try {
      const fd = new FormData();
      fd.append("selfie", selfieFile);
      if (websiteId) fd.append("website_id", String(websiteId));
      const res: any = await galleryApi.selfieMatch(fd);

      const poll = setInterval(async () => {
        try {
          const job: any = await galleryApi.selfieStatus(res.id);
          if (job.status === "done") {
            clearInterval(poll);
            setMatches(job.matches || []);
            setStatus("done");
          } else if (job.status === "failed") {
            clearInterval(poll);
            setStatus("error");
          }
        } catch { clearInterval(poll); setStatus("error"); }
      }, 2000);
    } catch {
      setStatus("error");
      toast.error("Selfie match failed.");
    }
  };

  const handleEnhanceAll = async () => {
    setEnhancing(true);
    const newUrls: Record<number, string> = {};
    for (const m of filteredMatches) {
      const src = `${API}${m.thumbnail_url || m.picture}`;
      newUrls[m.id] = await enhanceImage(src);
    }
    setEnhancedUrls(newUrls);
    setEnhancing(false);
    toast.success("Photos enhanced!");
  };

  const handleDownloadAll = async () => {
    const urls = filteredMatches.map(m =>
      enhancedUrls[m.id] || `${API}${m.picture}`
    );
    toast("Preparing download…");
    await downloadAllAsZip(urls, "my-wedding-photos.zip");
  };

  const filteredMatches = matches.filter(m => {
    if (!showGroup && m.match_type === "group") return false;
    if (m.confidence !== undefined && m.confidence < minConfidence) return false;
    return true;
  });

  const confidenceColor = (c?: number) => {
    if (!c) return "#9CA3AF";
    if (c >= 0.8) return "#16a34a";
    if (c >= 0.6) return "#CA8A04";
    return "#DC2626";
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100">
      <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
        🤳 AI Selfie Match
        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Enhanced</span>
      </h3>
      <p className="text-xs text-gray-400 mb-3">
        Upload a selfie — AI finds you in solo & group photos, then auto-enhances them
      </p>

      <div className="flex gap-3 mb-3">
        {/* Selfie dropzone */}
        <div {...getRootProps()}
          className="flex-1 border-2 border-dashed border-gray-200 rounded-xl p-3 text-center cursor-pointer hover:border-[#C9952A] transition-colors">
          <input {...getInputProps()} />
          {selfiePreview ? (
            <img src={selfiePreview} className="w-16 h-16 rounded-lg object-cover mx-auto" alt="selfie" />
          ) : (
            <>
              <div className="text-2xl mb-1">🤳</div>
              <p className="text-xs text-gray-400">Drop selfie here</p>
            </>
          )}
        </div>

        {/* Options */}
        <div className="flex flex-col gap-2 justify-center">
          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
            <input type="checkbox" checked={showGroup} onChange={e => setShowGroup(e.target.checked)}
              className="rounded accent-purple-600" />
            Include group photos
          </label>
          <div>
            <p className="text-xs text-gray-400 mb-1">Min confidence: {Math.round(minConfidence * 100)}%</p>
            <input type="range" min={30} max={90} value={minConfidence * 100}
              onChange={e => setMinConfidence(Number(e.target.value) / 100)}
              className="w-full accent-[#C9952A]" />
          </div>
        </div>
      </div>

      <button onClick={runMatch} disabled={!selfieFile || status === "processing"}
        className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
        style={{ background: "#C9952A" }}>
        {status === "processing" ? (
          <>
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
              <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Scanning gallery with AI…
          </>
        ) : "🔍 Find My Photos"}
      </button>

      {status === "done" && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-700">
              {filteredMatches.length} photo{filteredMatches.length !== 1 ? "s" : ""} found
              {matches.length !== filteredMatches.length && (
                <span className="text-xs text-gray-400 ml-1">({matches.length} total)</span>
              )}
            </p>
            {filteredMatches.length > 0 && (
              <div className="flex gap-2">
                <button onClick={handleEnhanceAll} disabled={enhancing}
                  className="text-xs px-3 py-1.5 rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50 font-medium disabled:opacity-50">
                  {enhancing ? "Enhancing…" : "✨ Enhance All"}
                </button>
                <button onClick={handleDownloadAll}
                  className="text-xs px-3 py-1.5 rounded-lg text-white font-medium"
                  style={{ background: "#8B1A4A" }}>
                  ⬇ Download ZIP
                </button>
              </div>
            )}
          </div>

          {filteredMatches.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {filteredMatches.map((m: any) => (
                <div key={m.id} className="relative group">
                  <img
                    src={enhancedUrls[m.id] || `${API}${m.thumbnail_url || m.picture}`}
                    className="w-full aspect-square object-cover rounded-xl transition-all"
                    style={Object.keys(enhancedUrls).length > 0 && !enhancedUrls[m.id]
                      ? { filter: "none" } : {}}
                    alt=""
                  />
                  {/* Confidence badge */}
                  {m.confidence !== undefined && (
                    <span className="absolute bottom-1 left-1 text-xs font-bold px-1.5 py-0.5 rounded-full text-white"
                      style={{ background: confidenceColor(m.confidence), fontSize: "9px" }}>
                      {Math.round(m.confidence * 100)}%
                    </span>
                  )}
                  {/* Group photo badge */}
                  {m.match_type === "group" && (
                    <span className="absolute top-1 right-1 text-xs bg-blue-500 text-white px-1 py-0.5 rounded-full"
                      style={{ fontSize: "9px" }}>
                      group
                    </span>
                  )}
                  {/* Enhanced badge */}
                  {enhancedUrls[m.id] && (
                    <span className="absolute top-1 left-1 text-xs bg-purple-500 text-white px-1 py-0.5 rounded-full"
                      style={{ fontSize: "9px" }}>
                      ✨
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-400">
              <div className="text-3xl mb-2">😕</div>
              <p className="text-xs">No matches found with current filters</p>
              <button onClick={() => { setMinConfidence(0.3); setShowGroup(true); }}
                className="text-xs text-[#C9952A] underline mt-1">Lower confidence threshold</button>
            </div>
          )}
        </div>
      )}

      {status === "error" && (
        <p className="mt-2 text-xs text-red-500">Match failed. The gallery may be processing — please try again in a moment.</p>
      )}
    </div>
  );
}

// ── Main gallery page ────────────────────────────────────
export default function GalleryPage() {
  const API = process.env.NEXT_PUBLIC_API_URL || "";

  const [currentUser,   setCurrentUser]   = useState<CurrentUser | null>(null);
  const [invitations,   setInvitations]   = useState<Invitation[]>([]);
  const [selectedId,    setSelectedId]    = useState<number | null>(null);
  const [photos,        setPhotos]        = useState<Photo[]>([]);
  const [categories,    setCategories]    = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedUploadCategory, setSelectedUploadCategory] = useState<number | null>(null);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [lightbox,      setLightbox]      = useState<string | null>(null);
  const [galleryToken,  setGalleryToken]  = useState("");
  const [vendorWebsiteId, setVendorWebsiteId] = useState<number | null>(null);
  const [connectingVendor, setConnectingVendor] = useState(false);

  // Fetch current user
  useEffect(() => {
    authApi.me()
      .then((data: any) => {
        setCurrentUser(data);
      })
      .catch(() => { setCurrentUser(null); });
  }, []);

  // Fetch categories
  useEffect(() => {
    galleryApi.categories()
      .then((data: any) => {
        const list = Array.isArray(data) ? data : (data?.results ?? []);
        setCategories(list);
      })
      .catch(() => { setCategories([]); });
  }, []);

  // Fetch invitation list — normalise paginated or plain-array response
  useEffect(() => {
    if (currentUser?.role === "VENDOR") {
      setInvitations([]);
    } else {
      invitationApi.list()
        .then((data: any) => {
          const list: Invitation[] = Array.isArray(data) ? data : (data?.results ?? []);
          setInvitations(list);
          if (list.length === 1) setSelectedId(list[0].id);
        })
        .catch(() => { setInvitations([]); });
    }
  }, [currentUser]);

  // Fetch photos — owner endpoint filtered by website ID (auth required)
  useEffect(() => {
    if (!selectedId && !vendorWebsiteId) { setPhotos([]); return; }
    setLoadingPhotos(true);
    const websiteId = selectedId || vendorWebsiteId;

    if (!websiteId) {
      setLoadingPhotos(false);
      return;
    }

    galleryApi.list(websiteId)
      .then((data: any) => {
        const list: Photo[] = Array.isArray(data) ? data : (data?.results ?? []);
        // ID-only filtering -- string-name comparison was unreliable
        // (categories had no slug normalization).
        const filtered = selectedCategory
          ? list.filter((p) => (p.category_id ?? p.category) === selectedCategory)
          : list;
        setPhotos(filtered);
      })
      .catch(() => { setPhotos([]); })
      .finally(() => setLoadingPhotos(false));
  }, [selectedId, vendorWebsiteId, selectedCategory]);

  // Upload handler — sends "picture" file + "website" ID + optional "category" to Django
  const handleUpload = async (files: File[]) => {
    const websiteId = selectedId || vendorWebsiteId;
    if (!websiteId) return;

    // Dev-bypass tokens are never sent to the backend → uploads would 401.
    // Show a clear, actionable error rather than a confusing "failed" toast.
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (token?.startsWith("dev_")) {
      toast.error(
        "Image upload requires real login. Please sign in with email/password or Google.",
        { duration: 5000 }
      );
      return;
    }

    let success = 0;
    for (const file of files) {
      try {
        const fd = new FormData();
        fd.append("picture", file);
        fd.append("website", String(websiteId));
        // category MUST be a numeric ID; coerce + skip if not
        if (typeof selectedUploadCategory === "number" && !Number.isNaN(selectedUploadCategory)) {
          fd.append("category", String(selectedUploadCategory));
        }
        // gallery_type controls where the photo appears publicly:
        //   INVITATION (default) -> shown on /invite/[slug]
        //   ALBUM                -> shown on /invite/[slug]/gallery (digital album)
        //   PRIVATE              -> dashboard only, never public
        fd.append("gallery_type", "INVITATION");
        const res: any = await galleryApi.uploadWithCategory(fd);
        setPhotos((prev) => [res, ...prev]);
        success++;
      } catch (err: any) {
        // Distinguish auth errors from generic upload failures
        const statusCode = err?.response?.status;
        if (statusCode === 401 || statusCode === 403) {
          toast.error("Session expired. Please log in again.");
          return;
        }
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    if (success > 0) toast.success(`${success} photo${success > 1 ? "s" : ""} uploaded! AI processing in background…`);
  };

  // Vendor connect to wedding via token
  const handleVendorConnect = async () => {
    if (!galleryToken) return;
    setConnectingVendor(true);
    try {
      const res: any = await invitationApi.verifyGalleryToken(galleryToken);
      if (res.website_id) {
        setVendorWebsiteId(res.website_id);
        setGalleryToken("");
        toast.success("Connected to wedding gallery!");
      } else {
        toast.error("Invalid gallery token");
      }
    } catch (err: any) {
      toast.error("Failed to verify gallery token");
    } finally {
      setConnectingVendor(false);
    }
  };

  // Download — backend returns { url: "..." }
  const handleDownload = async (photo: Photo) => {
    // Backend returns { url: "<absolute>" }.  picture_url is also absolute now,
    // so we no longer have to concat ${API} + relative path (which was broken).
    const fallback = photo.picture_url || photo.thumbnail_url || "";
    try {
      const res: any = await galleryApi.download(photo.id);
      window.open(res.url || fallback, "_blank");
    } catch {
      if (fallback) window.open(fallback, "_blank");
    }
  };

  const selectedInvite = invitations.find((i) => i.id === selectedId);

  return (
    <div className="min-h-screen p-6" style={{ background: "#F8F5F0" }}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-light" style={{ color: "#0D1B2A" }}>Photo Gallery</h1>
        <p className="text-sm text-gray-500 mt-1">
          {currentUser?.role === "VENDOR" ? "Upload photos to weddings" : "Upload and manage wedding photos"}
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Vendor connect section */}
          {currentUser?.role === "VENDOR" && !vendorWebsiteId && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-3">
              <h3 className="font-semibold text-gray-800">Connect to Wedding</h3>
              <p className="text-xs text-gray-500">Enter the gallery token shared by the couple</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter gallery token"
                  value={galleryToken}
                  onChange={(e) => setGalleryToken(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#8B1A4A]"
                  disabled={connectingVendor}
                />
                <button
                  onClick={handleVendorConnect}
                  disabled={!galleryToken || connectingVendor}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: "#8B1A4A" }}>
                  {connectingVendor ? "Connecting…" : "Connect"}
                </button>
              </div>
            </div>
          )}

          {/* Couple invitation selector */}
          {currentUser?.role !== "VENDOR" && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <label className="text-xs font-medium text-gray-500 block mb-2">
                Select Wedding
              </label>
              <select
                value={selectedId ?? ""}
                onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : null)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#8B1A4A] bg-white">
                <option value="">— Choose invitation —</option>
                {invitations.map((inv) => (
                  <option key={inv.id} value={inv.id}>{inv.couple}</option>
                ))}
              </select>
            </div>
          )}

          {/* Upload zone */}
          <UploadZone
            onUpload={handleUpload}
            disabled={!selectedId && !vendorWebsiteId}
            categories={categories}
            onCategoryChange={setSelectedUploadCategory}
            selectedCategory={selectedUploadCategory}
          />

          {/* Category filter */}
          {photos.length > 0 && categories.length > 0 && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <label className="text-xs font-medium text-gray-500 block mb-2">
                Filter by Category
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition ${
                    selectedCategory === null
                      ? "bg-[#8B1A4A] text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}>
                  All
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition ${
                      selectedCategory === cat.id
                        ? "bg-[#8B1A4A] text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}>
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Photo grid */}
          <div>
            {loadingPhotos ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="aspect-square bg-gray-200 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : photos.length === 0 && (selectedId || vendorWebsiteId) ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
                <div className="text-4xl mb-2">🖼️</div>
                <p className="text-sm text-gray-400">
                  {selectedCategory ? "No photos in this category" : "No photos yet. Upload some above!"}
                </p>
              </div>
            ) : photos.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-700">
                    {photos.length} photo{photos.length !== 1 ? "s" : ""} ·{" "}
                    <span className="text-gray-400">
                      {selectedInvite?.couple || (vendorWebsiteId ? "Wedding Gallery" : "")}
                    </span>
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {photos.map((photo) => {
                    // picture_url and thumbnail_url are ABSOLUTE URLs from the
                    // backend now -- no API base prefix needed.  Legacy relative
                    // values are still tolerated as a defensive fallback.
                    const abs = (u?: string) =>
                      !u ? "" : (u.startsWith("http") ? u : `${API}${u}`);
                    const src     = abs(photo.thumbnail_url || photo.picture_url || photo.picture);
                    const fullSrc = abs(photo.picture_url || photo.picture || photo.thumbnail_url);
                    return (
                    <div key={photo.id}
                      className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 cursor-pointer">
                      <img src={src}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onClick={() => setLightbox(fullSrc)}
                        alt={photo.title || "Wedding photo"} />
                      {/* Category badge */}
                      {photo.category_name && (
                        <div className="absolute top-2 left-2 bg-[#8B1A4A]/90 text-white px-2 py-1 rounded-full text-xs font-medium">
                          {photo.category_name}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-end justify-end p-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDownload(photo); }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 hover:bg-white p-1.5 rounded-lg"
                          title="Download">
                          ⬇️
                        </button>
                      </div>
                    </div>
                  );
                  })}
                </div>
              </>
            ) : null}
          </div>
        </div>

        {/* Right column: AI Selfie Match */}
        <div className="space-y-4">
          <SelfieMatchPanel websiteId={selectedId || vendorWebsiteId} />

          {/* Stats */}
          {photos.length > 0 && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">📊 Gallery Stats</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total photos</span>
                  <span className="font-medium text-gray-800">{photos.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Wedding</span>
                  <span className="font-medium text-gray-800 truncate ml-4">
                    {selectedInvite?.couple ?? "—"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white text-2xl opacity-70 hover:opacity-100">✕</button>
          <img src={lightbox}
            className="max-w-[90vw] max-h-[90vh] rounded-xl object-contain"
            alt="Wedding photo" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
