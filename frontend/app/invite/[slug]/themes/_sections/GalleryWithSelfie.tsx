"use client";
/**
 * GalleryWithSelfie -- shared invitation gallery section with AI selfie match.
 *
 * Drop into any invitation theme.  Public-by-default: NO auth headers sent,
 * so guests opening the WhatsApp share link can use it without signing in.
 *
 *   <GalleryWithSelfie
 *      slug={inv.slug}
 *      images={galleryImages}
 *      categories={galleryCategories}
 *      // -- palette
 *      background="#0b0b0d" surface="rgba(255,255,255,0.04)"
 *      textColor="#fff" mutedColor="rgba(255,255,255,.55)"
 *      accent="#C9A84C" accentText="#0b0b0d"
 *   />
 *
 * Behaviour
 *   - 12-photo grid + "View More" -> /invite/<slug>/gallery
 *   - Lightbox with keyboard nav
 *   - "Find My Photos" button opens a selfie modal
 *   - Selfie POSTs directly to ${FASTAPI}/api/v1/ai/selfie-match  (synchronous)
 *   - Matches replace the grid, "Show All Photos" button to revert
 */
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";

const FASTAPI = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8001";
const API     = process.env.NEXT_PUBLIC_API_URL     || "http://localhost:8000";

export interface GwsImage {
  id:         number;
  image?:     string;     // absolute URL preferred
  thumbnail?: string;
  caption?:   string;
  tag?:       string;
  category?:  { id: number; name: string } | null;
}

export interface GwsCategory { id: number; name: string }

export interface GalleryWithSelfieProps {
  slug:        string;
  images:      GwsImage[];
  categories?: GwsCategory[];

  /** Palette */
  background?: string;
  surface?:    string;
  textColor?:  string;
  mutedColor?: string;
  accent?:     string;
  accentText?: string;

  /** Typography */
  serifClass?: string;
  sansClass?:  string;

  /** Section copy */
  eyebrow?:  string;
  heading?:  string;
  intro?:    string;

  sectionId?: string;
}

function abs(u?: string) {
  if (!u) return "";
  return u.startsWith("http") ? u : `${API}${u.startsWith("/") ? "" : "/"}${u}`;
}

export default function GalleryWithSelfie({
  slug, images, categories = [],
  background = "#0b0b0d", surface = "rgba(255,255,255,0.04)",
  textColor = "#ffffff", mutedColor = "rgba(255,255,255,0.55)",
  accent = "#C9A84C", accentText = "#0b0b0d",
  serifClass = "theme-serif", sansClass = "theme-sans",
  eyebrow = "Memories captured forever",
  heading = "Photo Gallery",
  intro   = "Browse the celebration. Use AI Selfie Match to instantly find every photo you appear in.",
  sectionId = "gallery",
}: GalleryWithSelfieProps) {
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [lightbox, setLightbox]   = useState<number | null>(null);
  const [qrFor,    setQrFor]      = useState<number | null>(null);
  const [showSelfie, setShowSelfie] = useState(false);

  // Selfie state
  const [selfieFile,    setSelfieFile]    = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [selfieStatus,  setSelfieStatus]  = useState<"idle" | "matching" | "done" | "error">("idle");
  const [selfieError,   setSelfieError]   = useState("");
  const [matched,       setMatched]       = useState<GwsImage[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Filter by category for the grid
  const filteredImages = useMemo(() => {
    const list = matched ?? images;
    if (!activeCat || matched) return list;
    return list.filter(p => p.category?.name === activeCat);
  }, [images, matched, activeCat]);

  const display = filteredImages.slice(0, 12);
  const hasMore = filteredImages.length > 12;

  // Lightbox keyboard
  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight")
        setLightbox(i => (i === null ? 0 : (i + 1) % filteredImages.length));
      if (e.key === "ArrowLeft")
        setLightbox(i => (i === null ? 0 : (i - 1 + filteredImages.length) % filteredImages.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, filteredImages.length]);

  // Selfie pick
  const pickSelfie = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setSelfieError("Please upload an image (JPG / PNG).");
      return;
    }
    if (f.size > 15 * 1024 * 1024) {
      setSelfieError("Image too large (15 MB max).");
      return;
    }
    setSelfieError("");
    setSelfieFile(f);
    setSelfiePreview(URL.createObjectURL(f));
    setSelfieStatus("idle");
  };

  const submitSelfie = useCallback(async () => {
    if (!selfieFile) return;
    setSelfieStatus("matching");
    setSelfieError("");
    setMatched(null);

    try {
      const fd = new FormData();
      fd.append("file", selfieFile);
      const url = `${FASTAPI}/api/v1/ai/selfie-match?website_slug=${encodeURIComponent(slug)}`;
      const res = await fetch(url, { method: "POST", body: fd });

      if (!res.ok) {
        let msg = `AI service returned ${res.status}`;
        try {
          const j = await res.json();
          if (j?.detail) msg = j.detail;
        } catch { /* ignore */ }
        setSelfieError(msg);
        setSelfieStatus("error");
        return;
      }

      const data = await res.json();
      const matchedIds: number[] = (data.matched ?? []).map((m: any) => m.id);

      // Build the matched-image array preserving the AI similarity ranking,
      // pulling captions/category from the original feed.
      const byId = new Map(images.map(i => [i.id, i]));
      const ordered: GwsImage[] = [];
      for (const m of (data.matched ?? [])) {
        const found = byId.get(m.id);
        if (found) ordered.push(found);
        else if (m.picture) {
          ordered.push({ id: m.id, image: m.picture, caption: "" });
        }
      }
      setMatched(ordered);
      setSelfieStatus("done");
      // Auto-close modal so the user sees their matches
      setTimeout(() => setShowSelfie(false), 800);
    } catch (e: any) {
      setSelfieError(e?.message || "Network error -- please try again.");
      setSelfieStatus("error");
    }
  }, [selfieFile, slug, images]);

  const reset = () => { setMatched(null); setSelfieFile(null); setSelfiePreview(null); setSelfieStatus("idle"); };

  return (
    <section id={sectionId} className="py-20 px-4 md:px-8" style={{ background, color: textColor }}>
      <div className="max-w-6xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-12">
          <p className={sansClass}
             style={{ fontSize: 11, letterSpacing: "0.4em", textTransform: "uppercase",
                      color: accent, opacity: 0.85, marginBottom: 14 }}>
            {eyebrow}
          </p>
          <h2 className={serifClass}
              style={{ fontSize: "clamp(2rem, 5vw, 2.8rem)", fontWeight: 300,
                       lineHeight: 1.1, marginBottom: 14 }}>
            {heading}
          </h2>
          <div aria-hidden style={{ width: 60, height: 1, background: accent,
                                    opacity: 0.5, margin: "18px auto 22px" }} />
          <p className={sansClass}
             style={{ color: mutedColor, fontSize: 15, lineHeight: 1.7,
                      maxWidth: 580, margin: "0 auto 28px" }}>
            {intro}
          </p>

          {/* AI selfie-match CTA */}
          <button
            type="button"
            onClick={() => setShowSelfie(true)}
            className={`${sansClass} theme-cta`}
            style={{ display: "inline-flex", alignItems: "center", gap: 10,
                     padding: "12px 22px", borderRadius: 999,
                     background: accent, color: accentText, fontSize: 13,
                     fontWeight: 700, letterSpacing: "0.18em",
                     textTransform: "uppercase", border: "none", cursor: "pointer" }}>
            🔍 AI Selfie Match — Find My Photos
          </button>

          {matched && (
            <div style={{ marginTop: 18, color: mutedColor, fontSize: 14 }}>
              <span className={sansClass}>
                Showing <strong style={{ color: accent }}>{matched.length}</strong> match{matched.length === 1 ? "" : "es"} from AI
              </span>{" "}
              <button type="button" onClick={reset}
                className={sansClass}
                style={{ marginLeft: 12, background: "transparent",
                         border: `1px solid ${accent}`, color: accent,
                         padding: "6px 12px", borderRadius: 999, cursor: "pointer",
                         fontSize: 11, letterSpacing: "0.15em",
                         textTransform: "uppercase" }}>
                Show all photos
              </button>
            </div>
          )}
        </div>

        {/* Category filter pills (only when not in match-mode and we have categories) */}
        {!matched && categories.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            <button onClick={() => setActiveCat(null)} className={sansClass}
              style={{ padding: "6px 16px", borderRadius: 999, fontSize: 12,
                       fontWeight: 600, letterSpacing: "0.1em",
                       textTransform: "uppercase",
                       border: `1px solid ${accent}`,
                       background: !activeCat ? accent : "transparent",
                       color: !activeCat ? accentText : accent, cursor: "pointer" }}>
              All
            </button>
            {categories.map(c => (
              <button key={c.id} onClick={() => setActiveCat(c.name)}
                className={sansClass}
                style={{ padding: "6px 16px", borderRadius: 999, fontSize: 12,
                         fontWeight: 600, letterSpacing: "0.1em",
                         textTransform: "uppercase",
                         border: `1px solid ${accent}55`,
                         background: activeCat === c.name ? accent : "transparent",
                         color: activeCat === c.name ? accentText : textColor,
                         cursor: "pointer" }}>
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Grid */}
        {display.length === 0 ? (
          <p className={sansClass} style={{ textAlign: "center", color: mutedColor }}>
            {matched ? "No matches found yet — try a clearer selfie." : "Photos will be shared soon ✨"}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {display.map((p, i) => {
              const src = abs(p.thumbnail || p.image);
              return (
                <div key={p.id}
                  onClick={() => setLightbox(i)}
                  className="relative aspect-square overflow-hidden rounded-xl cursor-pointer group"
                  style={{ background: surface }}>
                  {src ? (
                    <img src={src} alt={p.caption || `Photo ${i + 1}`}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"
                         style={{ color: mutedColor }}>—</div>
                  )}
                  {/* QR / download badge -- always visible on mobile, hover on desktop */}
                  <button
                    type="button"
                    aria-label="Show download QR code"
                    onClick={(e) => { e.stopPropagation(); setQrFor(i); }}
                    className="absolute top-2 right-2 w-9 h-9 rounded-full flex items-center justify-center text-base shadow-md backdrop-blur opacity-70 group-hover:opacity-100 transition"
                    style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}>
                    ⤓
                  </button>
                  {p.caption && (
                    <div className="absolute inset-x-0 bottom-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)" }}>
                      <p className={sansClass}
                         style={{ color: "#fff", fontSize: 11, lineHeight: 1.3 }}>
                        {p.caption}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* View-more link */}
        {hasMore && (
          <div className="text-center mt-10">
            <a href={`/invite/${slug}/gallery`}
              className={`${sansClass} theme-cta`}
              style={{ display: "inline-block", padding: "12px 26px",
                       borderRadius: 999, border: `1px solid ${accent}`,
                       color: accent, background: "transparent",
                       fontSize: 12, fontWeight: 700, letterSpacing: "0.18em",
                       textTransform: "uppercase", textDecoration: "none" }}>
              View All {filteredImages.length} Photos →
            </a>
          </div>
        )}
      </div>

      {/* ── Lightbox ──────────────────────────────────────────────────── */}
      {lightbox !== null && filteredImages[lightbox] && (
        <div onClick={() => setLightbox(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)",
                   zIndex: 100, display: "flex", alignItems: "center",
                   justifyContent: "center", cursor: "pointer", padding: 16 }}>
          <img
            src={abs(filteredImages[lightbox].image || filteredImages[lightbox].thumbnail)}
            alt={filteredImages[lightbox].caption || "Photo"}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "92vw", maxHeight: "90vh",
                     objectFit: "contain", borderRadius: 8 }} />
          <button type="button" aria-label="Close"
            onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
            style={{ position: "absolute", top: 16, right: 16, fontSize: 28,
                     background: "rgba(255,255,255,0.1)", color: "#fff",
                     border: "none", width: 44, height: 44, borderRadius: 999,
                     cursor: "pointer" }}>×</button>
        </div>
      )}

      {/* ── Selfie modal ──────────────────────────────────────────────── */}
      {showSelfie && (
        <div onClick={() => selfieStatus !== "matching" && setShowSelfie(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
                   zIndex: 110, display: "flex", alignItems: "center",
                   justifyContent: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "#111", color: "#fff", borderRadius: 18,
                     border: `1px solid ${accent}55`, maxWidth: 460, width: "100%",
                     padding: 28 }}>
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <p className={sansClass}
                 style={{ fontSize: 11, letterSpacing: "0.4em",
                          textTransform: "uppercase", color: accent,
                          opacity: 0.85, marginBottom: 8 }}>
                AI Selfie Match
              </p>
              <h3 className={serifClass}
                  style={{ fontSize: "1.7rem", fontWeight: 300, color: "#fff" }}>
                Find Your Photos
              </h3>
              <p className={sansClass}
                 style={{ color: "rgba(255,255,255,0.6)", fontSize: 13,
                          marginTop: 8 }}>
                Upload a clear front-facing selfie. We'll instantly find every photo you appear in.
              </p>
            </div>

            <div onClick={() => fileRef.current?.click()}
              style={{ border: `1.5px dashed ${accent}55`, borderRadius: 16,
                       padding: selfiePreview ? 12 : "32px 16px",
                       textAlign: "center", cursor: "pointer",
                       background: "rgba(255,255,255,0.02)", marginBottom: 14 }}>
              {selfiePreview ? (
                <img src={selfiePreview} alt="Selfie preview"
                  style={{ maxHeight: 200, maxWidth: "100%", borderRadius: 10 }} />
              ) : (
                <>
                  <div style={{ fontSize: 38, marginBottom: 8 }}>🤳</div>
                  <p className={sansClass} style={{ fontSize: 14 }}>Tap to choose your selfie</p>
                  <p className={sansClass} style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
                    JPG / PNG · up to 15 MB
                  </p>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" capture="user"
              onChange={pickSelfie} style={{ display: "none" }} />

            {selfieError && (
              <p role="alert" className={sansClass}
                 style={{ color: "#ff7a7a", fontSize: 13, marginBottom: 10,
                          textAlign: "center" }}>{selfieError}</p>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button type="button"
                onClick={() => { setShowSelfie(false); reset(); }}
                disabled={selfieStatus === "matching"}
                className={sansClass}
                style={{ flex: 1, padding: 12, borderRadius: 12,
                         border: "1px solid rgba(255,255,255,0.2)",
                         background: "transparent", color: "#fff", cursor: "pointer",
                         fontSize: 12, fontWeight: 600, letterSpacing: "0.15em",
                         textTransform: "uppercase" }}>
                Cancel
              </button>
              <button type="button"
                onClick={submitSelfie}
                disabled={!selfieFile || selfieStatus === "matching"}
                className={`${sansClass} theme-cta`}
                style={{ flex: 2, padding: 12, borderRadius: 12, border: "none",
                         cursor: selfieFile && selfieStatus !== "matching" ? "pointer" : "not-allowed",
                         background: selfieFile && selfieStatus !== "matching" ? accent : `${accent}55`,
                         color: accentText, fontSize: 12, fontWeight: 700,
                         letterSpacing: "0.18em", textTransform: "uppercase" }}>
                {selfieStatus === "matching" ? "Matching…" : "Find My Photos"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Per-photo QR + Download modal ─────────────────────────────── */}
      {qrFor !== null && filteredImages[qrFor] && (() => {
        const photo  = filteredImages[qrFor];
        const fullUrl = abs(photo.image || photo.thumbnail);
        return (
          <div onClick={() => setQrFor(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)",
                     zIndex: 120, display: "flex", alignItems: "center",
                     justifyContent: "center", padding: 16 }}>
            <div onClick={(e) => e.stopPropagation()}
              style={{ background: "#fff", color: "#111", borderRadius: 18,
                       maxWidth: 380, width: "100%", padding: 22, textAlign: "center" }}>
              <p className={sansClass}
                 style={{ fontSize: 11, letterSpacing: "0.35em",
                          textTransform: "uppercase", color: "#666",
                          marginBottom: 4 }}>
                Scan to download
              </p>
              <h3 className={serifClass}
                  style={{ fontSize: "1.4rem", fontWeight: 400, marginBottom: 14 }}>
                {photo.caption || "Wedding Photo"}
              </h3>

              {/* QR code */}
              <div style={{ background: "#fff", padding: 10, display: "inline-block",
                            borderRadius: 12, border: "1px solid #eee", marginBottom: 14 }}>
                <QRCodeSVG value={fullUrl} size={220} level="M" includeMargin={false} />
              </div>

              <p className={sansClass}
                 style={{ fontSize: 12, color: "#666", marginBottom: 14 }}>
                Open camera, point at code and the photo will download.
              </p>

              {/* Preview thumbnail */}
              <img src={fullUrl} alt={photo.caption || ""}
                style={{ width: "100%", maxHeight: 140, objectFit: "cover",
                         borderRadius: 10, marginBottom: 14 }} />

              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => setQrFor(null)}
                  className={sansClass}
                  style={{ flex: 1, padding: 12, borderRadius: 12,
                           border: "1px solid #ddd", background: "#fff",
                           cursor: "pointer", fontSize: 12, fontWeight: 600,
                           letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  Close
                </button>
                <a href={fullUrl} download target="_blank" rel="noopener"
                  className={`${sansClass} theme-cta`}
                  style={{ flex: 2, padding: 12, borderRadius: 12,
                           background: accent, color: accentText,
                           textDecoration: "none", fontSize: 12, fontWeight: 700,
                           letterSpacing: "0.15em", textTransform: "uppercase",
                           textAlign: "center", display: "inline-block" }}>
                  Download
                </a>
              </div>
            </div>
          </div>
        );
      })()}
    </section>
  );
}
