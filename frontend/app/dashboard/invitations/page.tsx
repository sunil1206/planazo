"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Eye, Trash2, Globe, Lock,
  Heart, Sparkles, X,
  Layout, Search,
} from "lucide-react";
import { invitationApi } from "@/lib/api";
import toast from "react-hot-toast";

const THEMES = [
  { value: "royal_mughal", label: "Royal Mughal", emoji: "👑", desc: "Traditional luxury" },
  { value: "kerala_trad", label: "Kerala Traditional", emoji: "🪔", desc: "Cultural elegance" },
  { value: "modern_minimal", label: "Modern Minimal", emoji: "🤍", desc: "Clean & chic" },
  { value: "floral_pastel", label: "Floral Pastel", emoji: "🌸", desc: "Soft & romantic" },
  { value: "cinematic_dark", label: "Cinematic Dark", emoji: "🎬", desc: "Dramatic mood" },
];

const BLANK = { couple: "", bride_info: "", groom_info: "", theme: "modern_minimal" };

export default function InvitationsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [searchQuery, setSearchQuery] = useState("");

  // Safe data fetching with array validation
  const { data: invitationsData, isLoading } = useQuery<any[]>({
    queryKey: ["invitations"],
    queryFn: async () => {
      const res = await invitationApi.list();
      return Array.isArray(res) ? res : (res?.results ?? []);
    },
  });

  const invitations = Array.isArray(invitationsData) ? invitationsData : [];
  
  const filteredInvitations = invitations.filter(inv => 
    inv.couple?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const createMutation = useMutation({
    mutationFn: (data: any) => invitationApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invitations"] });
      toast.success("Invitation created!");
      setShowCreate(false);
      setForm(BLANK);
    },
    onError: () => toast.error("Failed to create invitation."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => invitationApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invitations"] });
      toast.success("Invitation deleted.");
    },
    onError: () => toast.error("Failed to delete."),
  });

  const togglePublish = useMutation({
    mutationFn: ({ id, published }: { id: number; published: boolean }) =>
      invitationApi.update(id, { is_published: published }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invitations"] }),
  });

  return (
    <div className="max-w-7xl mx-auto pb-20 p-4 md:p-0">
      {/* Dynamic Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#8B1A4A] font-bold text-[10px] uppercase tracking-[0.3em]">
            <Sparkles size={12} />
            <span>Design Studio</span>
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Invitations</h1>
          <p className="text-gray-500 text-sm md:text-base font-medium">
            Manage your digital wedding experiences.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#8B1A4A] transition-colors" size={18} />
            <input 
              type="text"
              placeholder="Search couples..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-6 py-3.5 bg-white border border-gray-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#8B1A4A]/20 focus:border-[#8B1A4A] transition-all w-full sm:w-64 shadow-sm"
            />
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="group flex items-center justify-center gap-3 bg-[#8B1A4A] text-white px-8 py-4 rounded-2xl font-bold transition-all hover:shadow-xl hover:shadow-pink-900/20 active:scale-95 whitespace-nowrap"
          >
            <Plus size={20} strokeWidth={3} className="transition-transform group-hover:rotate-90" />
            <span>Create New</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-[2.5rem] border border-gray-100 p-8 animate-pulse space-y-4">
              <div className="h-48 bg-gray-50 rounded-[2rem]" />
              <div className="h-6 bg-gray-100 rounded w-3/4" />
              <div className="h-4 bg-gray-50 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : invitations.length === 0 ? (
        <div className="bg-white rounded-[3rem] border border-dashed border-gray-200 py-32 text-center shadow-sm">
          <div className="w-24 h-24 bg-pink-50 rounded-full flex items-center justify-center text-5xl mx-auto mb-8 animate-bounce duration-1000">
            ✉️
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Your studio is quiet</h3>
          <p className="text-gray-500 max-w-sm mx-auto mb-10 leading-relaxed font-medium px-4">
            Transform your wedding into a digital masterpiece. Start by creating your first interactive invitation.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-12 py-4 rounded-2xl text-white font-black transition-all hover:scale-105 shadow-xl shadow-pink-900/20"
            style={{ background: "#8B1A4A" }}
          >
            Launch First Invite
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredInvitations.map((inv: any) => {
            const theme = THEMES.find((t) => t.value === inv.theme);
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
            
            return (
              <div key={inv.id} className="group bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm transition-all hover:shadow-2xl hover:shadow-black/5 hover:-translate-y-2">
                {/* Media Section */}
                <div className="relative h-60 bg-gray-50 overflow-hidden cursor-pointer">
                  {inv.thumbnail ? (
                    <img 
                      src={inv.thumbnail.startsWith('http') ? inv.thumbnail : `${apiUrl}${inv.thumbnail}`}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                      alt={inv.couple} 
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-pink-50 to-orange-50 text-7xl transition-transform duration-700 group-hover:scale-110">
                      {theme?.emoji || "🎴"}
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <div className="absolute top-6 right-6">
                    <span className={`text-[9px] uppercase font-black tracking-[0.2em] px-4 py-2 rounded-full shadow-lg backdrop-blur-md ${
                      inv.is_published ? "bg-emerald-500 text-white" : "bg-white/90 text-gray-500"
                    }`}>
                      {inv.is_published ? "Live" : "Draft"}
                    </span>
                  </div>
                </div>

                {/* Content Section */}
                <div className="p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div className="space-y-1">
                      <h3 className="text-xl font-black text-gray-900 tracking-tight truncate max-w-[180px]">{inv.couple}</h3>
                      <p className="text-[10px] font-black text-pink-600/60 uppercase tracking-widest">{theme?.label}</p>
                    </div>
                    <button 
                      onClick={() => { if(confirm("Delete this?")) deleteMutation.mutate(inv.id)}}
                      className="p-2 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  {/* Micro Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-8 bg-gray-50/50 p-4 rounded-3xl border border-gray-100">
                    <StatBox val={inv.views || 0} label="Views" />
                    <StatBox val={inv.rsvp_count || 0} label="RSVPs" />
                    <StatBox val={inv.wish_count || 0} label="Wishes" />
                  </div>

                  {/* Dynamic Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => togglePublish.mutate({ id: inv.id, published: !inv.is_published })}
                      className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-xs font-black transition-all ${
                        inv.is_published 
                          ? "bg-amber-50 text-amber-600 hover:bg-amber-100" 
                          : "bg-[#8B1A4A] text-white hover:shadow-lg hover:shadow-pink-900/10"
                      }`}
                    >
                      {inv.is_published ? <><Lock size={14} /> Unpublish</> : <><Globe size={14} /> Go Live</>}
                    </button>
                    <Link
                      href={`/invite/${inv.slug}`}
                      target="_blank"
                      className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-gray-100 text-gray-700 text-xs font-black hover:bg-gray-200 transition-all"
                    >
                      <Eye size={16} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Creation Modal - Redesigned for Premium Experience */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-white/20">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-10 border-b border-gray-50 bg-gray-50/30">
              <div className="space-y-1">
                <h2 className="text-3xl font-black text-gray-900 tracking-tighter">New Invitation</h2>
                <p className="text-sm font-medium text-gray-400 uppercase tracking-widest">Step 1: Basic Configuration</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="p-3 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                <X size={28} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-10 space-y-10 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {/* Couple Input */}
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.25em]">
                  <Heart size={14} className="text-pink-500" /> Couple Names
                </label>
                <input
                  value={form.couple}
                  onChange={(e) => setForm({ ...form, couple: e.target.value })}
                  placeholder="e.g. Rahul & Meera"
                  className="w-full bg-gray-50 border-none rounded-[1.5rem] px-8 py-5 text-xl font-bold placeholder:text-gray-300 focus:ring-4 focus:ring-[#8B1A4A]/10 transition-all shadow-inner"
                />
              </div>

              {/* Theme Selector */}
              <div className="space-y-5">
                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.25em]">
                  <Layout size={14} className="text-[#8B1A4A]" /> Select Design Concept
                </label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {THEMES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setForm({ ...form, theme: t.value })}
                      className={`flex flex-col items-center justify-center p-5 rounded-[2rem] border-2 transition-all duration-300 ${
                        form.theme === t.value
                          ? "border-[#8B1A4A] bg-pink-50/50 shadow-lg scale-105"
                          : "border-gray-50 bg-gray-50/50 hover:border-gray-200"
                      }`}
                    >
                      <span className="text-4xl mb-3">{t.emoji}</span>
                      <span className="text-[9px] font-black text-center leading-tight uppercase tracking-tighter text-gray-600">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Family Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                <InputField 
                  label="Groom's Parents/Details" 
                  val={form.groom_info} 
                  ph="e.g. S/O Mr. & Mrs. Malhotra"
                  onCh={(v: string) => setForm({...form, groom_info: v})}
                />
                <InputField 
                  label="Bride's Parents/Details" 
                  val={form.bride_info} 
                  ph="e.g. D/O Mr. & Mrs. Kapoor"
                  onCh={(v: string) => setForm({...form, bride_info: v})}
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-10 bg-gray-50/50 flex flex-col sm:flex-row gap-4 border-t border-gray-50">
              <button
                onClick={() => { setShowCreate(false); setForm(BLANK); }}
                className="flex-1 py-5 rounded-2xl text-gray-500 font-bold hover:bg-gray-100 transition-all order-2 sm:order-1"
              >
                Exit Studio
              </button>
              <button
                onClick={() => createMutation.mutate(form)}
                disabled={!form.couple || createMutation.isPending}
                className="flex-[2] py-5 rounded-2xl text-white font-black shadow-2xl shadow-pink-900/20 disabled:opacity-30 transition-all hover:scale-[1.02] active:scale-95 order-1 sm:order-2"
                style={{ background: "#8B1A4A" }}
              >
                {createMutation.isPending ? "Creating Canvas..." : "Launch Design"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * COMPONENT: Micro Stat Box
 */
function StatBox({ val, label }: { val: number; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center">
      <p className="text-sm font-black text-gray-900 leading-none">{val}</p>
      <span className="text-[7px] uppercase font-black text-gray-400 tracking-[0.2em] mt-1.5">{label}</span>
    </div>
  );
}

/**
 * COMPONENT: Custom Input Field
 */
function InputField({ label, val, ph, onCh }: any) {
  return (
    <div className="space-y-3 group">
      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest group-focus-within:text-[#8B1A4A] transition-colors">
        {label}
      </label>
      <input
        value={val}
        onChange={(e) => onCh(e.target.value)}
        placeholder={ph}
        className="w-full bg-white border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold placeholder:text-gray-300 focus:ring-4 focus:ring-[#8B1A4A]/5 focus:border-[#8B1A4A] transition-all shadow-sm"
      />
    </div>
  );
}