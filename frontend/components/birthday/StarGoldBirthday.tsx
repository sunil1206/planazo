"use client";
/**
 * Template: Star Gold Birthday
 * Luxury gold & black aesthetic — perfect for milestone birthdays (30, 40, 50…)
 */
import { useEffect, useState } from "react";
import Link from "next/link";

interface BirthdayData {
  celebrant: string;
  title: string;
  slug: string;
  date?: string;
  time?: string;
  venue?: string;
  venue_map?: string;
  description?: string;
  events?: any[];
  stories?: any[];
  wishes?: any[];
  countdown?: { target_date: string; label: string };
}

function Countdown({ target }: { target: string; label?: string }) {
  const [time, setTime] = useState({ d: 0, h: 0, m: 0, s: 0 });
  useEffect(() => {
    const tick = () => {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) return;
      setTime({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  return (
    <div className="flex justify-center gap-4 flex-wrap">
      {[["d", "Days"], ["h", "Hrs"], ["m", "Min"], ["s", "Sec"]].map(([k, label]) => (
        <div key={k} className="text-center">
          <div className="w-20 h-20 flex items-center justify-center rounded-xl text-3xl font-bold"
            style={{ background: "rgba(201,149,42,0.15)", color: "#C9952A", border: "1px solid #C9952A" }}>
            {(time as any)[k].toString().padStart(2, "0")}
          </div>
          <p className="text-xs mt-1 text-gray-400">{label}</p>
        </div>
      ))}
    </div>
  );
}

export default function StarGoldBirthday({ data }: { data: BirthdayData }) {
  const API = process.env.NEXT_PUBLIC_API_URL || "";

  return (
    <div className="min-h-screen" style={{ background: "#0A0A0A", color: "#F5F0E8" }}>
      {/* ── Hero ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden">
        {/* Star field background */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(60)].map((_, i) => (
            <div key={i} className="absolute rounded-full"
              style={{
                width: Math.random() * 3 + 1 + "px",
                height: Math.random() * 3 + 1 + "px",
                background: "#C9952A",
                top: Math.random() * 100 + "%",
                left: Math.random() * 100 + "%",
                opacity: Math.random() * 0.8 + 0.2,
                animation: `pulse ${Math.random() * 3 + 2}s ease-in-out infinite`,
              }}
            />
          ))}
        </div>
        <div className="relative z-10">
          <p className="text-xs tracking-[0.5em] mb-4" style={{ color: "#C9952A" }}>
            ✦ YOU ARE INVITED ✦
          </p>
          <h1 className="text-6xl md:text-8xl font-bold mb-4" style={{
            background: "linear-gradient(135deg, #C9952A, #FFE566, #C9952A)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            {data.celebrant}
          </h1>
          <p className="text-xl md:text-2xl font-light mb-8 text-gray-300">{data.title}</p>
          {data.date && (
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full"
              style={{ background: "rgba(201,149,42,0.1)", border: "1px solid rgba(201,149,42,0.4)" }}>
              <span style={{ color: "#C9952A" }}>★</span>
              <span className="text-sm">{new Date(data.date).toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
              {data.time && <><span style={{ color: "#C9952A" }}>·</span><span className="text-sm">{data.time}</span></>}
            </div>
          )}
          {data.venue && (
            <div className="mt-4 text-gray-400 text-sm">
              📍 {data.venue}
              {data.venue_map && (
                <a href={data.venue_map} target="_blank" rel="noopener noreferrer"
                  className="ml-2 underline" style={{ color: "#C9952A" }}>Map</a>
              )}
            </div>
          )}
          <div className="flex gap-4 justify-center mt-8">
            <a href="#rsvp"
              className="px-8 py-3 rounded-full font-medium transition-all hover:scale-105"
              style={{ background: "linear-gradient(135deg, #C9952A, #FFE566)", color: "#0A0A0A" }}>
              RSVP Now
            </a>
            <Link href={`/birthday/${data.slug}/gifts`}
              className="px-8 py-3 rounded-full font-medium border transition-all hover:scale-105"
              style={{ borderColor: "#C9952A", color: "#C9952A" }}>
              🎁 Send Gift
            </Link>
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-9 border-2 rounded-full flex items-start justify-center pt-1" style={{ borderColor: "#C9952A" }}>
            <div className="w-1 h-2 rounded-full" style={{ background: "#C9952A" }} />
          </div>
        </div>
      </section>

      {/* ── Countdown ── */}
      {data.countdown && (
        <section className="py-16 px-6">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-xs tracking-widest mb-8" style={{ color: "#C9952A" }}>
              ✦ COUNTING DOWN ✦
            </p>
            <Countdown target={data.countdown.target_date} label={data.countdown.label} />
            <p className="mt-4 text-gray-500 text-sm">{data.countdown.label}</p>
          </div>
        </section>
      )}

      {/* ── Description ── */}
      {data.description && (
        <section className="py-16 px-6" style={{ background: "rgba(201,149,42,0.05)" }}>
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-xs tracking-widest mb-6" style={{ color: "#C9952A" }}>✦ ABOUT THE CELEBRATION ✦</p>
            <p className="text-gray-300 leading-relaxed text-lg">{data.description}</p>
          </div>
        </section>
      )}

      {/* ── Stories / Memories ── */}
      {data.stories && data.stories.length > 0 && (
        <section className="py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <p className="text-xs tracking-widest text-center mb-10" style={{ color: "#C9952A" }}>✦ MEMORIES ✦</p>
            <div className="space-y-12">
              {data.stories.map((s: any, i: number) => (
                <div key={s.id} className={`flex flex-col md:flex-row gap-8 items-center ${i % 2 === 1 ? "md:flex-row-reverse" : ""}`}>
                  {s.image_url && (
                    <img src={s.image_url} alt={s.heading}
                      className="w-full md:w-72 h-56 object-cover rounded-2xl"
                      style={{ border: "1px solid rgba(201,149,42,0.3)" }} />
                  )}
                  <div className="flex-1">
                    <h3 className="text-2xl font-semibold mb-3" style={{ color: "#C9952A" }}>{s.heading}</h3>
                    <p className="text-gray-300 leading-relaxed">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Events ── */}
      {data.events && data.events.length > 0 && (
        <section className="py-16 px-6" style={{ background: "rgba(201,149,42,0.05)" }}>
          <div className="max-w-3xl mx-auto">
            <p className="text-xs tracking-widest text-center mb-10" style={{ color: "#C9952A" }}>✦ SCHEDULE ✦</p>
            <div className="space-y-6">
              {data.events.map((e: any) => (
                <div key={e.id} className="flex gap-6 items-start p-6 rounded-2xl"
                  style={{ background: "rgba(201,149,42,0.08)", border: "1px solid rgba(201,149,42,0.2)" }}>
                  <div className="text-center min-w-[60px]">
                    <div className="text-2xl font-bold" style={{ color: "#C9952A" }}>{new Date(e.date).getDate()}</div>
                    <div className="text-xs text-gray-400">{new Date(e.date).toLocaleDateString("en-IN", { month: "short" })}</div>
                  </div>
                  <div className="border-l pl-6" style={{ borderColor: "rgba(201,149,42,0.3)" }}>
                    <h4 className="font-semibold text-white text-lg">{e.title}</h4>
                    {e.time && <p className="text-xs text-gray-400 mb-1">{e.time}</p>}
                    {e.venue && <p className="text-sm text-gray-300">📍 {e.venue}</p>}
                    {e.description && <p className="text-sm text-gray-400 mt-2">{e.description}</p>}
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
            <p className="text-xs tracking-widest text-center mb-10" style={{ color: "#C9952A" }}>✦ BIRTHDAY WISHES ✦</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data.wishes.map((w: any) => (
                <div key={w.id} className="p-6 rounded-2xl"
                  style={{ background: "rgba(201,149,42,0.08)", border: "1px solid rgba(201,149,42,0.15)" }}>
                  <p className="text-gray-300 italic mb-4">"{w.message}"</p>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ background: "#C9952A", color: "#0A0A0A" }}>
                      {w.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{w.name}</p>
                      {w.relation && <p className="text-xs text-gray-500">{w.relation}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── RSVP ── */}
      <section id="rsvp" className="py-16 px-6" style={{ background: "rgba(201,149,42,0.05)" }}>
        <div className="max-w-lg mx-auto text-center">
          <p className="text-xs tracking-widest mb-4" style={{ color: "#C9952A" }}>✦ JOIN THE CELEBRATION ✦</p>
          <h2 className="text-3xl font-bold text-white mb-8">RSVP</h2>
          <RSVPForm slug={data.slug} theme="dark" />
        </div>
      </section>

      {/* ── Send Wish ── */}
      <section className="py-16 px-6">
        <div className="max-w-lg mx-auto text-center">
          <p className="text-xs tracking-widest mb-4" style={{ color: "#C9952A" }}>✦ LEAVE A WISH ✦</p>
          <h2 className="text-3xl font-bold text-white mb-8">Send Your Wishes ⭐</h2>
          <WishForm slug={data.slug} theme="dark" />
        </div>
      </section>

      <footer className="text-center py-8 text-xs text-gray-600 border-t" style={{ borderColor: "rgba(201,149,42,0.2)" }}>
        Made with ✦ by Planazo
      </footer>

      <style jsx global>{`
        @keyframes pulse { 0%,100%{opacity:0.2} 50%{opacity:1} }
      `}</style>
    </div>
  );
}

function RSVPForm({ slug, theme }: { slug: string; theme?: string }) {
  const [form, setForm] = useState({ name: "", phone: "", guests: "1", meal_pref: "VEG", message: "", attending: true });
  const [state, setState] = useState<"idle"|"loading"|"done">("idle");
  const isDark = theme === "dark";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("loading");
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/birthday/public/${slug}/rsvp/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, guests: parseInt(form.guests) }),
      });
      setState("done");
    } catch { setState("idle"); }
  };

  if (state === "done") return (
    <div className="p-8 rounded-2xl" style={{ background: isDark ? "rgba(201,149,42,0.1)" : "#FFF8E7", border: "1px solid #C9952A" }}>
      <div className="text-4xl mb-3">🎉</div>
      <p className="font-semibold" style={{ color: "#C9952A" }}>RSVP Confirmed!</p>
      <p className={`text-sm mt-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>We can't wait to celebrate with you!</p>
    </div>
  );

  const inputCls = `w-full px-4 py-3 rounded-xl text-sm outline-none transition-all ${
    isDark ? "bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-yellow-500" : "bg-gray-50 border border-gray-200 text-gray-900 focus:border-yellow-500"
  }`;

  return (
    <form onSubmit={submit} className="space-y-4 text-left">
      <input required placeholder="Your name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
      <input placeholder="Phone number" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputCls} />
      <div className="flex gap-3">
        <select value={form.guests} onChange={e => setForm(f => ({ ...f, guests: e.target.value }))} className={inputCls}>
          {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} Guest{n>1?"s":""}</option>)}
        </select>
        <select value={form.meal_pref} onChange={e => setForm(f => ({ ...f, meal_pref: e.target.value }))} className={inputCls}>
          <option value="VEG">🥗 Veg</option>
          <option value="NON_VEG">🍗 Non-Veg</option>
          <option value="VEGAN">🌱 Vegan</option>
        </select>
      </div>
      <textarea rows={3} placeholder="Any message?" value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} className={inputCls} />
      <button type="submit" disabled={state === "loading"}
        className="w-full py-4 rounded-xl font-semibold transition-all hover:scale-[1.02]"
        style={{ background: "linear-gradient(135deg, #C9952A, #FFE566)", color: "#0A0A0A" }}>
        {state === "loading" ? "Sending…" : "Confirm RSVP ✦"}
      </button>
    </form>
  );
}

function WishForm({ slug, theme }: { slug: string; theme?: string }) {
  const [form, setForm] = useState({ name: "", relation: "", message: "" });
  const [state, setState] = useState<"idle"|"loading"|"done">("idle");
  const isDark = theme === "dark";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("loading");
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/birthday/public/${slug}/wish/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setState("done");
    } catch { setState("idle"); }
  };

  if (state === "done") return (
    <div className="p-8 rounded-2xl text-center" style={{ background: isDark ? "rgba(201,149,42,0.1)" : "#FFF8E7" }}>
      <div className="text-4xl mb-3">⭐</div>
      <p className="font-semibold" style={{ color: "#C9952A" }}>Wish sent!</p>
    </div>
  );

  const inputCls = `w-full px-4 py-3 rounded-xl text-sm outline-none transition-all ${
    isDark ? "bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-yellow-500" : "bg-gray-50 border border-gray-200 text-gray-900 focus:border-yellow-500"
  }`;

  return (
    <form onSubmit={submit} className="space-y-4 text-left">
      <input required placeholder="Your name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
      <input placeholder="Relation (e.g. Friend, Cousin)" value={form.relation} onChange={e => setForm(f => ({ ...f, relation: e.target.value }))} className={inputCls} />
      <textarea required rows={4} placeholder="Write your birthday wish…" value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} className={inputCls} />
      <button type="submit" disabled={state === "loading"}
        className="w-full py-4 rounded-xl font-semibold transition-all hover:scale-[1.02]"
        style={{ background: "linear-gradient(135deg, #C9952A, #FFE566)", color: "#0A0A0A" }}>
        {state === "loading" ? "Sending…" : "Send Wish ⭐"}
      </button>
    </form>
  );
}
