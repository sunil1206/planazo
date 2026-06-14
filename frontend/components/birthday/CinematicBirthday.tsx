"use client";
/**
 * Template: Cinematic Birthday
 * Dark, premium, moody cinematic look — for adults who want drama and elegance
 */
import { useState } from "react";
import Link from "next/link";

interface BirthdayData {
  celebrant: string; title: string; slug: string;
  date?: string; time?: string; venue?: string; venue_map?: string;
  description?: string; events?: any[]; stories?: any[]; wishes?: any[];
}

export default function CinematicBirthday({ data }: { data: BirthdayData }) {
  return (
    <div className="min-h-screen" style={{ background: "#0C0C0C", color: "#E8E8E8", fontFamily: "'Georgia', serif" }}>

      {/* ── Cinematic Hero ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Cinematic bars */}
        <div className="absolute top-0 left-0 right-0 h-16" style={{ background: "#000" }} />
        <div className="absolute bottom-0 left-0 right-0 h-16" style={{ background: "#000" }} />

        {/* Background gradient */}
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse at center, #1a0a2e 0%, #0C0C0C 70%)"
        }} />

        {/* Film grain effect */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")" }} />

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          {/* Film countdown dots */}
          <div className="flex justify-center gap-2 mb-8">
            {[...Array(8)].map((_,i) => (
              <div key={i} className="w-2 h-2 rounded-full" style={{ background: i === 3 ? "#9B59B6" : "rgba(255,255,255,0.2)" }} />
            ))}
          </div>

          <p className="text-xs tracking-[0.6em] mb-6" style={{ color: "#9B59B6" }}>
            A SNAPSHARE ORIGINAL PRODUCTION
          </p>

          <h1 className="text-6xl md:text-8xl font-bold mb-4 leading-tight"
            style={{ background: "linear-gradient(180deg, #FFFFFF 0%, #9B59B6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            {data.celebrant}
          </h1>

          <div className="flex items-center justify-center gap-4 my-4">
            <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, transparent, #9B59B6)" }} />
            <p className="text-gray-400 text-sm italic">{data.title}</p>
            <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, #9B59B6, transparent)" }} />
          </div>

          {data.date && (
            <div className="inline-block px-6 py-3 mb-8 text-sm" style={{ border: "1px solid rgba(155,89,182,0.4)", color: "#9B59B6" }}>
              {new Date(data.date).toLocaleDateString("en-IN", { year:"numeric", month:"long", day:"numeric" })}
              {data.time && ` · ${data.time}`}
            </div>
          )}

          {data.venue && (
            <p className="text-gray-400 text-sm mb-8">
              ▸ {data.venue}
              {data.venue_map && <a href={data.venue_map} target="_blank" rel="noopener noreferrer" className="ml-2 underline" style={{ color: "#9B59B6" }}>View Map</a>}
            </p>
          )}

          <div className="flex gap-4 justify-center flex-wrap">
            <a href="#rsvp" className="px-8 py-3 font-medium tracking-widest text-sm hover:bg-purple-900 transition-colors"
              style={{ border: "1px solid #9B59B6", color: "#9B59B6" }}>
              RSVP
            </a>
            <Link href={`/birthday/${data.slug}/gifts`}
              className="px-8 py-3 text-black font-medium tracking-widest text-sm hover:opacity-90 transition-opacity"
              style={{ background: "#9B59B6" }}>
              🎁 SEND GIFT
            </Link>
          </div>
        </div>
      </section>

      {/* ── Description ── */}
      {data.description && (
        <section className="py-20 px-6">
          <div className="max-w-2xl mx-auto text-center">
            <div className="h-px mb-12" style={{ background: "linear-gradient(90deg, transparent, #9B59B6, transparent)" }} />
            <p className="text-gray-400 leading-relaxed text-lg italic">"{data.description}"</p>
            <div className="h-px mt-12" style={{ background: "linear-gradient(90deg, transparent, #9B59B6, transparent)" }} />
          </div>
        </section>
      )}

      {/* ── Stories ── */}
      {data.stories && data.stories.length > 0 && (
        <section className="py-20 px-6" style={{ background: "#0A0A0A" }}>
          <div className="max-w-5xl mx-auto">
            <p className="text-xs tracking-[0.5em] text-center mb-16" style={{ color: "#9B59B6" }}>THE STORY SO FAR</p>
            <div className="space-y-16">
              {data.stories.map((s: any, i: number) => (
                <div key={s.id} className={`flex flex-col md:flex-row gap-10 items-center ${i%2===1?"md:flex-row-reverse":""}`}>
                  {s.image_url && (
                    <img src={s.image_url} alt={s.heading}
                      className="w-full md:w-80 h-64 object-cover"
                      style={{ filter: "grayscale(30%)", border: "1px solid rgba(155,89,182,0.3)" }} />
                  )}
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-4" style={{ color: "#9B59B6" }}>{s.heading}</h3>
                    <p className="text-gray-400 leading-relaxed">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Events ── */}
      {data.events && data.events.length > 0 && (
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs tracking-[0.5em] text-center mb-12" style={{ color: "#9B59B6" }}>THE SCHEDULE</p>
            <div className="space-y-4">
              {data.events.map((e: any, i: number) => (
                <div key={e.id} className="flex gap-6 items-start p-6"
                  style={{ borderLeft: "2px solid #9B59B6", background: "rgba(155,89,182,0.05)" }}>
                  <span className="text-lg font-bold" style={{ color: "#9B59B6" }}>{String(i+1).padStart(2,"0")}</span>
                  <div>
                    <h4 className="font-semibold text-white text-lg">{e.title}</h4>
                    <p className="text-gray-500 text-sm">
                      {new Date(e.date).toLocaleDateString("en-IN",{month:"long",day:"numeric"})}
                      {e.time && ` · ${e.time}`}
                    </p>
                    {e.venue && <p className="text-gray-500 text-sm mt-1">▸ {e.venue}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Wishes ── */}
      {data.wishes && data.wishes.length > 0 && (
        <section className="py-20 px-6" style={{ background: "#0A0A0A" }}>
          <div className="max-w-4xl mx-auto">
            <p className="text-xs tracking-[0.5em] text-center mb-12" style={{ color: "#9B59B6" }}>WORDS FROM THE AUDIENCE</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data.wishes.map((w: any) => (
                <div key={w.id} className="p-6" style={{ border: "1px solid rgba(155,89,182,0.2)", background: "rgba(155,89,182,0.05)" }}>
                  <p className="text-gray-400 italic mb-4 leading-relaxed">"{w.message}"</p>
                  <p className="text-xs tracking-widest" style={{ color: "#9B59B6" }}>— {w.name}{w.relation?`, ${w.relation}`:""}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── RSVP ── */}
      <section id="rsvp" className="py-20 px-6">
        <div className="max-w-lg mx-auto">
          <p className="text-xs tracking-[0.5em] text-center mb-8" style={{ color: "#9B59B6" }}>CONFIRM YOUR PRESENCE</p>
          <RSVPForm slug={data.slug} />
        </div>
      </section>

      {/* ── Wish Form ── */}
      <section className="py-20 px-6" style={{ background: "#0A0A0A" }}>
        <div className="max-w-lg mx-auto">
          <p className="text-xs tracking-[0.5em] text-center mb-8" style={{ color: "#9B59B6" }}>LEAVE YOUR WORDS</p>
          <WishForm slug={data.slug} />
        </div>
      </section>

      <footer className="text-center py-8 text-xs tracking-widest text-gray-700 border-t border-gray-900">
        A SNAPSHARE PRODUCTION · MMXXVI
      </footer>
    </div>
  );
}

function RSVPForm({ slug }: { slug: string }) {
  const [form, setForm] = useState({ name: "", phone: "", guests: "1", meal_pref: "VEG", message: "" });
  const [state, setState] = useState<"idle"|"loading"|"done">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setState("loading");
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL||""}/api/birthday/public/${slug}/rsvp/`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ ...form, guests: parseInt(form.guests) }),
      });
      setState("done");
    } catch { setState("idle"); }
  };

  if (state === "done") return (
    <div className="text-center p-10 border" style={{ borderColor: "rgba(155,89,182,0.3)" }}>
      <p className="text-xs tracking-widest mb-2" style={{ color: "#9B59B6" }}>CONFIRMED</p>
      <p className="text-xl font-bold text-white">Your presence is noted.</p>
    </div>
  );

  const inp = "w-full px-4 py-3 text-sm bg-transparent border-b border-gray-700 text-white placeholder-gray-600 focus:border-purple-500 outline-none transition-colors";
  return (
    <form onSubmit={submit} className="space-y-6">
      <input required placeholder="Full name" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className={inp} />
      <input placeholder="Phone" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} className={inp} />
      <div className="flex gap-6">
        <select value={form.guests} onChange={e=>setForm(f=>({...f,guests:e.target.value}))} className={inp + " bg-black"}>
          {[1,2,3,4,5].map(n=><option key={n} value={n}>{n} Guest{n>1?"s":""}</option>)}
        </select>
        <select value={form.meal_pref} onChange={e=>setForm(f=>({...f,meal_pref:e.target.value}))} className={inp + " bg-black"}>
          <option value="VEG">Vegetarian</option>
          <option value="NON_VEG">Non-Vegetarian</option>
          <option value="VEGAN">Vegan</option>
        </select>
      </div>
      <textarea rows={3} placeholder="A note (optional)" value={form.message} onChange={e=>setForm(f=>({...f,message:e.target.value}))} className={inp} />
      <button type="submit" className="w-full py-4 text-black font-medium tracking-widest text-sm hover:opacity-90 transition-opacity"
        style={{ background: "#9B59B6" }}>
        {state==="loading"?"…":"CONFIRM ATTENDANCE"}
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
      await fetch(`${process.env.NEXT_PUBLIC_API_URL||""}/api/birthday/public/${slug}/wish/`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify(form),
      });
      setState("done");
    } catch { setState("idle"); }
  };

  if (state === "done") return (
    <div className="text-center p-10 border" style={{ borderColor: "rgba(155,89,182,0.3)" }}>
      <p className="text-xs tracking-widest mb-2" style={{ color: "#9B59B6" }}>RECEIVED</p>
      <p className="text-xl font-bold text-white">Your words have been recorded.</p>
    </div>
  );

  const inp = "w-full px-4 py-3 text-sm bg-transparent border-b border-gray-700 text-white placeholder-gray-600 focus:border-purple-500 outline-none transition-colors";
  return (
    <form onSubmit={submit} className="space-y-6">
      <input required placeholder="Full name" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className={inp} />
      <input placeholder="Relation" value={form.relation} onChange={e=>setForm(f=>({...f,relation:e.target.value}))} className={inp} />
      <textarea required rows={5} placeholder="Your words for the occasion…" value={form.message} onChange={e=>setForm(f=>({...f,message:e.target.value}))} className={inp} />
      <button type="submit" className="w-full py-4 text-black font-medium tracking-widest text-sm hover:opacity-90 transition-opacity"
        style={{ background: "#9B59B6" }}>
        {state==="loading"?"…":"SUBMIT"}
      </button>
    </form>
  );
}
