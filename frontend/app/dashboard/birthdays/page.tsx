"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { birthdayApi } from "@/lib/api";

const THEMES = [
  { id: "star_gold",       label: "Star Gold",       emoji: "⭐", bg: "#0A0A0A", accent: "#C9952A" },
  { id: "balloon_bash",    label: "Balloon Bash",    emoji: "🎈", bg: "#FFFEF0", accent: "#FF6B6B" },
  { id: "floral_birthday", label: "Floral Birthday", emoji: "🌸", bg: "#FFF0F3", accent: "#C9527A" },
  { id: "kids_party",      label: "Kids Party",      emoji: "🎊", bg: "#FFFBF0", accent: "#FF6348" },
  { id: "cinematic_dark",  label: "Cinematic Dark",  emoji: "🎬", bg: "#0C0C0C", accent: "#9B59B6" },
];

interface BirthdayPage {
  id: number; celebrant: string; title: string; slug: string;
  theme: string; date?: string; is_published: boolean;
  wish_count: number; rsvp_count: number;
}

export default function BirthdaysDashboard() {
  const [pages,    setPages]    = useState<BirthdayPage[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [creating, setCreating] = useState(false);
  const [newPage,  setNewPage]  = useState({ title: "", celebrant: "", theme: "star_gold", date: "" });

  const load = () => {
    birthdayApi.list()
      .then((d: any) => setPages(Array.isArray(d) ? d : d.results || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await birthdayApi.create(newPage);
      setCreating(false);
      setNewPage({ title: "", celebrant: "", theme: "star_gold", date: "" });
      load();
    } catch (err: any) {
      alert(err?.message || "Failed to create.");
    }
  };

  const publish = async (page: BirthdayPage) => {
    await birthdayApi.publish(page.id);
    load();
  };

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/birthday/${slug}`);
  };

  const del = async (id: number) => {
    if (!confirm("Delete this birthday page?")) return;
    await birthdayApi.delete(id);
    load();
  };

  return (
    <div className="min-h-screen p-6" style={{ background: "#F8F9FA" }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">🎂 Birthday Pages</h1>
            <p className="text-gray-400 text-sm mt-1">Create and manage birthday celebration pages</p>
          </div>
          <button onClick={() => setCreating(true)}
            className="px-5 py-2.5 rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
            style={{ background: "linear-gradient(135deg, #9B59B6, #C9952A)" }}>
            + New Birthday Page
          </button>
        </div>

        {/* Create Modal */}
        {creating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Create Birthday Page</h2>
              <form onSubmit={create} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Who's the birthday star? *</label>
                  <input required placeholder="e.g. Rahul Kumar" value={newPage.celebrant}
                    onChange={e => setNewPage(p => ({ ...p, celebrant: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-purple-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Page Title *</label>
                  <input required placeholder="e.g. Rahul's 30th Birthday Bash" value={newPage.title}
                    onChange={e => setNewPage(p => ({ ...p, title: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-purple-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Birthday Date</label>
                  <input type="date" value={newPage.date}
                    onChange={e => setNewPage(p => ({ ...p, date: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-purple-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-2 block">Choose Template</label>
                  <div className="grid grid-cols-5 gap-2">
                    {THEMES.map(t => (
                      <button key={t.id} type="button"
                        onClick={() => setNewPage(p => ({ ...p, theme: t.id }))}
                        className={`p-3 rounded-xl text-center transition-all border-2 ${newPage.theme === t.id ? "border-purple-500" : "border-transparent"}`}
                        style={{ background: t.bg }}>
                        <div className="text-2xl">{t.emoji}</div>
                        <p className="text-[9px] mt-1 font-medium" style={{ color: t.accent }}>{t.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setCreating(false)}
                    className="flex-1 py-3 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                    Cancel
                  </button>
                  <button type="submit"
                    className="flex-1 py-3 rounded-xl text-white font-medium text-sm"
                    style={{ background: "linear-gradient(135deg, #9B59B6, #C9952A)" }}>
                    Create 🎉
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Pages grid */}
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading…</div>
        ) : pages.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎂</div>
            <p className="text-gray-500 mb-4">No birthday pages yet.</p>
            <button onClick={() => setCreating(true)}
              className="px-6 py-3 rounded-xl text-white font-medium"
              style={{ background: "#9B59B6" }}>
              Create your first birthday page
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pages.map(page => {
              const theme = THEMES.find(t => t.id === page.theme) || THEMES[0];
              return (
                <div key={page.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col">
                  {/* Theme preview header */}
                  <div className="h-28 flex flex-col items-center justify-center relative"
                    style={{ background: theme.bg }}>
                    <div className="text-4xl mb-1">{theme.emoji}</div>
                    <p className="text-xs font-medium" style={{ color: theme.accent }}>{theme.label}</p>
                    {page.is_published && (
                      <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs text-white font-medium"
                        style={{ background: "#10B981" }}>Live</span>
                    )}
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-semibold text-gray-800 text-lg">{page.celebrant}</h3>
                    <p className="text-sm text-gray-400 mb-1">{page.title}</p>
                    {page.date && <p className="text-xs text-gray-400 mb-3">🗓 {new Date(page.date).toLocaleDateString("en-IN",{month:"long",day:"numeric",year:"numeric"})}</p>}

                    <div className="flex gap-4 text-xs text-gray-400 mb-4">
                      <span>💌 {page.wish_count} wishes</span>
                      <span>✅ {page.rsvp_count} RSVPs</span>
                    </div>

                    <div className="flex gap-2 flex-wrap mt-auto">
                      <Link href={`/dashboard/birthdays/edit/${page.id}`}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100">
                        ✏️ Edit
                      </Link>
                      {page.is_published && (
                        <a href={`/birthday/${page.slug}`} target="_blank" rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100">
                          👁 Preview
                        </a>
                      )}
                      <button onClick={() => publish(page)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${page.is_published ? "bg-red-50 text-red-500 border-red-100" : "bg-green-50 text-green-600 border-green-100"}`}>
                        {page.is_published ? "Unpublish" : "🚀 Publish"}
                      </button>
                      {page.is_published && (
                        <button onClick={() => copyLink(page.slug)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-50 text-purple-600 border border-purple-100">
                          🔗 Copy Link
                        </button>
                      )}
                      <button onClick={() => del(page.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-400 border border-red-100">
                        🗑 Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
