"use client";
/**
 * Template: Floral Birthday
 * Soft pink botanical aesthetic — elegant for ladies' birthdays, baby showers, garden parties
 */
import { useState } from "react";
import Link from "next/link";

interface BirthdayData {
  celebrant: string; title: string; slug: string;
  date?: string; time?: string; venue?: string; venue_map?: string;
  description?: string; events?: any[]; stories?: any[]; wishes?: any[];
}

export default function FloralBirthday({ data }: { data: BirthdayData }) {
  return (
    <div className="min-h-screen" style={{ background: "#FDF6F0", fontFamily: "'Georgia', serif" }}>
      {/* ── Hero ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden"
        style={{ background: "linear-gradient(160deg, #FFF0F3 0%, #FDE8F5 50%, #FFF0E8 100%)" }}>
        {/* Decorative petals */}
        <div className="absolute top-0 left-0 text-[120px] opacity-20 -translate-x-1/4 -translate-y-1/4 select-none">🌸</div>
        <div className="absolute top-0 right-0 text-[120px] opacity-20 translate-x-1/4 -translate-y-1/4 select-none rotate-90">🌺</div>
        <div className="absolute bottom-0 left-0 text-[80px] opacity-15 -translate-x-1/4 translate-y-1/4 select-none">🌷</div>
        <div className="absolute bottom-0 right-0 text-[80px] opacity-15 translate-x-1/4 translate-y-1/4 select-none">🌹</div>

        <div className="relative z-10">
          <p className="text-sm tracking-[0.4em] mb-6" style={{ color: "#D4799A" }}>
            ✿ ─── with love ─── ✿
          </p>
          <h1 className="text-5xl md:text-7xl mb-4" style={{ color: "#C9527A", fontStyle: "italic" }}>
            {data.celebrant}
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-gray-600 font-normal">{data.title}</p>

          {data.date && (
            <div className="inline-flex items-center gap-3 px-8 py-4 rounded-full mb-8"
              style={{ background: "white", boxShadow: "0 4px 20px rgba(212,121,154,0.2)" }}>
              <span style={{ color: "#D4799A" }}>🌸</span>
              <span className="text-gray-700 text-sm">
                {new Date(data.date).toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                {data.time && ` · ${data.time}`}
              </span>
            </div>
          )}
          {data.venue && (
            <p className="text-gray-500 mb-8 text-sm">
              📍 {data.venue}
              {data.venue_map && <a href={data.venue_map} target="_blank" rel="noopener noreferrer" className="ml-1 underline" style={{ color: "#C9527A" }}>Map</a>}
            </p>
          )}
          <div className="flex gap-4 justify-center flex-wrap">
            <a href="#rsvp" className="px-8 py-3 rounded-full text-white font-medium transition-all hover:scale-105 shadow-md"
              style={{ background: "linear-gradient(135deg, #C9527A, #E8879B)" }}>
              🌸 RSVP
            </a>
            <Link href={`/birthday/${data.slug}/gifts`}
              className="px-8 py-3 rounded-full font-medium border-2 transition-all hover:scale-105"
              style={{ borderColor: "#C9527A", color: "#C9527A" }}>
              🎁 Send a Gift
            </Link>
          </div>
        </div>
      </section>

      {/* ── About ── */}
      {data.description && (
        <section className="py-16 px-6 text-center">
          <div className="max-w-2xl mx-auto">
            <div className="text-3xl mb-4">🌷</div>
            <p className="text-gray-600 leading-relaxed text-lg italic">{data.description}</p>
          </div>
        </section>
      )}

      {/* ── Stories ── */}
      {data.stories && data.stories.length > 0 && (
        <section className="py-16 px-6" style={{ background: "#FFF5F8" }}>
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl text-center mb-12 italic" style={{ color: "#C9527A" }}>
              🌺 Her Story
            </h2>
            <div className="space-y-10">
              {data.stories.map((s: any, i: number) => (
                <div key={s.id} className={`flex flex-col md:flex-row gap-8 items-center ${i%2===1?"md:flex-row-reverse":""}`}>
                  {s.image_url && (
                    <img src={s.image_url} alt={s.heading}
                      className="w-full md:w-64 h-64 object-cover rounded-3xl shadow-md"
                      style={{ border: "4px solid #F7C0D0" }} />
                  )}
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-2xl italic mb-3" style={{ color: "#C9527A" }}>{s.heading}</h3>
                    <p className="text-gray-600 leading-relaxed">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Events ── */}
      {data.events && data.events.length > 0 && (
        <section className="py-16 px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl text-center italic mb-12" style={{ color: "#C9527A" }}>🌸 Celebration Schedule</h2>
            <div className="space-y-4">
              {data.events.map((e: any) => (
                <div key={e.id} className="p-6 rounded-3xl bg-white shadow-sm border"
                  style={{ borderColor: "#F7C0D0" }}>
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl"
                      style={{ background: "#FDE8F5" }}>🌺</div>
                    <div>
                      <h4 className="font-semibold text-gray-800 text-lg">{e.title}</h4>
                      <p className="text-sm text-gray-400">
                        {new Date(e.date).toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })}
                        {e.time && ` · ${e.time}`}
                      </p>
                      {e.venue && <p className="text-sm text-gray-500 mt-1">📍 {e.venue}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Wishes ── */}
      {data.wishes && data.wishes.length > 0 && (
        <section className="py-16 px-6" style={{ background: "#FFF5F8" }}>
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl italic text-center mb-12" style={{ color: "#C9527A" }}>
              💌 Birthday Wishes
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data.wishes.map((w: any) => (
                <div key={w.id} className="p-6 rounded-3xl bg-white shadow-sm border" style={{ borderColor: "#F7C0D0" }}>
                  <p className="text-gray-600 italic mb-4">"{w.message}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm"
                      style={{ background: "linear-gradient(135deg, #C9527A, #E8879B)" }}>
                      {w.name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{w.name}</p>
                      {w.relation && <p className="text-xs text-gray-400">{w.relation}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── RSVP ── */}
      <section id="rsvp" className="py-16 px-6">
        <div className="max-w-lg mx-auto">
          <h2 className="text-3xl italic text-center mb-8" style={{ color: "#C9527A" }}>🌸 RSVP</h2>
          <RSVPForm slug={data.slug} />
        </div>
      </section>

      {/* ── Wish Form ── */}
      <section className="py-16 px-6" style={{ background: "#FFF5F8" }}>
        <div className="max-w-lg mx-auto">
          <h2 className="text-3xl italic text-center mb-8" style={{ color: "#C9527A" }}>💌 Leave a Wish</h2>
          <WishForm slug={data.slug} />
        </div>
      </section>

      <footer className="text-center py-6 text-xs text-gray-400">
        Made with 🌸 by Planazo
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
    <div className="text-center p-10 rounded-3xl bg-white shadow-sm border" style={{ borderColor: "#F7C0D0" }}>
      <div className="text-5xl mb-3">🌸</div>
      <p className="text-xl italic" style={{ color: "#C9527A" }}>See you at the party!</p>
    </div>
  );

  const inp = "w-full px-4 py-3 rounded-2xl text-sm border border-pink-100 bg-white focus:border-pink-300 outline-none";
  return (
    <form onSubmit={submit} className="space-y-4 p-8 rounded-3xl bg-white shadow-sm border" style={{ borderColor: "#F7C0D0" }}>
      <input required placeholder="Your name" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} className={inp} />
      <input placeholder="Phone" value={form.phone} onChange={e => setForm(f=>({...f,phone:e.target.value}))} className={inp} />
      <div className="flex gap-3">
        <select value={form.guests} onChange={e => setForm(f=>({...f,guests:e.target.value}))} className={inp}>
          {[1,2,3,4,5].map(n=><option key={n} value={n}>{n} Guest{n>1?"s":""}</option>)}
        </select>
        <select value={form.meal_pref} onChange={e => setForm(f=>({...f,meal_pref:e.target.value}))} className={inp}>
          <option value="VEG">🥗 Veg</option>
          <option value="NON_VEG">🍗 Non-Veg</option>
          <option value="VEGAN">🌱 Vegan</option>
        </select>
      </div>
      <textarea rows={3} placeholder="A message?" value={form.message} onChange={e=>setForm(f=>({...f,message:e.target.value}))} className={inp} />
      <button type="submit" className="w-full py-4 rounded-2xl text-white font-medium hover:scale-[1.02] transition-transform"
        style={{ background: "linear-gradient(135deg, #C9527A, #E8879B)" }}>
        {state==="loading"?"Sending…":"Confirm RSVP 🌸"}
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
    <div className="text-center p-10 rounded-3xl bg-white shadow-sm border" style={{ borderColor: "#F7C0D0" }}>
      <div className="text-5xl mb-3">💌</div>
      <p className="text-xl italic" style={{ color: "#C9527A" }}>Wish sent!</p>
    </div>
  );

  const inp = "w-full px-4 py-3 rounded-2xl text-sm border border-pink-100 bg-white focus:border-pink-300 outline-none";
  return (
    <form onSubmit={submit} className="space-y-4 p-8 rounded-3xl bg-white shadow-sm border" style={{ borderColor: "#F7C0D0" }}>
      <input required placeholder="Your name" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className={inp} />
      <input placeholder="Relation" value={form.relation} onChange={e=>setForm(f=>({...f,relation:e.target.value}))} className={inp} />
      <textarea required rows={4} placeholder="Your heartfelt wish… 🌷" value={form.message} onChange={e=>setForm(f=>({...f,message:e.target.value}))} className={inp} />
      <button type="submit" className="w-full py-4 rounded-2xl text-white font-medium hover:scale-[1.02] transition-transform"
        style={{ background: "linear-gradient(135deg, #C9527A, #E8879B)" }}>
        {state==="loading"?"Sending…":"Send Wish 🌸"}
      </button>
    </form>
  );
}
