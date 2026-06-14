"use client";
/**
 * Theme 1 — Royal Mughal
 * Deep burgundy + gold. Arch motifs. Mandala-inspired dividers.
 * Rich heritage aesthetic for North Indian weddings.
 */
import { useState } from "react";
import { invitationApi } from "@/lib/api";
import toast from "react-hot-toast";

const GOLD   = "#C9952A";
const BURG   = "#5C0F2A";
const CREAM  = "#FDF6EC";

/* SVG ornament — simplified mandala arc */
function MandalaLine() {
  return (
    <svg viewBox="0 0 400 24" className="w-full max-w-xs mx-auto" fill="none">
      <line x1="0" y1="12" x2="160" y2="12" stroke={GOLD} strokeWidth="0.5" />
      <circle cx="200" cy="12" r="10" stroke={GOLD} strokeWidth="0.8" fill="none" />
      <circle cx="200" cy="12" r="5"  stroke={GOLD} strokeWidth="0.5" fill="none" />
      <circle cx="200" cy="12" r="1.5" fill={GOLD} />
      <line x1="240" y1="12" x2="400" y2="12" stroke={GOLD} strokeWidth="0.5" />
      {/* petals */}
      {[0,60,120,180,240,300].map(a => {
        const r = a * Math.PI / 180;
        const x = 200 + 8 * Math.cos(r);
        const y = 12  + 8 * Math.sin(r);
        return <circle key={a} cx={x} cy={y} r="1" fill={GOLD} opacity="0.6" />;
      })}
    </svg>
  );
}

export default function RoyalMughal({ data }: { data: any }) {
  const [rsvp, setRsvp]    = useState({ name: "", attendance: "YES", message: "" });
  const [wish, setWish]    = useState({ name: "", message: "", relationship: "" });
  const [sending, setSending] = useState(false);
  const API = process.env.NEXT_PUBLIC_API_URL || "";

  const submitRSVP = async (e: React.FormEvent) => {
    e.preventDefault(); setSending(true);
    try {
      await invitationApi.rsvp(data.slug, rsvp);
      toast.success("RSVP sent! 🙏");
      setRsvp({ name: "", attendance: "YES", message: "" });
    } catch { toast.error("Failed. Please try again."); }
    finally { setSending(false); }
  };

  const submitWish = async (e: React.FormEvent) => {
    e.preventDefault(); setSending(true);
    try {
      await invitationApi.wish(data.slug, wish);
      toast.success("Wish sent! 💐");
      setWish({ name: "", message: "", relationship: "" });
    } catch { toast.error("Failed. Please try again."); }
    finally { setSending(false); }
  };

  return (
    <div className="min-h-screen font-serif" style={{ background: CREAM, color: "#2C0A1A" }}>

      {/* ── Hero ─────────────────────────────────── */}
      <section
        className="relative min-h-screen flex flex-col items-center justify-center text-center overflow-hidden px-4"
        style={{ background: `linear-gradient(160deg, ${BURG} 0%, #3A0718 100%)` }}
      >
        {/* Background photo if set */}
        {data.thumbnail && (
          <img src={`${API}${data.thumbnail}`}
            className="absolute inset-0 w-full h-full object-cover opacity-25" alt="" />
        )}

        {/* Top arch ornament */}
        <div className="relative z-10 pt-16 pb-12 w-full max-w-xl mx-auto">
          {/* Gold arch border */}
          <div className="border-2 mx-6 rounded-t-full p-10 relative"
            style={{ borderColor: GOLD }}>
            <div className="border mx-4 rounded-t-full p-8 relative"
              style={{ borderColor: `${GOLD}66` }}>

              <p className="text-xs uppercase tracking-[0.4em] mb-6 opacity-70" style={{ color: GOLD }}>
                With the blessings of our families
              </p>

              <h1 className="text-5xl md:text-7xl font-light leading-tight mb-4" style={{ color: GOLD }}>
                {data.couple}
              </h1>

              <MandalaLine />

              {data.countdown?.event_date && (
                <p className="mt-6 text-sm tracking-widest opacity-80" style={{ color: CREAM }}>
                  {new Date(data.countdown.event_date).toLocaleDateString("en-IN", {
                    weekday: "long", year: "numeric", month: "long", day: "numeric",
                  })}
                </p>
              )}

              {data.groom_info && data.bride_info && (
                <p className="text-xs opacity-60 mt-3" style={{ color: CREAM }}>
                  {data.groom_info} &amp; {data.bride_info}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Bride & Groom ────────────────────────── */}
      {data.bridegroom && (
        <section className="py-20 px-6 text-center" style={{ background: CREAM }}>
          <p className="text-xs uppercase tracking-[0.3em] mb-2" style={{ color: GOLD }}>
            The Blessed Couple
          </p>
          <h2 className="text-3xl font-light mb-3">Meet the Couple</h2>
          <MandalaLine />

          <div className="grid md:grid-cols-2 gap-12 max-w-3xl mx-auto mt-12">
            {[
              { name: data.bridegroom.groom_name, desc: data.bridegroom.groom_description, img: data.bridegroom.groom_image, label: "Groom" },
              { name: data.bridegroom.bride_name, desc: data.bridegroom.bride_description, img: data.bridegroom.bride_image, label: "Bride" },
            ].map(({ name, desc, img, label }) => (
              <div key={label} className="text-center">
                <div className="relative inline-block">
                  {img ? (
                    <img src={`${API}${img}`}
                      className="w-44 h-44 rounded-full object-cover mx-auto mb-4 border-4"
                      style={{ borderColor: GOLD }} alt={name} />
                  ) : (
                    <div className="w-44 h-44 rounded-full mx-auto mb-4 border-4 flex items-center justify-center text-5xl"
                      style={{ borderColor: GOLD, background: `${BURG}15` }}>
                      {label === "Groom" ? "🤵" : "👰"}
                    </div>
                  )}
                </div>
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: GOLD }}>{label}</p>
                <h3 className="text-2xl font-light mb-2">{name}</h3>
                <p className="text-sm opacity-70 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Events ───────────────────────────────── */}
      {data.events?.length > 0 && (
        <section className="py-20 px-6 text-center" style={{ background: `${BURG}08` }}>
          <p className="text-xs uppercase tracking-[0.3em] mb-2" style={{ color: GOLD }}>
            Celebrations
          </p>
          <h2 className="text-3xl font-light mb-3">Wedding Events</h2>
          <MandalaLine />

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mt-12">
            {data.events.map((ev: any) => (
              <div key={ev.id} className="rounded-2xl p-6 border text-left"
                style={{ borderColor: `${GOLD}40`, background: "white" }}>
                {ev.image && (
                  <img src={`${API}${ev.image}`}
                    className="w-full h-32 object-cover rounded-xl mb-4" alt={ev.title} />
                )}
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: GOLD }}>
                  {ev.time}
                </p>
                <h3 className="text-lg font-medium mb-1">{ev.title}</h3>
                <p className="text-sm opacity-60 mb-2">{ev.location_name}</p>
                <p className="text-sm opacity-70">{ev.desc}</p>
                {ev.location_link && (
                  <a href={ev.location_link} target="_blank" rel="noopener"
                    className="text-xs mt-3 inline-block hover:underline" style={{ color: GOLD }}>
                    📍 View Location
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── RSVP ─────────────────────────────────── */}
      <section className="py-20 px-6 text-center">
        <p className="text-xs uppercase tracking-[0.3em] mb-2" style={{ color: GOLD }}>
          Kindly Respond
        </p>
        <h2 className="text-3xl font-light mb-3">RSVP</h2>
        <MandalaLine />

        <form onSubmit={submitRSVP} className="max-w-sm mx-auto mt-10 space-y-4 text-left">
          <input required value={rsvp.name} placeholder="Your full name"
            onChange={(e) => setRsvp({ ...rsvp, name: e.target.value })}
            className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2"
            style={{ borderColor: `${GOLD}60`, background: "white" }} />
          <select value={rsvp.attendance}
            onChange={(e) => setRsvp({ ...rsvp, attendance: e.target.value })}
            className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none"
            style={{ borderColor: `${GOLD}60`, background: "white" }}>
            <option value="YES">Joyfully Accepts</option>
            <option value="NO">Regretfully Declines</option>
            <option value="MAYBE">Maybe</option>
          </select>
          <textarea value={rsvp.message} placeholder="A message for the couple (optional)"
            onChange={(e) => setRsvp({ ...rsvp, message: e.target.value })}
            className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none h-24 resize-none"
            style={{ borderColor: `${GOLD}60`, background: "white" }} />
          <button type="submit" disabled={sending}
            className="w-full py-3 rounded-xl text-sm font-medium tracking-wider transition"
            style={{ background: BURG, color: GOLD }}>
            {sending ? "Sending..." : "SEND RSVP 🙏"}
          </button>
        </form>
      </section>

      {/* ── Wishes ───────────────────────────────── */}
      <section className="py-20 px-6 text-center" style={{ background: `${BURG}08` }}>
        <p className="text-xs uppercase tracking-[0.3em] mb-2" style={{ color: GOLD }}>
          Blessings &amp; Wishes
        </p>
        <h2 className="text-3xl font-light mb-3">Leave a Wish</h2>
        <MandalaLine />

        <form onSubmit={submitWish} className="max-w-sm mx-auto mt-10 space-y-4 text-left">
          <input required value={wish.name} placeholder="Your name"
            onChange={(e) => setWish({ ...wish, name: e.target.value })}
            className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none"
            style={{ borderColor: `${GOLD}60`, background: "white" }} />
          <input value={wish.relationship} placeholder="Your relation (e.g. Uncle, Friend)"
            onChange={(e) => setWish({ ...wish, relationship: e.target.value })}
            className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none"
            style={{ borderColor: `${GOLD}60`, background: "white" }} />
          <textarea required value={wish.message} placeholder="Your heartfelt blessings..."
            onChange={(e) => setWish({ ...wish, message: e.target.value })}
            className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none h-28 resize-none"
            style={{ borderColor: `${GOLD}60`, background: "white" }} />
          <button type="submit" disabled={sending}
            className="w-full py-3 rounded-xl text-sm font-medium tracking-wider"
            style={{ background: GOLD, color: BURG }}>
            {sending ? "Sending..." : "SEND BLESSINGS 💐"}
          </button>
        </form>

        {data.wishes?.length > 0 && (
          <div className="max-w-lg mx-auto mt-12 space-y-4">
            {data.wishes.map((w: any) => (
              <div key={w.id} className="rounded-xl p-5 text-left border"
                style={{ background: "white", borderColor: `${GOLD}30` }}>
                <p className="text-sm italic opacity-80 mb-2">"{w.message}"</p>
                <p className="text-xs opacity-50">— {w.name}{w.relationship ? `, ${w.relationship}` : ""}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="text-center py-8 text-xs opacity-40">
        Created with ❤️ on <span style={{ color: GOLD }}>Planazo</span>
      </footer>
    </div>
  );
}
