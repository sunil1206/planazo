"use client";
/**
 * Template: Kids Party
 * Super bright, cartoonish, fun — perfect for children's birthdays
 */
import { useState } from "react";
import Link from "next/link";

interface BirthdayData {
  celebrant: string; title: string; slug: string;
  date?: string; time?: string; venue?: string; venue_map?: string;
  description?: string; events?: any[]; stories?: any[]; wishes?: any[];
}

const EMOJIS = ["🦄","🐶","🐱","🦊","🐸","🐼","🦁","🐯","🐻","🦋"];
const BG_COLORS = ["#FFE5E5","#E5F5FF","#E5FFE5","#FFF5E5","#F5E5FF"];

export default function KidsParty({ data }: { data: BirthdayData }) {
  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: "#FFFBF0" }}>
      {/* ── Hero ── */}
      <section className="relative py-20 px-6 text-center overflow-hidden"
        style={{ background: "linear-gradient(135deg, #FF9FF3 0%, #FECA57 50%, #48DBFB 100%)" }}>
        {/* Stars */}
        {[...Array(15)].map((_,i) => (
          <div key={i} className="absolute text-2xl" style={{
            top: Math.random()*90+"%", left: Math.random()*100+"%",
            animation: `spin ${2+Math.random()*3}s linear infinite`,
            opacity: 0.7,
          }}>⭐</div>
        ))}
        <div className="relative z-10">
          <div className="text-7xl mb-4">🎂</div>
          <h1 className="text-5xl md:text-7xl font-black mb-2" style={{
            color: "white",
            textShadow: "3px 3px 0 #FF6348, 6px 6px 0 rgba(0,0,0,0.1)",
          }}>
            Happy Birthday!
          </h1>
          <p className="text-3xl font-black text-white mb-2" style={{ textShadow: "2px 2px 0 rgba(0,0,0,0.1)" }}>
            {data.celebrant} 🎈
          </p>
          {data.date && (
            <div className="inline-block mt-4 px-6 py-3 rounded-2xl font-bold text-white text-sm"
              style={{ background: "rgba(0,0,0,0.2)" }}>
              🗓 {new Date(data.date).toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              {data.time && ` · ${data.time}`}
            </div>
          )}
          {data.venue && (
            <p className="mt-4 text-white font-medium" style={{ textShadow: "1px 1px 0 rgba(0,0,0,0.2)" }}>
              📍 {data.venue}
              {data.venue_map && <a href={data.venue_map} target="_blank" rel="noopener noreferrer" className="ml-1 underline">🗺 Map</a>}
            </p>
          )}
          <div className="flex gap-4 justify-center mt-8 flex-wrap">
            <a href="#rsvp" className="px-8 py-4 rounded-2xl font-black text-lg shadow-xl hover:scale-110 transition-transform"
              style={{ background: "#FF6348", color: "white" }}>🎉 I'm Coming!</a>
            <Link href={`/birthday/${data.slug}/gifts`}
              className="px-8 py-4 rounded-2xl font-black text-lg shadow-xl hover:scale-110 transition-transform"
              style={{ background: "white", color: "#FF6348" }}>🎁 Send a Gift</Link>
          </div>
        </div>
      </section>

      {/* ── Fun animal decorators ── */}
      <div className="flex justify-around py-6 px-4 overflow-x-auto" style={{ background: "#FFF5E0" }}>
        {EMOJIS.slice(0,7).map((e,i) => (
          <div key={i} className="text-4xl hover:scale-125 transition-transform cursor-default"
            style={{ animation: `bounce2 ${1+i*0.2}s ease-in-out infinite` }}>{e}</div>
        ))}
      </div>

      {/* ── Description ── */}
      {data.description && (
        <section className="py-12 px-6 text-center">
          <div className="max-w-2xl mx-auto p-8 rounded-3xl" style={{ background: BG_COLORS[0] }}>
            <div className="text-4xl mb-4">🥳</div>
            <p className="text-gray-700 text-lg leading-relaxed font-medium">{data.description}</p>
          </div>
        </section>
      )}

      {/* ── Events ── */}
      {data.events && data.events.length > 0 && (
        <section className="py-12 px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-black text-center mb-8" style={{ color: "#FF6348" }}>
              🎊 Party Plan!
            </h2>
            <div className="grid gap-4">
              {data.events.map((e: any, i: number) => (
                <div key={e.id} className="flex gap-4 items-center p-5 rounded-3xl shadow-sm"
                  style={{ background: BG_COLORS[i % BG_COLORS.length] }}>
                  <div className="text-4xl">{EMOJIS[i % EMOJIS.length]}</div>
                  <div>
                    <h4 className="font-black text-gray-800 text-lg">{e.title}</h4>
                    <p className="text-gray-500 text-sm">
                      {new Date(e.date).toLocaleDateString("en-IN", {month:"short", day:"numeric"})}
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
        <section className="py-12 px-6" style={{ background: "#F0F9FF" }}>
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-black text-center mb-8" style={{ color: "#0097A7" }}>💌 Birthday Wishes!</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.wishes.map((w: any, i: number) => (
                <div key={w.id} className="p-5 rounded-3xl shadow-sm hover:scale-105 transition-transform"
                  style={{ background: BG_COLORS[i % BG_COLORS.length] }}>
                  <div className="text-2xl mb-2">{EMOJIS[(i+3) % EMOJIS.length]}</div>
                  <p className="text-gray-700 font-medium mb-3 italic">"{w.message}"</p>
                  <p className="text-sm font-black text-gray-500">— {w.name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── RSVP ── */}
      <section id="rsvp" className="py-12 px-6">
        <div className="max-w-lg mx-auto">
          <h2 className="text-3xl font-black text-center mb-8" style={{ color: "#FF6348" }}>🎉 Will You Come?</h2>
          <RSVPForm slug={data.slug} />
        </div>
      </section>

      {/* ── Wish Form ── */}
      <section className="py-12 px-6" style={{ background: "#F0F9FF" }}>
        <div className="max-w-lg mx-auto">
          <h2 className="text-3xl font-black text-center mb-8" style={{ color: "#0097A7" }}>✏️ Leave a Wish</h2>
          <WishForm slug={data.slug} />
        </div>
      </section>

      <footer className="text-center py-6 text-sm text-gray-400">
        Made with 🎈 by Planazo
      </footer>

      <style jsx global>{`
        @keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
        @keyframes bounce2 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
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
      await fetch(`${process.env.NEXT_PUBLIC_API_URL||""}/api/birthday/public/${slug}/rsvp/`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ ...form, guests: parseInt(form.guests) }),
      });
      setState("done");
    } catch { setState("idle"); }
  };

  if (state === "done") return (
    <div className="text-center p-10 rounded-3xl" style={{ background: "#FFF5E0" }}>
      <div className="text-6xl mb-3">🥳</div>
      <p className="text-2xl font-black" style={{ color: "#FF6348" }}>Yay! See you there!</p>
    </div>
  );

  const inp = "w-full px-4 py-3 rounded-2xl text-sm border-2 border-yellow-200 bg-white focus:border-orange-300 outline-none font-medium";
  return (
    <form onSubmit={submit} className="space-y-4 p-8 rounded-3xl" style={{ background: "#FFF5E0" }}>
      <input required placeholder="🦁 Your name" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className={inp} />
      <input placeholder="📱 Phone" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} className={inp} />
      <div className="flex gap-3">
        <select value={form.guests} onChange={e=>setForm(f=>({...f,guests:e.target.value}))} className={inp}>
          {[1,2,3,4,5].map(n=><option key={n} value={n}>{n} Friend{n>1?"s":""}</option>)}
        </select>
        <select value={form.meal_pref} onChange={e=>setForm(f=>({...f,meal_pref:e.target.value}))} className={inp}>
          <option value="VEG">🥗 Veg</option>
          <option value="NON_VEG">🍗 Non-Veg</option>
          <option value="VEGAN">🌱 Vegan</option>
        </select>
      </div>
      <textarea rows={3} placeholder="Any special message?" value={form.message} onChange={e=>setForm(f=>({...f,message:e.target.value}))} className={inp} />
      <button type="submit" className="w-full py-4 rounded-2xl text-white font-black text-xl hover:scale-[1.02] transition-transform shadow-lg"
        style={{ background: "#FF6348" }}>
        {state==="loading"?"🎈 Sending…":"YES, I'm Coming! 🎉"}
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
    <div className="text-center p-10 rounded-3xl" style={{ background: "#E5F5FF" }}>
      <div className="text-6xl mb-3">💌</div>
      <p className="text-2xl font-black" style={{ color: "#0097A7" }}>Wish sent! 🎉</p>
    </div>
  );

  const inp = "w-full px-4 py-3 rounded-2xl text-sm border-2 border-blue-100 bg-white focus:border-blue-300 outline-none font-medium";
  return (
    <form onSubmit={submit} className="space-y-4 p-8 rounded-3xl" style={{ background: "#E5F5FF" }}>
      <input required placeholder="🐼 Your name" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className={inp} />
      <input placeholder="🤝 Relation" value={form.relation} onChange={e=>setForm(f=>({...f,relation:e.target.value}))} className={inp} />
      <textarea required rows={4} placeholder="Write a super fun birthday wish! 🎊" value={form.message} onChange={e=>setForm(f=>({...f,message:e.target.value}))} className={inp} />
      <button type="submit" className="w-full py-4 rounded-2xl text-white font-black text-xl hover:scale-[1.02] transition-transform shadow-lg"
        style={{ background: "#0097A7" }}>
        {state==="loading"?"Sending…":"Send Wish! ⭐"}
      </button>
    </form>
  );
}
