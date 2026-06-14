"use client";
/**
 * /invite/[slug] — Theme router
 * Fetches invitation data then renders the correct theme component.
 * Theme is set in the editor (General tab → Theme picker).
 */
import { useState, useEffect, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";

import ModernMinimal    from "./themes/ModernMinimal";
import RoyalMughal      from "./themes/RoyalMughal";
import KeralaTraditional from "./themes/KeralaTraditional";
import FloralPastel     from "./themes/FloralPastel";
import CinematicDark    from "./themes/CinematicDark";
import LuxuryWedding    from "./themes/LuxuryWedding";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Loading skeleton ──────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="text-center">
        <div className="text-6xl mb-4 animate-bounce">💍</div>
        <p className="text-gray-400 text-sm tracking-widest uppercase font-light">
          Loading invitation…
        </p>
      </div>
    </div>
  );
}

// ── Error screen ──────────────────────────────────────────────────────────────
function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
      <div className="text-center px-6">
        <div className="text-6xl mb-4">💌</div>
        <h1 className="text-2xl font-light mb-2">Invitation Not Found</h1>
        <p className="text-gray-400 text-sm">
          This invitation may not be published yet or the link may be incorrect.
        </p>
      </div>
    </div>
  );
}

// ── Theme map ─────────────────────────────────────────────────────────────────
const THEME_MAP: Record<string, React.ComponentType<any>> = {
  modern_minimal:  ModernMinimal,
  royal_mughal:    RoyalMughal,
  kerala_trad:     KeralaTraditional,
  floral_pastel:   FloralPastel,
  cinematic_dark:  CinematicDark,
  luxury_wedding:  LuxuryWedding,
};

// ── Inner page (uses useSearchParams, must be wrapped in Suspense) ────────────
function InvitePageInner() {
  const params       = useParams();
  const searchParams = useSearchParams();

  const slug         = params?.slug as string;
  const previewToken = searchParams?.get("preview") ?? "";

  const [inv,              setInv]              = useState<any>(null);
  const [galleryImages,    setGalleryImages]    = useState<any[]>([]);
  const [galleryCategories,setGalleryCategories]= useState<any[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [notFound,         setNotFound]         = useState(false);

  // Fetch invitation + gallery data
  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);

    const invUrl = previewToken
      ? `${API}/api/invitations/invite/${slug}/?preview=${encodeURIComponent(previewToken)}`
      : `${API}/api/invitations/invite/${slug}/`;

    fetch(invUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      })
      .then(async (data) => {
        setInv(data);
        // Fetch professional gallery + categories in parallel (non-blocking).
        // IMPORTANT: use the PUBLIC `by-website` endpoint -- the plain
        // /api/gallery/images/ route requires auth and ignores ?website=.
        const [galleryRes, catRes] = await Promise.allSettled([
          fetch(`${API}/api/gallery/images/by-website/?website_id=${data.id}&gallery_type=INVITATION&per_page=200`).then(r => r.json()),
          fetch(`${API}/api/gallery/categories/`).then(r => r.json()),
        ]);
        if (galleryRes.status === "fulfilled") {
          const gd  = galleryRes.value;
          const raw = Array.isArray(gd) ? gd : (gd?.results ?? []);
          // Backend returns { picture, picture_url, thumbnail_url, category (id),
          // category_name }, but themes consume { id, image, caption, tag,
          // category: {id, name} }.  Normalize once here so every theme works.
          const normalized = raw.map((g: any) => ({
            id:        g.id,
            // `picture` is the absolute URL (DRF auto-builds with request ctx);
            // `picture_url` is broken (returns the storage path with no /media/);
            // `thumbnail_url` is a relative path starting with /media/.
            image:     g.picture || g.thumbnail_url || g.image || g.picture_url || "",
            thumbnail: g.thumbnail_url || g.thumb_small || g.thumb_medium || g.picture || "",
            caption:   g.title || g.caption || "",
            tag:       g.tag || g.category_name || "",
            category:  g.category_name
              ? { id: g.category_id ?? g.category, name: g.category_name }
              : (typeof g.category === "object" && g.category) ? g.category : null,
          }));
          setGalleryImages(normalized);
        }
        if (catRes.status === "fulfilled") {
          const cd = catRes.value;
          setGalleryCategories(Array.isArray(cd) ? cd : (cd?.results ?? []));
        }
      })
      .catch((err) => {
        console.error("Invite fetch error:", err);
        setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [slug, previewToken]);

  // RSVP handler
  const handleRsvp = async (data: any) => {
    const res = await fetch(`${API}/api/invitations/invite/${slug}/rsvp/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("RSVP failed");
  };

  // Wish handler
  const handleWish = async (data: any) => {
    const res = await fetch(`${API}/api/invitations/invite/${slug}/wish/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Wish failed");
  };

  // Guest photo upload handler
  const handleUploadPhoto = async (formData: FormData) => {
    const res = await fetch(`${API}/api/invitations/invite/${slug}/upload-photo/`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Upload failed");
  };

  if (loading)  return <LoadingSkeleton />;
  if (notFound || !inv) return <NotFound />;

  // Select theme component (fall back to LuxuryWedding for new/unknown themes)
  const theme     = inv.theme || "luxury_wedding";
  const ThemePage = THEME_MAP[theme] ?? LuxuryWedding;

  return (
    <ThemePage
      inv={inv}
      galleryImages={galleryImages}
      galleryCategories={galleryCategories}
      onRsvp={handleRsvp}
      onWish={handleWish}
      onUploadPhoto={handleUploadPhoto}
    />
  );
}

// ── Default export — wrap in Suspense for useSearchParams ─────────────────────
export default function InvitePage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <InvitePageInner />
    </Suspense>
  );
}
