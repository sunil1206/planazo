"use client";
/**
 * /dashboard/invites  — Manage wedding invitation websites
 * List · Create · Edit · Publish · Delete
 */
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { invitationApi } from "@/lib/api";
import toast from "react-hot-toast";

const THEMES = [
  { value: "royal_mughal",   label: "Royal Mughal",       emoji: "👑", desc: "Burgundy & Gold, arch borders" },
  { value: "kerala_trad",    label: "Kerala Traditional", emoji: "🌿", desc: "Kasavu border, red & gold" },
  { value: "modern_minimal", label: "Modern Minimal",     emoji: "✨", desc: "Clean & contemporary" },
  { value: "floral_pastel",  label: "Floral Pastel",      emoji: "🌸", desc: "Pink, lavender, dreamy" },
  { value: "cinematic_dark", label: "Cinematic Dark",     emoji: "🎬", desc: "Black & gold, movie-poster" },
];

interface Invitation {
  id: number;
  couple: string;
  slug: string;
  theme: string;
  is_published: boolean;
  views: number;
  gallery_token: string;
  created_at: string;
}

export default function InvitationsPage() {
  const router = useRouter();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showCreate, setShowCreate]   = useState(false);
  const [creating, setCreating]       = useState(false);
  const [deleteId, setDeleteId]       = useState<number | null>(null);
  const [form, setForm] = useState({
    couple:     "",
    groom_info: "",
    bride_info: "",
    theme:      "royal_mughal",
  });

  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");

  const load = async () => {
    setLoading(true);
    try {
      const data: any = await invitationApi.list();
      const list = Array.isArray(data) ? data : (data?.results ?? []);
      setInvitations(list);
    } catch {
      setInvitations([]); // show empty state — no toast, no crash
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const inv: any = await invitationApi.create(form);
      toast.success("Invitation created!");
      setShowCreate(false);
      setForm({ couple: "", groom_info: "", bride_info: "", theme: "royal_mughal" });
      router.push(`/dashboard/edit/${inv.id}`);
    } catch {
      toast.error("Failed to create invitation.");
    } finally {
      setCreating(false);
    }
  };

  const togglePublish = async (inv: Invitation) => {
    try {
      await invitationApi.update(inv.id, { is_published: !inv.is_published });
      setInvitations((prev) =>
        prev.map((i) => i.id === inv.id ? { ...i, is_published: !i.is_published } : i)
      );
      toast.success(inv.is_published ? "Unpublished" : "Published! Guests can now view.");
    } catch { toast.error("Failed to update."); }
  };

  const deleteInvitation = async (id: number) => {
    try {
      await invitationApi.delete(id);
      setInvitations((prev) => prev.filter((i) => i.id !== id));
      setDeleteId(null);
      toast.success("Invitation deleted.");
    } catch { toast.error("Failed to delete."); }
  };

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`${SITE_URL}/invite/${slug}`);
    toast.success("Link copied to clipboard!");
  };

  const themeInfo = (value: string) => THEMES.find((t) => t.value === value) || THEMES[0];

  return (
    <div className="min-h-screen p-6" style={{ background: "#F8F5F0" }}>
      {/* ── Header ──────────────────────────────── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-light" style={{ color: "#0D1B2A" }}>
            Wedding Invitations
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Create beautiful digital invitations for your wedding
          </p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white shadow-sm"
          style={{ background: "#8B1A4A" }}>
          + New Invitation
        </button>
      </div>

      {/* ── Grid ────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 animate-pulse">
              <div className="h-32 bg-gray-200 rounded-xl mb-4" />
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : invitations.length === 0 ? (
        <div className="text-center py-24">
          <div className="text-6xl mb-4">💌</div>
          <h3 className="text-xl font-light text-gray-500 mb-2">No invitations yet</h3>
          <p className="text-sm text-gray-400 mb-6">
            Create your first digital wedding invitation
          </p>
          <button onClick={() => setShowCreate(true)}
            className="px-6 py-3 rounded-xl text-sm font-medium text-white"
            style={{ background: "#8B1A4A" }}>
            Create Invitation
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {invitations.map((inv) => {
            const t = themeInfo(inv.theme);
            return (
              <div key={inv.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                {/* Theme preview banner */}
                <div className="h-28 flex items-center justify-center relative"
                  style={{
                    background:
                      inv.theme === "cinematic_dark"   ? "#0C0C0C" :
                      inv.theme === "royal_mughal"      ? "linear-gradient(135deg,#5C0F2A,#8B1A4A)" :
                      inv.theme === "kerala_trad"       ? "linear-gradient(135deg,#7B1C1C,#9B1C1C)" :
                      inv.theme === "floral_pastel"     ? "linear-gradient(135deg,#FEF0F3,#F5F2FF)" :
                                                         "linear-gradient(135deg,#F8F8F8,#E8E8E8)",
                  }}>
                  <span className="text-4xl">{t.emoji}</span>
                  <span className={
                    "absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-medium " +
                    (inv.is_published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")
                  }>
                    {inv.is_published ? "● Live" : "○ Draft"}
                  </span>
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 text-base mb-0.5 truncate">
                    {inv.couple}
                  </h3>
                  <p className="text-xs text-gray-400 mb-3">
                    {t.label} · {inv.views} views ·{" "}
                    {new Date(inv.created_at).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </p>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2">
                    {/* Edit */}
                    <Link href={`/dashboard/edit/${inv.id}`}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                      style={{ background: "#8B1A4A" }}>
                      ✏️ Edit
                    </Link>

                    {/* Preview */}
                    <Link href={`/invite/${inv.slug}`} target="_blank"
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50">
                      👁️ Preview
                    </Link>

                    {/* Publish / Unpublish */}
                    <button onClick={() => togglePublish(inv)}
                      className={
                        "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors " +
                        (inv.is_published
                          ? "border-orange-200 text-orange-600 hover:bg-orange-50"
                          : "border-green-200 text-green-600 hover:bg-green-50")
                      }>
                      {inv.is_published ? "📤 Unpublish" : "🚀 Publish"}
                    </button>

                    {/* Copy link (only when published) */}
                    {inv.is_published && (
                      <button onClick={() => copyLink(inv.slug)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-blue-200 text-blue-600 hover:bg-blue-50">
                        🔗 Copy Link
                      </button>
                    )}

                    {/* Delete */}
                    <button onClick={() => setDeleteId(inv.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-100 text-red-400 hover:bg-red-50">
                      🗑️
                    </button>
                  </div>

                  {/* Gallery token */}
                  {inv.gallery_token && (
                    <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-400">Photographer Code</p>
                        <p className="text-sm font-mono font-bold tracking-widest text-gray-700">
                          {inv.gallery_token}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(inv.gallery_token);
                          toast.success("Gallery code copied!");
                        }}
                        className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
                        Copy
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create Modal ──────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 overflow-y-auto"
          onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl my-8"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Create New Invitation</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={createInvitation} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">
                  Couple Name *
                </label>
                <input required
                  value={form.couple}
                  onChange={(e) => setForm({ ...form, couple: e.target.value })}
                  placeholder="e.g. Priya & Arjun"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#8B1A4A]" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Groom's Name</label>
                  <input value={form.groom_info}
                    onChange={(e) => setForm({ ...form, groom_info: e.target.value })}
                    placeholder="Arjun"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#8B1A4A]" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Bride's Name</label>
                  <input value={form.bride_info}
                    onChange={(e) => setForm({ ...form, bride_info: e.target.value })}
                    placeholder="Priya"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#8B1A4A]" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 block mb-2">Choose a Theme *</label>
                <div className="space-y-2">
                  {THEMES.map((t) => (
                    <label key={t.value}
                      className={
                        "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all " +
                        (form.theme === t.value
                          ? "border-[#8B1A4A] bg-rose-50"
                          : "border-gray-200 hover:border-gray-300")
                      }>
                      <input type="radio" name="theme" value={t.value} className="hidden"
                        checked={form.theme === t.value}
                        onChange={(e) => setForm({ ...form, theme: e.target.value })} />
                      <span className="text-2xl">{t.emoji}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{t.label}</p>
                        <p className="text-xs text-gray-400">{t.desc}</p>
                      </div>
                      {form.theme === t.value && (
                        <span className="text-[#8B1A4A]">✓</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-500 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-60"
                  style={{ background: "#8B1A4A" }}>
                  {creating ? "Creating..." : "Create & Edit →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ────────────────────────── */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setDeleteId(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="text-3xl text-center mb-3">⚠️</div>
            <h3 className="font-semibold text-center text-gray-800 mb-2">Delete Invitation?</h3>
            <p className="text-sm text-gray-500 text-center mb-5">
              This will permanently remove the invitation and all its data. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-500 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={() => deleteInvitation(deleteId)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-600">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
