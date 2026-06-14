"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  X, Menu, Search, MapPin, Heart, ChevronRight,
  Sparkles, CheckCircle2, Star, Camera, Gift,
  BadgeCheck, ArrowRight, Zap,
} from "lucide-react";
import { vendorApi } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function absUrl(src?: string | null) {
  if (!src) return undefined;
  return src.startsWith("http") ? src : `${API}${src}`;
}

// ── Static constants ──────────────────────────────────────────────────────────
const VENDOR_CATS = [
  { label: "Wedding Venues",  emoji: "🏛️", value: "VENUE",        img: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=500&q=80" },
  { label: "Photographers",   emoji: "📷", value: "PHOTOGRAPHER",  img: "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=500&q=80" },
  { label: "Caterers",        emoji: "🍽️", value: "CATERING",      img: "https://images.unsplash.com/photo-1555244162-803834f70033?w=500&q=80" },
  { label: "Bridal Attire",   emoji: "👗", value: "MAKEUP",        img: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500&q=80" },
];

const MORE_CATS = [
  { label: "Wedding Planners", value: "EVENT" },
  { label: "DJs & Bands",      value: "MUSIC" },
  { label: "Decoration",       value: "DECOR" },
  { label: "Makeup Artists",   value: "MAKEUP" },
  { label: "Videographers",    value: "PHOTOGRAPHER" },
  { label: "Mehndi Artists",   value: "MAKEUP" },
  { label: "Florists",         value: "DECOR" },
  { label: "Jewellery",        value: "VENUE" },
  { label: "Wedding Rentals",  value: "DECOR" },
];

const TOOLS = [
  { label: "Checklist",       icon: "✅", href: "/dashboard/checklist",    desc: "Pre-populated tasks by timeline" },
  { label: "Budget Planner",  icon: "💰", href: "/dashboard/budget",       desc: "Track estimated vs. actual costs" },
  { label: "Guest List",      icon: "👥", href: "/dashboard/guests",       desc: "RSVP tracking & meal preferences" },
  { label: "Wedding Website", icon: "🌐", href: "/dashboard/invites",      desc: "Beautiful templates, live RSVP" },
  { label: "AI Planner",      icon: "✨", href: "/dashboard/planner",      desc: "AI builds your complete vendor plan" },
  { label: "Gift Registry",   icon: "🎁", href: "/shop",                   desc: "Curated gifts from verified sellers" },
];

const TESTIMONIALS = [
  { name: "Priya & Arjun",   city: "Kochi",    quote: "Planazo made our entire wedding planning effortless. The AI selfie match was a magical surprise for our guests!" },
  { name: "Meera & Rohan",   city: "Thrissur", quote: "Found our dream photographer in 10 minutes. The vendor comparison tool saved us hours of research." },
  { name: "Divya & Karthik", city: "Chennai",  quote: "Our wedding website got 500+ RSVPs and guests could find their own photos using the AI gallery. Incredible!" },
];

const NAV_LINKS = [
  ["Vendors",    "/vendors"],
  ["Weddings",   "/dashboard/invites"],
  ["Shop",       "/shop"],
  ["AI Planner", "/dashboard/planner"],
  ["My Wedding", "/dashboard/overview"],
];

// ── Animated counter ──────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1200, started = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!started || target === 0) return;
    const step = target / (duration / 16);
    let cur = 0;
    const t = setInterval(() => {
      cur = Math.min(cur + step, target);
      setVal(Math.round(cur));
      if (cur >= target) clearInterval(t);
    }, 16);
    return () => clearInterval(t);
  }, [target, started]);
  return val;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();
  const [search,      setSearch]      = useState("");
  const [location,    setLocation]    = useState("");
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [isScrolled,  setIsScrolled]  = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Trigger counter animation when stats row enters viewport
  useEffect(() => {
    if (!statsRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true); },
      { threshold: 0.3 }
    );
    obs.observe(statsRef.current);
    return () => obs.disconnect();
  }, []);

  // ── Data fetching ──────────────────────────────────────────────────────────
  // Featured vendors: top-rated, verified
  const { data: featuredData } = useQuery<any>({
    queryKey: ["featured-vendors"],
    queryFn:  () => vendorApi.list({ is_verified: true, ordering: "-avg_rating", page_size: 4 }),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // Stats: total vendor count (verified)
  const { data: statsData } = useQuery<any>({
    queryKey: ["vendor-stats"],
    queryFn:  () => vendorApi.list({ is_verified: true, page_size: 1 }),
    retry: false,
    staleTime: 10 * 60 * 1000,
  });

  const featuredVendors: any[] = Array.isArray(featuredData)
    ? featuredData.slice(0, 4)
    : (featuredData?.results ?? []).slice(0, 4);

  const verifiedCount = statsData?.count ?? statsData?.length ?? 0;

  // Animated stats (base counts + real vendor count)
  const couplesCount  = useCountUp(1240,  1400, statsVisible);
  const vendorsCount  = useCountUp(Math.max(verifiedCount, 87), 1200, statsVisible);
  const photosCount   = useCountUp(42000, 1500, statsVisible);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search)   params.set("search", search);
    if (location) params.set("city",   location);
    router.push(`/vendors?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-rose-100 selection:text-rose-900">

      {/* ── Sticky Navigation ───────────────────────────────────────────────── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100 py-3" : "bg-transparent py-5"
      }`}>
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
            <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-rose-200 group-hover:scale-110 transition-transform">
              <Heart size={22} fill="currentColor" />
            </div>
            <span className="font-bold text-2xl tracking-tight text-slate-900">Planazo</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(([label, href]) => (
              <Link key={href} href={href}
                className="text-sm font-semibold text-slate-600 hover:text-rose-600 transition-colors">
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/login"
              className="hidden sm:block px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
              Sign In
            </Link>
            <Link href="/register"
              className="px-6 py-2.5 bg-rose-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-rose-200 hover:bg-rose-700 hover:-translate-y-0.5 transition-all active:translate-y-0">
              Get Started
            </Link>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-colors">
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu overlay */}
        <div className={`fixed inset-0 bg-white z-40 md:hidden transition-transform duration-500 ease-in-out ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}>
          <div className="flex flex-col h-full p-6 pt-24">
            <nav className="flex flex-col gap-6">
              {NAV_LINKS.map(([label, href]) => (
                <Link key={href} href={href} onClick={() => setMobileOpen(false)}
                  className="text-2xl font-bold text-slate-800 hover:text-rose-600 transition-colors flex items-center justify-between">
                  {label}
                  <ChevronRight size={24} className="text-slate-300" />
                </Link>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-4">
              <Link href="/login"
                className="w-full py-4 text-center font-bold text-slate-800 border-2 border-slate-100 rounded-2xl">
                Sign In
              </Link>
              <Link href="/register"
                className="w-full py-4 text-center font-bold text-white bg-rose-600 rounded-2xl shadow-xl shadow-rose-100">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ── Hero Section ────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 overflow-hidden"
        style={{ background: "linear-gradient(135deg,#fff1f2 0%,#fdf2f8 60%,#fff 100%)" }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-40">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[60%] bg-rose-200 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[60%] bg-purple-100 blur-[120px] rounded-full" />
        </div>

        <div className="max-w-5xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-full text-xs font-bold uppercase tracking-widest mb-8 border border-rose-100">
            <Sparkles size={14} /> India's AI-Powered Wedding Platform..
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 mb-6 leading-[1.1] tracking-tight">
            Plan Your Perfect<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-pink-500">
              Wedding Journey
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-500 mb-10 max-w-2xl mx-auto font-medium leading-relaxed">
            Find verified vendors, build your wedding website, manage guests, share AI-powered memories — all in one place.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch}
            className="bg-white rounded-3xl shadow-2xl shadow-slate-200/60 p-2 flex flex-col sm:flex-row gap-2 max-w-3xl mx-auto border border-slate-100 group focus-within:ring-4 focus-within:ring-rose-50 transition-all">
            <div className="flex-[1.5] flex items-center gap-3 px-4 py-3">
              <Search className="text-slate-400 group-focus-within:text-rose-500 transition-colors flex-shrink-0" size={20} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search vendors, categories…"
                className="w-full text-base outline-none text-slate-700 placeholder-slate-300 font-medium"
              />
            </div>
            <div className="w-px bg-slate-100 hidden sm:block my-2" />
            <div className="flex-1 flex items-center gap-3 px-4 py-3">
              <MapPin className="text-slate-400 flex-shrink-0" size={20} />
              <input
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="City or location"
                className="w-full text-base outline-none text-slate-700 placeholder-slate-300 font-medium"
              />
            </div>
            <button type="submit"
              className="px-8 py-4 bg-rose-600 text-white rounded-2xl text-base font-bold hover:bg-rose-700 transition-all flex-shrink-0 shadow-lg shadow-rose-100">
              Search
            </button>
          </form>

          {/* Quick category pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-8">
            {["Photographers", "Venues", "Caterers", "DJs", "Decoration"].map(c => (
              <Link key={c} href={`/vendors?search=${c}`}
                className="px-5 py-2 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-600 hover:border-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all shadow-sm">
                {c}
              </Link>
            ))}
          </div>
        </div>

        {/* ── Animated Stats ──────────────────────────────────────────────── */}
        <div ref={statsRef} className="flex justify-center gap-4 mt-16 flex-wrap px-4">
          {[
            { value: couplesCount > 0 ? `${couplesCount.toLocaleString("en-IN")}+` : "1,200+", label: "Couples Served" },
            { value: vendorsCount > 0 ? `${vendorsCount}+` : "87+",     label: "Verified Vendors" },
            { value: photosCount  > 0 ? `${(photosCount/1000).toFixed(0)}K+` : "42K+", label: "AI Photos Shared" },
            { value: "Free",                                              label: "Wedding Website" },
          ].map(({ value, label }) => (
            <div key={label}
              className="bg-white rounded-2xl px-8 py-4 shadow-sm border border-slate-100 text-center hover:shadow-md transition-shadow">
              <p className="text-2xl font-black text-rose-600">{value}</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Vendor Categories ────────────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Find every vendor you need</h2>
              <p className="text-slate-500 font-medium mt-2">Connect with India's best wedding professionals</p>
            </div>
            <Link href="/vendors"
              className="text-rose-600 font-bold flex items-center gap-1 group hover:gap-2 transition-all">
              Show all <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {VENDOR_CATS.map(cat => (
              <Link key={cat.value} href={`/vendors?category=${cat.value}`}
                className="group relative rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all">
                <div className="aspect-[4/3] overflow-hidden">
                  <img src={cat.img} alt={cat.label}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                <div className="absolute bottom-0 left-0 p-6 w-full">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-lg border border-white/30">
                      {cat.emoji}
                    </span>
                    <h3 className="font-bold text-white text-lg">{cat.label}</h3>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            {MORE_CATS.map(c => (
              <Link key={c.label} href={`/vendors?category=${c.value}`}
                className="px-6 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold text-slate-700 hover:bg-white hover:border-rose-200 hover:text-rose-600 hover:shadow-md transition-all">
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Planning Tools ───────────────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-slate-900 text-white rounded-[3rem] mx-4 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-600/20 blur-[100px]" />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div className="text-center md:text-left">
              <h2 className="text-4xl font-black mb-4 tracking-tight">Enjoy planning your wedding</h2>
              <p className="text-slate-400 font-medium max-w-xl">All tools free, forever. Open your dashboard to get started.</p>
            </div>
            <Link href="/dashboard/overview"
              className="px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-bold rounded-2xl border border-white/10 transition-all flex items-center gap-2">
              Open Dashboard <ChevronRight size={18} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {TOOLS.map(t => (
              <Link key={t.href} href={t.href}
                className="bg-white/5 backdrop-blur-sm border border-white/10 p-8 rounded-[2.5rem] hover:bg-white/10 hover:border-white/20 transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center mb-6 shadow-xl group-hover:scale-110 transition-transform text-3xl">
                  {t.icon}
                </div>
                <h3 className="text-xl font-bold mb-2 group-hover:text-rose-400 transition-colors">{t.label}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{t.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Vendors (Live Data) ─────────────────────────────────────── */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-xs font-bold mb-3 border border-rose-100">
                <BadgeCheck size={12} /> Verified by Planazo
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Top-Rated Vendors</h2>
              <p className="text-slate-500 font-medium mt-2">Handpicked professionals loved by couples</p>
            </div>
            <Link href="/vendors"
              className="text-rose-600 font-bold flex items-center gap-1 group hover:gap-2 transition-all">
              Browse all vendors <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {featuredVendors.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredVendors.map((vendor: any) => {
                const thumb = absUrl(vendor.thumbnail);
                return (
                  <Link key={vendor.id} href={`/vendors/${vendor.slug}`}
                    className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-50">
                    <div className="aspect-[4/3] overflow-hidden relative bg-gradient-to-br from-rose-50 to-purple-50">
                      {thumb ? (
                        <img src={thumb} alt={vendor.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-5xl">
                          {vendor.category === "PHOTOGRAPHER" ? "📸" :
                           vendor.category === "CATERING"     ? "🍽️" :
                           vendor.category === "DECOR"        ? "🌸" :
                           vendor.category === "MUSIC"        ? "🎵" :
                           vendor.category === "MAKEUP"       ? "💄" : "🏪"}
                        </div>
                      )}
                      {vendor.is_verified && (
                        <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 bg-blue-600/90 backdrop-blur-sm text-white rounded-full text-[10px] font-bold">
                          <BadgeCheck size={9} /> Verified
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="font-bold text-slate-800 text-base mb-1 group-hover:text-rose-600 transition-colors line-clamp-1">
                        {vendor.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                        <MapPin size={11} />
                        <span>{vendor.city}</span>
                        {vendor.avg_rating && (
                          <>
                            <span>·</span>
                            <Star size={11} className="text-amber-400 fill-amber-400" />
                            <span className="font-bold text-slate-600">{vendor.avg_rating}</span>
                          </>
                        )}
                      </div>
                      {vendor.starting_price && (
                        <p className="text-xs font-bold text-rose-600">
                          From ₹{Number(vendor.starting_price).toLocaleString("en-IN")}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            /* Skeleton while loading */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-3xl overflow-hidden border border-slate-100 animate-pulse">
                  <div className="aspect-[4/3] bg-slate-100" />
                  <div className="p-5 space-y-2">
                    <div className="h-4 bg-slate-100 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Gift Registry CTA ────────────────────────────────────────────────── */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto bg-gradient-to-br from-[#1a0a2e] to-[#3b0764] rounded-[3rem] p-12 text-center text-white relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
          <div className="relative z-10">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center mx-auto mb-8">
              <Gift size={40} className="text-white" />
            </div>
            <h2 className="text-4xl font-black mb-4 tracking-tight">Create your free wedding registry</h2>
            <p className="text-purple-100 font-medium max-w-xl mx-auto mb-10 text-lg leading-relaxed">
              Guests can easily find and send gifts directly through your wedding website. Start your wishlist today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/shop"
                className="px-10 py-4 bg-white text-purple-700 font-black rounded-2xl shadow-xl hover:scale-105 transition-transform">
                Browse Gift Shop
              </Link>
              <Link href="/dashboard/invites"
                className="px-10 py-4 bg-purple-700/40 backdrop-blur-md text-white font-black rounded-2xl border border-white/20 hover:bg-purple-700/60 transition-all">
                Create Website
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── AI Selfie Section ─────────────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1">
            <div className="w-fit px-4 py-1.5 bg-rose-50 text-rose-600 rounded-full text-xs font-bold mb-6 flex items-center gap-2 border border-rose-100">
              <Camera size={14} /> AI-POWERED GALLERY
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 leading-tight tracking-tight">
              AI finds your photos{" "}
              <span className="text-rose-600 underline decoration-rose-100 decoration-8 underline-offset-8">instantly.</span>
            </h2>
            <p className="text-slate-500 font-medium text-lg mb-8 leading-relaxed">
              Upload one selfie and our AI scans the entire wedding gallery to find every photo of you — in seconds. No scrolling through hundreds of photos.
            </p>

            <div className="space-y-4 mb-10">
              {[
                "Works with 100+ photo galleries",
                "Finds group photos too",
                "Download all your photos as ZIP",
                "Auto-enhanced for perfect brightness",
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-3 text-slate-700 font-semibold">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 size={14} />
                  </div>
                  {f}
                </div>
              ))}
            </div>

            <Link href="/dashboard/gallery-v2"
              className="px-8 py-4 text-white font-black rounded-2xl shadow-xl transition-all flex items-center gap-3 w-fit hover:opacity-90"
              style={{ background: "linear-gradient(135deg,#7c3aed,#9b59b6)" }}>
              🤳 Try AI Photo Match <ChevronRight size={20} />
            </Link>
          </div>

          <div className="flex-1 relative">
            <div className="relative rounded-[3rem] overflow-hidden shadow-2xl z-10 border-8 border-white group">
              <img
                src="https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&q=80"
                alt="AI Gallery"
                className="w-full h-full object-cover aspect-square group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-purple-900/60 to-transparent opacity-40" />
              <div className="absolute bottom-8 left-8 right-8 bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-3xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden shadow-lg">
                    <img src="https://i.pravatar.cc/100?u=a" alt="Selfie" />
                  </div>
                  <div>
                    <p className="text-white text-[10px] font-black uppercase opacity-80 tracking-widest">AI Matching...</p>
                    <p className="text-white font-bold">14 Photos of you found!</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-rose-100 rounded-full blur-3xl opacity-60" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-100 rounded-full blur-3xl opacity-60" />
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-rose-50/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-black text-slate-900 text-center mb-16 tracking-tight">
            Loved by couples across India
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t, i) => (
              <div key={i}
                className="bg-white p-10 rounded-[2.5rem] border border-rose-100 shadow-sm flex flex-col h-full hover:shadow-md transition-shadow">
                <div className="flex gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} fill="#fbbf24" className="text-amber-400" />
                  ))}
                </div>
                <p className="text-slate-600 font-medium italic text-lg leading-relaxed mb-8 flex-grow">
                  "{t.quote}"
                </p>
                <div className="flex items-center gap-4 pt-6 border-t border-rose-50">
                  <div className="w-12 h-12 rounded-full bg-rose-600 flex items-center justify-center text-white font-bold text-xl">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="font-black text-slate-900 leading-none mb-1">{t.name}</p>
                    <p className="text-rose-500 font-bold text-xs uppercase tracking-widest">{t.city}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA Banner ─────────────────────────────────────────────────── */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center bg-gradient-to-br from-rose-50 to-pink-50 rounded-[3rem] p-16 border border-rose-100">
          <div className="w-16 h-16 bg-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-rose-200">
            <Zap size={32} className="text-white" />
          </div>
          <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">
            Start planning for free today
          </h2>
          <p className="text-slate-500 font-medium mb-8 text-lg max-w-xl mx-auto">
            Join thousands of couples who planned their perfect wedding with Planazo.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register"
              className="px-10 py-4 bg-rose-600 text-white font-black rounded-2xl shadow-xl shadow-rose-200 hover:bg-rose-700 hover:-translate-y-0.5 transition-all flex items-center gap-2 justify-center">
              Get Started Free <ArrowRight size={20} />
            </Link>
            <Link href="/vendors"
              className="px-10 py-4 bg-white text-slate-800 font-black rounded-2xl border border-slate-200 hover:border-rose-300 hover:text-rose-600 transition-all flex items-center gap-2 justify-center">
              Browse Vendors
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-white pt-24 pb-12 rounded-t-[4rem]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
            <div className="col-span-2 lg:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center text-white">
                  <Heart size={22} fill="currentColor" />
                </div>
                <span className="font-bold text-2xl tracking-tight">Planazo</span>
              </Link>
              <p className="text-slate-400 font-medium leading-relaxed max-w-xs">
                India's complete wedding planning platform. Empowering couples with AI magic.
              </p>
            </div>

            {[
              {
                title: "Planning Tools",
                links: [
                  ["Checklist",   "/dashboard/checklist"],
                  ["Budget",      "/dashboard/budget"],
                  ["Guest List",  "/dashboard/guests"],
                  ["AI Planner",  "/dashboard/planner"],
                ],
              },
              {
                title: "Find Vendors",
                links: [
                  ["All Vendors",    "/vendors"],
                  ["Photographers",  "/vendors?category=PHOTOGRAPHER"],
                  ["Decoration",     "/vendors?category=DECOR"],
                  ["Caterers",       "/vendors?category=CATERING"],
                ],
              },
              {
                title: "More",
                links: [
                  ["Gift Shop",        "/shop"],
                  ["Wedding Website",  "/dashboard/invites"],
                  ["For Sellers",      "/seller"],
                  ["For Vendors",      "/vendor/portfolio"],
                ],
              },
            ].map(col => (
              <div key={col.title}>
                <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-sm">{col.title}</h4>
                <ul className="space-y-4">
                  {col.links.map(([label, href]) => (
                    <li key={label}>
                      <Link href={href}
                        className="text-slate-400 hover:text-rose-500 font-medium transition-colors">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-slate-500 font-bold text-sm">
            <p>© 2026 Planazo · Made with 💍 in Kerala, India</p>
            <div className="flex gap-8">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Sitemap</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
