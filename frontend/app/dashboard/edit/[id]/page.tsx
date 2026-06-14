"use client";
import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { invitationApi, vendorApi, weddingVendorApi } from "@/lib/api";
import toast from "react-hot-toast";
import Link from "next/link";
import {
  ArrowLeft, Eye, Save, Plus, Clock, MapPin, Heart, Calendar,
  Upload, Share2, Link2, Copy, Check, Smartphone, Trash2,
  ChevronRight, Globe, Sparkles, Users, Image, Store, Search, X,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { id: "basic",     label: "General",    emoji: "🎴", icon: Image },
  { id: "couple",    label: "The Couple", emoji: "💑", icon: Users },
  { id: "events",    label: "Events",     emoji: "📅", icon: Calendar },
  { id: "stories",   label: "Our Story",  emoji: "💫", icon: Heart },
  { id: "countdown", label: "Date",       emoji: "⏰", icon: Clock },
  { id: "vendors",   label: "Vendors",    emoji: "🧑‍🍳", icon: Store },
  { id: "share",     label: "Publish",    emoji: "🚀", icon: Globe },
];

const THEMES = [
  { value: "royal_mughal",   label: "Royal Mughal",       emoji: "👑", color: "#8B1A4A" },
  { value: "kerala_trad",    label: "Kerala",             emoji: "🪔", color: "#D97706" },
  { value: "modern_minimal", label: "Minimal",            emoji: "🤍", color: "#6B7280" },
  { value: "floral_pastel",  label: "Floral",             emoji: "🌸", color: "#EC4899" },
  { value: "cinematic_dark", label: "Cinematic",          emoji: "🎬", color: "#1E293B" },
  { value: "luxury_wedding", label: "Luxury",             emoji: "✨", color: "#C9A84C" },
];

// ─── Root page ────────────────────────────────────────────────────────────────

export default function InvitationEditorPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [tab, setTab] = useState("basic");

  const { data: inv, isLoading } = useQuery<any>({
    queryKey: ["invitation", id],
    queryFn: () => invitationApi.get(Number(id)),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-[70vh] text-gray-400">
      <div className="text-center">
        <div className="text-5xl mb-4 animate-pulse">💍</div>
        <p className="text-sm">Loading your invitation…</p>
      </div>
    </div>
  );

  if (!inv) return (
    <div className="text-center py-20 text-gray-500">
      Invitation not found.{" "}
      <Link href="/dashboard/invites" className="text-[#8B1A4A] underline">← Back</Link>
    </div>
  );

  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const shareUrl = `${origin}/invite/${inv.slug}`;
  const previewUrl = inv.is_published ? shareUrl : `${shareUrl}?preview=${inv.gallery_token}`;

  return (
    <div className="flex flex-col h-full">
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/invites"
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">{inv.couple}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              inv.is_published ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
            }`}>
              {inv.is_published ? "🟢 Live" : "🟡 Draft"}
            </span>
          </div>
        </div>
        <Link href={previewUrl} target="_blank"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition font-medium">
          <Eye size={14} /> Open Full Preview
        </Link>
      </div>

      {/* ── Split layout: Editor LEFT · Preview RIGHT ──────────────────────── */}
      <div className="flex gap-5 flex-1 min-h-0">
        {/* LEFT — editor panel */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Tab bar */}
          <div className="flex gap-1 bg-gray-50 border border-gray-200 rounded-2xl p-1.5 mb-4 overflow-x-auto flex-shrink-0">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex-1 justify-center ${
                  tab === t.id
                    ? "bg-white shadow-sm text-[#8B1A4A] border border-gray-100"
                    : "text-gray-500 hover:text-gray-700"
                }`}>
                <span>{t.emoji}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="p-6">
              {tab === "basic"     && <BasicTab     inv={inv} qc={qc} onLiveUpdate={() => {}} />}
              {tab === "couple"    && <CoupleTab    inv={inv} qc={qc} onLiveUpdate={() => {}} />}
              {tab === "events"    && <EventsTab    inv={inv} qc={qc} onLiveUpdate={() => {}} />}
              {tab === "stories"   && <StoriesTab   inv={inv} qc={qc} onLiveUpdate={() => {}} />}
              {tab === "countdown" && <CountdownTab inv={inv} qc={qc} onLiveUpdate={() => {}} />}
              {tab === "vendors"   && <VendorsTab   inv={inv} qc={qc} />}
              {tab === "share"     && <ShareTab     inv={inv} shareUrl={shareUrl} qc={qc} />}
            </div>
          </div>
        </div>

        {/* RIGHT — Live iframe preview of the actual invitation design */}
        <div className="hidden xl:flex flex-col items-center gap-3 flex-shrink-0" style={{ width: 320 }}>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-widest">
            <Smartphone size={13} /> Live Preview
          </div>

          {/* Phone shell */}
          <div className="relative bg-gray-900 rounded-[3.5rem] p-[10px] shadow-2xl border-4 border-gray-800 flex-shrink-0">
            {/* Dynamic Island / Notch */}
            <div className="absolute top-[18px] left-1/2 -translate-x-1/2 w-24 h-6 bg-gray-900 rounded-full z-20" />

            {/* Screen — iframe scaled to phone width */}
            <div className="rounded-[2.8rem] overflow-hidden bg-white relative" style={{ width: 296, height: 560 }}>
              <iframe
                key={previewUrl}           /* re-mount on URL change */
                src={previewUrl}
                title="Invitation Preview"
                style={{
                  width: 390,              /* render at iPhone width   */
                  height: 844,             /* render at iPhone height  */
                  border: "none",
                  transform: "scale(0.76)",
                  transformOrigin: "top left",
                  pointerEvents: "none",   /* no interaction inside preview */
                }}
              />
              {/* Refresh overlay button */}
              <button
                onClick={() => {
                  const iframe = document.querySelector<HTMLIFrameElement>(".preview-iframe");
                  if (iframe) iframe.src = previewUrl;
                }}
                className="absolute bottom-3 right-3 z-10 p-2 bg-white/80 backdrop-blur rounded-full shadow border border-gray-200 hover:bg-white transition text-gray-600"
                title="Refresh preview"
              >
                <Sparkles size={14} />
              </button>
            </div>

            {/* Home bar */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-24 h-1 bg-gray-700 rounded-full" />
          </div>

          {/* Open in new tab */}
          <Link href={previewUrl} target="_blank"
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition font-medium">
            <Eye size={12} /> Open full page
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Section header helper ────────────────────────────────────────────────────

function SectionHeader({ emoji, title, subtitle }: { emoji: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3 mb-6 pb-4 border-b border-gray-100">
      <div className="text-2xl leading-none mt-0.5">{emoji}</div>
      <div>
        <h3 className="font-bold text-gray-900 text-base">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Field helpers ────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A4A]/30 focus:border-[#8B1A4A] transition bg-white";
const textareaCls = `${inputCls} resize-none`;

// ─── Save button ──────────────────────────────────────────────────────────────

function SaveBtn({ pending, label = "Save Changes" }: { pending: boolean; label?: string }) {
  return (
    <button type="submit" disabled={pending}
      className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-50 transition-all hover:shadow-lg active:scale-95"
      style={{ background: "linear-gradient(135deg, #8B1A4A 0%, #C9952A 100%)" }}>
      {pending ? (
        <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Saving…</span>
      ) : (
        <><Save size={15} />{label}</>
      )}
    </button>
  );
}

// ─── Basic Tab ────────────────────────────────────────────────────────────────

function BasicTab({ inv, qc, onLiveUpdate }: any) {
  const [form, setForm] = useState({
    couple: inv.couple || "",
    bride_info: inv.bride_info || "",
    groom_info: inv.groom_info || "",
    theme: inv.theme || "modern_minimal",
  });
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(inv.thumbnail || null);
  const [uploading, setUploading] = useState(false);
  const thumbRef = useRef<HTMLInputElement>(null);

  const f = (k: string) => (e: any) => {
    const updated = { ...form, [k]: e.target.value };
    setForm(updated);
    onLiveUpdate((prev: any) => ({ ...prev, ...updated }));
  };
  const setTheme = (v: string) => {
    setForm({ ...form, theme: v });
    onLiveUpdate((prev: any) => ({ ...prev, theme: v }));
  };

  const m = useMutation({
    mutationFn: (d: any) => invitationApi.update(inv.id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invitation", String(inv.id)] }); toast.success("General info saved! ✨"); },
    onError: () => toast.error("Save failed."),
  });

  const pickThumb = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbFile(file);
    const url = URL.createObjectURL(file);
    setThumbPreview(url);
    onLiveUpdate((prev: any) => ({ ...prev, thumbnail: url }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await m.mutateAsync(form);
    if (thumbFile) {
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("image", thumbFile);
        await invitationApi.uploadThumbnail(inv.id, fd);
        toast.success("Cover photo uploaded! 📸");
        qc.invalidateQueries({ queryKey: ["invitation", String(inv.id)] });
      } catch { toast.error("Photo upload failed."); }
      finally { setUploading(false); }
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-5 max-w-xl">
      <SectionHeader emoji="🎴" title="General Info" subtitle="Cover photo, names & theme" />

      {/* Cover photo */}
      <Field label="Cover Photo">
        <div onClick={() => thumbRef.current?.click()}
          className="relative w-full h-44 rounded-2xl border-2 border-dashed border-gray-200 overflow-hidden cursor-pointer hover:border-[#8B1A4A] transition group bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
          {thumbPreview
            ? <img src={thumbPreview} alt="Cover" className="w-full h-full object-cover" />
            : <div className="text-center text-gray-400">
                <div className="w-12 h-12 rounded-2xl bg-gray-200 flex items-center justify-center mx-auto mb-2">
                  <Upload size={20} />
                </div>
                <p className="text-sm font-medium">Click to upload cover photo</p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP • Max 20MB</p>
              </div>}
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
            <span className="text-white text-sm font-semibold bg-black/40 px-4 py-2 rounded-xl">Change Photo</span>
          </div>
        </div>
        <input ref={thumbRef} type="file" accept="image/*" className="hidden" onChange={pickThumb} />
      </Field>

      {/* Couple names */}
      <Field label="Couple Names *">
        <input value={form.couple} onChange={f("couple")} placeholder="e.g. Sunil & Priya"
          className={inputCls} required />
      </Field>

      {/* Groom / Bride info */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Groom Info">
          <input value={form.groom_info} onChange={f("groom_info")} placeholder="S/O Ramesh Kumar" className={inputCls} />
        </Field>
        <Field label="Bride Info">
          <input value={form.bride_info} onChange={f("bride_info")} placeholder="D/O Rajan Nair" className={inputCls} />
        </Field>
      </div>

      {/* Theme picker */}
      <Field label="Invitation Theme">
        <div className="grid grid-cols-5 gap-2">
          {THEMES.map((t) => (
            <button type="button" key={t.value} onClick={() => setTheme(t.value)}
              className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 text-xs font-semibold transition ${
                form.theme === t.value
                  ? "border-[#8B1A4A] bg-[#8B1A4A]/5 shadow-sm"
                  : "border-gray-200 hover:border-gray-300"
              }`}>
              <span className="text-xl">{t.emoji}</span>
              <span className="text-center leading-tight text-gray-600">{t.label}</span>
              {form.theme === t.value && (
                <div className="w-1.5 h-1.5 rounded-full bg-[#8B1A4A]" />
              )}
            </button>
          ))}
        </div>
      </Field>

      <SaveBtn pending={m.isPending || uploading} />
    </form>
  );
}

// ─── Couple Tab ───────────────────────────────────────────────────────────────

function CoupleTab({ inv, qc, onLiveUpdate }: any) {
  const bg = inv.bridegroom || {};
  const [form, setForm] = useState({
    groom_name: bg.groom_name || "",
    groom_description: bg.groom_description || "",
    groom_instagram: bg.groom_instagram || "",
    bride_name: bg.bride_name || "",
    bride_description: bg.bride_description || "",
    bride_instagram: bg.bride_instagram || "",
  });
  const [groomFile, setGroomFile] = useState<File | null>(null);
  const [brideFile, setBrideFile] = useState<File | null>(null);
  const [groomPreview, setGroomPreview] = useState<string | null>(bg.groom_photo || null);
  const [bridePreview, setBridePreview] = useState<string | null>(bg.bride_photo || null);
  const [uploading, setUploading] = useState(false);
  const groomRef = useRef<HTMLInputElement>(null);
  const brideRef = useRef<HTMLInputElement>(null);

  const f = (k: string) => (e: any) => {
    const updated = { ...form, [k]: e.target.value };
    setForm(updated);
    onLiveUpdate((prev: any) => ({ ...prev, bridegroom: { ...prev?.bridegroom, ...updated } }));
  };

  // Use patchBridegroom (handles both create & update via PATCH with JSON)
  const saveMut = useMutation({
    mutationFn: async (d: any) => {
      return await invitationApi.patchBridegroom(inv.id, d);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invitation", String(inv.id)] }); toast.success("Couple details saved! 💑"); },
    onError: () => toast.error("Save failed."),
  });

  const pickGroom = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setGroomFile(file);
    const url = URL.createObjectURL(file);
    setGroomPreview(url);
    onLiveUpdate((prev: any) => ({ ...prev, bridegroom: { ...prev?.bridegroom, groom_photo: url } }));
  };
  const pickBride = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setBrideFile(file);
    const url = URL.createObjectURL(file);
    setBridePreview(url);
    onLiveUpdate((prev: any) => ({ ...prev, bridegroom: { ...prev?.bridegroom, bride_photo: url } }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveMut.mutateAsync(form);
    if (groomFile || brideFile) {
      setUploading(true);
      try {
        const fd = new FormData();
        if (groomFile) fd.append("groom_image", groomFile);
        if (brideFile) fd.append("bride_image", brideFile);
        await invitationApi.patchBridegroom(inv.id, fd);
        toast.success("Photos uploaded! 📸");
        qc.invalidateQueries({ queryKey: ["invitation", String(inv.id)] });
      } catch { toast.error("Photo upload failed."); }
      finally { setUploading(false); }
    }
  };

  const PhotoUpload = ({ preview, inputRef, onPick, label }: any) => (
    <div>
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">{label}</label>
      <div onClick={() => inputRef.current?.click()}
        className="relative w-full h-28 rounded-2xl border-2 border-dashed border-gray-200 overflow-hidden cursor-pointer hover:border-[#8B1A4A] transition group bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        {preview
          ? <img src={preview} alt={label} className="w-full h-full object-cover" />
          : <div className="text-center text-gray-400">
              <Upload size={18} className="mx-auto mb-1" />
              <p className="text-xs font-medium">Upload photo</p>
            </div>}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
          <span className="text-white text-xs font-semibold bg-black/40 px-3 py-1.5 rounded-lg">Change</span>
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
    </div>
  );

  return (
    <form onSubmit={handleSave} className="max-w-2xl">
      <SectionHeader emoji="💑" title="The Couple" subtitle="Photos and individual profiles" />
      <div className="grid md:grid-cols-2 gap-8">
        {/* Groom */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="text-lg">🤵</div>
            <h4 className="font-bold text-gray-800">Groom</h4>
          </div>
          <PhotoUpload preview={groomPreview} inputRef={groomRef} onPick={pickGroom} label="Photo" />
          <Field label="Full Name">
            <input value={form.groom_name} onChange={f("groom_name")} placeholder="Groom's full name" className={inputCls} />
          </Field>
          <Field label="About">
            <textarea value={form.groom_description} onChange={f("groom_description")} placeholder="A short bio…" rows={3} className={textareaCls} />
          </Field>
          <Field label="Instagram URL">
            <input value={form.groom_instagram} onChange={f("groom_instagram")} placeholder="https://instagram.com/…" className={inputCls} />
          </Field>
        </div>

        {/* Bride */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="text-lg">👰</div>
            <h4 className="font-bold text-gray-800">Bride</h4>
          </div>
          <PhotoUpload preview={bridePreview} inputRef={brideRef} onPick={pickBride} label="Photo" />
          <Field label="Full Name">
            <input value={form.bride_name} onChange={f("bride_name")} placeholder="Bride's full name" className={inputCls} />
          </Field>
          <Field label="About">
            <textarea value={form.bride_description} onChange={f("bride_description")} placeholder="A short bio…" rows={3} className={textareaCls} />
          </Field>
          <Field label="Instagram URL">
            <input value={form.bride_instagram} onChange={f("bride_instagram")} placeholder="https://instagram.com/…" className={inputCls} />
          </Field>
        </div>
      </div>
      <div className="mt-6">
        <SaveBtn pending={saveMut.isPending || uploading} label="Save Couple Details" />
      </div>
    </form>
  );
}

// ─── Events Tab ───────────────────────────────────────────────────────────────

function EventsTab({ inv, qc, onLiveUpdate }: any) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", time: "", location_name: "", location_link: "", desc: "", date: "" });
  const events: any[] = inv.events || [];

  const m = useMutation({
    mutationFn: (d: any) => invitationApi.addEvent(inv.id, d),
    onSuccess: (newEvent: any) => {
      qc.invalidateQueries({ queryKey: ["invitation", String(inv.id)] });
      toast.success("Event added! 🎉");
      setShowAdd(false);
      setForm({ title: "", time: "", location_name: "", location_link: "", desc: "", date: "" });
      onLiveUpdate((prev: any) => ({ ...prev, events: [...(prev?.events || []), newEvent] }));
    },
    onError: () => toast.error("Failed to add event."),
  });

  const f = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) return;
    m.mutate(form);
  };

  return (
    <div className="max-w-xl">
      <SectionHeader emoji="📅" title="Wedding Events" subtitle="Mehendi, Sangeet, Wedding and more" />

      {/* Add form */}
      {showAdd && (
        <form onSubmit={handleAdd} className="bg-gradient-to-br from-[#8B1A4A]/5 to-[#C9952A]/5 border border-[#8B1A4A]/20 rounded-2xl p-5 mb-5 space-y-3">
          <h4 className="font-semibold text-gray-800 text-sm mb-1">New Event</h4>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Event Title *">
              <input value={form.title} onChange={f("title")} placeholder="e.g. Mehendi" className={inputCls} required />
            </Field>
            <Field label="Time">
              <input value={form.time} onChange={f("time")} placeholder="7:00 PM" className={inputCls} />
            </Field>
          </div>
          <Field label="Date & Time">
            <input type="datetime-local" value={form.date} onChange={f("date")} className={inputCls} />
          </Field>
          <Field label="Venue Name">
            <input value={form.location_name} onChange={f("location_name")} placeholder="Grand Palace Banquet" className={inputCls} />
          </Field>
          <Field label="Google Maps Link">
            <input value={form.location_link} onChange={f("location_link")} placeholder="https://maps.google.com/…" className={inputCls} />
          </Field>
          <Field label="Description">
            <textarea value={form.desc} onChange={f("desc")} placeholder="Additional details…" rows={2} className={textareaCls} />
          </Field>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={!form.title || m.isPending}
              className="px-5 py-2.5 rounded-xl text-sm text-white font-semibold disabled:opacity-50 transition"
              style={{ background: "#8B1A4A" }}>
              {m.isPending ? "Adding…" : "Add Event"}
            </button>
            <button type="button" onClick={() => setShowAdd(false)}
              className="px-5 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Events list */}
      {events.length === 0 && !showAdd ? (
        <div className="text-center py-14 text-gray-400">
          <Calendar size={36} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium text-gray-500">No events yet</p>
          <p className="text-sm text-gray-400 mt-1">Add Mehendi, Sangeet, Wedding ceremonies and more</p>
        </div>
      ) : (
        <div className="space-y-3 mb-5">
          {events.map((ev: any) => (
            <div key={ev.id} className="flex items-start gap-3 border border-gray-100 rounded-2xl p-4 hover:border-gray-200 transition">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "#8B1A4A15" }}>
                <Calendar size={16} style={{ color: "#8B1A4A" }} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 text-sm">{ev.title}</h4>
                <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-1">
                  {ev.time && <span className="flex items-center gap-1"><Clock size={11} />{ev.time}</span>}
                  {ev.location_name && <span className="flex items-center gap-1"><MapPin size={11} />{ev.location_name}</span>}
                </div>
                {ev.desc && <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{ev.desc}</p>}
                {ev.location_link && (
                  <a href={ev.location_link} target="_blank" rel="noopener"
                    className="text-xs text-blue-500 hover:underline mt-1 inline-block">📍 View on map</a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!showAdd && (
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white transition hover:shadow-lg"
          style={{ background: "linear-gradient(135deg, #8B1A4A 0%, #C9952A 100%)" }}>
          <Plus size={16} /> Add Event
        </button>
      )}
    </div>
  );
}

// ─── Stories Tab ──────────────────────────────────────────────────────────────

function StoriesTab({ inv, qc, onLiveUpdate }: any) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", desc: "", date: "" });
  const stories: any[] = inv.stories || [];

  const m = useMutation({
    mutationFn: (d: any) => invitationApi.addStory(inv.id, d),
    onSuccess: (newStory: any) => {
      qc.invalidateQueries({ queryKey: ["invitation", String(inv.id)] });
      toast.success("Story added! 💫");
      setShowAdd(false);
      setForm({ title: "", desc: "", date: "" });
      onLiveUpdate((prev: any) => ({ ...prev, stories: [...(prev?.stories || []), newStory] }));
    },
    onError: () => toast.error("Failed to add story."),
  });

  const f = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) return;
    m.mutate(form);
  };

  return (
    <div className="max-w-xl">
      <SectionHeader emoji="💫" title="Our Story" subtitle="Share the journey that brought you together" />

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-100 rounded-2xl p-5 mb-5 space-y-3">
          <h4 className="font-semibold text-gray-800 text-sm">New Story Moment</h4>
          <Field label="Title *">
            <input value={form.title} onChange={f("title")} placeholder="e.g. How We Met, The Proposal…" className={inputCls} required />
          </Field>
          <Field label="Date">
            <input type="date" value={form.date} onChange={f("date")} className={inputCls} />
          </Field>
          <Field label="Story">
            <textarea value={form.desc} onChange={f("desc")} placeholder="Tell the story behind this moment…" rows={4} className={textareaCls} />
          </Field>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={!form.title || m.isPending}
              className="px-5 py-2.5 rounded-xl text-sm text-white font-semibold disabled:opacity-50"
              style={{ background: "#8B1A4A" }}>
              {m.isPending ? "Adding…" : "Add Story"}
            </button>
            <button type="button" onClick={() => setShowAdd(false)}
              className="px-5 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
              Cancel
            </button>
          </div>
        </form>
      )}

      {stories.length === 0 && !showAdd ? (
        <div className="text-center py-14 text-gray-400">
          <Heart size={36} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium text-gray-500">No story moments yet</p>
          <p className="text-sm text-gray-400 mt-1">Share how you met, your first date, the proposal…</p>
        </div>
      ) : (
        <div className="relative mb-5">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#8B1A4A] to-[#C9952A] opacity-20 rounded-full" />
          <div className="space-y-5 pl-10">
            {stories.map((s: any, idx: number) => (
              <div key={s.id} className="relative">
                <div className="absolute -left-[2.15rem] top-1 w-3.5 h-3.5 rounded-full border-2 border-[#8B1A4A] bg-white shadow-sm" />
                <div className="bg-white border border-gray-100 rounded-2xl p-4 hover:border-gray-200 transition shadow-sm">
                  {s.date && (
                    <p className="text-xs text-gray-400 mb-1">
                      {new Date(s.date).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                  )}
                  <h4 className="font-semibold text-gray-900 text-sm">{s.title}</h4>
                  {s.desc && <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{s.desc}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!showAdd && (
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white transition hover:shadow-lg"
          style={{ background: "linear-gradient(135deg, #8B1A4A 0%, #C9952A 100%)" }}>
          <Plus size={16} /> Add Story Moment
        </button>
      )}
    </div>
  );
}

// ─── Countdown Tab ────────────────────────────────────────────────────────────

function CountdownTab({ inv, qc, onLiveUpdate }: any) {
  const ex = inv.countdown;
  const [form, setForm] = useState({
    heading: ex?.heading || "We Are Getting Married!",
    event_date: ex?.event_date ? ex.event_date.slice(0, 16) : "",
  });

  const m = useMutation({
    mutationFn: (d: any) => invitationApi.setCountdown(inv.id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invitation", String(inv.id)] });
      toast.success("Wedding date saved! 🎊");
      onLiveUpdate((prev: any) => ({ ...prev, countdown: form }));
    },
    onError: () => toast.error("Save failed."),
  });

  const weddingDate = form.event_date ? new Date(form.event_date) : null;
  const daysLeft = weddingDate ? Math.max(0, Math.ceil((weddingDate.getTime() - Date.now()) / 86400000)) : null;

  return (
    <form onSubmit={(e) => { e.preventDefault(); m.mutate(form); }} className="max-w-md">
      <SectionHeader emoji="⏰" title="Wedding Date" subtitle="Set the big day countdown" />

      <div className="space-y-4">
        <Field label="Countdown Heading">
          <input value={form.heading}
            onChange={(e) => setForm({ ...form, heading: e.target.value })}
            className={inputCls} placeholder="We Are Getting Married!" />
        </Field>

        <Field label="Wedding Date & Time *">
          <input type="datetime-local" value={form.event_date}
            onChange={(e) => setForm({ ...form, event_date: e.target.value })}
            className={inputCls} required />
        </Field>

        {weddingDate && (
          <div className="rounded-2xl overflow-hidden">
            <div className="p-4 text-center text-white"
              style={{ background: "linear-gradient(135deg, #8B1A4A 0%, #C9952A 100%)" }}>
              <p className="text-sm font-medium opacity-80 mb-1">{form.heading}</p>
              <p className="text-3xl font-bold">{daysLeft}</p>
              <p className="text-sm opacity-80">days to go</p>
              <p className="text-xs opacity-60 mt-2">
                {weddingDate.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>
        )}

        <SaveBtn pending={m.isPending} label="Save Wedding Date" />
      </div>
    </form>
  );
}

// ─── Share Tab ────────────────────────────────────────────────────────────────

function ShareTab({ inv, shareUrl, qc }: any) {
  const [copied, setCopied] = useState(false);

  const toggle = useMutation({
    mutationFn: (p: boolean) => invitationApi.update(inv.id, { is_published: p }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invitation", String(inv.id)] });
      toast.success(inv.is_published ? "Invitation unpublished." : "Invitation is now live! 🎉");
    },
    onError: () => toast.error("Failed."),
  });

  const copy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copied!");
  };

  const waText = `You're invited to the wedding of ${inv.couple}! 🎉\n\nView your invitation: ${shareUrl}`;

  const stats = [
    { label: "Views", value: inv.views || 0, icon: "👁️", color: "blue" },
    { label: "RSVPs", value: inv.rsvp_count || 0, icon: "✅", color: "green" },
    { label: "Wishes", value: inv.wish_count || 0, icon: "💌", color: "pink" },
  ];

  return (
    <div className="max-w-lg space-y-5">
      <SectionHeader emoji="🚀" title="Publish & Share" subtitle="Go live and share with your guests" />

      {/* Publish toggle card */}
      <div className={`rounded-2xl p-5 border-2 transition ${
        inv.is_published
          ? "border-green-200 bg-gradient-to-r from-green-50 to-emerald-50"
          : "border-dashed border-gray-200 bg-gray-50"
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-gray-900">
              {inv.is_published ? "🟢 Invitation is Live" : "⚪ Draft — Not Published"}
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              {inv.is_published
                ? "Guests can view and RSVP to your invitation."
                : "Publish to make it visible to your guests."}
            </p>
          </div>
          <button onClick={() => toggle.mutate(!inv.is_published)} disabled={toggle.isPending}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              inv.is_published
                ? "bg-white border border-orange-200 text-orange-600 hover:bg-orange-50"
                : "text-white hover:opacity-90"
            }`}
            style={!inv.is_published ? { background: "linear-gradient(135deg, #8B1A4A, #C9952A)" } : {}}>
            {toggle.isPending ? "…" : inv.is_published ? "Unpublish" : "Publish Now ✨"}
          </button>
        </div>
      </div>

      {/* URL copy */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
          Your Invitation URL
        </label>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 min-w-0">
            <Link2 size={14} className="text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-600 truncate">{shareUrl}</span>
          </div>
          <button onClick={copy}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition whitespace-nowrap ${
              copied ? "bg-green-100 text-green-700" : "text-white"
            }`}
            style={!copied ? { background: "#8B1A4A" } : {}}>
            {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
          </button>
        </div>
      </div>

      {/* Share buttons */}
      <div className="flex flex-wrap gap-3">
        <a href={`https://wa.me/?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-green-50 text-green-700 hover:bg-green-100 transition border border-green-200">
          💬 Share on WhatsApp
        </a>
        <Link href={`/invite/${inv.slug}`} target="_blank"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-gray-50 text-gray-700 hover:bg-gray-100 transition border border-gray-200">
          <Eye size={14} /> Open Invitation
        </Link>
      </div>

      {/* Stats */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Engagement</label>
        <div className="grid grid-cols-3 gap-3">
          {stats.map(({ label, value, icon }) => (
            <div key={label}
              className="text-center bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="text-2xl mb-1">{icon}</div>
              <div className="text-2xl font-bold text-gray-900">{value}</div>
              <div className="text-xs text-gray-500 font-medium">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Vendors Tab ──────────────────────────────────────────────────────────────

const VENDOR_CATEGORY_ICONS: Record<string, string> = {
  PHOTOGRAPHER: "📷", EVENT: "🎪", DECOR: "🌸", CATERING: "🍽️", MAKEUP: "💄", MUSIC: "🎵",
};

function VendorsTab({ inv, qc }: any) {
  const [search, setSearch]       = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults]     = useState<any[]>([]);
  const [adding, setAdding]       = useState<number | null>(null);
  const [removing, setRemoving]   = useState<number | null>(null);
  const [noteMap, setNoteMap]     = useState<Record<number, string>>({});

  // Attached vendors
  const { data: attached = [], refetch } = useQuery<any>({
    queryKey: ["wv", inv.id],
    queryFn:  () => weddingVendorApi.list(inv.id),
  });

  // Search all vendors
  const doSearch = async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const data: any = await vendorApi.list({ search: q, page_size: 12 });
      setResults(Array.isArray(data) ? data : data?.results ?? []);
    } finally { setSearching(false); }
  };

  useEffect(() => {
    const t = setTimeout(() => doSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const attachedIds = new Set((attached as any[]).map((v: any) => v.vendor_id));

  const add = async (vendor: any) => {
    setAdding(vendor.id);
    try {
      await weddingVendorApi.add(inv.id, vendor.id, noteMap[vendor.id] || "");
      refetch();
      toast.success(`${vendor.title} added to your wedding! 🎉`);
    } catch { toast.error("Failed to add vendor."); }
    finally { setAdding(null); }
  };

  const remove = async (vendorId: number) => {
    setRemoving(vendorId);
    try {
      await weddingVendorApi.remove(inv.id, vendorId);
      refetch();
      toast.success("Vendor removed.");
    } catch { toast.error("Failed to remove vendor."); }
    finally { setRemoving(null); }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <SectionHeader emoji="🧑‍🍳" title="Wedding Vendors" subtitle="Add vendors from our directory to showcase on your invitation page" />

      {/* Attached vendors */}
      {(attached as any[]).length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Your Wedding Team</p>
          <div className="space-y-2">
            {(attached as any[]).map((v: any) => (
              <div key={v.id} className="flex items-center gap-3 p-3 bg-gradient-to-r from-rose-50 to-white border border-rose-100 rounded-2xl">
                <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center">
                  {v.thumbnail
                    ? <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover" />
                    : <span className="text-lg">{VENDOR_CATEGORY_ICONS[v.category] || "🎯"}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{v.title}</p>
                  <p className="text-xs text-gray-500">{v.category_label}{v.city ? ` · ${v.city}` : ""}</p>
                  {v.service_note && <p className="text-xs text-rose-500 italic">{v.service_note}</p>}
                </div>
                <button onClick={() => remove(v.vendor_id)} disabled={removing === v.vendor_id}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition flex-shrink-0" title="Remove">
                  {removing === v.vendor_id ? "…" : <X size={14} />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
          Search & Add Vendors
        </p>
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Search by name or category…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-rose-300"
          />
        </div>

        {searching && <p className="text-xs text-gray-400 text-center py-4">Searching…</p>}

        {results.length > 0 && (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {results.map((v: any) => {
              const isAdded = attachedIds.has(v.id);
              return (
                <div key={v.id} className="border border-gray-100 rounded-xl p-3 bg-white hover:border-rose-200 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center">
                      {v.thumbnail
                        ? <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover" />
                        : <span className="text-lg">{VENDOR_CATEGORY_ICONS[v.category] || "🎯"}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{v.title}</p>
                      <p className="text-xs text-gray-400">{v.category}{v.city ? ` · ${v.city}` : ""}</p>
                    </div>
                    <button
                      onClick={() => !isAdded && add(v)}
                      disabled={isAdded || adding === v.id}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex-shrink-0 ${
                        isAdded
                          ? "bg-green-100 text-green-700 cursor-default"
                          : "text-white hover:opacity-80"
                      }`}
                      style={!isAdded ? { background: "linear-gradient(135deg,#8B1A4A,#C9952A)" } : {}}>
                      {isAdded ? "✓ Added" : adding === v.id ? "…" : "+ Add"}
                    </button>
                  </div>
                  {!isAdded && (
                    <input
                      placeholder="Service note e.g. 'Bridal Photography' (optional)"
                      value={noteMap[v.id] || ""}
                      onChange={e => setNoteMap(m => ({ ...m, [v.id]: e.target.value }))}
                      className="mt-2 w-full px-3 py-1.5 text-xs border border-gray-100 rounded-lg focus:outline-none focus:border-rose-300"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!searching && search && results.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-6">No vendors found for &ldquo;{search}&rdquo;</p>
        )}

        {!search && (attached as any[]).length === 0 && (
          <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-2xl">
            <p className="text-3xl mb-2">🔍</p>
            <p className="text-sm font-semibold text-gray-600">Search our vendor directory</p>
            <p className="text-xs text-gray-400 mt-1">Added vendors appear on your invitation page</p>
          </div>
        )}
      </div>
    </div>
  );
}
