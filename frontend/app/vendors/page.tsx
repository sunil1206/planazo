"use client";
/**
 * /vendors — WeddingWire-style public vendor discovery
 * ▸ Category pills | Search | City | Price range | Sort
 * ▸ Favorites toggle (heart) with local optimistic update
 * ▸ Compare drawer (up to 3 vendors)
 * ▸ Budget planner sidebar
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search, MapPin, Star, Heart, SlidersHorizontal, ChevronDown,
  X, Check, GitCompare, Package, Camera, BadgeCheck, Sparkles,
  ChevronRight, IndianRupee, Calculator, ArrowUpDown, Filter,
} from "lucide-react";
import toast from "react-hot-toast";
import { vendorApi } from "@/lib/api";
// PublicNavbar is now mounted globally via app/layout.tsx -> GlobalNavGate.

// ─── Constants ────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const CATEGORIES = [
  { value: "",             label: "All Vendors",  emoji: "✨" },
  { value: "PHOTOGRAPHER", label: "Photography",  emoji: "📸" },
  { value: "EVENT",        label: "Event Mgmt",   emoji: "🎪" },
  { value: "DECOR",        label: "Decoration",   emoji: "🌸" },
  { value: "CATERING",     label: "Catering",     emoji: "🍽️" },
  { value: "MAKEUP",       label: "Makeup",       emoji: "💄" },
  { value: "MUSIC",        label: "DJ / Music",   emoji: "🎵" },
];

const CITIES = ["Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad", "Kolkata", "Pune", "Jaipur", "Kochi", "Ahmedabad"];

const PRICE_RANGES = [
  { label: "Any Price",    min: 0,     max: 0      },
  { label: "Under ₹10k",  min: 0,     max: 10000  },
  { label: "₹10k – ₹30k", min: 10000, max: 30000  },
  { label: "₹30k – ₹75k", min: 30000, max: 75000  },
  { label: "₹75k – ₹2L",  min: 75000, max: 200000 },
  { label: "₹2L+",        min: 200000, max: 0     },
];

const SORT_OPTIONS = [
  { value: "-created_at", label: "Newest First"  },
  { value: "title",       label: "Name A–Z"      },
  { value: "-avg_rating", label: "Top Rated"     },
  { value: "starting_price", label: "Price: Low → High" },
];

const BUDGET_CATS = [
  { key: "PHOTOGRAPHER", label: "Photography",  emoji: "📸", pct: 0.20 },
  { key: "EVENT",        label: "Event Mgmt",   emoji: "🎪", pct: 0.15 },
  { key: "DECOR",        label: "Decoration",   emoji: "🌸", pct: 0.25 },
  { key: "CATERING",     label: "Catering",     emoji: "🍽️", pct: 0.30 },
  { key: "MAKEUP",       label: "Makeup",       emoji: "💄", pct: 0.05 },
  { key: "MUSIC",        label: "DJ / Music",   emoji: "🎵", pct: 0.05 },
];

function absUrl(src?: string | null): string | undefined {
  if (!src) return undefined;
  return src.startsWith("http") ? src : `${API}${src}`;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function VendorsPage() {
  const qc = useQueryClient();

  // Filters
  const [category,   setCategory]   = useState("");
  const [city,       setCity]       = useState("");
  const [search,     setSearch]     = useState("");
  const [dSearch,    setDSearch]    = useState("");   // debounced
  const [priceIdx,   setPriceIdx]   = useState(0);
  const [sort,       setSort]       = useState("-created_at");

  // UI state
  const [filtersOpen,  setFiltersOpen]  = useState(false);
  const [cityOpen,     setCityOpen]     = useState(false);
  const [sortOpen,     setSortOpen]     = useState(false);
  const [budgetOpen,   setBudgetOpen]   = useState(false);
  const [compareOpen,  setCompareOpen]  = useState(false);
  const [compareList,  setCompareList]  = useState<any[]>([]);
  const [budgetTotal,  setBudgetTotal]  = useState<string>("500000");
  const [favIds,       setFavIds]       = useState<Set<number>>(new Set());

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Build query params
  const params: Record<string, any> = { ordering: sort };
  if (category)  params.category = category;
  if (city)      params.city     = city;
  if (dSearch)   params.search   = dSearch;
  const pr = PRICE_RANGES[priceIdx];
  if (pr.min > 0)  params.min_price = pr.min;
  if (pr.max > 0)  params.max_price = pr.max;

  const { data: vendorsRaw, isLoading } = useQuery<any>({
    queryKey: ["vendors", params],
    queryFn:  () => vendorApi.list(params),
  });
  const vendors: any[] = Array.isArray(vendorsRaw) ? vendorsRaw : (vendorsRaw?.results ?? []);

  // Fetch my favorites — avoid setState-in-queryFn infinite renders by syncing via useEffect
  const { data: favData } = useQuery<any>({
    queryKey:  ["vendor-favorites"],
    queryFn:   () => vendorApi.favorites(),
    staleTime: 60_000,
    retry:     false,
  });
  useEffect(() => {
    if (!favData) return;
    const ids = new Set<number>(
      (Array.isArray(favData) ? favData : []).map((f: any) => f.vendor?.id ?? f.vendor_id)
    );
    setFavIds(ids);
  }, [favData]);

  const toggleFav = async (vendor: any) => {
    const wasFav = favIds.has(vendor.id);
    // Optimistic update
    setFavIds(prev => {
      const next = new Set(prev);
      wasFav ? next.delete(vendor.id) : next.add(vendor.id);
      return next;
    });
    try {
      if (wasFav) {
        await vendorApi.removeFavorite(vendor.id);
        toast.success("Removed from favorites");
      } else {
        await vendorApi.addFavorite(vendor.id);
        toast.success("Saved to favorites ❤️");
      }
      qc.invalidateQueries({ queryKey: ["vendor-favorites"] });
    } catch {
      // Revert
      setFavIds(prev => {
        const next = new Set(prev);
        wasFav ? next.add(vendor.id) : next.delete(vendor.id);
        return next;
      });
      toast.error("Log in to save favorites");
    }
  };

  const toggleCompare = (vendor: any) => {
    setCompareList(prev => {
      const exists = prev.some(v => v.id === vendor.id);
      if (exists) return prev.filter(v => v.id !== vendor.id);
      if (prev.length >= 3) { toast.error("Compare up to 3 vendors"); return prev; }
      return [...prev, vendor];
    });
  };

  const clearFilters = () => {
    setCategory(""); setCity(""); setSearch(""); setPriceIdx(0); setSort("-created_at");
  };

  const hasFilters = category || city || search || priceIdx > 0;
  const budget     = parseFloat(budgetTotal) || 0;

  return (
    <div className="min-h-screen bg-[#fafafa]">

      {/* ── Hero Banner ───────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-rose-950 text-white pt-32 pb-14 md:pt-36 md:pb-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-widest mb-5">
            <Sparkles size={12} /> Find Your Dream Wedding Team
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tight leading-tight">
            Trusted Wedding<br className="hidden md:block" /> Professionals
          </h1>
          <p className="text-white/70 text-base md:text-lg max-w-xl mx-auto mb-8">
            Discover photographers, decorators, caterers, and more — all verified by Snapshare.
          </p>

          {/* Search bar */}
          <div className="flex items-center max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 flex-1 px-5 py-3.5">
              <Search size={18} className="text-slate-400 flex-shrink-0" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, city or service…"
                className="flex-1 outline-none text-slate-800 font-medium placeholder:text-slate-400 text-sm bg-transparent"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-slate-300 hover:text-slate-500">
                  <X size={14} />
                </button>
              )}
            </div>
            <button className="m-1.5 px-6 py-3 bg-rose-600 text-white font-black rounded-xl text-sm hover:bg-rose-700 transition flex-shrink-0">
              Search
            </button>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* ── Left Sidebar — Filters ─────────────────────────────────── */}
          <aside className={`lg:w-64 flex-shrink-0 ${filtersOpen ? "block" : "hidden lg:block"}`}>
            <div className="space-y-4">

              {/* Filter Header */}
              <div className="flex items-center justify-between">
                <h2 className="font-black text-slate-800 flex items-center gap-2">
                  <Filter size={16} /> Filters
                </h2>
                {hasFilters && (
                  <button onClick={clearFilters}
                    className="text-xs text-rose-500 font-bold hover:underline">
                    Clear all
                  </button>
                )}
              </div>

              {/* Category */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Category</h3>
                <div className="space-y-1">
                  {CATEGORIES.map(c => (
                    <button key={c.value} onClick={() => setCategory(c.value)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        category === c.value
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}>
                      <span>{c.emoji}</span>
                      <span className="flex-1 text-left">{c.label}</span>
                      {category === c.value && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* City */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">City</h3>
                <div className="relative mb-3">
                  <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="Type a city…"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-sm font-medium outline-none focus:ring-2 focus:ring-rose-100"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {CITIES.map(c => (
                    <button key={c} onClick={() => setCity(prev => prev === c ? "" : c)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                        city === c ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Starting Price</h3>
                <div className="space-y-1">
                  {PRICE_RANGES.map((r, i) => (
                    <button key={i} onClick={() => setPriceIdx(i)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition ${
                        priceIdx === i ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
                      }`}>
                      <span className="flex-1 text-left">{r.label}</span>
                      {priceIdx === i && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget Planner */}
              <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl p-5 border border-rose-100">
                <h3 className="text-xs font-black uppercase tracking-widest text-rose-400 mb-3 flex items-center gap-2">
                  <Calculator size={13} /> Budget Planner
                </h3>
                <label className="text-xs text-slate-500 font-semibold mb-1.5 block">
                  Total wedding budget
                </label>
                <div className="relative mb-4">
                  <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    value={budgetTotal}
                    onChange={e => setBudgetTotal(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-white border border-rose-100 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-100"
                  />
                </div>
                {budget > 0 && (
                  <div className="space-y-2">
                    {BUDGET_CATS.map(bc => (
                      <div key={bc.key} className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 font-medium flex items-center gap-1.5">
                          <span>{bc.emoji}</span> {bc.label}
                        </span>
                        <span className="font-black text-slate-800">
                          ₹{Math.round(budget * bc.pct).toLocaleString("en-IN")}
                        </span>
                      </div>
                    ))}
                    <div className="mt-3 pt-3 border-t border-rose-100 flex items-center justify-between text-xs">
                      <span className="font-black text-slate-700">Total</span>
                      <span className="font-black text-rose-600">
                        ₹{budget.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </aside>

          {/* ── Right Content ──────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3 flex-wrap">
                <button onClick={() => setFiltersOpen(p => !p)}
                  className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl border border-slate-200 text-sm font-bold text-slate-700 shadow-sm">
                  <SlidersHorizontal size={15} />
                  Filters {hasFilters && <span className="w-2 h-2 bg-rose-500 rounded-full" />}
                </button>
                <span className="text-sm text-slate-500 font-medium">
                  {isLoading ? "Loading…" : `${vendors.length} vendor${vendors.length !== 1 ? "s" : ""} found`}
                </span>
                {compareList.length > 0 && (
                  <button onClick={() => setCompareOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg hover:bg-indigo-700 transition">
                    <GitCompare size={14} /> Compare ({compareList.length})
                  </button>
                )}
              </div>

              {/* Sort */}
              <div className="relative">
                <button onClick={() => setSortOpen(p => !p)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl border border-slate-200 text-sm font-bold text-slate-700 shadow-sm hover:border-slate-300 transition">
                  <ArrowUpDown size={14} />
                  {SORT_OPTIONS.find(o => o.value === sort)?.label}
                  <ChevronDown size={14} className={`transition-transform ${sortOpen ? "rotate-180" : ""}`} />
                </button>
                {sortOpen && (
                  <div className="absolute right-0 top-12 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 w-52 z-20">
                    {SORT_OPTIONS.map(o => (
                      <button key={o.value} onClick={() => { setSort(o.value); setSortOpen(false); }}
                        className={`w-full px-4 py-2.5 text-left text-sm font-bold transition ${
                          sort === o.value ? "bg-slate-50 text-slate-900" : "text-slate-600 hover:bg-slate-50"
                        }`}>
                        {o.label} {sort === o.value && "✓"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Active filter pills */}
            {hasFilters && (
              <div className="flex flex-wrap gap-2 mb-5">
                {category && (
                  <FilterPill label={CATEGORIES.find(c => c.value === category)?.label || category}
                    onRemove={() => setCategory("")} />
                )}
                {city && <FilterPill label={`📍 ${city}`} onRemove={() => setCity("")} />}
                {search && <FilterPill label={`"${search}"`} onRemove={() => setSearch("")} />}
                {priceIdx > 0 && <FilterPill label={PRICE_RANGES[priceIdx].label} onRemove={() => setPriceIdx(0)} />}
              </div>
            )}

            {/* Category pills (horizontal scroll on mobile) */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 pb-1">
              {CATEGORIES.map(c => (
                <button key={c.value} onClick={() => setCategory(c.value)}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-black transition-all ${
                    category === c.value
                      ? "bg-slate-900 text-white shadow-lg"
                      : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                  }`}>
                  <span>{c.emoji}</span> {c.label}
                </button>
              ))}
            </div>

            {/* Vendor grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 animate-pulse">
                    <div className="h-48 bg-slate-100" />
                    <div className="p-5 space-y-3">
                      <div className="h-5 bg-slate-100 rounded-full w-3/4" />
                      <div className="h-3 bg-slate-100 rounded-full w-1/2" />
                      <div className="h-3 bg-slate-100 rounded-full w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : vendors.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-black text-slate-700 mb-2">No vendors found</h3>
                <p className="text-slate-400 text-sm mb-6">Try adjusting your filters or search terms</p>
                <button onClick={clearFilters}
                  className="px-8 py-3 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-700 transition">
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {(vendors as any[]).map(vendor => (
                  <VendorCard
                    key={vendor.id}
                    vendor={vendor}
                    isFav={favIds.has(vendor.id)}
                    onToggleFav={() => toggleFav(vendor)}
                    isComparing={compareList.some(v => v.id === vendor.id)}
                    onToggleCompare={() => toggleCompare(vendor)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Compare Drawer ─────────────────────────────────────────────────── */}
      {compareOpen && compareList.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-4xl rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white rounded-t-[2rem] z-10">
              <h2 className="text-xl font-black flex items-center gap-2">
                <GitCompare size={20} className="text-indigo-500" /> Compare Vendors
              </h2>
              <button onClick={() => setCompareOpen(false)}
                className="p-2 rounded-full bg-slate-100 text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr>
                    <td className="text-xs font-black uppercase tracking-widest text-slate-400 pb-4 pr-4 w-32" />
                    {compareList.map(v => (
                      <td key={v.id} className="pb-4 pr-4 min-w-[160px]">
                        <div className="flex items-center gap-2">
                          {v.thumbnail
                            ? <img src={absUrl(v.thumbnail)} alt="" className="w-10 h-10 rounded-xl object-cover" />
                            : <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg">🎯</div>
                          }
                          <div>
                            <p className="font-black text-slate-900 text-sm leading-tight">{v.title}</p>
                            <p className="text-[10px] text-slate-400 font-semibold">{v.city}</p>
                          </div>
                        </div>
                      </td>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {[
                    { label: "Rating",        key: (v: any) => v.avg_rating ? `${v.avg_rating} ★` : "—"      },
                    { label: "Reviews",       key: (v: any) => `${v.review_count || 0} reviews`             },
                    { label: "Portfolio",     key: (v: any) => `${v.portfolio_count || 0} photos`            },
                    { label: "Starting at",   key: (v: any) => v.starting_price
                        ? `₹${Math.round(v.starting_price).toLocaleString("en-IN")}` : "Ask for quote"      },
                    { label: "Verified",      key: (v: any) => v.is_verified ? "✅ Verified" : "Not verified" },
                    { label: "Subscription",  key: (v: any) => v.subscription_tier || "Free"                 },
                  ].map(row => (
                    <tr key={row.label}>
                      <td className="py-3 pr-4 text-xs font-black uppercase tracking-widest text-slate-400">{row.label}</td>
                      {compareList.map(v => (
                        <td key={v.id} className="py-3 pr-4 text-sm font-bold text-slate-700">{row.key(v)}</td>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <td className="py-3 pr-4" />
                    {compareList.map(v => (
                      <td key={v.id} className="py-3 pr-4">
                        <Link href={`/vendors/${v.slug}`}
                          className="inline-flex items-center gap-1 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-black hover:bg-rose-700 transition">
                          View Profile <ChevronRight size={12} />
                        </Link>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-between items-center">
              <button onClick={() => setCompareList([])}
                className="text-sm text-slate-400 font-bold hover:text-red-500 transition">
                Clear compare list
              </button>
              <button onClick={() => setCompareOpen(false)}
                className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-700 transition">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Compare FAB (mobile) ───────────────────────────────────────────── */}
      {compareList.length > 0 && !compareOpen && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <button onClick={() => setCompareOpen(true)}
            className="flex items-center gap-3 px-6 py-3.5 bg-indigo-600 text-white rounded-2xl shadow-2xl font-black text-sm hover:bg-indigo-700 transition">
            <GitCompare size={16} />
            Compare {compareList.length} vendor{compareList.length > 1 ? "s" : ""}
          </button>
        </div>
      )}

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

// ─── Vendor Card ──────────────────────────────────────────────────────────────

function VendorCard({
  vendor,
  isFav,
  onToggleFav,
  isComparing,
  onToggleCompare,
}: {
  vendor: any;
  isFav: boolean;
  onToggleFav: () => void;
  isComparing: boolean;
  onToggleCompare: () => void;
}) {
  return (
    <div className="group bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-xl hover:border-slate-200 transition-all duration-300">
      {/* Cover / Thumbnail */}
      <div className="relative h-48 overflow-hidden">
        {vendor.thumbnail ? (
          <img src={absUrl(vendor.thumbnail)} alt={vendor.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-5xl">
            {CATEGORIES.find(c => c.value === vendor.category)?.emoji || "🎯"}
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {vendor.is_verified && (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-white/95 text-emerald-600 rounded-full text-[10px] font-black shadow-md">
              <BadgeCheck size={11} /> Verified
            </span>
          )}
          {vendor.subscription_tier === "PREMIUM" && (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-400 text-white rounded-full text-[10px] font-black shadow-md">
              ⭐ Premium
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="absolute top-3 right-3 flex gap-2">
          <button onClick={e => { e.preventDefault(); onToggleFav(); }}
            className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all ${
              isFav ? "bg-rose-500 text-white" : "bg-white/90 text-slate-400 hover:text-rose-500"
            }`}>
            <Heart size={15} fill={isFav ? "currentColor" : "none"} />
          </button>
          <button onClick={e => { e.preventDefault(); onToggleCompare(); }}
            className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all ${
              isComparing ? "bg-indigo-500 text-white" : "bg-white/90 text-slate-400 hover:text-indigo-500"
            }`}>
            <GitCompare size={15} />
          </button>
        </div>

        {/* Category pill */}
        <div className="absolute bottom-3 left-3">
          <span className="px-3 py-1 bg-black/50 backdrop-blur-sm text-white text-[10px] font-black rounded-full">
            {CATEGORIES.find(c => c.value === vendor.category)?.emoji}{" "}
            {CATEGORIES.find(c => c.value === vendor.category)?.label || vendor.category}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-black text-slate-900 text-base leading-tight line-clamp-1">{vendor.title}</h3>
          {vendor.avg_rating && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <Star size={13} className="text-amber-400" fill="currentColor" />
              <span className="text-xs font-black text-slate-700">{vendor.avg_rating}</span>
            </div>
          )}
        </div>

        {vendor.city && (
          <p className="flex items-center gap-1 text-xs text-slate-400 font-medium mb-3">
            <MapPin size={11} /> {vendor.city}
          </p>
        )}

        {vendor.bio && (
          <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-4">{vendor.bio}</p>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-4 pb-4 mb-4 border-b border-slate-50 text-xs text-slate-500 font-semibold">
          {vendor.review_count > 0 && (
            <span className="flex items-center gap-1">
              <Star size={11} className="text-amber-300" fill="currentColor" />
              {vendor.review_count} review{vendor.review_count > 1 ? "s" : ""}
            </span>
          )}
          {vendor.portfolio_count > 0 && (
            <span className="flex items-center gap-1">
              <Camera size={11} className="text-indigo-300" />
              {vendor.portfolio_count} photos
            </span>
          )}
        </div>

        {/* Price + CTA */}
        <div className="flex items-center justify-between gap-3">
          <div>
            {vendor.starting_price ? (
              <>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Starting at</p>
                <p className="font-black text-slate-900 text-base">
                  ₹{Math.round(vendor.starting_price).toLocaleString("en-IN")}
                </p>
              </>
            ) : (
              <p className="text-xs text-slate-400 font-semibold">Contact for pricing</p>
            )}
          </div>
          <Link href={`/vendors/${vendor.slug}`}
            className="flex items-center gap-1 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-rose-600 transition-all hover:shadow-lg">
            View Profile <ChevronRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Filter Pill ──────────────────────────────────────────────────────────────

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-full text-xs font-bold">
      {label}
      <button onClick={onRemove} className="hover:text-rose-300 transition">
        <X size={12} />
      </button>
    </div>
  );
}
