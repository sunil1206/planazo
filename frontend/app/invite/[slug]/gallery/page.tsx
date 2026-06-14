"use client";
/**
 * /invite/[slug]/gallery — Full wedding photo gallery
 * Masonry grid · category filters · search · lightbox · AI selfie match link
 * Guests can upload photos; photographers upload via their dashboard token.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const FASTAPI = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8001";

type Photo = {
  id: number;
  image: string;
  thumbnail?: string;
  caption?: string;
  tag?: string;        // "ceremony" | "reception" | "portrait" | "fun" | "decor" | etc.
  uploader_name?: string;
  created_at?: string;
};

const FILTERS = [
  { key: "all",       label: "All Photos",   emoji: "📷" },
  { key: "ceremony",  label: "Ceremony",     emoji: "💒" },
  { key: "reception", label: "Reception",    emoji: "🥂" },
  { key: "portrait",  label: "Portraits",    emoji: "👫" },
  { key: "fun",       label: "Fun Moments",  emoji: "🎉" },
  { key: "decor",     label: "Décor",        emoji: "🌸" },
];

function imgUrl(src: string): string {
  return src.startsWith("http") ? src : `${API}${src}`;
}

// ── Masonry grid ──────────────────────────────────────────────────────────────
function MasonryGrid({ photos, onOpen }: { photos: Photo[]; onOpen: (i: number) => void }) {
  // 3-column masonry using CSS columns
  return (
    <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 [column-fill:_balance]">
      {photos.map((p, i) => (
        <div key={p.id}
          onClick={() => onOpen(i)}
          className="break-inside-avoid mb-3 rounded-xl overflow-hidden cursor-pointer group relative shadow-sm hover:shadow-md transition-shadow">
          <img
            src={imgUrl(p.image)}
            alt={p.caption || `Photo ${i + 1}`}
            className="w-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          {p.caption && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-end p-2 opacity-0 group-hover:opacity-100">
              <p className="text-white text-xs font-medium line-clamp-2">{p.caption}</p>
            </div>
          )}
          {p.tag && (
            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs bg-white/80 text-gray-700 font-medium opacity-0 group-hover:opacity-100 transition">
              {FILTERS.find(f => f.key === p.tag)?.emoji} {p.tag}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Lightbox ─────────────────────────────────────────────────────────────────
function Lightbox({ photos, index, onClose, onNav }: {
  photos: Photo[]; index: number; onClose: () => void; onNav: (d: 1 | -1) => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNav(1);
      if (e.key === "ArrowLeft")  onNav(-1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const p = photos[index];
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 text-white text-3xl z-10">×</button>
      <button onClick={e => { e.stopPropagation(); onNav(-1); }}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-4xl z-10 px-2 hover:text-rose-300">‹</button>
      <button onClick={e => { e.stopPropagation(); onNav(1); }}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-4xl z-10 px-2 hover:text-rose-300">›</button>
      <div className="max-w-3xl max-h-[90vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
        <img src={imgUrl(p.image)} alt={p.caption || ""} className="max-h-[80vh] max-w-full object-contain rounded-xl" />
        {p.caption && <p className="text-white text-sm mt-3 text-center">{p.caption}</p>}
        <p className="text-gray-400 text-xs mt-1">{index + 1} / {photos.length}</p>
      </div>
    </div>
  );
}

// ── Guest upload ──────────────────────────────────────────────────────────────
function GuestUpload({ slug, onUploaded }: { slug: string; onUploaded: () => void }) {
  const [show, setShow] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [name,  setName]  = useState("");
  const [tag,   setTag]   = useState("reception");
  const [busy,  setBusy]  = useState(false);
  const [done,  setDone]  = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async () => {
    if (!files.length) return;
    setBusy(true);
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append("image",         file);
        fd.append("tag",           tag);
        fd.append("uploader_name", name || "Guest");
        await fetch(`${API}/api/invitations/invite/${slug}/upload-photo/`, { method: "POST", body: fd });
      }
      setDone(true);
      onUploaded();
      setTimeout(() => { setShow(false); setDone(false); setFiles([]); }, 2000);
    } catch { alert("Upload failed. Please try again."); }
    finally { setBusy(false); }
  };

  return (
    <>
      <button onClick={() => setShow(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition">
        📸 Add Photos
      </button>
      {show && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-gray-800">Share Your Photos</h3>
              <button onClick={() => setShow(false)} className="text-gray-400 text-2xl">×</button>
            </div>
            {done ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">🎉</div>
                <p className="font-semibold text-gray-700">Photos uploaded! Thank you!</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Your Name</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Rahul Sharma"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-rose-300" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Category</label>
                  <select value={tag} onChange={e => setTag(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-rose-300 bg-white">
                    {FILTERS.filter(f => f.key !== "all").map(f => (
                      <option key={f.key} value={f.key}>{f.emoji} {f.label}</option>
                    ))}
                  </select>
                </div>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-rose-200 rounded-2xl p-8 text-center cursor-pointer hover:bg-rose-50 transition">
                  {files.length > 0
                    ? <p className="text-rose-600 font-medium text-sm">{files.length} photo{files.length > 1 ? "s" : ""} selected</p>
                    : <>
                        <div className="text-3xl mb-2">📸</div>
                        <p className="text-sm text-gray-400">Click to select photos</p>
                        <p className="text-xs text-gray-300 mt-1">JPEG, PNG — multiple allowed</p>
                      </>
                  }
                  <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
                    onChange={e => setFiles(Array.from(e.target.files || []))} />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShow(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500">Cancel</button>
                  <button onClick={upload} disabled={!files.length || busy}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold disabled:opacity-50">
                    {busy ? "Uploading…" : "Upload"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function GalleryPage() {
  const params = useParams();
  const slug   = params?.slug as string;

  const [invite,  setInvite]  = useState<any>(null);
  const [photos,  setPhotos]  = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("all");
  const [search,  setSearch]  = useState("");
  const [lbIdx,   setLbIdx]   = useState<number | null>(null);
  const [page,    setPage]    = useState(1);
  const PER_PAGE = 24;

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      // Step 1: fetch the invitation (we need its numeric id for the gallery query).
      const inv = await fetch(`${API}/api/invitations/invite/${slug}/`)
        .then(r => r.json())
        .catch(() => null);
      setInvite(inv);

      // Step 2: load photos from BOTH sources -- the dashboard `GalleryImage`
      // model (where /dashboard/gallery-v2 uploads land) AND the guest-photo
      // `WeddingGalleryPhoto` model (where in-page uploads land).  Merge them
      // into a single feed so the public gallery shows everything.
      const fetches: Promise<any>[] = [
        fetch(`${API}/api/invitations/invite/${slug}/photos/`)
          .then(r => r.json()).catch(() => []),
      ];
      if (inv?.id) {
        fetches.push(
          fetch(`${API}/api/gallery/images/by-website/?website_id=${inv.id}&gallery_type=ALBUM,INVITATION&per_page=500`)
            .then(r => r.json()).catch(() => [])
        );
      }
      const results = await Promise.all(fetches);

      const guestPhotos = (() => {
        const x = results[0];
        return Array.isArray(x) ? x : (x?.results ?? []);
      })();

      const proPhotos = ((): any[] => {
        if (results.length < 2) return [];
        const x = results[1];
        const arr = Array.isArray(x) ? x : (x?.results ?? []);
        // Normalize backend GalleryImage -> the Photo shape this page uses.
        return arr.map((g: any) => ({
          id:            10_000_000 + (g.id ?? 0),  // namespace to avoid id clash
          image:         g.picture || g.thumbnail_url || g.picture_url || "",
          thumbnail:     g.thumbnail_url || g.thumb_small || g.thumb_medium || g.picture || "",
          caption:       g.title || "",
          tag:           g.category_name?.toLowerCase() || "ceremony",
          uploader_name: "Photographer",
          created_at:    g.created_at,
        }));
      })();

      setPhotos([...proPhotos, ...guestPhotos]);
    } finally { setLoading(false); }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  // Filter + search
  const filtered = photos.filter(p => {
    const matchFilter = filter === "all" || p.tag === filter;
    const matchSearch = !search || p.caption?.toLowerCase().includes(search.toLowerCase()) || p.uploader_name?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const paginated  = filtered.slice(0, page * PER_PAGE);
  const hasMore    = paginated.length < filtered.length;

  const openLightbox = (idx: number) => setLbIdx(idx);
  const navLightbox  = (dir: 1 | -1) => setLbIdx(i => i === null ? null : Math.max(0, Math.min(filtered.length - 1, i + dir)));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/invite/${slug}`} className="text-gray-400 hover:text-rose-600 text-sm">← Back</Link>
            <span className="text-gray-200">|</span>
            <h1 className="font-bold text-gray-800">{invite?.couple || "Wedding"} — Gallery</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/gallery-v2`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-600 text-xs font-semibold border border-purple-200 hover:bg-purple-100 transition">
              ✨ Find My Photos (AI)
            </Link>
            {slug && <GuestUpload slug={slug} onUploaded={load} />}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Stats bar */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-800">{filtered.length}</span> photo{filtered.length !== 1 ? "s" : ""}
            {filter !== "all" && ` in ${FILTERS.find(f => f.key === filter)?.label}`}
          </p>
          {/* Search */}
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by caption or uploader…"
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-rose-300 w-56"
          />
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-6 flex-wrap">
          {FILTERS.map(f => (
            <button key={f.key}
              onClick={() => { setFilter(f.key); setPage(1); }}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition ${
                filter === f.key
                  ? "bg-rose-600 text-white shadow-sm"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-rose-300"
              }`}>
              <span>{f.emoji}</span>
              <span>{f.label}</span>
              {f.key !== "all" && (
                <span className={`text-xs ${filter === f.key ? "text-rose-100" : "text-gray-400"}`}>
                  ({photos.filter(p => p.tag === f.key).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* AI selfie match banner */}
        <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🤳</div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">Find photos of yourself using AI</p>
              <p className="text-xs text-gray-400">Upload a selfie and our AI will find all your photos from the event</p>
            </div>
          </div>
          <Link href="/dashboard/gallery-v2"
            className="flex-shrink-0 px-5 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition shadow">
            Try AI Match →
          </Link>
        </div>

        {/* Photos grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="aspect-square rounded-xl bg-gray-200 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📷</div>
            <p className="text-gray-400 font-medium">No photos yet</p>
            <p className="text-gray-300 text-sm mt-1">Be the first to add photos!</p>
          </div>
        ) : (
          <>
            <MasonryGrid photos={paginated} onOpen={openLightbox} />
            {hasMore && (
              <div className="text-center mt-8">
                <button onClick={() => setPage(p => p + 1)}
                  className="px-8 py-3 rounded-full border-2 border-rose-200 text-rose-600 font-semibold text-sm hover:bg-rose-50 transition">
                  Load More Photos ({filtered.length - paginated.length} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Lightbox */}
      {lbIdx !== null && (
        <Lightbox
          photos={paginated}
          index={lbIdx}
          onClose={() => setLbIdx(null)}
          onNav={navLightbox}
        />
      )}
    </div>
  );
}
