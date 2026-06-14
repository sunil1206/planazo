"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  MapPin, Phone, Mail, Globe, Instagram, Star, Send, Loader2,
  CheckCircle2, ArrowLeft, Share2, Heart, ShieldCheck, ChevronRight,
  Clock, Calendar, Award, Camera, MessageCircle, Package, X,
  ExternalLink, Zap, Users, Image as ImageIcon, BadgeCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import { vendorApi } from "@/lib/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const CAT_LABELS: Record<string, string> = {
  PHOTOGRAPHER: "Candid Photographer",
  EVENT:        "Luxury Event Planner",
  DECOR:        "Artistic Decorator",
  CATERING:     "Gourmet Caterer",
  MAKEUP:       "Celebrity Makeup Artist",
  MUSIC:        "Premium DJ / Music",
};

const CAT_ICONS: Record<string, string> = {
  PHOTOGRAPHER: "📷", EVENT: "🎪", DECOR: "🌸", CATERING: "🍽️", MAKEUP: "💄", MUSIC: "🎵",
};

function absUrl(src?: string | null): string | undefined {
  if (!src) return undefined;
  return src.startsWith("http") ? src : `${API}${src}`;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function VendorProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [activeTab, setActiveTab]       = useState<"portfolio" | "packages" | "reviews">("portfolio");
  const [selectedCat, setSelectedCat]   = useState<number | null>(null);
  const [lightbox, setLightbox]         = useState<string | null>(null);
  const [enquireOpen, setEnquireOpen]   = useState(false);
  const [selectedPkg, setSelectedPkg]   = useState<any>(null);
  const [isScrolled, setIsScrolled]     = useState(false);
  const [isFav, setIsFav]               = useState(false);
  const [favLoading, setFavLoading]     = useState(false);
  const [shareToast, setShareToast]     = useState(false);

  // Fetch vendor data
  const { data: vendor, isLoading, isError } = useQuery<any>({
    queryKey: ["vendor", slug],
    queryFn:  () => vendorApi.get(slug),
  });

  // Fetch my favorites to check if this vendor is saved
  const { data: favs } = useQuery<any>({
    queryKey: ["vendor-favorites"],
    queryFn:  () => vendorApi.favorites(),
    retry:    false,
  });

  useEffect(() => {
    if (vendor && Array.isArray(favs ?? [])) {
      const list: any[] = Array.isArray(favs) ? favs : [];
      setIsFav(list.some((f: any) => f.vendor?.id === vendor.id || f.vendor_id === vendor.id));
    }
  }, [favs, vendor]);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggleFav = async () => {
    if (!vendor) return;
    setFavLoading(true);
    try {
      if (isFav) {
        await vendorApi.removeFavorite(vendor.id);
        setIsFav(false);
        toast.success("Removed from favorites");
      } else {
        await vendorApi.addFavorite(vendor.id);
        setIsFav(true);
        toast.success("Saved to favorites ❤️");
      }
      qc.invalidateQueries({ queryKey: ["vendor-favorites"] });
    } catch {
      toast.error("Please log in to save favorites");
    } finally {
      setFavLoading(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: vendor?.title, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2500);
    }
  };

  // ── Loading / Error States ─────────────────────────────────────────────────
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 size={44} className="animate-spin text-rose-500" />
        <p className="text-sm font-semibold text-slate-400 tracking-widest uppercase animate-pulse">
          Loading Portfolio…
        </p>
      </div>
    </div>
  );

  if (isError || !vendor) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 text-center px-4">
      <div className="text-6xl">😕</div>
      <h1 className="text-2xl font-black text-slate-800">Vendor not found</h1>
      <p className="text-slate-500 max-w-sm">
        The vendor profile you're looking for doesn't exist or may have been removed.
      </p>
      <Link href="/vendors"
        className="px-8 py-3 bg-rose-600 text-white rounded-2xl font-bold shadow-lg hover:bg-rose-700 transition">
        ← Browse Vendors
      </Link>
    </div>
  );

  const portfolio = vendor.portfolio || [];
  const displayPhotos = selectedCat === null
    ? portfolio
    : portfolio.filter((p: any) => p.category === selectedCat);
  const packages = vendor.packages || [];
  const reviews  = vendor.reviews  || [];
  const cats     = vendor.portfolio_categories || [];
  const accent   = vendor.theme_color || "#be123c";

  return (
    <div className="min-h-screen bg-[#fafafa] font-sans text-slate-900 selection:bg-rose-100">

      {/* ── Sticky Header ─────────────────────────────────────────────────── */}
      <header className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 ${
        isScrolled ? "bg-white/95 backdrop-blur-lg shadow-md py-3" : "bg-transparent py-5"
      }`}>
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between gap-4">
          <button onClick={() => router.back()}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all ${
              isScrolled ? "bg-slate-100 text-slate-700" : "bg-white/20 text-white backdrop-blur-md"
            }`}>
            <ArrowLeft size={16} /> Back
          </button>

          {isScrolled && (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {vendor.thumbnail && (
                <img src={absUrl(vendor.thumbnail)} alt=""
                  className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
              )}
              <span className="font-black text-slate-800 truncate">{vendor.title}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button onClick={toggleFav} disabled={favLoading}
              className={`p-2.5 rounded-full transition-all ${
                isScrolled ? "bg-slate-100" : "bg-white/20 backdrop-blur-md"
              } ${isFav ? "text-rose-500" : isScrolled ? "text-slate-500" : "text-white"}`}>
              <Heart size={20} fill={isFav ? "currentColor" : "none"} />
            </button>
            <div className="relative">
              <button onClick={handleShare}
                className={`p-2.5 rounded-full transition-all ${
                  isScrolled ? "bg-slate-100 text-slate-600" : "bg-white/20 text-white backdrop-blur-md"
                }`}>
                <Share2 size={20} />
              </button>
              {shareToast && (
                <div className="absolute top-12 right-0 bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
                  Link copied! ✓
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Hero / Cover ──────────────────────────────────────────────────── */}
      <section className="relative h-[50vh] md:h-[65vh] overflow-hidden">
        {vendor.cover_image ? (
          <img src={absUrl(vendor.cover_image)} alt={vendor.title}
            className="w-full h-full object-cover scale-[1.02]" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-slate-900/50 to-slate-900/10" />

        {/* Vendor identity card at bottom of hero */}
        <div className="absolute bottom-0 inset-x-0 px-4 pb-10">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-end gap-5">
            {/* Logo / Thumbnail */}
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24 md:w-36 md:h-36 rounded-3xl overflow-hidden border-4 border-white shadow-2xl">
                {vendor.thumbnail
                  ? <img src={absUrl(vendor.thumbnail)} className="w-full h-full object-cover" alt={vendor.title} />
                  : <div className="w-full h-full flex items-center justify-center bg-slate-700 text-4xl">
                      {CAT_ICONS[vendor.category] || "🎯"}
                    </div>
                }
              </div>
              {vendor.is_verified && (
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                  <BadgeCheck size={16} className="text-white" />
                </div>
              )}
            </div>

            {/* Name + metadata */}
            <div className="flex-1 text-white">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-5xl font-black tracking-tight drop-shadow-xl leading-tight">
                  {vendor.title}
                </h1>
                {vendor.is_verified && (
                  <span className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-emerald-500 text-white rounded-full text-xs font-black shadow-lg">
                    <ShieldCheck size={12} /> VERIFIED
                  </span>
                )}
              </div>
              {vendor.tagline && (
                <p className="text-base md:text-lg font-medium opacity-90 mb-3 max-w-2xl drop-shadow">
                  {vendor.tagline}
                </p>
              )}
              <div className="flex flex-wrap gap-4 text-sm font-semibold opacity-80">
                <span className="flex items-center gap-1.5">
                  <Award size={15} /> {CAT_LABELS[vendor.category] || vendor.category}
                </span>
                {vendor.city && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={15} /> {vendor.city}
                  </span>
                )}
                {vendor.avg_rating && (
                  <span className="flex items-center gap-1.5">
                    <Star size={15} className="text-amber-400" fill="currentColor" />
                    {vendor.avg_rating} ({vendor.review_count} Reviews)
                  </span>
                )}
                {vendor.starting_price && (
                  <span className="flex items-center gap-1.5">
                    <Package size={15} />
                    From ₹{Math.round(vendor.starting_price).toLocaleString("en-IN")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Content Grid ─────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 -mt-4 relative z-10 pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Left: Content */}
          <div className="lg:col-span-8 space-y-6">

            {/* Mobile Quick Stats */}
            <div className="grid grid-cols-3 gap-3 lg:hidden">
              {[
                { label: "Rating",   val: vendor.avg_rating  ?? "—",  icon: <Star size={14} className="text-amber-400" fill="currentColor" /> },
                { label: "Reviews",  val: vendor.review_count ?? 0,   icon: <MessageCircle size={14} className="text-rose-400" /> },
                { label: "Photos",   val: portfolio.length,            icon: <Camera size={14} className="text-indigo-400" /> },
              ].map(stat => (
                <div key={stat.label}
                  className="bg-white p-4 rounded-2xl shadow-sm text-center border border-slate-100">
                  <div className="flex justify-center mb-1">{stat.icon}</div>
                  <div className="text-xl font-black text-slate-800">{stat.val}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* About Card */}
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100">
              <h2 className="text-lg font-black mb-4 flex items-center gap-2">
                <Zap size={18} className="text-rose-500" /> Our Story
              </h2>
              <p className="text-slate-600 leading-relaxed">{vendor.bio}</p>

              {/* Contact Links */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 pt-6 border-t border-slate-50">
                {vendor.phone && (
                  <a href={`tel:${vendor.phone}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-rose-50 transition group">
                    <div className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform">
                      <Phone size={16} />
                    </div>
                    <span className="text-sm font-bold text-slate-700">{vendor.phone}</span>
                  </a>
                )}
                {vendor.email && (
                  <a href={`mailto:${vendor.email}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-blue-50 transition group">
                    <div className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                      <Mail size={16} />
                    </div>
                    <span className="text-sm font-bold text-slate-700 truncate">{vendor.email}</span>
                  </a>
                )}
                {vendor.instagram && (
                  <a href={vendor.instagram} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-pink-50 transition group">
                    <div className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center text-pink-600 group-hover:scale-110 transition-transform">
                      <Instagram size={16} />
                    </div>
                    <span className="text-sm font-bold text-slate-700">Instagram</span>
                    <ExternalLink size={12} className="ml-auto text-slate-300" />
                  </a>
                )}
                {vendor.website && (
                  <a href={vendor.website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-indigo-50 transition group">
                    <div className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                      <Globe size={16} />
                    </div>
                    <span className="text-sm font-bold text-slate-700 truncate">
                      {vendor.website.replace(/^https?:\/\//, "")}
                    </span>
                    <ExternalLink size={12} className="ml-auto text-slate-300" />
                  </a>
                )}
              </div>
            </div>

            {/* Tab Nav */}
            <div className="sticky top-16 z-30 bg-[#fafafa]/90 backdrop-blur-md py-2 -mx-4 px-4 border-b border-slate-100">
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {([
                  { id: "portfolio", label: "Portfolio", icon: <ImageIcon size={14} /> },
                  { id: "packages",  label: "Packages",  icon: <Package size={14} /> },
                  { id: "reviews",   label: "Reviews",   icon: <Star size={14} /> },
                ] as const).map(t => (
                  <button key={t.id} onClick={() => setActiveTab(t.id)}
                    className={`flex items-center gap-1.5 whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
                      activeTab === t.id
                        ? "bg-slate-900 text-white shadow-lg"
                        : "bg-white text-slate-500 border border-slate-200 hover:border-slate-300"
                    }`}>
                    {t.icon} {t.label}
                    {t.id === "reviews" && vendor.review_count > 0 && (
                      <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                        activeTab === "reviews" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                      }`}>{vendor.review_count}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* ── PORTFOLIO TAB ─────────────────────────────────────────── */}
            {activeTab === "portfolio" && (
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-xl font-black tracking-tight">Work Portfolio</h2>
                    <p className="text-slate-400 text-xs mt-1">{portfolio.length} photos</p>
                  </div>
                  {cats.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setSelectedCat(null)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                          selectedCat === null ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}>ALL</button>
                      {cats.map((c: any) => (
                        <button key={c.id} onClick={() => setSelectedCat(c.id)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                            selectedCat === c.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}>
                          {c.emoji} {c.name.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {displayPhotos.length === 0 ? (
                  <div className="text-center py-16 text-slate-300">
                    <Camera size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="font-semibold text-slate-400">No photos yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {displayPhotos.map((img: any) => (
                      <button key={img.id} onClick={() => setLightbox(absUrl(img.picture) || "")}
                        className="aspect-[4/5] rounded-2xl overflow-hidden group relative shadow-sm border border-slate-100">
                        <img src={absUrl(img.picture)} alt={img.title || "Portfolio"}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                          {img.title && (
                            <p className="text-white text-[10px] font-bold uppercase tracking-widest">{img.title}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── PACKAGES TAB ──────────────────────────────────────────── */}
            {activeTab === "packages" && (
              <div className="space-y-4">
                {packages.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-slate-100">
                    <Package size={48} className="mx-auto mb-4 text-slate-200" />
                    <p className="font-semibold text-slate-400">No packages listed yet</p>
                    <button onClick={() => setEnquireOpen(true)}
                      className="mt-6 px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-rose-600 transition">
                      Request Custom Quote
                    </button>
                  </div>
                ) : packages.map((pkg: any) => (
                  <div key={pkg.id}
                    className={`relative bg-white rounded-[2rem] border-2 p-7 transition-all hover:shadow-xl ${
                      pkg.is_popular ? "border-rose-200 shadow-rose-50 shadow-lg" : "border-slate-100 shadow-sm"
                    }`}>
                    {pkg.is_popular && (
                      <div className="absolute -top-3.5 left-8">
                        <span className="px-4 py-1 bg-rose-600 text-white text-[10px] font-black rounded-full shadow-lg tracking-widest uppercase">
                          Most Popular
                        </span>
                      </div>
                    )}

                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                      {/* Package details */}
                      <div className="flex-1">
                        <h3 className="text-2xl font-black text-slate-900 mb-1">{pkg.name}</h3>
                        {pkg.description && (
                          <p className="text-slate-500 text-sm leading-relaxed mb-5">{pkg.description}</p>
                        )}

                        <div className="flex items-end gap-2 mb-6">
                          <span className="text-4xl font-black text-slate-900">
                            ₹{Math.round(parseFloat(pkg.price)).toLocaleString("en-IN")}
                          </span>
                          <span className="text-slate-400 text-xs font-bold mb-1.5 uppercase tracking-wide">
                            Starts from
                          </span>
                        </div>

                        {/* Quick meta */}
                        {(pkg.max_hours || pkg.delivery_days) && (
                          <div className="flex gap-6 pb-5 mb-5 border-b border-slate-50">
                            {pkg.max_hours && (
                              <div className="flex items-center gap-2 text-slate-600 font-bold text-xs">
                                <Clock size={14} className="text-rose-400" /> {pkg.max_hours} Hours
                              </div>
                            )}
                            {pkg.delivery_days && (
                              <div className="flex items-center gap-2 text-slate-600 font-bold text-xs">
                                <Calendar size={14} className="text-rose-400" /> {pkg.delivery_days} Day Delivery
                              </div>
                            )}
                          </div>
                        )}

                        {/* Features */}
                        {Array.isArray(pkg.features) && pkg.features.length > 0 && (
                          <div className="space-y-3">
                            {pkg.features.map((f: string, i: number) => (
                              <div key={i} className="flex items-center gap-3 text-slate-700 text-sm font-medium">
                                <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                                  <CheckCircle2 size={12} />
                                </div>
                                {f}
                              </div>
                            ))}
                          </div>
                        )}

                        {pkg.allows_custom && (
                          <p className="mt-4 text-xs text-indigo-500 font-semibold">
                            ✦ Custom add-ons available on request
                          </p>
                        )}
                      </div>

                      {/* CTA */}
                      <div className="flex flex-col gap-3 md:w-44 flex-shrink-0">
                        <button
                          onClick={() => { setSelectedPkg(pkg); setEnquireOpen(true); }}
                          className={`w-full py-3.5 rounded-2xl font-black transition-all active:scale-95 text-sm ${
                            pkg.is_popular
                              ? "bg-rose-600 text-white shadow-xl shadow-rose-200 hover:bg-rose-700"
                              : "bg-slate-900 text-white hover:bg-rose-600"
                          }`}>
                          Get Quote
                        </button>
                        <button
                          onClick={() => { setSelectedPkg(null); setEnquireOpen(true); }}
                          className="w-full py-3 rounded-2xl font-bold text-slate-500 border border-slate-200 hover:border-slate-300 text-xs transition">
                          Custom Request
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── REVIEWS TAB ───────────────────────────────────────────── */}
            {activeTab === "reviews" && (
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100">
                {/* Rating summary */}
                <div className="flex flex-col sm:flex-row items-center gap-6 mb-8 pb-8 border-b border-slate-50">
                  <div className="text-center">
                    <div className="text-6xl font-black text-slate-900 leading-none">
                      {vendor.avg_rating ?? "—"}
                    </div>
                    <div className="flex justify-center gap-1 mt-2">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Star key={i} size={16}
                          fill={vendor.avg_rating && i <= Math.round(vendor.avg_rating) ? "#f59e0b" : "#e2e8f0"}
                          className={vendor.avg_rating && i <= Math.round(vendor.avg_rating) ? "text-amber-400" : "text-slate-200"} />
                      ))}
                    </div>
                    <p className="text-xs text-slate-400 font-bold mt-1">
                      {vendor.review_count} Reviews
                    </p>
                  </div>

                  <div className="flex-1 w-full space-y-2">
                    {[5, 4, 3, 2, 1].map(star => {
                      const count = reviews.filter((r: any) => r.rating === star).length;
                      const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-3">
                          <span className="text-xs font-bold text-slate-500 w-4">{star}</span>
                          <Star size={10} className="text-amber-400 flex-shrink-0" fill="currentColor" />
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-400 rounded-full transition-all"
                              style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-slate-400 font-bold w-6 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {reviews.length === 0 ? (
                  <div className="text-center py-10 text-slate-300">
                    <MessageCircle size={44} className="mx-auto mb-3 opacity-30" />
                    <p className="font-semibold text-slate-400">No reviews yet. Be the first!</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {reviews.map((r: any) => (
                      <div key={r.id}
                        className="pb-6 border-b border-slate-50 last:border-0 last:pb-0">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center font-black text-rose-500 text-base">
                              {(r.reviewer_name || "A")[0]}
                            </div>
                            <div>
                              <p className="font-black text-slate-800 text-sm leading-none mb-1">
                                {r.reviewer_name || "Anonymous"}
                              </p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Verified Couple
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-0.5 flex-shrink-0">
                            {[1, 2, 3, 4, 5].map(i => (
                              <Star key={i} size={13}
                                fill={i <= r.rating ? "#f59e0b" : "#e2e8f0"}
                                className={i <= r.rating ? "text-amber-400" : "text-slate-200"} />
                            ))}
                          </div>
                        </div>
                        <p className="text-slate-600 text-sm font-medium italic leading-relaxed">
                          "{r.comment}"
                        </p>
                        {r.created_at && (
                          <p className="text-[10px] text-slate-300 font-semibold mt-2">
                            {new Date(r.created_at).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* ── Sidebar (desktop) ─────────────────────────────────────── */}
          <aside className="hidden lg:block lg:col-span-4">
            <div className="sticky top-24 space-y-4">

              {/* CTA Card */}
              <div className="bg-white rounded-[2.5rem] p-7 shadow-xl border border-slate-100">
                <h3 className="text-xl font-black mb-1">Book This Vendor</h3>
                <p className="text-slate-400 text-xs mb-6">
                  Connect directly and check availability for your wedding date.
                </p>

                <button onClick={() => { setSelectedPkg(null); setEnquireOpen(true); }}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-rose-600 transition-all hover:-translate-y-0.5 active:translate-y-0 shadow-xl text-sm">
                  <Send size={16} /> Request Pricing
                </button>

                <button onClick={toggleFav}
                  className={`w-full mt-3 py-3.5 rounded-2xl font-black flex items-center justify-center gap-2 border-2 transition-all text-sm ${
                    isFav
                      ? "border-rose-200 bg-rose-50 text-rose-600"
                      : "border-slate-200 text-slate-600 hover:border-rose-200 hover:text-rose-500"
                  }`}>
                  <Heart size={16} fill={isFav ? "currentColor" : "none"} />
                  {isFav ? "Saved to Favorites" : "Save to Favorites"}
                </button>

                <div className="mt-5 flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <ShieldCheck className="text-emerald-600 flex-shrink-0" size={20} />
                  <p className="text-xs font-bold text-emerald-800 leading-tight">
                    Planazo Protection · All vendors are reviewed before listing.
                  </p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Quick Facts</h4>
                <div className="space-y-3">
                  {vendor.avg_rating && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 font-medium flex items-center gap-2">
                        <Star size={14} className="text-amber-400" fill="currentColor" /> Rating
                      </span>
                      <span className="font-black text-slate-900">{vendor.avg_rating} / 5.0</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 font-medium flex items-center gap-2">
                      <Camera size={14} className="text-indigo-400" /> Portfolio
                    </span>
                    <span className="font-black text-slate-900">{portfolio.length} photos</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 font-medium flex items-center gap-2">
                      <Package size={14} className="text-rose-400" /> Packages
                    </span>
                    <span className="font-black text-slate-900">{packages.length} options</span>
                  </div>
                  {vendor.starting_price && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 font-medium flex items-center gap-2">
                        <Zap size={14} className="text-green-500" /> Starting at
                      </span>
                      <span className="font-black text-slate-900">
                        ₹{Math.round(vendor.starting_price).toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}
                  {vendor.city && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 font-medium flex items-center gap-2">
                        <MapPin size={14} className="text-slate-400" /> Location
                      </span>
                      <span className="font-black text-slate-900 text-sm">{vendor.city}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Similar vendors CTA */}
              <Link href={`/vendors?category=${vendor.category}`}
                className="flex items-center justify-between p-5 bg-white rounded-3xl shadow-sm border border-slate-100 hover:border-rose-200 transition group">
                <div>
                  <p className="font-black text-slate-800 text-sm">Similar Vendors</p>
                  <p className="text-xs text-slate-400 mt-0.5">Browse more {CAT_LABELS[vendor.category]}s</p>
                </div>
                <ChevronRight size={18} className="text-slate-300 group-hover:text-rose-500 transition" />
              </Link>

            </div>
          </aside>

        </div>
      </main>

      {/* ── Mobile Bottom Bar ─────────────────────────────────────────────── */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 p-4 bg-white/95 backdrop-blur-xl border-t border-slate-100 z-50">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <button onClick={toggleFav} disabled={favLoading}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 border-2 transition-all ${
              isFav ? "border-rose-200 bg-rose-50 text-rose-500" : "border-slate-200 text-slate-400"
            }`}>
            <Heart size={22} fill={isFav ? "currentColor" : "none"} />
          </button>
          {vendor.phone && (
            <a href={`tel:${vendor.phone}`}
              className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 flex-shrink-0">
              <Phone size={22} />
            </a>
          )}
          <button onClick={() => { setSelectedPkg(null); setEnquireOpen(true); }}
            className="flex-1 h-14 bg-rose-600 text-white font-black rounded-2xl shadow-xl shadow-rose-200 flex items-center justify-center gap-2 hover:bg-rose-700 active:scale-[0.98] transition">
            Request Pricing <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* ── Lightbox ──────────────────────────────────────────────────────── */}
      {lightbox && (
        <div className="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}>
          <button className="absolute top-6 right-6 p-3 text-white hover:text-rose-400 transition">
            <X size={28} />
          </button>
          <img src={lightbox} className="max-w-full max-h-[90vh] rounded-2xl object-contain shadow-2xl"
            alt="Full size" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* ── Enquiry / Request Pricing Modal ───────────────────────────────── */}
      {enquireOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setEnquireOpen(false)}>
          <div className="bg-white rounded-t-[2rem] sm:rounded-[2.5rem] w-full sm:max-w-lg shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="p-7 sm:p-9">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black mb-1">Request Pricing</h2>
                  {selectedPkg ? (
                    <p className="text-slate-500 text-sm">
                      For <span className="font-bold text-slate-700">{selectedPkg.name}</span> package · {vendor.title}
                    </p>
                  ) : (
                    <p className="text-slate-500 text-sm">To {vendor.title}</p>
                  )}
                </div>
                <button onClick={() => setEnquireOpen(false)}
                  className="p-2 rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 transition flex-shrink-0">
                  <X size={18} />
                </button>
              </div>

              {selectedPkg && (
                <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-black text-slate-900">{selectedPkg.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{selectedPkg.description}</p>
                    </div>
                    <span className="text-xl font-black text-slate-900">
                      ₹{Math.round(parseFloat(selectedPkg.price)).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              )}

              <EnquiryForm slug={slug} packageName={selectedPkg?.name} onClose={() => setEnquireOpen(false)} />
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

// ─── Enquiry Form Component ────────────────────────────────────────────────────

function EnquiryForm({
  slug,
  packageName,
  onClose,
}: {
  slug: string;
  packageName?: string;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", event_date: "",
    message: packageName ? `I'm interested in the "${packageName}" package. Please share pricing details.` : "",
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await vendorApi.enquire(slug, form);
      setSent(true);
    } catch {
      toast.error("Failed to send. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (sent) return (
    <div className="text-center py-8">
      <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm">
        <CheckCircle2 size={40} />
      </div>
      <h3 className="text-2xl font-black text-slate-800 mb-2">Sent!</h3>
      <p className="text-slate-500 font-medium mb-7 max-w-xs mx-auto text-sm">
        The vendor will review your request and get back to you within 24 hours.
      </p>
      <button onClick={onClose}
        className="px-10 py-3.5 bg-slate-900 text-white rounded-2xl font-black shadow-lg hover:bg-rose-600 transition">
        Done
      </button>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
            Full Name *
          </label>
          <input required value={form.name} onChange={e => set("name", e.target.value)}
            placeholder="Your name"
            className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-100 focus:border-rose-200 transition text-sm font-medium" />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
            Phone *
          </label>
          <input required value={form.phone} onChange={e => set("phone", e.target.value)}
            placeholder="+91 98765 43210"
            className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-100 focus:border-rose-200 transition text-sm font-medium" />
        </div>
      </div>
      <div>
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
          Email Address
        </label>
        <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
          placeholder="you@example.com"
          className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-100 focus:border-rose-200 transition text-sm font-medium" />
      </div>
      <div>
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
          Wedding Date
        </label>
        <div className="relative">
          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
          <input type="date" value={form.event_date} onChange={e => set("event_date", e.target.value)}
            className="w-full pl-10 pr-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none text-sm font-medium text-slate-600" />
        </div>
      </div>
      <div>
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
          Message *
        </label>
        <textarea required rows={4} value={form.message} onChange={e => set("message", e.target.value)}
          placeholder="Tell the vendor about your wedding, requirements, guest count…"
          className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-100 focus:border-rose-200 transition text-sm font-medium resize-none" />
      </div>
      <button type="submit" disabled={sending}
        className="w-full py-4 bg-rose-600 text-white font-black rounded-2xl shadow-xl shadow-rose-100 flex items-center justify-center gap-2 transition-all active:scale-[0.98] hover:bg-rose-700 text-sm">
        {sending ? <Loader2 size={18} className="animate-spin" /> : <><Send size={16} /> Send Request</>}
      </button>
    </form>
  );
}
