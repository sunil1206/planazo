"use client";
/**
 * RoyalMughal Theme — Auto-generated from LuxuryWedding (palette-swapped)
 * Apple product pages + Vogue Wedding + Netflix documentary aesthetic
 *
 * Bugs fixed in this version:
 *  1. Gallery images: professional gallery uses `picture` field, not `image` — normalized
 *  2. IntersectionObserver: used callback refs so observer is set up even when
 *     sections render after async data load
 *  3. Sections always visible: removed `length > 0` guards; show empty states instead
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ThemeProps, imgUrl, formatDate } from "./types";

const FASTAPI = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8001";
const API     = process.env.NEXT_PUBLIC_API_URL     || "http://localhost:8000";

// ── Tag labels ─────────────────────────────────────────────────────────────────
const TAG_LABELS: Record<string, string> = {
  all:       "All Photos",
  ceremony:  "Ceremony",
  reception: "Reception",
  portrait:  "Portraits",
  fun:       "Fun Moments",
  decor:     "Décor",
  other:     "Others",
};

// Emoji for ceremony events
const EVENT_EMOJIS: Record<string, string> = {
  wedding:    "💍",
  reception:  "🥂",
  engagement: "💑",
  haldi:      "🌿",
  mehendi:    "🌸",
  sangeet:    "🎶",
  ceremony:   "🙏",
};
function getEventEmoji(title: string): string {
  const t = title.toLowerCase();
  for (const [key, emoji] of Object.entries(EVENT_EMOJIS)) {
    if (t.includes(key)) return emoji;
  }
  return "💍";
}

// ── Reliable IntersectionObserver using callback ref ──────────────────────────
// Unlike useRef, callback refs fire whenever the DOM element is attached/detached.
// This handles the case where sections render AFTER async data loads.
function useInView(threshold = 0.1) {
  const [vis, setVis] = useState(false);
  const obsRef = useRef<IntersectionObserver | null>(null);

  const ref = useCallback((node: HTMLElement | null) => {
    if (obsRef.current) {
      obsRef.current.disconnect();
      obsRef.current = null;
    }
    if (!node) return;
    obsRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVis(true);
          obsRef.current?.disconnect();
        }
      },
      { threshold }
    );
    obsRef.current.observe(node);
  }, [threshold]);

  return { ref, vis };
}

// ── Countdown ──────────────────────────────────────────────────────────────────
function useCountdown(target: string | null | undefined) {
  const [diff, setDiff] = useState(0);
  useEffect(() => {
    if (!target) return;
    const tick = () => setDiff(new Date(target).getTime() - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  const total = Math.max(0, diff);
  return {
    d:      Math.floor(total / 86400000),
    h:      Math.floor((total % 86400000) / 3600000),
    m:      Math.floor((total % 3600000)  / 60000),
    s:      Math.floor((total % 60000)    / 1000),
    isPast: diff <= 0,
  };
}

// ── Resolve any image to src string ───────────────────────────────────────────
// Handles both `picture` (professional gallery model) and `image` (guest gallery)
function resolveImg(g: any): string | undefined {
  const raw = g?.image || g?.picture || g?.thumbnail_url || g?.thumb_small || g?.thumb_medium;
  return imgUrl(raw);
}

// ══════════════════════════════════════════════════════════════════════════════
export default function RoyalMughal({
  inv, galleryImages, galleryCategories, onRsvp, onWish, onUploadPhoto,
}: ThemeProps) {

  // ── Parallax ─────────────────────────────────────────────────────────────
  const heroImgRef  = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // ── Music ─────────────────────────────────────────────────────────────────
  const audioRef    = useRef<HTMLAudioElement | null>(null);
  const [playing,   setPlaying]   = useState(false);
  const musicUrl    = (inv as any).music_url || null;
  useEffect(() => {
    if (!musicUrl) return;
    const a  = new Audio(musicUrl);
    a.loop   = true;
    a.volume = 0.3;
    audioRef.current = a;
    return () => { a.pause(); a.src = ""; };
  }, [musicUrl]);
  const toggleMusic = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play().then(() => setPlaying(true)).catch(() => {}); }
  };

  // ── Gallery ───────────────────────────────────────────────────────────────
  // Normalize both professional gallery (picture field) and guest photos (image field)
  const allGallery = [
    ...galleryImages.map(g => ({
      id:      g.id,
      src:     resolveImg(g),
      tag:     g.tag || (g.category as any)?.name?.toLowerCase() || "other",
      caption: (g as any).title || g.caption || "",
      source:  "pro" as const,
    })),
    ...inv.gallery_images.map(g => ({
      id:      g.id,
      src:     resolveImg(g),
      tag:     g.tag || "other",
      caption: g.caption || "",
      source:  "guest" as const,
    })),
  ];

  const [galTab,   setGalTab]   = useState("all");
  const [lightbox, setLightbox] = useState<string | null>(null);

  // AI selfie state
  const [selfieMode, setSelfieMode]         = useState(false);
  const [selfieSearching, setSelfieSearching] = useState(false);
  const [matchedIds, setMatchedIds]         = useState<Set<number> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef     = useRef<HTMLVideoElement>(null);
  const [camActive,  setCamActive]  = useState(false);
  const streamRef    = useRef<MediaStream | null>(null);

  const usedTags = ["all", ...Array.from(new Set(
    allGallery.map(g => g.tag).filter(Boolean)
  ))].filter(t => t in TAG_LABELS);

  const galFiltered = allGallery.filter(g => {
    if (!g.src) return false;
    if (galTab !== "all" && g.tag !== galTab) return false;
    if (matchedIds && !matchedIds.has(g.id)) return false;
    return true;
  });

  // AI selfie match
  const handleSelfieFile = useCallback(async (file: File) => {
    setSelfieSearching(true);
    try {
      // FastAPI direct call -- synchronous match, no Celery polling needed.
      // Endpoint expects file= field name and website_slug as a query param.
      const fd = new FormData();
      fd.append("file", file);
      const url  = `${FASTAPI}/api/v1/ai/selfie-match?website_slug=${encodeURIComponent(inv.slug)}`;
      const res  = await fetch(url, { method: "POST", body: fd });
      const data: any = await res.json();
      // Response shape: { matched: [{ id, similarity, picture }, ...] }
      const ids: number[] = (data.matched ?? data.results ?? [])
        .map((r: any) => r.id)
        .filter((v: any) => typeof v === "number");
      setMatchedIds(new Set(ids));
    } catch {
      setMatchedIds(new Set());
    } finally {
      setSelfieSearching(false);
      setSelfieMode(false);
      stopCamera();
    }
  }, [inv.id, inv.slug]);

  const openCamera = async () => {
    setCamActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch { setCamActive(false); }
  };
  const capturePhoto = () => {
    const v = videoRef.current;
    if (!v) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d")?.drawImage(v, 0, 0);
    c.toBlob(blob => {
      if (blob) handleSelfieFile(new File([blob], "selfie.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.85);
  };
  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCamActive(false);
  };

  // ── RSVP ─────────────────────────────────────────────────────────────────
  // Field name must be `attendance` (matches serializer) with uppercase values YES/NO/MAYBE
  const [rsvpForm,    setRsvpForm]    = useState({ name: "", email: "", phone: "", attendance: "YES", guests: "1", meal_preference: "", message: "" });
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [rsvpDone,    setRsvpDone]    = useState(false);
  const submitRsvp = async (e: React.FormEvent) => {
    e.preventDefault();
    setRsvpLoading(true);
    try { await onRsvp(rsvpForm); setRsvpDone(true); }
    catch {}
    finally { setRsvpLoading(false); }
  };

  // ── Wishes ────────────────────────────────────────────────────────────────
  const [wishes,      setWishes]      = useState<any[]>(inv.wishes || []);
  const [wishForm,    setWishForm]    = useState({ name: "", relationship: "", message: "" });
  const [wishLoading, setWishLoading] = useState(false);
  const [wishDone,    setWishDone]    = useState(false);
  const submitWish = async (e: React.FormEvent) => {
    e.preventDefault();
    setWishLoading(true);
    try {
      await onWish(wishForm);
      setWishes(p => [{ id: Date.now(), ...wishForm, created_at: new Date().toISOString() }, ...p]);
      setWishDone(true);
      setTimeout(() => { setWishDone(false); setWishForm({ name: "", relationship: "", message: "" }); }, 4000);
    } catch {}
    finally { setWishLoading(false); }
  };

  // ── Countdown ─────────────────────────────────────────────────────────────
  const weddingDate = inv.countdown?.event_date || inv.wedding_date || inv.events[0]?.date;
  const { d, h, m, s, isPast } = useCountdown(weddingDate);

  // ── Guest photo upload ─────────────────────────────────────────────────────
  const [uploadOpen,    setUploadOpen]    = useState(false);
  const [uploadName,    setUploadName]    = useState("");
  const [uploadCaption, setUploadCaption] = useState("");
  const [uploadFile,    setUploadFile]    = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadDone,    setUploadDone]    = useState(false);
  const uploadFileInputRef = useRef<HTMLInputElement>(null);

  const pickUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploadFile(f);
    setUploadPreview(URL.createObjectURL(f));
  };

  const submitUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !onUploadPhoto) return;
    setUploadLoading(true);
    try {
      const fd = new FormData();
      fd.append("image", uploadFile);
      fd.append("uploader_name", uploadName || "Guest");
      fd.append("caption", uploadCaption);
      fd.append("tag", "other");
      await onUploadPhoto(fd);
      setUploadDone(true);
      setTimeout(() => {
        setUploadDone(false);
        setUploadOpen(false);
        setUploadFile(null);
        setUploadPreview(null);
        setUploadName("");
        setUploadCaption("");
      }, 3000);
    } catch {
      // silently ignore
    } finally {
      setUploadLoading(false);
    }
  };

  // ── Scroll-reveal refs (callback-based, handles async renders) ────────────
  const coupleRef  = useInView(0.1);
  const storyRef   = useInView(0.05);
  const eventsRef  = useInView(0.05);
  const galRef     = useInView(0.05);
  const rsvpRef    = useInView(0.1);
  const wishRef    = useInView(0.05);
  const memRef     = useInView(0.05);

  // ── Hero helpers ──────────────────────────────────────────────────────────
  const heroBg   = imgUrl(inv.thumbnail || inv.background_image);
  const bride    = inv.bridegroom?.bride_name  || inv.couple?.split(" & ")?.[0]  || "Bride";
  const groom    = inv.bridegroom?.groom_name  || inv.couple?.split(" & ")?.[1]  || "Groom";
  const brideImg = resolveImg({ image: inv.bridegroom?.bride_image || inv.bridegroom?.bride_photo });
  const groomImg = resolveImg({ image: inv.bridegroom?.groom_image || inv.bridegroom?.groom_photo });
  const videoUrl = (inv as any).video_url || null;

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <>
      {/* ── Global CSS ──────────────────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,600&family=Inter:wght@300;400;500;600;700&display=swap');

        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth;background:#0E4D40}
        body{background:#0E4D40;color:#F5EAD0;font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased}

        .rm-serif{font-family:'Cormorant Garamond',Georgia,serif}
        .rm-sans{font-family:'Inter',Arial,sans-serif}

        /* ── Colour tokens ── */
        :root{
          --gold:#D4A24C;
          --gold2:#F0CF6B;
          --cream:#F5EAD0;
          --ink:#0E4D40;
          --ink2:#07382E;
          --ink3:#052824;
          --glass:rgba(212,162,76,0.06);
          --g-border:rgba(212,162,76,0.28);
        }

        /* ── Glassmorphism ── */
        .glass{
          background:var(--glass);
          backdrop-filter:blur(18px);
          -webkit-backdrop-filter:blur(18px);
          border:1px solid var(--g-border);
          border-radius:20px;
        }

        /* ── Gold rule ── */
        .gold-hr{
          width:64px;height:1px;
          background:linear-gradient(90deg,transparent,var(--gold),transparent);
          margin:0 auto;
        }

        /* ── Section entry animation (CSS-only, fires on class add) ── */
        .rm-fade{opacity:0;transform:translateY(30px);transition:opacity .9s ease,transform .9s ease}
        .rm-fade.in{opacity:1;transform:none}
        .rm-fade-left{opacity:0;transform:translateX(-36px);transition:opacity .9s ease,transform .9s ease}
        .rm-fade-left.in{opacity:1;transform:none}
        .rm-fade-right{opacity:0;transform:translateX(36px);transition:opacity .9s ease,transform .9s ease}
        .rm-fade-right.in{opacity:1;transform:none}

        /* ── Stagger children ── */
        .rm-stagger > *{opacity:0;transform:translateY(24px);transition:opacity .7s ease,transform .7s ease}
        .rm-stagger.in > *{opacity:1;transform:none}
        .rm-stagger.in > *:nth-child(1){transition-delay:.05s}
        .rm-stagger.in > *:nth-child(2){transition-delay:.15s}
        .rm-stagger.in > *:nth-child(3){transition-delay:.25s}
        .rm-stagger.in > *:nth-child(4){transition-delay:.35s}
        .rm-stagger.in > *:nth-child(5){transition-delay:.45s}
        .rm-stagger.in > *:nth-child(6){transition-delay:.55s}
        .rm-stagger.in > *:nth-child(7){transition-delay:.65s}

        /* ── Masonry photo grid ── */
        .masonry{columns:2 180px;column-gap:8px}
        .masonry-item{break-inside:avoid;margin-bottom:8px;cursor:pointer;border-radius:12px;overflow:hidden;display:block;position:relative}
        .masonry-item img{width:100%;display:block;object-fit:cover;transition:transform .4s ease}
        .masonry-item:hover img{transform:scale(1.04)}
        .masonry-item .overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.65),transparent);opacity:0;transition:opacity .3s ease;display:flex;align-items:flex-end;padding:10px}
        .masonry-item:hover .overlay{opacity:1}
        @media(min-width:640px){.masonry{columns:3 180px}}
        @media(min-width:1024px){.masonry{columns:4 200px}}

        /* ── Timeline ── */
        .timeline-track{position:relative;padding-left:48px}
        .timeline-track::before{content:'';position:absolute;left:18px;top:0;bottom:0;width:1px;background:linear-gradient(180deg,transparent,var(--gold) 10%,var(--gold) 90%,transparent)}
        .timeline-dot{position:absolute;left:12px;width:13px;height:13px;border-radius:50%;background:var(--gold);box-shadow:0 0 12px rgba(212,162,76,.6);transform:translateX(-50%)}

        /* ── Event cards ── */
        .event-grid{display:grid;gap:16px;grid-template-columns:1fr}
        @media(min-width:640px){.event-grid{grid-template-columns:repeat(2,1fr)}}
        @media(min-width:900px){.event-grid{grid-template-columns:repeat(3,1fr)}}

        /* ── Scrollbar ── */
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:var(--ink)}
        ::-webkit-scrollbar-thumb{background:var(--gold);border-radius:2px}

        /* ── Input focus ── */
        input:focus,textarea:focus,select:focus{outline:none;border-color:var(--gold)!important}

        /* ── Couple portrait ring ── */
        .portrait-ring{
          border-radius:50%;border:2px solid var(--gold);
          box-shadow:0 0 0 6px rgba(212,162,76,.08),0 0 40px rgba(212,162,76,.15);
        }

        /* ── Hero text animation ── */
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
        .hero-name{animation:fadeUp .9s ease forwards;opacity:0}
        .hero-name-1{animation-delay:.2s}
        .hero-name-2{animation-delay:.5s}
        .hero-sub{animation:fadeUp .9s ease .8s forwards;opacity:0}
        .hero-cd{animation:fadeUp .9s ease 1.1s forwards;opacity:0}

        /* ── Scroll hint ── */
        @keyframes scrollHint{0%,100%{transform:translateY(0);opacity:.7}50%{transform:translateY(8px);opacity:.3}}
        .scroll-hint{animation:scrollHint 2s ease-in-out infinite}

        /* ── Music pulse ── */
        @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(212,162,76,.4)}50%{box-shadow:0 0 0 8px rgba(212,162,76,0)}}
        .music-pulse{animation:pulse 2s ease infinite}

        /* ── Shimmer loader ── */
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        .shimmer{background:linear-gradient(90deg,transparent,rgba(212,162,76,.12),transparent);background-size:200% 100%;animation:shimmer 1.8s infinite}
      `}</style>

      {/* ── Floating music button ───────────────────────────────────────── */}
      {musicUrl && (
        <button
          onClick={toggleMusic}
          title={playing ? "Pause music" : "Play ambient music"}
          className={`glass music-pulse fixed bottom-6 right-6 z-50 w-12 h-12 flex items-center justify-center`}
          style={{ borderRadius: "50%", border: "1px solid var(--gold)", cursor: "pointer" }}
        >
          {playing ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--gold)">
              <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--gold)">
              <polygon points="5,3 19,12 5,21"/>
            </svg>
          )}
        </button>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 1 — HERO
      ════════════════════════════════════════════════════════════════════ */}
      <section style={{ position: "relative", width: "100%", height: "100svh", minHeight: 600, overflow: "hidden" }}>
        {/* Parallax background */}
        <div
          ref={heroImgRef}
          style={{
            position: "absolute", inset: 0,
            height: "130%", top: "-15%",
            backgroundImage: heroBg ? `url(${heroBg})` : undefined,
            backgroundColor: heroBg ? undefined : "#07382E",
            backgroundSize:  "cover",
            backgroundPosition: "center",
            transform: `translateY(${scrollY * 0.38}px)`,
            willChange: "transform",
          }}
        />
        {/* Gradient overlays */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(0,0,0,.55) 0%,rgba(0,0,0,.25) 45%,rgba(0,0,0,.55) 80%,#0E4D40 100%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 100%,rgba(212,162,76,.1) 0%,transparent 65%)" }} />

        {/* Content */}
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px", textAlign: "center" }}>

          <p className="rm-sans hero-sub" style={{ fontSize: 11, letterSpacing: "0.4em", color: "rgba(240,207,107,0.8)", textTransform: "uppercase", marginBottom: 28 }}>
            Together with their families
          </p>

          {/* Bride name */}
          <h1 className="rm-serif hero-name hero-name-1" style={{ fontSize: "clamp(3.2rem,11vw,7.5rem)", fontWeight: 300, lineHeight: 1.0, color: "#FFFFFF", letterSpacing: "0.02em" }}>
            {bride}
          </h1>

          {/* Gold divider + ampersand */}
          <div className="hero-sub" style={{ display: "flex", alignItems: "center", gap: 16, margin: "12px 0", width: "min(240px,50vw)" }}>
            <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,transparent,var(--gold))" }} />
            <span className="rm-serif" style={{ fontSize: "clamp(1.2rem,3vw,2rem)", color: "rgba(240,207,107,0.7)", fontStyle: "italic", fontWeight: 300 }}>&amp;</span>
            <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,var(--gold),transparent)" }} />
          </div>

          {/* Groom name */}
          <h1 className="rm-serif hero-name hero-name-2" style={{ fontSize: "clamp(3.2rem,11vw,7.5rem)", fontWeight: 300, lineHeight: 1.0, color: "#FFFFFF", letterSpacing: "0.02em", marginBottom: 20 }}>
            {groom}
          </h1>

          {weddingDate && (
            <p className="rm-sans hero-sub" style={{ fontSize: 12, letterSpacing: "0.3em", color: "rgba(212,162,76,0.6)", marginBottom: 32 }}>
              {new Date(weddingDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          )}

          {/* Live Countdown */}
          {!isPast && weddingDate && (
            <div className="hero-cd" style={{ display: "flex", gap: "clamp(16px,4vw,40px)" }}>
              {[["Days", d], ["Hours", h], ["Mins", m], ["Secs", s]].map(([lbl, val]) => (
                <div key={lbl as string} style={{ textAlign: "center" }}>
                  <div className="rm-serif" style={{ fontSize: "clamp(2rem,5vw,3.4rem)", fontWeight: 400, lineHeight: 1, color: "#FFFFFF" }}>
                    {String(val).padStart(2, "0")}
                  </div>
                  <div className="rm-sans" style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(212,162,76,0.5)", marginTop: 4 }}>
                    {lbl}
                  </div>
                </div>
              ))}
            </div>
          )}
          {isPast && weddingDate && (
            <p className="rm-serif hero-cd" style={{ fontSize: "clamp(1.2rem,3vw,1.8rem)", color: "rgba(240,207,107,0.7)", fontStyle: "italic", fontWeight: 300 }}>
              Now & Forever 
            </p>
          )}
        </div>

        {/* Scroll indicator */}
        <div className="scroll-hint" style={{ position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <span className="rm-sans" style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(212,162,76,.4)" }}>Scroll</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(212,162,76,.5)" strokeWidth="1.5">
            <path d="M12 5v14M5 12l7 7 7-7"/>
          </svg>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 2 — VIDEO TEASER (if set)
      ════════════════════════════════════════════════════════════════════ */}
      {videoUrl && (
        <section style={{ padding: "80px 24px", background: "var(--ink)" }}>
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <p className="rm-sans" style={{ textAlign: "center", fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(212,162,76,.6)", marginBottom: 12 }}>Our Story</p>
            <div style={{ position: "relative", paddingTop: "56.25%", borderRadius: 20, overflow: "hidden" }}>
              <iframe
                src={videoUrl.includes("youtube") ? videoUrl.replace("watch?v=", "embed/") : videoUrl}
                className="glass"
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
                allow="autoplay;fullscreen"
                allowFullScreen
              />
            </div>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 3 — THE COUPLE
      ════════════════════════════════════════════════════════════════════ */}
      <section
        ref={coupleRef.ref as any}
        style={{ padding: "96px 24px", background: `linear-gradient(180deg,var(--ink) 0%,var(--ink2) 100%)` }}
      >
        <div style={{ maxWidth: 960, margin: "0 auto" }}>

          {/* Heading */}
          <div className={`rm-fade${coupleRef.vis ? " in" : ""}`} style={{ textAlign: "center", marginBottom: 64 }}>
            <p className="rm-sans" style={{ fontSize: 11, letterSpacing: "0.35em", textTransform: "uppercase", color: "rgba(212,162,76,.6)", marginBottom: 12 }}>The Couple</p>
            <h2 className="rm-serif" style={{ fontSize: "clamp(2rem,5vw,3.5rem)", fontWeight: 300, color: "#FFFFFF" }}>Bound by Love</h2>
            <div className="gold-hr" style={{ marginTop: 16 }} />
          </div>

          {/* Bride & Groom */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 48, alignItems: "start" }}>
            {/* Bride */}
            <div className={`rm-fade-left${coupleRef.vis ? " in" : ""}`} style={{ textAlign: "center" }}>
              <div style={{ position: "relative", width: 200, height: 200, margin: "0 auto 20px" }}>
                {brideImg ? (
                  <img src={brideImg} alt={bride} className="portrait-ring" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div className="portrait-ring" style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 72, background: "var(--ink3)" }}>👰</div>
                )}
                <div className="glass" style={{ position: "absolute", bottom: -8, right: -8, width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🌸</div>
              </div>
              <h3 className="rm-serif" style={{ fontSize: "clamp(1.8rem,4vw,2.6rem)", fontWeight: 300, color: "#FFFFFF", marginBottom: 8 }}>{bride}</h3>
              {inv.bridegroom?.bride_description && (
                <p className="rm-sans" style={{ fontSize: 13, color: "rgba(245,234,208,.5)", lineHeight: 1.7, maxWidth: 280, margin: "0 auto 12px" }}>{inv.bridegroom.bride_description}</p>
              )}
              {inv.bridegroom?.bride_instagram && (
                <a href={`https://instagram.com/${inv.bridegroom.bride_instagram.replace("@","").replace(/.*instagram\.com\//,"")}`}
                   target="_blank" rel="noreferrer"
                   className="rm-sans" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(212,162,76,.6)", textDecoration: "none" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                  {inv.bridegroom.bride_instagram.replace("https://instagram.com/","")}
                </a>
              )}
            </div>

            {/* Groom */}
            <div className={`rm-fade-right${coupleRef.vis ? " in" : ""}`} style={{ textAlign: "center", transitionDelay: "0.12s" }}>
              <div style={{ position: "relative", width: 200, height: 200, margin: "0 auto 20px" }}>
                {groomImg ? (
                  <img src={groomImg} alt={groom} className="portrait-ring" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div className="portrait-ring" style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 72, background: "var(--ink3)" }}>🤵</div>
                )}
                <div className="glass" style={{ position: "absolute", bottom: -8, left: -8, width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>✨</div>
              </div>
              <h3 className="rm-serif" style={{ fontSize: "clamp(1.8rem,4vw,2.6rem)", fontWeight: 300, color: "#FFFFFF", marginBottom: 8 }}>{groom}</h3>
              {inv.bridegroom?.groom_description && (
                <p className="rm-sans" style={{ fontSize: 13, color: "rgba(245,234,208,.5)", lineHeight: 1.7, maxWidth: 280, margin: "0 auto 12px" }}>{inv.bridegroom.groom_description}</p>
              )}
              {inv.bridegroom?.groom_instagram && (
                <a href={`https://instagram.com/${inv.bridegroom.groom_instagram.replace("@","").replace(/.*instagram\.com\//,"")}`}
                   target="_blank" rel="noreferrer"
                   className="rm-sans" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(212,162,76,.6)", textDecoration: "none" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                  {inv.bridegroom.groom_instagram.replace("https://instagram.com/","")}
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 4 — STORY TIMELINE (always visible)
      ════════════════════════════════════════════════════════════════════ */}
      <section ref={storyRef.ref as any} style={{ padding: "96px 24px", background: "var(--ink2)" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>

          <div className={`rm-fade${storyRef.vis ? " in" : ""}`} style={{ textAlign: "center", marginBottom: 64 }}>
            <p className="rm-sans" style={{ fontSize: 11, letterSpacing: "0.35em", textTransform: "uppercase", color: "rgba(212,162,76,.6)", marginBottom: 12 }}>Our Journey</p>
            <h2 className="rm-serif" style={{ fontSize: "clamp(2rem,5vw,3.5rem)", fontWeight: 300, color: "#FFFFFF" }}>How We Fell in Love</h2>
            <div className="gold-hr" style={{ marginTop: 16 }} />
          </div>

          {inv.stories.length === 0 ? (
            /* Empty state */
            <div className={`rm-fade${storyRef.vis ? " in" : ""} glass`} style={{ textAlign: "center", padding: "48px 24px", transitionDelay: "0.2s" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>💫</div>
              <p className="rm-serif" style={{ fontSize: "1.3rem", color: "rgba(245,234,208,.6)", fontStyle: "italic", fontWeight: 300 }}>
                Our love story is being written…
              </p>
              <p className="rm-sans" style={{ fontSize: 12, color: "rgba(212,162,76,.4)", marginTop: 8 }}>
                Add your story milestones from the wedding dashboard
              </p>
            </div>
          ) : (
            /* Timeline */
            <div className="timeline-track">
              {inv.stories.map((story, i) => {
                const storyImg = resolveImg({ image: story.photo });
                return (
                  <div
                    key={story.id}
                    className={`rm-fade${storyRef.vis ? " in" : ""}`}
                    style={{ position: "relative", marginBottom: 48, transitionDelay: `${i * 0.12}s` }}
                  >
                    {/* Dot */}
                    <div className="timeline-dot" style={{ top: 20 }} />

                    {/* Card */}
                    <div className="glass" style={{ padding: "20px 24px" }}>
                      {storyImg && (
                        <img src={storyImg} alt={story.title} style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 12, marginBottom: 14, opacity: 0.85 }} />
                      )}
                      <p className="rm-sans" style={{ fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(212,162,76,.5)", marginBottom: 6 }}>
                        {story.date ? new Date(story.date).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : ""}
                      </p>
                      <h4 className="rm-serif" style={{ fontSize: "1.4rem", fontWeight: 400, color: "#FFFFFF", marginBottom: 8 }}>{story.title}</h4>
                      {(story.desc || story.description) && (
                        <p className="rm-sans" style={{ fontSize: 13, color: "rgba(245,234,208,.55)", lineHeight: 1.75 }}>
                          {story.desc || story.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 5 — EVENTS / CEREMONIES (always visible)
      ════════════════════════════════════════════════════════════════════ */}
      <section ref={eventsRef.ref as any} style={{ padding: "96px 24px", background: `linear-gradient(180deg,var(--ink2) 0%,var(--ink3) 100%)` }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>

          <div className={`rm-fade${eventsRef.vis ? " in" : ""}`} style={{ textAlign: "center", marginBottom: 60 }}>
            <p className="rm-sans" style={{ fontSize: 11, letterSpacing: "0.35em", textTransform: "uppercase", color: "rgba(212,162,76,.6)", marginBottom: 12 }}>Join the Festivities</p>
            <h2 className="rm-serif" style={{ fontSize: "clamp(2rem,5vw,3.5rem)", fontWeight: 300, color: "#FFFFFF" }}>Wedding Celebrations</h2>
            <div className="gold-hr" style={{ marginTop: 16 }} />
          </div>

          {inv.events.length === 0 ? (
            /* Empty state */
            <div className={`rm-fade${eventsRef.vis ? " in" : ""} glass`} style={{ textAlign: "center", padding: "48px 24px", transitionDelay: "0.2s", maxWidth: 480, margin: "0 auto" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
              <p className="rm-serif" style={{ fontSize: "1.3rem", color: "rgba(245,234,208,.6)", fontStyle: "italic", fontWeight: 300 }}>
                Event details coming soon…
              </p>
              <p className="rm-sans" style={{ fontSize: 12, color: "rgba(212,162,76,.4)", marginTop: 8 }}>
                Add your wedding events from the dashboard
              </p>
            </div>
          ) : (
            <div className={`event-grid rm-stagger${eventsRef.vis ? " in" : ""}`}>
              {inv.events.map((event) => {
                const eventImg = resolveImg({ image: (event as any).image });
                return (
                  <div key={event.id} className="glass" style={{ padding: "28px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
                    {/* Event image */}
                    {eventImg && (
                      <img src={eventImg} alt={event.title} style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 12, marginBottom: 4 }} />
                    )}

                    {/* Icon + title */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(212,162,76,.12)", border: "1px solid var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                        {getEventEmoji(event.title)}
                      </div>
                      <div>
                        <h4 className="rm-serif" style={{ fontSize: "1.35rem", fontWeight: 400, color: "#FFFFFF", lineHeight: 1.2 }}>{event.title}</h4>
                        <p className="rm-sans" style={{ fontSize: 11, color: "rgba(212,162,76,.6)", marginTop: 4, letterSpacing: "0.05em" }}>
                          {event.date ? new Date(event.date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }) : "Date TBA"}
                          {event.time && <span> · {event.time}</span>}
                        </p>
                      </div>
                    </div>

                    {/* Venue */}
                    {(event.venue || event.location_name) && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(212,162,76,.5)" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        <span className="rm-sans" style={{ fontSize: 12, color: "rgba(245,234,208,.55)" }}>{event.venue || event.location_name}</span>
                      </div>
                    )}

                    {/* Description */}
                    {(event.desc || event.description) && (
                      <p className="rm-sans" style={{ fontSize: 12, color: "rgba(245,234,208,.4)", lineHeight: 1.7 }}>
                        {event.desc || event.description}
                      </p>
                    )}

                    {/* Directions */}
                    {event.location_link && (
                      <a href={event.location_link} target="_blank" rel="noreferrer"
                         className="rm-sans"
                         style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "rgba(212,162,76,.65)", textDecoration: "none", marginTop: "auto" }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                        Get Directions
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 6 — GALLERY (always visible)
      ════════════════════════════════════════════════════════════════════ */}
      <section ref={galRef.ref as any} style={{ padding: "96px 16px", background: "var(--ink)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>

          <div className={`rm-fade${galRef.vis ? " in" : ""}`} style={{ textAlign: "center", marginBottom: 40 }}>
            <p className="rm-sans" style={{ fontSize: 11, letterSpacing: "0.35em", textTransform: "uppercase", color: "rgba(212,162,76,.6)", marginBottom: 12 }}>Captured Moments</p>
            <h2 className="rm-serif" style={{ fontSize: "clamp(2rem,5vw,3.5rem)", fontWeight: 300, color: "#FFFFFF", marginBottom: 16 }}>Our Gallery</h2>
            <div className="gold-hr" style={{ marginBottom: 28 }} />

            {/* AI selfie button */}
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, marginBottom: 24 }}>
              <button
                onClick={() => { setSelfieMode(true); setMatchedIds(null); }}
                className="rm-sans"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 22px", borderRadius: 100, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, background: "linear-gradient(135deg,#D4A24C,#9A6B2A)", color: "#0E4D40" }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                Find My Photos with AI
              </button>
              {matchedIds && (
                <button
                  onClick={() => setMatchedIds(null)}
                  className="rm-sans glass"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 100, border: "none", cursor: "pointer", fontSize: 12, color: "rgba(212,162,76,.7)", background: "var(--glass)" }}
                >
                  ✕ Clear Filter ({matchedIds.size} matches)
                </button>
              )}
            </div>

            {/* Category tabs */}
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
              {usedTags.map(tag => (
                <button key={tag} onClick={() => setGalTab(tag)}
                  className="rm-sans"
                  style={{
                    padding: "7px 16px", borderRadius: 100, cursor: "pointer", fontSize: 12, fontWeight: 500, transition: "all .25s",
                    background: galTab === tag ? "var(--gold)" : "rgba(212,162,76,.08)",
                    color:      galTab === tag ? "#000"        : "rgba(212,162,76,.7)",
                    border:     `1px solid ${galTab === tag ? "var(--gold)" : "rgba(212,162,76,.2)"}`,
                  }}
                >
                  {TAG_LABELS[tag] || tag}
                </button>
              ))}
            </div>
          </div>

          {/* AI selfie modal */}
          {selfieMode && (
            <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,.88)" }}>
              <div className="glass" style={{ maxWidth: 360, width: "100%", padding: "36px 28px", textAlign: "center" }}>
                <h3 className="rm-serif" style={{ fontSize: "1.8rem", fontWeight: 300, color: "#FFFFFF", marginBottom: 8 }}>Find Your Photos</h3>
                <p className="rm-sans" style={{ fontSize: 13, color: "rgba(245,234,208,.45)", marginBottom: 24, lineHeight: 1.6 }}>
                  Our AI will scan all wedding photos to find every picture you're in.
                </p>
                {selfieSearching ? (
                  <div style={{ padding: "24px 0" }}>
                    <div className="shimmer" style={{ width: 64, height: 64, borderRadius: "50%", margin: "0 auto 16px" }} />
                    <p className="rm-sans" style={{ fontSize: 13, color: "rgba(212,162,76,.6)" }}>Searching faces…</p>
                  </div>
                ) : camActive ? (
                  <div>
                    <video ref={videoRef} autoPlay playsInline muted
                           style={{ width: "100%", borderRadius: 12, marginBottom: 12, height: 220, objectFit: "cover", transform: "scaleX(-1)" }} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={capturePhoto} className="rm-sans"
                        style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, background: "linear-gradient(135deg,#D4A24C,#9A6B2A)", color: "#0E4D40" }}>
                        📸 Capture
                      </button>
                      <button onClick={() => { stopCamera(); setSelfieMode(false); }} className="rm-sans glass"
                        style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: "none", cursor: "pointer", fontSize: 13, color: "rgba(245,234,208,.6)" }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <button onClick={openCamera} className="rm-sans"
                      style={{ padding: "12px 0", borderRadius: 12, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, background: "linear-gradient(135deg,#D4A24C,#9A6B2A)", color: "#0E4D40" }}>
                      📷 Open Camera
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="rm-sans glass"
                      style={{ padding: "12px 0", borderRadius: 12, border: "none", cursor: "pointer", fontSize: 13, color: "rgba(245,234,208,.6)" }}>
                      🖼 Upload Photo
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }}
                           onChange={e => { const f = e.target.files?.[0]; if (f) handleSelfieFile(f); }} />
                    <button onClick={() => setSelfieMode(false)} className="rm-sans"
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "rgba(212,162,76,.4)", marginTop: 4 }}>
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Gallery grid */}
          {galFiltered.length === 0 ? (
            <div className={`rm-fade${galRef.vis ? " in" : ""} glass`} style={{ textAlign: "center", padding: "56px 24px", maxWidth: 480, margin: "32px auto 0" }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>📸</div>
              <p className="rm-serif" style={{ fontSize: "1.3rem", color: "rgba(245,234,208,.6)", fontStyle: "italic", fontWeight: 300 }}>
                {matchedIds ? "No matches found — try another photo" : "Photos will appear here soon…"}
              </p>
              {!matchedIds && (
                <p className="rm-sans" style={{ fontSize: 12, color: "rgba(212,162,76,.4)", marginTop: 8 }}>
                  Ask your photographer to link via your gallery token
                </p>
              )}
            </div>
          ) : (
            <div className="masonry" style={{ marginTop: 16 }}>
              {galFiltered.map(img => (
                <div key={`${img.source}-${img.id}`} className="masonry-item" onClick={() => setLightbox(img.src!)}>
                  <img src={img.src} alt={img.caption || "Wedding photo"} loading="lazy" />
                  {img.caption && (
                    <div className="overlay rm-sans" style={{ fontSize: 12, color: "#FFFFFF" }}>{img.caption}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Full album link */}
          <div style={{ textAlign: "center", marginTop: 40 }}>
            <Link href={`/invite/${inv.slug}/gallery`} className="rm-sans"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 28px", borderRadius: 100, border: "1px solid var(--gold)", color: "var(--gold)", textDecoration: "none", fontSize: 13, fontWeight: 500 }}>
              View Full Digital Album
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 7 — VENDORS
      ════════════════════════════════════════════════════════════════════ */}
      {inv.vendors.length > 0 && (
        <section style={{ padding: "80px 24px", background: "var(--ink2)" }}>
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <p className="rm-sans" style={{ fontSize: 11, letterSpacing: "0.35em", textTransform: "uppercase", color: "rgba(212,162,76,.6)", marginBottom: 12 }}>The Dream Team</p>
              <h2 className="rm-serif" style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 300, color: "#FFFFFF" }}>Our Wedding Vendors</h2>
              <div className="gold-hr" style={{ marginTop: 16 }} />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12 }}>
              {inv.vendors.map(v => (
                <Link key={v.id} href={`/vendors/${v.slug}`}
                  className="glass rm-sans"
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", width: 260, textDecoration: "none", transition: "border-color .25s" }}>
                  {resolveImg({ image: v.thumbnail }) ? (
                    <img src={resolveImg({ image: v.thumbnail })} alt={v.title} style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--ink3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>🏪</div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: "#FFFFFF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.title}</p>
                    <p style={{ fontSize: 11, color: "rgba(212,162,76,.5)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.category_label || v.category} · {v.city}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 8 — RSVP
      ════════════════════════════════════════════════════════════════════ */}
      <section
        ref={rsvpRef.ref as any}
        style={{
          padding: "96px 24px",
          background: heroBg ? `linear-gradient(rgba(8,8,8,.78),rgba(8,8,8,.88)),url(${heroBg}) center/cover` : "linear-gradient(180deg,var(--ink3) 0%,#0c0608 100%)",
        }}
      >
        <div style={{ maxWidth: 540, margin: "0 auto" }}>
          <div
            className="glass"
            style={{
              padding: "48px 36px",
              opacity:   rsvpRef.vis ? 1 : 0,
              transform: rsvpRef.vis ? "none" : "translateY(28px)",
              transition: "opacity .9s ease, transform .9s ease",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <p className="rm-sans" style={{ fontSize: 11, letterSpacing: "0.35em", textTransform: "uppercase", color: "rgba(212,162,76,.6)", marginBottom: 12 }}>Join the Celebration</p>
              <h2 className="rm-serif" style={{ fontSize: "clamp(2rem,5vw,2.8rem)", fontWeight: 300, color: "#FFFFFF" }}>RSVP</h2>
              <div className="gold-hr" style={{ marginTop: 14 }} />
            </div>

            {rsvpDone ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <div style={{ fontSize: 52, marginBottom: 16 }}>💌</div>
                <h3 className="rm-serif" style={{ fontSize: "1.8rem", fontWeight: 300, color: "#FFFFFF", marginBottom: 8 }}>Thank You!</h3>
                <p className="rm-sans" style={{ fontSize: 13, color: "rgba(245,234,208,.5)" }}>Your RSVP is confirmed. See you there!</p>
              </div>
            ) : (
              <form onSubmit={submitRsvp} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { k: "name",  type: "text",  label: "Full Name",     ph: "Your name" },
                  { k: "email", type: "email", label: "Email",         ph: "your@email.com" },
                  { k: "phone", type: "tel",   label: "Phone",         ph: "+91 98765 43210" },
                ].map(f => (
                  <div key={f.k}>
                    <label className="rm-sans" style={{ fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(212,162,76,.55)", display: "block", marginBottom: 6 }}>{f.label}</label>
                    <input type={f.type} required placeholder={f.ph}
                           value={(rsvpForm as any)[f.k]}
                           onChange={e => setRsvpForm(p => ({ ...p, [f.k]: e.target.value }))}
                           className="rm-sans"
                           style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: "1px solid rgba(212,162,76,.2)", background: "rgba(255,255,255,.05)", color: "#FFFFFF", fontSize: 13 }} />
                  </div>
                ))}

                <div>
                  <label className="rm-sans" style={{ fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(212,162,76,.55)", display: "block", marginBottom: 6 }}>Attending?</label>
                  <select value={rsvpForm.attendance} onChange={e => setRsvpForm(p => ({ ...p, attendance: e.target.value }))}
                    className="rm-sans"
                    style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: "1px solid rgba(212,162,76,.2)", background: "#111", color: "rgba(245,234,208,.8)", fontSize: 13 }}>
                    <option value="YES">Yes, I'll be there 🎉</option>
                    <option value="NO">Sorry, can't make it</option>
                    <option value="MAYBE">Maybe</option>
                  </select>
                </div>

                {rsvpForm.attendance === "YES" && (
                  <>
                    <div>
                      <label className="rm-sans" style={{ fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(212,162,76,.55)", display: "block", marginBottom: 6 }}>Number of Guests</label>
                      <div style={{ display: "flex", gap: 8 }}>
                        {["1","2","3","4","5"].map(n => (
                          <button key={n} type="button"
                            onClick={() => setRsvpForm(p => ({ ...p, guests: n }))}
                            className="rm-sans"
                            style={{ flex: 1, padding: "10px 4px", borderRadius: 10, border: `1px solid ${rsvpForm.guests === n ? "rgba(212,162,76,.8)" : "rgba(212,162,76,.2)"}`, background: rsvpForm.guests === n ? "rgba(212,162,76,.15)" : "rgba(255,255,255,.04)", color: rsvpForm.guests === n ? "rgba(212,162,76,1)" : "rgba(245,234,208,.5)", fontSize: 13, cursor: "pointer" }}>
                            {n}
                          </button>
                        ))}
                        <button type="button"
                          onClick={() => setRsvpForm(p => ({ ...p, guests: "6+" }))}
                          className="rm-sans"
                          style={{ flex: 1, padding: "10px 4px", borderRadius: 10, border: `1px solid ${rsvpForm.guests === "6+" ? "rgba(212,162,76,.8)" : "rgba(212,162,76,.2)"}`, background: rsvpForm.guests === "6+" ? "rgba(212,162,76,.15)" : "rgba(255,255,255,.04)", color: rsvpForm.guests === "6+" ? "rgba(212,162,76,1)" : "rgba(245,234,208,.5)", fontSize: 13, cursor: "pointer" }}>
                          6+
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="rm-sans" style={{ fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(212,162,76,.55)", display: "block", marginBottom: 6 }}>Meal Preference</label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {[
                          { v: "VEG",     label: "🥦 Vegetarian" },
                          { v: "NON_VEG", label: "🍗 Non-Veg" },
                          { v: "VEGAN",   label: "🌱 Vegan" },
                          { v: "JAIN",    label: "🕊️ Jain" },
                        ].map(({ v, label }) => (
                          <button key={v} type="button"
                            onClick={() => setRsvpForm(p => ({ ...p, meal_preference: p.meal_preference === v ? "" : v }))}
                            className="rm-sans"
                            style={{ padding: "10px 12px", borderRadius: 10, border: `1px solid ${rsvpForm.meal_preference === v ? "rgba(212,162,76,.8)" : "rgba(212,162,76,.2)"}`, background: rsvpForm.meal_preference === v ? "rgba(212,162,76,.15)" : "rgba(255,255,255,.04)", color: rsvpForm.meal_preference === v ? "rgba(212,162,76,1)" : "rgba(245,234,208,.5)", fontSize: 12, cursor: "pointer", textAlign: "left" as const }}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="rm-sans" style={{ fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(212,162,76,.55)", display: "block", marginBottom: 6 }}>Message (Optional)</label>
                  <textarea rows={3} placeholder="Share your excitement…"
                             value={rsvpForm.message}
                             onChange={e => setRsvpForm(p => ({ ...p, message: e.target.value }))}
                             className="rm-sans"
                             style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: "1px solid rgba(212,162,76,.2)", background: "rgba(255,255,255,.05)", color: "#FFFFFF", fontSize: 13, resize: "none" }} />
                </div>

                <button type="submit" disabled={rsvpLoading} className="rm-sans"
                  style={{ padding: "14px 0", borderRadius: 12, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", background: rsvpLoading ? "rgba(212,162,76,.4)" : "linear-gradient(135deg,#D4A24C,#9A6B2A)", color: "#0E4D40", marginTop: 6 }}>
                  {rsvpLoading ? "Sending…" : "Confirm RSVP"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 9 — WISHES WALL
      ════════════════════════════════════════════════════════════════════ */}
      <section ref={wishRef.ref as any} style={{ padding: "96px 24px", background: "var(--ink)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>

          <div className={`rm-fade${wishRef.vis ? " in" : ""}`} style={{ textAlign: "center", marginBottom: 48 }}>
            <p className="rm-sans" style={{ fontSize: 11, letterSpacing: "0.35em", textTransform: "uppercase", color: "rgba(212,162,76,.6)", marginBottom: 12 }}>Love & Blessings</p>
            <h2 className="rm-serif" style={{ fontSize: "clamp(2rem,5vw,3.5rem)", fontWeight: 300, color: "#FFFFFF" }}>Wishes Wall</h2>
            <div className="gold-hr" style={{ marginTop: 16 }} />
          </div>

          {/* Send wish form */}
          <div className={`glass rm-fade${wishRef.vis ? " in" : ""}`} style={{ padding: "28px 24px", marginBottom: 40, transitionDelay: "0.1s" }}>
            {wishDone ? (
              <p className="rm-serif" style={{ textAlign: "center", fontSize: "1.3rem", color: "rgba(245,234,208,.8)", fontStyle: "italic", fontWeight: 300 }}>Your blessings have been sent 💛</p>
            ) : (
              <form onSubmit={submitWish} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <p className="rm-serif" style={{ textAlign: "center", fontSize: "1.4rem", fontWeight: 300, color: "#FFFFFF", marginBottom: 4 }}>Send Your Blessings</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { k: "name",         label: "Name",         ph: "Your name" },
                    { k: "relationship", label: "Relationship", ph: "Friend, Family…" },
                  ].map(f => (
                    <div key={f.k}>
                      <label className="rm-sans" style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(212,162,76,.55)", display: "block", marginBottom: 5 }}>{f.label}</label>
                      <input required={f.k === "name"} type="text" placeholder={f.ph}
                             value={(wishForm as any)[f.k]}
                             onChange={e => setWishForm(p => ({ ...p, [f.k]: e.target.value }))}
                             className="rm-sans"
                             style={{ width: "100%", padding: "10px 13px", borderRadius: 10, border: "1px solid rgba(212,162,76,.2)", background: "rgba(255,255,255,.05)", color: "#FFFFFF", fontSize: 13 }} />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="rm-sans" style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(212,162,76,.55)", display: "block", marginBottom: 5 }}>Your Message</label>
                  <textarea required rows={3} placeholder="Share your heartfelt wishes…"
                             value={wishForm.message}
                             onChange={e => setWishForm(p => ({ ...p, message: e.target.value }))}
                             className="rm-sans"
                             style={{ width: "100%", padding: "10px 13px", borderRadius: 10, border: "1px solid rgba(212,162,76,.2)", background: "rgba(255,255,255,.05)", color: "#FFFFFF", fontSize: 13, resize: "none" }} />
                </div>
                <button type="submit" disabled={wishLoading} className="rm-sans"
                  style={{ alignSelf: "flex-end", padding: "10px 24px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 12, background: wishLoading ? "rgba(212,162,76,.4)" : "linear-gradient(135deg,#D4A24C,#9A6B2A)", color: "#0E4D40" }}>
                  {wishLoading ? "Sending…" : "Send Wish ✨"}
                </button>
              </form>
            )}
          </div>

          {/* Wishes grid */}
          {wishes.length > 0 && (
            <div style={{ columns: "1 300px", columnGap: 12 }}>
              {wishes.map((w: any, i) => (
                <div key={w.id || i} className="glass"
                  style={{ padding: "20px 22px", marginBottom: 12, breakInside: "avoid",
                    opacity: wishRef.vis ? 1 : 0, transform: wishRef.vis ? "none" : "translateY(20px)",
                    transition: `opacity .7s ease ${i * 0.08}s, transform .7s ease ${i * 0.08}s`
                  }}>
                  <p className="rm-serif" style={{ fontSize: "1.05rem", fontStyle: "italic", fontWeight: 300, color: "rgba(245,234,208,.88)", lineHeight: 1.7, marginBottom: 12 }}>
                    "{w.message}"
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(212,162,76,.15)", border: "1px solid rgba(212,162,76,.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: "var(--gold)", flexShrink: 0 }}>
                      {w.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="rm-sans" style={{ fontSize: 12, fontWeight: 500, color: "rgba(212,162,76,.8)" }}>{w.name}</p>
                      {w.relationship && <p className="rm-sans" style={{ fontSize: 10, color: "rgba(212,162,76,.4)" }}>{w.relationship}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 10 — GUEST MEMORIES (upload your photos)
      ════════════════════════════════════════════════════════════════════ */}
      {onUploadPhoto && (
        <section
          ref={memRef.ref as any}
          style={{ padding: "80px 24px", background: "linear-gradient(180deg,#0c0608 0%,#110a0e 100%)", textAlign: "center" }}
        >
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            <p className="rm-sans" style={{ fontSize: 11, letterSpacing: "0.35em", textTransform: "uppercase", color: "rgba(212,162,76,.5)", marginBottom: 10 }}>Join The Story</p>
            <h2
              className="rm-serif"
              style={{
                fontSize: "clamp(2rem,5vw,3rem)", fontWeight: 300, color: "#FFFFFF",
                opacity:   memRef.vis ? 1 : 0,
                transform: memRef.vis ? "none" : "translateY(20px)",
                transition: "opacity .9s ease, transform .9s ease",
              }}
            >
              Share Your Memories
            </h2>
            <div className="gold-hr" style={{ margin: "18px auto 24px" }} />
            <p className="rm-sans" style={{ fontSize: 13, color: "rgba(245,234,208,.4)", lineHeight: 1.8, marginBottom: 36, maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
              Captured a beautiful moment? Upload your photo and it will appear in our shared gallery — a mosaic of love from everyone present.
            </p>

            {/* Preview grid of guest photos */}
            {inv.gallery_images?.filter(g => !(g as any).picture).slice(0, 6).length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, maxWidth: 480, margin: "0 auto 32px" }}>
                {inv.gallery_images.filter(g => !(g as any).picture).slice(0, 6).map((g, i) => {
                  const src = resolveImg(g);
                  return src ? (
                    <div key={g.id || i} style={{ aspectRatio: "1", borderRadius: 10, overflow: "hidden", opacity: memRef.vis ? 1 : 0, transition: `opacity .6s ease ${i * 0.1}s` }}>
                      <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  ) : null;
                })}
              </div>
            )}

            <button
              onClick={() => setUploadOpen(true)}
              className="rm-sans"
              style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                padding: "14px 32px", borderRadius: 14,
                border: "1px solid rgba(212,162,76,.4)",
                background: "rgba(212,162,76,.08)",
                color: "var(--gold)", fontSize: 13, fontWeight: 600,
                cursor: "pointer", letterSpacing: "0.05em",
                transition: "all .3s ease",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Upload Your Photo
            </button>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════════════════════════════ */}
      <footer style={{ padding: "64px 24px 48px", background: "var(--ink)", textAlign: "center" }}>
        <div className="gold-hr" style={{ marginBottom: 32 }} />
        <h2 className="rm-serif" style={{ fontSize: "clamp(2rem,7vw,4.5rem)", fontWeight: 300, color: "#FFFFFF", letterSpacing: "0.04em" }}>
          {bride} <span style={{ color: "var(--gold)", fontStyle: "italic" }}>&amp;</span> {groom}
        </h2>
        {weddingDate && (
          <p className="rm-sans" style={{ fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(212,162,76,.45)", marginTop: 12 }}>
            {new Date(weddingDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        )}
        <div className="gold-hr" style={{ margin: "28px auto" }} />

        {/* Social share */}
        {typeof window !== "undefined" && (
          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 24 }}>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`You're invited to ${inv.couple}'s wedding! 💍 ${window.location.href}`)}`}
              target="_blank" rel="noreferrer"
              className="rm-sans"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 10, border: "1px solid rgba(37,211,102,.3)", background: "rgba(37,211,102,.08)", color: "rgba(37,211,102,.8)", fontSize: 12, textDecoration: "none", fontWeight: 600 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
              WhatsApp
            </a>
            <button
              onClick={() => { navigator.clipboard.writeText(window.location.href); }}
              className="rm-sans"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 10, border: "1px solid rgba(212,162,76,.3)", background: "rgba(212,162,76,.06)", color: "rgba(212,162,76,.8)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copy Link
            </button>
          </div>
        )}

        <p className="rm-sans" style={{ fontSize: 11, color: "rgba(212,162,76,.2)", letterSpacing: "0.15em" }}>
          Made with 💛 on Planazo
        </p>
      </footer>

      {/* ── Guest Photo Upload Modal ──────────────────────────────────────── */}
      {uploadOpen && (
        <div
          onClick={() => setUploadOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 0 0 0", background: "rgba(0,0,0,.85)", backdropFilter: "blur(10px)" }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="glass"
            style={{ width: "100%", maxWidth: 480, borderRadius: "28px 28px 0 0", padding: "32px 28px 40px", maxHeight: "90vh", overflowY: "auto" }}
          >
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ width: 48, height: 4, borderRadius: 2, background: "rgba(212,162,76,.2)", margin: "0 auto 20px" }} />
              <p className="rm-sans" style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(212,162,76,.5)", marginBottom: 8 }}>Share Your Moment</p>
              <h3 className="rm-serif" style={{ fontSize: "1.7rem", fontWeight: 300, color: "#FFFFFF" }}>Upload a Memory</h3>
            </div>

            {uploadDone ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <div style={{ fontSize: 52, marginBottom: 14 }}>📸</div>
                <h4 className="rm-serif" style={{ fontSize: "1.5rem", fontWeight: 300, color: "#FFFFFF", marginBottom: 6 }}>Photo Uploaded!</h4>
                <p className="rm-sans" style={{ fontSize: 13, color: "rgba(245,234,208,.4)" }}>Your memory has been added to the gallery 💛</p>
              </div>
            ) : (
              <form onSubmit={submitUpload} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Drop zone / file picker */}
                <div
                  onClick={() => uploadFileInputRef.current?.click()}
                  style={{ border: "1.5px dashed rgba(212,162,76,.3)", borderRadius: 14, padding: "20px 16px", textAlign: "center", cursor: "pointer", transition: "border-color .2s ease", background: uploadPreview ? "transparent" : "rgba(255,255,255,.02)" }}
                >
                  {uploadPreview ? (
                    <img src={uploadPreview} alt="Preview" style={{ maxHeight: 200, maxWidth: "100%", borderRadius: 10, objectFit: "cover" }} />
                  ) : (
                    <>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(212,162,76,.4)" strokeWidth="1.5" style={{ margin: "0 auto 10px", display: "block" }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      <p className="rm-sans" style={{ fontSize: 13, color: "rgba(245,234,208,.4)" }}>Tap to choose a photo</p>
                      <p className="rm-sans" style={{ fontSize: 11, color: "rgba(245,234,208,.25)", marginTop: 4 }}>JPG, PNG, HEIC — max 10 MB</p>
                    </>
                  )}
                </div>
                <input ref={uploadFileInputRef} type="file" accept="image/*" onChange={pickUploadFile} style={{ display: "none" }} />

                {[
                  { k: "uploadName",    label: "Your Name",       ph: "How shall we credit you?" },
                  { k: "uploadCaption", label: "Caption (optional)", ph: "A little description…" },
                ].map(f => (
                  <div key={f.k}>
                    <label className="rm-sans" style={{ fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(212,162,76,.5)", display: "block", marginBottom: 5 }}>{f.label}</label>
                    <input type="text" placeholder={f.ph}
                           value={f.k === "uploadName" ? uploadName : uploadCaption}
                           onChange={e => f.k === "uploadName" ? setUploadName(e.target.value) : setUploadCaption(e.target.value)}
                           className="rm-sans"
                           style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(212,162,76,.18)", background: "rgba(255,255,255,.05)", color: "#FFFFFF", fontSize: 13 }} />
                  </div>
                ))}

                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <button type="button" onClick={() => setUploadOpen(false)} className="rm-sans"
                    style={{ flex: 1, padding: "12px", borderRadius: 12, border: "1px solid rgba(212,162,76,.2)", background: "transparent", color: "rgba(245,234,208,.5)", fontSize: 13, cursor: "pointer" }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={!uploadFile || uploadLoading} className="rm-sans"
                    style={{ flex: 2, padding: "12px", borderRadius: 12, border: "none", cursor: uploadFile && !uploadLoading ? "pointer" : "not-allowed", fontWeight: 700, fontSize: 13, background: uploadFile && !uploadLoading ? "linear-gradient(135deg,#D4A24C,#9A6B2A)" : "rgba(212,162,76,.25)", color: "#0E4D40" }}>
                    {uploadLoading ? "Uploading…" : "Share Memory 📸"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Lightbox ──────────────────────────────────────────────────────── */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,.95)", backdropFilter: "blur(12px)" }}
        >
          <button onClick={() => setLightbox(null)} className="glass"
            style={{ position: "absolute", top: 16, right: 16, width: 40, height: 40, borderRadius: "50%", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(212,162,76,.7)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
          <img
            src={lightbox}
            alt=""
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: "100%", maxHeight: "92vh", objectFit: "contain", borderRadius: 12, boxShadow: "0 0 80px rgba(0,0,0,.8)" }}
          />
        </div>
      )}
    </>
  );
}
