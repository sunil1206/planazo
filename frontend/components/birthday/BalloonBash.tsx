"use client";
/**
 * Template: Balloon Bash
 * Colorful, fun, bubbly party vibe — great for all ages
 */
import { useState } from "react";
import Link from "next/link";

interface BirthdayData {
  celebrant: string; title: string; slug: string;
  date?: string; time?: string; venue?: string; venue_map?: string;
  description?: string; events?: any[]; stories?: any[]; wishes?: any[];
}

const COLORS = ["#FF6B6B","#FFD93D","#6BCB77","#4D96FF","#FF6BFF","#FF9F43"];

function FloatingBalloon({ color, style }: { color: string; style?: React.CSSProperties }) {
  return (
    <div className="absolute" style={style}>
      <div className="relative" style={{ animation: "bob 3s ease-in-out infinite" }}>
        <div className="w-8 h-10 rounded-full" style={{ background: color, opacity: 0.7 }} />
        <div className="w-px h-8 bg-gray-400 mx-auto" />
      </div>
    </div>
  );
}

export default function BalloonBash({ data }: { data: BirthdayData }) {
  return (
    <div className="min-h-screen overflow-hidden" style={{ background: "#FFFEF0" }}>
      {/* ── Hero ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center">
        {/* Balloons */}
        {COLORS.map((c, i) => (
          <FloatingBalloon key={i} color={c} style={{
            top: Math.random() * 30 + "%", left: (i * 17) + "%",
            animationDelay: `${i * 0.4}s`,
          }} />
        ))}
        <FloatingBalloon color="#FF6B6B" style={{ bottom: "10%", right: "10%", animationDelay: "1.2s" }} />
        <FloatingBalloon color="#4D96FF" style={{ bottom: "15%", left: "5%", animationDelay: "0.8s" }} />

        <div className="relative z-10">
          {/* Confetti dots */}
          <div className="text-6xl mb-4">🎈🎉🎊</div>
          <h1 className="text-5xl md:text-7xl font-black mb-4"
            style={{ color: "#FF6B6B", textShadow: "3px 3px 0 #FFD93D" }}>
            Happy Birthday!
          </h1>
          <p className="text-3xl md:text-4xl font-bold mb-6" style={{ color: "#4D96FF" }}>
            {data.celebrant}
          </p>
          {data.date && (
            <div className="inline-block px-6 py-3 rounded-2xl text-white font-semibold text-sm mb-6"
              style={{ background: "#FF9F43" }}>
              🗓 {new Date(data.date).toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              {data.time && ` · ${data.time}`}
            </div>
          )}
          {data.venue && (
            <p className="text-gray-600 mb-8">
              📍 {data.venue}
              {data.venue_map && (
                <a href={data.venue_map} target="_blank" rel="noopener noreferrer"
                  className="ml-2 underline" style={{ color: "#4D96FF" }}>Map</a>
              )}
            </p>
          )}
          <div className="flex gap-4 justify-center flex-wrap">
            <a href="#rsvp" className="px-8 py-4 rounded-2xl text-white font-bold text-lg shadow-lg hover:scale-105 transition-transform"
              style={{ background: "#FF6B6B" }}>🎉 RSVP Now</a>
            <Link href={`/birthday/${data.slug}/gifts`}
              className="px-8 py-4 rounded-2xl text-white font-bold text-lg shadow-lg hover:scale-105 transition-transform"
              style={{ background: "#6BCB77" }}>🎁 Send Gift</Link>
          </div>
        </div>
      </section>

      {/* ── Description ── */}
      {data.description && (
        <section className="py-16 px-6">
          <div className="max-w-2xl mx-auto text-center">
            <div className="text-4xl mb-4">🎊</div>
            <p className="text-gray-700 text-lg leading-relaxed">{data.description}</p>
          </div>
        </section>
      )}

      {/* ── Events ── */}
      {data.events && data.events.length > 0 && (
        <section className="py-16 px-6" style={{ background: "#FFF5F5" }}>
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-black text-center mb-10" style={{ color: "#FF6B6B" }}>🗓 Party Schedule</h2>
            <div className="grid gap-4">
              {data.events.map((e: any, i: number) => (
                <div key={e.id} className="flex gap-4 items-center p-5 rounded-2xl bg-white shadow-sm border-l-4"
                  style={{ borderColor: COLORS[i % COLORS.length] }}>
                  <div className="text-3xl">{["🎈","🎉","🎊","🎂","🍰","🥳"][i % 6]}</div>
                  <div>
                    <h4 className="font-bold text-gray-800">{e.title}</h4>
                    <p className="text-sm text-gray-500">
                      {new Date(e.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                      {e.time && ` · ${e.time}`}
                      {e.venue && ` · ${e.venue}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Wishes ── */}
      {data.wishes && data.wishes.length > 0 && (
        <section className="py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-black text-center mb-10" style={{ color: "#4D96FF" }}>💌 Birthday Wishes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.wishes.map((w: any, i: number) => (
                <div key={w.id} className="p-5 rounded-2xl text-white shadow-md hover:scale-105 transition-transform"
                  style={{ background: COLORS[i % COLORS.length] }}>
                  <p className="font-medium mb-3 italic">"{w.message}"</p>
                  <p className="text-sm font-bold opacity-90">— {w.name}{w.relation ? ` (${w.relation})` : ""}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── RSVP ── */}
      <section id="rsvp" className="py-16 px-6" style={{ background: "#FFF5F5" }}>
        <div className="max-w-lg mx-auto">
          <h2 className="text-3xl font-black text-center mb-8" style={{ color: "#FF6B6B" }}>🎉 RSVP</h2>
          <RSVPForm slug={data.slug} />
        </div>
      </section>

      {/* ── Send Wish ── */}
      <section className="py-16 px-6">
        <div className="max-w-lg mx-auto">
          <h2 className="text-3xl font-black text-center mb-8" style={{ color: "#4D96FF" }}>💌 Leave a Wish</h2>
          <WishForm slug={data.slug} />
        </div>
      </section>

      <footer className="text-center py-6 text-sm text-gray-400">
        Made with 🎈 by Planazo
      </footer>

      <style jsx global>{`
        @keyframes bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
      `}</style>
    </div>
  );
}

function RSVPForm({ slug }: { slug: string }) {
  const [form, setForm] = useState({ name: "", phone: "", guests: "1", meal_pref: "VEG", message: "" });
  const [state, setState] = useState<"idle"|"loading"|"done">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setState("loading");
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/birthday/public/${slug}/rsvp/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, guests: parseInt(form.guests) }),
      });
      setState("done");
    } catch { setState("idle"); }
  };

  if (state === "done") return (
    <div className="text-center p-10 rounded-3xl bg-white shadow-md">
      <div className="text-5xl mb-3">🥳</div>
      <p className="text-2xl font-black" style={{ color: "#FF6B6B" }}>Woohoo!</p>
      <p className="text-gray-500 mt-2">We'll see you at the party! 🎈</p>
    </div>
  );

  const inp = "w-full px-4 py-3 rounded-xl text-sm border border-gray-200 focus:border-pink-400 outline-none";
  return (
    <form onSubmit={submit} className="space-y-4 bg-white p-8 rounded-3xl shadow-md">
      <input required placeholder="Your name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inp} />
      <input placeholder="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inp} />
      <div className="flex gap-3">
        <select value={form.guests} onChange={e => setForm(f => ({ ...f, guests: e.target.value }))} className={inp}>
          {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} Guest{n>1?"s":""}</option>)}
        </select>
        <select value={form.meal_pref} onChange={e => setForm(f => ({ ...f, meal_pref: e.target.value }))} className={inp}>
          <option value="VEG">🥗 Veg</option>
          <option value="NON_VEG">🍗 Non-Veg</option>
          <option value="VEGAN">🌱 Vegan</option>
        </select>
      </div>
      <textarea rows={3} placeholder="Anything to say?" value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} className={inp} />
      <button type="submit" className="w-full py-4 rounded-2xl text-white font-black text-lg hover:scale-[1.02] transition-transform"
        style={{ background: "#FF6B6B" }}>
        {state === "loading" ? "🎈 Sending…" : "Count me in! 🎉"}
      </button>
    </form>
  );
}

function WishForm({ slug }: { slug: string }) {
  const [form, setForm] = useState({ name: "", relation: "", message: "" });
  const [state, setState] = useState<"idle"|"loading"|"done">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setState("loading");
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/birthday/public/${slug}/wish/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setState("done");
    } catch { setState("idle"); }
  };

  if (state === "done") return (
    <div className="text-center p-10 rounded-3xl bg-white shadow-md">
      <div className="text-5xl mb-3">💌</div>
      <p className="font-black text-xl" style={{ color: "#4D96FF" }}>Wish sent!</p>
    </div>
  );

  const inp = "w-full px-4 py-3 rounded-xl text-sm border border-gray-200 focus:border-blue-400 outline-none";
  return (
    <form onSubmit={submit} className="space-y-4 bg-white p-8 rounded-3xl shadow-md">
      <input required placeholder="Your name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inp} />
      <input placeholder="Relation (Friend, Cousin…)" value={form.relation} onChange={e => setForm(f => ({ ...f, relation: e.target.value }))} className={inp} />
      <textarea required rows={4} placeholder="Write your wish! 🎂" value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} className={inp} />
      <button type="submit" className="w-full py-4 rounded-2xl text-white font-black text-lg hover:scale-[1.02] transition-transform"
        style={{ background: "#4D96FF" }}>
        {state === "loading" ? "Sending…" : "Send Wish 🎈"}
      </button>
    </form>
  );
}
