"use client";
/**
 * Theme 5 — Cinematic Dark
 * Deep black background. White typography. Gold accents.
 * Movie-poster inspired. Bold, dramatic, elegant.
 */
import { useState } from "react";
import { invitationApi } from "@/lib/api";
import toast from "react-hot-toast";

const GOLD   = "#D4AF6A";
const BG     = "#0C0C0C";
const CARD   = "#161616";
const MUTED  = "#888";

function CineLine() {
  return (
    <div className="flex items-center gap-4 my-8 justify-center">
      <div className="h-px flex-1 max-w-16" style={{ background: GOLD, opacity: 0.5 }} />
      <span style={{ color: GOLD, opacity: 0.8, fontSize: "10px", letterSpacing: "0.4em" }}>
        ◆ ◆ ◆
      </span>
      <div className="h-px flex-1 max-w-16" style={{ background: GOLD, opacity: 0.5 }} />
    </div>
  );
}

export default function CinematicDark({ data }: { data: any }) {
  const [rsvp, setRsvp]    = useState({ name: "", attendance: "YES", message: "" });
  const [wish, setWish]    = useState({ name: "", message: "", relationship: "" });
  const [sending, setSending] = useState(false);
  const API = process.env.NEXT_PUBLIC_API_URL || "";

  const submitRSVP = async (e: React.FormEvent) => {
    e.preventDefault(); setSending(true);
    try {
      await invitationApi.rsvp(data.slug, rsvp);
      toast.success("RSVP confirmed.");
      setRsvp({ name: "", attendance: "YES", message: "" });
    } catch { toast.error("Failed. Please try again."); }
    finally { setSending(false); }
  };

  const submitWish = async (e: React.FormEvent) => {
    e.preventDefault(); setSending(true);
    try {
      await invitationApi.wish(data.slug, wish);
      toast.success("Your wish has been received.");
      setWish({ name: "", message: "", relationship: "" });
    } catch { toast.error("Failed. Please try again."); }
    finally { setSending(false); }
  };

  return (
    <div className="min-h-screen font-serif" style={{ background: BG, color: "white" }}>

      {/* ── Hero ────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background photo */}
        {data.thumbnail ? (
          <>
            <img src={`${API}${data.thumbnail}`}
              className="absolute inset-0 w-full h-full object-cover opacity-30" alt="" />
            <div className="absolute inset-0"
              style={{ background: "linear-gradient(to bottom, #0C0C0C 0%, transparent 30%, transparent 70%, #0C0C0C 100%)" }} />
          </>
        ) : (
          <div className="absolute inset-0"
            style={{ background: `radial-gradient(ellipse at center, #1A1008 0%, ${BG} 70%)` }} />
        )}

        {/* Film grain effect */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} />

        <div className="relative z-10 text-center px-6 max-w-3xl mx-auto">
          {/* Gold top line */}
          <div className="w-16 h-0.5 mx-auto mb-8" style={{ background: GOLD }} />

          <p className="text-xs uppercase tracking-[0.6em] mb-8" style={{ color: GOLD }}>
            A Wedding Celebration
          </p>

          <h1 className="text-6xl md:text-8xl font-light tracking-wider mb-6 leading-none">
            {data.couple}
          </h1>

          {data.groom_info && data.bride_info && (
            <p className="text-sm opacity-40 tracking-widest mb-8">
              {data.groom_info} &amp; {data.bride_info}
            </p>
          )}

          {data.countdown?.event_date && (
            <div className="inline-block">
              <p className="text-xs uppercase tracking-[0.5em] mb-2" style={{ color: GOLD }}>
                Save the Date
              </p>
              <p className="text-xl tracking-widest opacity-80">
                {new Date(data.countdown.event_date).toLocaleDateString("en-IN", {
                  weekday: "long", year: "numeric", month: "long", day: "numeric",
                })}
              </p>
            </div>
          )}

          {/* Gold bottom line */}
          <div className="w-16 h-0.5 mx-auto mt-8" style={{ background: GOLD }} />
        </div>

        {/* Scroll arrow */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-30 animate-bounce">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12l7 7 7-7" stroke="white" strokeWidth="1" strokeLinecap="round"/>
          </svg>
        </div>
      </section>

      {/* ── Couple ──────────────────────────────── */}
      {data.bridegroom && (
        <section className="py-24 px-6 text-center" style={{ background: CARD }}>
          <p className="text-xs uppercase tracking-[0.5em] mb-2" style={{ color: GOLD }}>
            Introducing
          </p>
          <h2 className="text-3xl font-light tracking-widest mb-2">The Couple</h2>
          <CineLine />

          <div className="grid md:grid-cols-2 gap-16 max-w-3xl mx-auto">
            {[
              { name: data.bridegroom.groom_name, desc: data.bridegroom.groom_description, img: data.bridegroom.groom_image },
              { name: data.bridegroom.bride_name, desc: data.bridegroom.bride_description, img: data.bridegroom.bride_image },
            ].map(({ name, desc, img }) => (
              <div key={name} className="text-center">
                {img ? (
                  <img src={`${API}${img}`}
                    className="w-44 h-44 rounded-full object-cover mx-auto mb-6"
                    style={{ border: `2px solid ${GOLD}`, filter: "grayscale(20%)" }}
                    alt={name} />
                ) : (
                  <div className="w-44 h-44 rounded-full mx-auto mb-6 flex items-center justify-center text-5xl"
                    style={{ border: `2px solid ${GOLD}40`, background: "#1A1A1A" }}>
                    🎬
                  </div>
                )}
                <h3 className="text-2xl font-light tracking-wider mb-3" style={{ color: GOLD }}>
                  {name}
                </h3>
                <p className="text-sm opacity-50 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Events ──────────────────────────────── */}
      {data.events?.length > 0 && (
        <section className="py-24 px-6 text-center">
          <p className="text-xs uppercase tracking-[0.5em] mb-2" style={{ color: GOLD }}>
            Coming Soon
          </p>
          <h2 className="text-3xl font-light tracking-widest mb-2">Events</h2>
          <CineLine />

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {data.events.map((ev: any) => (
              <div key={ev.id}
                className="rounded-2xl p-6 text-left border"
                style={{ background: CARD, borderColor: `${GOLD}20` }}>
                {ev.image && (
                  <img src={`${API}${ev.image}`}
                    className="w-full h-36 object-cover rounded-xl mb-4"
                    style={{ filter: "grayscale(30%) contrast(1.1)" }}
                    alt={ev.title} />
                )}
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: GOLD }}>
                  {ev.time}
                </p>
                <h3 className="text-lg tracking-wide mb-1">{ev.title}</h3>
                <p className="text-sm opacity-40 mb-2">📍 {ev.location_name}</p>
                <p className="text-sm opacity-60">{ev.desc}</p>
                {ev.location_link && (
                  <a href={ev.location_link} target="_blank" rel="noopener"
                    className="text-xs mt-2 inline-block hover:opacity-80" style={{ color: GOLD }}>
                    View Location →
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── RSVP ──────────────────────────────── */}
      <section className="py-24 px-6 text-center" style={{ background: CARD }}>
        <p className="text-xs uppercase tracking-[0.5em] mb-2" style={{ color: GOLD }}>
          Curtain Call
        </p>
        <h2 className="text-3xl font-light tracking-widest mb-2">RSVP</h2>
        <CineLine />

        <form onSubmit={submitRSVP} className="max-w-sm mx-auto space-y-4 text-left">
          <input required value={rsvp.name} placeholder="Your full name"
            onChange={(e) => setRsvp({ ...rsvp, name: e.target.value })}
            className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none text-white placeholder-gray-600"
            style={{ background: "#222", border: `1px solid ${GOLD}30` }} />
          <select value={rsvp.attendance}
            onChange={(e) => setRsvp({ ...rsvp, attendance: e.target.value })}
            className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none text-white"
            style={{ background: "#222", border: `1px solid ${GOLD}30` }}>
            <option value="YES">I will be there</option>
            <option value="NO">Unable to attend</option>
            <option value="MAYBE">I'll try to make it</option>
          </select>
          <textarea value={rsvp.message} placeholder="A note for the couple (optional)"
            onChange={(e) => setRsvp({ ...rsvp, message: e.target.value })}
            className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none text-white placeholder-gray-600 h-24 resize-none"
            style={{ background: "#222", border: `1px solid ${GOLD}30` }} />
          <button type="submit" disabled={sending}
            className="w-full py-3 rounded-xl text-sm font-medium tracking-[0.3em] uppercase"
            style={{ background: GOLD, color: BG }}>
            {sending ? "Confirming..." : "Confirm RSVP"}
          </button>
        </form>
      </section>

      {/* ── Wishes ──────────────────────────── */}
      <section className="py-24 px-6">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.5em] mb-2" style={{ color: GOLD }}>
            End Credits
          </p>
          <h2 className="text-3xl font-light tracking-widest mb-2">Leave a Wish</h2>
          <CineLine />
        </div>

        <form onSubmit={submitWish} className="max-w-sm mx-auto space-y-4">
          <input required value={wish.name} placeholder="Your name"
            onChange={(e) => setWish({ ...wish, name: e.target.value })}
            className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none text-white placeholder-gray-600"
            style={{ background: CARD, border: `1px solid ${GOLD}30` }} />
          <input value={wish.relationship} placeholder="Your relation to the couple"
            onChange={(e) => setWish({ ...wish, relationship: e.target.value })}
            className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none text-white placeholder-gray-600"
            style={{ background: CARD, border: `1px solid ${GOLD}30` }} />
          <textarea required value={wish.message} placeholder="Your message..."
            onChange={(e) => setWish({ ...wish, message: e.target.value })}
            className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none text-white placeholder-gray-600 h-28 resize-none"
            style={{ background: CARD, border: `1px solid ${GOLD}30` }} />
          <button type="submit" disabled={sending}
            className="w-full py-3 rounded-xl text-sm font-medium tracking-[0.3em] uppercase"
            style={{ border: `1px solid ${GOLD}`, color: GOLD, background: "transparent" }}>
            {sending ? "Sending..." : "Send Wish"}
          </button>
        </form>

        {data.wishes?.length > 0 && (
          <div className="max-w-lg mx-auto mt-16 space-y-4">
            {data.wishes.map((w: any) => (
              <div key={w.id} className="border-l-2 pl-5 py-1"
                style={{ borderColor: `${GOLD}40` }}>
                <p className="text-sm italic opacity-70">"{w.message}"</p>
                <p className="text-xs opacity-30 mt-1">
                  — {w.name}{w.relationship ? `, ${w.relationship}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="text-center py-8 text-xs"
        style={{ color: MUTED, borderTop: `1px solid #222` }}>
        A film by <span style={{ color: GOLD }}>Planazo</span>
      </footer>
    </div>
  );
}
