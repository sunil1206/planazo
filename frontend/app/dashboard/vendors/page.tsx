"use client";
/**
 * /dashboard/vendors — Vendor Discovery for Dashboard Users
 * Browse all verified vendors and add them to your active wedding project.
 */

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search, Star, MapPin, BadgeCheck, Heart, Plus, Check,
  Filter, X, ChevronRight, SlidersHorizontal, Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import { vendorApi, invitationApi, weddingVendorApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const CATEGORIES = [
  { value: "",             label: "All",         emoji: "✨" },
  { value: "PHOTOGRAPHER", label: "Photography",  emoji: "📸" },
  { value: "EVENT",        label: "Event Mgmt",   emoji: "🎪" },
  { value: "DECOR",        label: "Decoration",   emoji: "🌸" },
  { value: "CATERING",     label: "Catering",     emoji: "🍽️" },
  { value: "MAKEUP",       label: "Makeup",       emoji: "💄" },
  { value: "MUSIC",        label: "DJ / Music",   emoji: "🎵" },
];

function absUrl(src?: string | null) {
  if (!src) return undefined;
  return src.startsWith("http") ? src : `${API}${src}`;
}

export default function DashboardVendorsPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const [category,  setCategory]  = useState("");
  const [search,    setSearch]    = useState("");
  const [dSearch,   setDSearch]   = useState("");
  const [favIds,    setFavIds]    = useState<Set<number>>(new Set());

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const params = useMemo<Record<string, any>>(() => {
    const p: Record<string, any> = { ordering: "-avg_rating", is_verified: true };
    if (category) p.category = category;
    if (dSearch)  p.search   = dSearch;
    return p;
  }, [category, dSearch]);

  // Vendors list
  const { data: vendorsData, isLoading } = useQuery<any>({
    queryKey:  ["dash-vendors", params],
    queryFn:   () => vendorApi.list(params),
    staleTime: 60_000,
  });
  const vendors = useMemo(
    () => Array.isArray(vendorsData) ? vendorsData : (vendorsData?.results ?? []),
    [vendorsData]
  );

  // My wedding invitations (handles both array and paginated responses)
  const { data: invitationsRaw } = useQuery<any>({
    queryKey:  ["invitations"],
    queryFn:   () => invitationApi.list(),
    staleTime: 60_000,
    retry:     false,
  });
  const invitationList: any[] = useMemo(
    () => Array.isArray(invitationsRaw) ? invitationsRaw : (invitationsRaw?.results ?? []),
    [invitationsRaw]
  );

  // My active project (first invitation, or null)
  const activeProject = invitationList[0] ?? null;

  // Fetch attached vendors for active project
  const { data: attachedVendors = [] } = useQuery<any[]>({
    queryKey: ["attached-vendors", activeProject?.id],
    queryFn:  () => activeProject ? weddingVendorApi.list(activeProject.id) as Promise<any[]> : Promise.resolve([]),
    enabled:  !!activeProject,
    retry:    false,
  });

  // Build a set of already-attached vendor IDs (useMemo avoids infinite re-render)
  const addedIds = useMemo(
    () => new Set<number>((attachedVendors as any[]).map((wv: any) => wv.vendor?.id ?? wv.vendor_id)),
    [attachedVendors]
  );

  // Favorites — query + sync to local Set via useEffect (avoids setState-in-queryFn infinite renders)
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
      setFavIds(prev => {
        const next = new Set(prev);
        wasFav ? next.add(vendor.id) : next.delete(vendor.id);
        return next;
      });
      toast.error("Could not update favorites");
    }
  };

  const addToProject = async (vendor: any) => {
    if (!activeProject) {
      toast.error("Create a wedding project first in My Weddings");
      return;
    }
    if (addedIds.has(vendor.id)) {
      toast("Already added to your project", { icon: "✅" });
      return;
    }
    try {
      await weddingVendorApi.add(activeProject.id, vendor.id);
      toast.success(`${vendor.title} added to ${activeProject.couple || "your wedding"}! 🎉`);
      qc.invalidateQueries({ queryKey: ["attached-vendors", activeProject.id] });
    } catch {
      toast.error("Could not add vendor — try again");
    }
  };

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Find Vendors</h1>
        <p className="text-sm text-gray-400 mt-1">
          Discover verified professionals and add them directly to your wedding project.
        </p>
      </div>

      {/* Active project banner */}
      {activeProject ? (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-2xl bg-rose-50 border border-rose-100">
          <span className="text-lg">💍</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-rose-800 truncate">{activeProject.couple || "Your Wedding"}</p>
            <p className="text-xs text-rose-400">Vendors you add will be saved to this project</p>
          </div>
          <Link href="/dashboard/vendor-manager"
            className="shrink-0 text-xs font-bold text-rose-600 hover:underline">
            Manage →
          </Link>
        </div>
      ) : (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-100">
          <span className="text-lg">⚠️</span>
          <p className="text-sm text-amber-700 flex-1">
            No active wedding project yet.{" "}
            <Link href="/dashboard/invites" className="font-bold underline">Create one first →</Link>
          </p>
        </div>
      )}

      {/* Search & category filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or city…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-rose-300 bg-white"
          />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 flex-wrap mb-6">
        {CATEGORIES.map(cat => (
          <button key={cat.value} onClick={() => setCategory(cat.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
              category === cat.value
                ? "bg-[#8B1A4A] text-white border-[#8B1A4A]"
                : "bg-white text-gray-600 border-gray-200 hover:border-rose-300"
            }`}>
            <span>{cat.emoji}</span> {cat.label}
          </button>
        ))}
      </div>

      {/* Vendor grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
              <div className="h-40 bg-gray-100" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : vendors.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🔍</div>
          <p className="font-semibold text-gray-700">No vendors found</p>
          <p className="text-sm text-gray-400 mt-1">Try a different category or search term</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(vendors as any[]).map(vendor => {
            const isFav   = favIds.has(vendor.id);
            const isAdded = addedIds.has(vendor.id);
            const thumb   = absUrl(vendor.thumbnail);

            return (
              <div key={vendor.id}
                className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-all">
                {/* Thumbnail */}
                <div className="relative h-40 bg-gradient-to-br from-rose-50 to-purple-50">
                  {thumb ? (
                    <img src={thumb} alt={vendor.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-4xl">
                      {CATEGORIES.find(c => c.value === vendor.category)?.emoji || "🏪"}
                    </div>
                  )}

                  {/* Favorite button */}
                  <button
                    onClick={() => toggleFav(vendor)}
                    className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center shadow transition-all ${
                      isFav ? "bg-rose-500 text-white" : "bg-white/90 text-gray-400 hover:text-rose-500"
                    }`}>
                    <Heart size={14} fill={isFav ? "currentColor" : "none"} />
                  </button>

                  {/* Verified badge */}
                  {vendor.is_verified && (
                    <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded-full text-[10px] font-bold">
                      <BadgeCheck size={10} /> Verified
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-1">{vendor.title}</h3>
                    {vendor.avg_rating && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Star size={11} className="text-amber-400 fill-amber-400" />
                        <span className="text-xs font-bold text-gray-700">{vendor.avg_rating}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-xs text-gray-400 mb-3">
                    <MapPin size={11} />
                    <span>{vendor.city}</span>
                    {vendor.category && (
                      <>
                        <span className="mx-1">·</span>
                        <span>{CATEGORIES.find(c => c.value === vendor.category)?.label || vendor.category}</span>
                      </>
                    )}
                  </div>

                  {vendor.starting_price && (
                    <p className="text-xs font-bold text-rose-700 mb-3">
                      From ₹{Number(vendor.starting_price).toLocaleString("en-IN")}
                    </p>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => addToProject(vendor)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition ${
                        isAdded
                          ? "bg-green-50 text-green-600 border border-green-200"
                          : "bg-[#8B1A4A] text-white hover:opacity-90"
                      }`}>
                      {isAdded ? (
                        <><Check size={13} /> Added</>
                      ) : (
                        <><Plus size={13} /> Add to Project</>
                      )}
                    </button>
                    <Link href={`/vendors/${vendor.slug}`}
                      className="px-3 py-2 rounded-xl text-xs font-bold text-gray-600 border border-gray-200 hover:bg-gray-50 transition">
                      View
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer link */}
      <div className="mt-8 text-center">
        <Link href="/vendors"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#8B1A4A] hover:underline">
          <Sparkles size={14} /> Browse full vendor directory
          <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
}
