"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  Eye,
  Trophy,
  Users,
  Zap,
  ExternalLink,
  ChevronRight,
  Sparkles,
  ArrowUpRight
} from "lucide-react";
import { invitationApi, paymentApi } from "@/lib/api";

export default function OverviewPage() {
  // Fetch Invitations with safe fallback
  const { data: invitationsData, isLoading: isInvitesLoading } = useQuery<any[]>({
    queryKey: ["invitations"],
    queryFn: async () => {
      try {
        const res = await invitationApi.list();
        return Array.isArray(res) ? res : (res?.results ?? []);
      } catch {
        return [];
      }
    },
  });

  const invitations: any[] = Array.isArray(invitationsData) ? invitationsData : [];

  // Fetch Subscription
  const { data: subscription } = useQuery<any>({
    queryKey: ["subscription"],
    queryFn: async () => {
      try { return await paymentApi.status(); }
      catch { return { plan: "FREE" }; }
    },
  });

  const totalViews = invitations.reduce((acc, curr) => acc + (Number(curr.views) || 0), 0);
  const publishedCount = invitations.filter(i => i.is_published).length;

  // Loading Skeleton
  if (isInvitesLoading) {
    return (
      <div className="space-y-8 animate-pulse p-4">
        <div className="h-20 bg-gray-100 rounded-3xl w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-50 rounded-3xl" />
          ))}
        </div>
        <div className="h-64 bg-gray-50 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 p-4 md:p-0">
      {/* Hero Header Section */}
      <header className="relative overflow-hidden bg-[#8B1A4A] rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl shadow-pink-900/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-pink-200 font-medium tracking-wide text-xs uppercase">
              <Sparkles size={14} />
              <span>Welcome back to Planazo</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Your Wedding Space</h1>
            <p className="text-pink-100/80 max-w-md text-sm md:text-base leading-relaxed">
              Create magic for your special day. Manage your digital experiences and track guest engagement in real-time.
            </p>
          </div>
          <Link
            href="/dashboard/invitations"
            className="group flex items-center justify-center gap-2 bg-white text-[#8B1A4A] px-8 py-4 rounded-2xl font-bold transition-all hover:bg-pink-50 hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-black/10 w-full md:w-auto"
          >
            <Plus size={20} strokeWidth={3} className="transition-transform group-hover:rotate-90" />
            <span>Create New Event</span>
          </Link>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-pink-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-pink-600/20 rounded-full blur-3xl" />
      </header>

      {/* Modern Stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
          label="Active Events" 
          value={invitations.length} 
          subValue={`${publishedCount} Published`}
          icon={<Trophy className="text-amber-600" size={24} />}
          gradient="from-amber-50 to-orange-50"
          iconBg="bg-amber-100"
        />
        <StatCard 
          label="Experience Views" 
          value={totalViews.toLocaleString()} 
          subValue="Real-time tracking"
          icon={<Users className="text-blue-600" size={24} />}
          gradient="from-blue-50 to-indigo-50"
          iconBg="bg-blue-100"
        />
        <StatCard 
          label="Current Membership" 
          value={(subscription as any)?.plan || "FREE"} 
          subValue="Standard Access"
          icon={<Zap className="text-pink-600" size={24} />}
          gradient="from-pink-50 to-rose-50"
          iconBg="bg-pink-100"
        />
      </section>

      {/* Main Content Area */}
      <section className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Recent Invitations</h2>
          <Link href="/dashboard/invitations" className="text-sm font-semibold text-[#8B1A4A] hover:underline flex items-center gap-1">
            View All <ChevronRight size={16} />
          </Link>
        </div>

        {invitations.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="divide-y divide-gray-50">
            {invitations.slice(0, 5).map((inv: any) => (
              <InvitationRow key={inv.id} inv={inv} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, subValue, icon, gradient, iconBg }: any) {
  return (
    <div className={`bg-gradient-to-br ${gradient} rounded-[2rem] p-8 border border-white/50 shadow-sm transition-all hover:shadow-md hover:-translate-y-1`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-black text-gray-900">{value}</p>
          <p className="text-xs font-semibold text-gray-400">{subValue}</p>
        </div>
        <div className={`${iconBg} p-4 rounded-2xl shadow-inner`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function InvitationRow({ inv }: { inv: any }) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  
  return (
    <div className="group flex flex-col sm:flex-row sm:items-center gap-4 px-8 py-6 transition-all hover:bg-gray-50/50">
      {/* Thumbnail */}
      <div className="relative w-full sm:w-16 h-32 sm:h-16 rounded-2xl bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200/50">
        {inv.thumbnail ? (
          <img 
            src={inv.thumbnail.startsWith('http') ? inv.thumbnail : `${apiUrl}${inv.thumbnail}`} 
            className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" 
            alt={inv.couple} 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-pink-50 text-[#8B1A4A]">
            <Trophy size={24} />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-gray-900 text-lg truncate">{inv.couple}</h3>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tight ${
            inv.is_published ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
          }`}>
            {inv.is_published ? "Live" : "Draft"}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-sm font-medium text-gray-400 capitalize">{inv.theme} Theme</span>
          <span className="w-1 h-1 rounded-full bg-gray-300" />
          <span className="text-sm font-medium text-gray-400">{inv.views.toLocaleString()} engagements</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Link 
          href={`/invite/${inv.slug}`} 
          target="_blank"
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm font-bold hover:border-[#8B1A4A] hover:text-[#8B1A4A] transition-all shadow-sm"
        >
          <Eye size={16} />
          <span>Preview</span>
          <ArrowUpRight size={14} className="text-gray-400" />
        </Link>
        <button className="p-2.5 rounded-xl bg-gray-50 text-gray-400 hover:text-gray-900 transition-all">
          <ExternalLink size={18} />
        </button>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20 px-8">
      <div className="relative inline-block mb-6">
        <div className="w-24 h-24 bg-pink-50 rounded-full flex items-center justify-center text-5xl">
          ✨
        </div>
        <div className="absolute -bottom-2 -right-2 bg-white p-2 rounded-xl shadow-lg">
          <Plus size={24} className="text-[#8B1A4A]" />
        </div>
      </div>
      <h3 className="text-xl font-bold text-gray-900">Your journey starts here</h3>
      <p className="text-gray-500 mt-2 max-w-xs mx-auto text-sm leading-relaxed">
        Start by creating your first digital invitation. It only takes a few minutes to make something beautiful.
      </p>
      <Link 
        href="/dashboard/invitations"
        className="mt-8 inline-flex items-center gap-2 bg-[#8B1A4A] text-white px-8 py-4 rounded-2xl font-bold transition-all hover:scale-105 active:scale-95 shadow-xl shadow-pink-900/10"
      >
        <Plus size={18} /> Start Creating
      </Link>
    </div>
  );
}