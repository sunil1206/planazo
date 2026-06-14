"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { birthdayApi } from "@/lib/api";

const TABS = ["Basic Info", "Events", "Stories", "Countdown", "Wishes", "RSVPs"] as const;
type Tab = typeof TABS[number];

export default function BirthdayEditPage() {
  const params = useParams();
  const router = useRouter();
  const id     = Number(params?.id);

  const [tab,     setTab]     = useState<Tab>("Basic Info");
  const [page,    setPage]    = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    birthdayApi.get(id)
      .then((d: any) => { setPage(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const save = async () => {
    if (!page) return;
    setSaving(true);
    try {
      await birthdayApi.update(id, {
        title: page.title, celebrant: page.celebrant, theme: page.theme,
        date: page.date, time: page.time, venue: page.venue,
        venue_map: page.venue_map, description: page.description,
      });
      alert("Saved!");
    } catch { alert("Save failed."); }
    setSaving(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-purple-400 text-4xl animate-pulse">🎂</div>;
  if (!page)   return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Page not found.</p></div>;

  return (
    <div className="min-h-screen" style={{ background: "#F8F9FA" }}>
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/birthdays" className="text-gray-400 hover:text-gray-700 text-sm">← Back</Link>
          <span className="text-gray-300">|</span>
          <h1 className="font-semibold text-gray-800">{page.celebrant}'s Birthday</h1>
          {page.is_published && (
            <span className="px-2 py-0.5 rounded-full text-xs text-white font-medium" style={{ background: "#10B981" }}>Live</span>
          )}
        </div>
        <div className="flex gap-3">
          {page.is_published && (
            <a href={`/birthday/${page.slug}`} target="_blank" rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50">
              Preview ↗
            </a>
          )}
          <button onClick={save} disabled={saving}
            className="px-5 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #9B59B6, #C9952A)" }}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 px-6">
        <div className="flex gap-0 max-w-5xl mx-auto">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t ? "border-purple-500 text-purple-600" : "border-transparent text-gray-400 hover:text-gray-600"
              }`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {tab === "Basic Info" && <BasicInfoTab page={page} setPage={setPage} />}
        {tab === "Events"     && <EventsTab id={id} />}
        {tab === "Stories"    && <StoriesTab id={id} />}
        {tab === "Countdown"  && <CountdownTab id={id} page={page} />}
        {tab === "Wishes"     && <WishesTab id={id} />}
        {tab === "RSVPs"      && <RSVPsTab id={id} />}
      </div>
    </div>
  );
}

// ── Basic Info ─────────────────────────────────────────────────────────────────

function BasicInfoTab({ page, setPage }: { page: any; setPage: any }) {
  const THEMES = [
    { id: "star_gold", label: "Star Gold", emoji: "⭐" },
    { id: "balloon_bash", label: "Balloon Bash", emoji: "🎈" },
    { id: "floral_birthday", label: "Floral", emoji: "🌸" },
    { id: "kids_party", label: "Kids Party", emoji: "🎊" },
    { id: "cinematic_dark", label: "Cinematic", emoji: "🎬" },
  ];

  const inp = "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-purple-400 bg-white";

  return (
    <div className="max-w-2xl space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Celebrant Name *</label>
          <input className={inp} value={page.celebrant || ""}
            onChange={e => setPage((p: any) => ({ ...p, celebrant: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Page Title *</label>
          <input className={inp} value={page.title || ""}
            onChange={e => setPage((p: any) => ({ ...p, title: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Birthday Date</label>
          <input type="date" className={inp} value={page.date || ""}
            onChange={e => setPage((p: any) => ({ ...p, date: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Party Time</label>
          <input type="time" className={inp} value={page.time || ""}
            onChange={e => setPage((p: any) => ({ ...p, time: e.target.value }))} />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-500 mb-1 block">Venue</label>
          <input className={inp} placeholder="e.g. Grand Palace Banquet, Mumbai"
            value={page.venue || ""} onChange={e => setPage((p: any) => ({ ...p, venue: e.target.value }))} />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-500 mb-1 block">Venue Map URL</label>
          <input type="url" className={inp} placeholder="https://maps.google.com/..."
            value={page.venue_map || ""} onChange={e => setPage((p: any) => ({ ...p, venue_map: e.target.value }))} />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-500 mb-1 block">Description</label>
          <textarea rows={4} className={inp} placeholder="Tell guests about this celebration…"
            value={page.description || ""} onChange={e => setPage((p: any) => ({ ...p, description: e.target.value }))} />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500 mb-3 block">Template</label>
        <div className="grid grid-cols-5 gap-3">
          {THEMES.map(t => (
            <button key={t.id} type="button"
              onClick={() => setPage((p: any) => ({ ...p, theme: t.id }))}
              className={`p-3 rounded-xl text-center border-2 transition-all ${
                page.theme === t.id ? "border-purple-500 bg-purple-50" : "border-gray-100 bg-gray-50 hover:bg-gray-100"
              }`}>
              <div className="text-2xl">{t.emoji}</div>
              <p className="text-[10px] mt-1 font-medium text-gray-600">{t.label}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Events Tab ─────────────────────────────────────────────────────────────────

function EventsTab({ id }: { id: number }) {
  const [events,  setEvents]  = useState<any[]>([]);
  const [form,    setForm]    = useState({ title: "", date: "", time: "", venue: "", description: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    birthdayApi.getEvents(id)
      .then((d: any) => setEvents(Array.isArray(d) ? d : d.results || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    await birthdayApi.addEvent(id, form);
    setForm({ title: "", date: "", time: "", venue: "", description: "" });
    const d: any = await birthdayApi.getEvents(id);
    setEvents(Array.isArray(d) ? d : d.results || []);
  };

  const inp = "w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-purple-400 bg-white";

  return (
    <div className="max-w-2xl space-y-6">
      <form onSubmit={add} className="bg-white rounded-2xl p-6 border border-gray-100 space-y-3">
        <h3 className="font-semibold text-gray-700">Add Event</h3>
        <input required placeholder="Event title" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} className={inp} />
        <div className="grid grid-cols-2 gap-3">
          <input required type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} className={inp} />
          <input type="time" value={form.time} onChange={e=>setForm(f=>({...f,time:e.target.value}))} className={inp} />
        </div>
        <input placeholder="Venue" value={form.venue} onChange={e=>setForm(f=>({...f,venue:e.target.value}))} className={inp} />
        <textarea rows={2} placeholder="Description" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} className={inp} />
        <button type="submit" className="px-4 py-2 rounded-xl text-white text-sm font-medium" style={{ background: "#9B59B6" }}>
          Add Event
        </button>
      </form>
      {loading ? <p className="text-gray-400 text-sm">Loading…</p> : (
        <div className="space-y-3">
          {events.map((e: any) => (
            <div key={e.id} className="bg-white p-4 rounded-xl border border-gray-100">
              <p className="font-medium text-gray-800">{e.title}</p>
              <p className="text-xs text-gray-400">{e.date} {e.time && `· ${e.time}`} {e.venue && `· ${e.venue}`}</p>
            </div>
          ))}
          {events.length === 0 && <p className="text-gray-400 text-sm">No events yet.</p>}
        </div>
      )}
    </div>
  );
}

// ── Stories Tab ─────────────────────────────────────────────────────────────────

function StoriesTab({ id }: { id: number }) {
  const [stories, setStories] = useState<any[]>([]);
  const [form,    setForm]    = useState({ heading: "", body: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    birthdayApi.getStories(id)
      .then((d: any) => setStories(Array.isArray(d) ? d : d.results || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    await birthdayApi.addStory(id, form);
    setForm({ heading: "", body: "" });
    const d: any = await birthdayApi.getStories(id);
    setStories(Array.isArray(d) ? d : d.results || []);
  };

  const inp = "w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-purple-400 bg-white";

  return (
    <div className="max-w-2xl space-y-6">
      <form onSubmit={add} className="bg-white rounded-2xl p-6 border border-gray-100 space-y-3">
        <h3 className="font-semibold text-gray-700">Add Story / Memory</h3>
        <input required placeholder="Heading" value={form.heading} onChange={e=>setForm(f=>({...f,heading:e.target.value}))} className={inp} />
        <textarea required rows={4} placeholder="Tell the story…" value={form.body} onChange={e=>setForm(f=>({...f,body:e.target.value}))} className={inp} />
        <button type="submit" className="px-4 py-2 rounded-xl text-white text-sm font-medium" style={{ background: "#9B59B6" }}>
          Add Story
        </button>
      </form>
      <div className="space-y-3">
        {stories.map((s: any) => (
          <div key={s.id} className="bg-white p-4 rounded-xl border border-gray-100">
            <p className="font-medium text-gray-800">{s.heading}</p>
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{s.body}</p>
          </div>
        ))}
        {!loading && stories.length === 0 && <p className="text-gray-400 text-sm">No stories yet.</p>}
      </div>
    </div>
  );
}

// ── Countdown Tab ──────────────────────────────────────────────────────────────

function CountdownTab({ id, page }: { id: number; page: any }) {
  const [form, setForm] = useState({ target_date: "", label: "until the party!" });
  const [saved, setSaved] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    await birthdayApi.setCountdown(id, form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inp = "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-purple-400 bg-white";

  return (
    <div className="max-w-md">
      <form onSubmit={save} className="bg-white rounded-2xl p-6 border border-gray-100 space-y-4">
        <h3 className="font-semibold text-gray-700">Countdown Timer</h3>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Target Date & Time</label>
          <input required type="datetime-local" className={inp} value={form.target_date}
            onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Label (shown below timer)</label>
          <input className={inp} value={form.label}
            onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
        </div>
        <button type="submit" className="px-5 py-2.5 rounded-xl text-white text-sm font-medium" style={{ background: "#9B59B6" }}>
          {saved ? "✓ Saved!" : "Save Countdown"}
        </button>
      </form>
    </div>
  );
}

// ── Wishes Tab ─────────────────────────────────────────────────────────────────

function WishesTab({ id }: { id: number }) {
  const [wishes, setWishes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    birthdayApi.getWishes(id)
      .then((d: any) => setWishes(Array.isArray(d) ? d : d.results || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-gray-400 text-sm">Loading…</p>;

  return (
    <div className="max-w-3xl space-y-4">
      <p className="text-sm text-gray-400">{wishes.length} wishes received</p>
      {wishes.map((w: any) => (
        <div key={w.id} className="bg-white p-5 rounded-xl border border-gray-100">
          <p className="text-gray-700 italic mb-2">"{w.message}"</p>
          <p className="text-xs font-medium text-gray-500">— {w.name}{w.relation ? ` (${w.relation})` : ""}</p>
          <p className="text-xs text-gray-400 mt-1">{new Date(w.created_at).toLocaleDateString("en-IN")}</p>
        </div>
      ))}
      {wishes.length === 0 && <p className="text-gray-400 text-sm">No wishes yet. Share the page to start receiving them!</p>}
    </div>
  );
}

// ── RSVPs Tab ──────────────────────────────────────────────────────────────────

function RSVPsTab({ id }: { id: number }) {
  const [rsvps, setRsvps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    birthdayApi.getRSVPs(id)
      .then((d: any) => setRsvps(Array.isArray(d) ? d : d.results || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-gray-400 text-sm">Loading…</p>;

  const attending    = rsvps.filter(r => r.attending);
  const notAttending = rsvps.filter(r => !r.attending);
  const totalGuests  = attending.reduce((s: number, r: any) => s + r.guests, 0);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[["Attending",`${attending.length}`,"#10B981"],["Not Attending",`${notAttending.length}`,"#EF4444"],["Total Guests",`${totalGuests}`,"#9B59B6"]].map(([label,val,color]) => (
          <div key={label} className="bg-white p-4 rounded-xl border border-gray-100 text-center">
            <p className="text-2xl font-bold" style={{ color }}>{val}</p>
            <p className="text-xs text-gray-400 mt-1">{label}</p>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {rsvps.map((r: any) => (
          <div key={r.id} className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">{r.name}</p>
              <p className="text-xs text-gray-400">{r.phone} · {r.guests} guest{r.guests>1?"s":""} · {r.meal_pref}</p>
              {r.message && <p className="text-xs text-gray-500 italic mt-1">"{r.message}"</p>}
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.attending ? "bg-green-50 text-green-600" : "bg-red-50 text-red-400"}`}>
              {r.attending ? "✓ Attending" : "✗ Declined"}
            </span>
          </div>
        ))}
        {rsvps.length === 0 && <p className="text-gray-400 text-sm">No RSVPs yet.</p>}
      </div>
    </div>
  );
}
