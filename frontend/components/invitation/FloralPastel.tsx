"use client";
/**
 * Theme 4 — Floral Pastel
 * Soft pink, lavender, sage green. Romantic & airy.
 * Perfect for modern Indian couples wanting a dreamy aesthetic.
 */
import { useState } from "react";
import { invitationApi } from "@/lib/api";
import toast from "react-hot-toast";

const PINK    = "#D4728A";
const LAVEND  = "#9B8EC4";
const SAGE    = "#7DAA88";
const BLUSH   = "#FEF0F3";
const LILAC   = "#F5F2FF";
const TEXT    = "#3D2C35";

function FloralDivider() {
  return (
    <div className="flex items-center justify-center gap-3 my-8 text-2xl opacity-60">
      <span>🌸</span><span>🌿</span><span>🌸</span>
    </div>
  );
}

export default function FloralPastel({ data }: { data: any }) {
  const [rsvp, setRsvp]    = useState({ name: "", attendance: "YES", message: "" });
  const [wish, setWish]    = useState({ name: "", message: "", relationship: "" });
  const [sending, setSending] = useState(false);
  const API = process.env.NEXT_PUBLIC_API_URL || "";

  const submitRSVP = async (e: React.FormEvent) => {
    e.preventDefault(); setSending(true);
    try {
      await invitationApi.rsvp(data.slug, rsvp);
      toast.success("RSVP sent! 🌸");
      setRsvp({ name: "", attendance: "YES", message: "" });
    } catch { toast.error("Failed. Please try again."); }
    finally { setSending(false); }
  };

  const submitWish = async (e: React.FormEvent) => {
    e.preventDefault(); setSending(true);
    try {
      await invitationApi.wish(data.slug, wish);
      toast.success("Wish sent! 💌");
      setWish({ name: "", message: "", relationship: "" });
    } catch { toast.error("Failed. Please try again."); }
    finally { setSending(false); }
  };

  return (
    <div className="min-h-screen font-serif" style={{ background: BLUSH, color: TEXT }}>

      {/* ── Hero ──────────────────────────────── */}
      <section
        className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 py-20"
        style={{ background: `linear-gradient(180deg, ${BLUSH} 0%, ${LILAC} 100%)` }}
      >
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20"
          style={{ background: PINK, transform: "translate(30%, -30%)" }} />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-15"
          style={{ background: LAVEND, transform: "translate(-30%, 30%)" }} />

        {data.thumbnail ? (
          <div className="relative mb-8">
            <div className="w-56 h-56 rounded-full overflow-hidden mx-auto border-8"
              style={{ borderColor: "white", boxShadow: `0 8px 40px ${PINK}40` }}>
              <img src={`${API}${data.thumbnail}`}
                className="w-full h-full object-cover" alt={data.couple} />
            </div>
          </div>
        ) : (
          <div className="text-5xl mb-6">💐</div>
        )}

        <p className="text-xs uppercase tracking-[0.4em] mb-4 opacity-60" style={{ color: PINK }}>
          Together with their families
        </p>

        <h1 className="text-5xl md:text-7xl font-light mb-6 leading-tight" style={{ color: TEXT }}>
          {data.couple.split("&").map((name: string, i: number) => (
            <span key={i}>
              {i > 0 && <span className="text-3xl mx-4" style={{ color: PINK }}>&</span>}
              {name.trim()}
            </span>
          ))}
        </h1>

        {data.groom_info && data.bride_info && (
          <p className="text-sm opacity-60 mb-6">
            {data.groom_info} &amp; {data.bride_info}
          </p>
        )}

        {data.countdown?.event_date && (
          <div className="px-8 py-4 rounded-2xl mt-2"
            style={{ background: "white", boxShadow: `0 4px 24px ${PINK}25` }}>
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: LAVEND }}>
              Our Wedding Day
            </p>
            <p className="text-base font-medium">
              {new Date(data.countdown.event_date).toLocaleDateString("en-IN", {
                weekday: "long", year: "numeric", month: "long", day: "numeric",
              })}
            </p>
          </div>
        )}

        <FloralDivider />
      </section>

      {/* ── Couple ────────────────────────────── */}
      {data.bridegroom && (
        <section className="py-20 px-6 text-center" style={{ background: "white" }}>
          <p className="text-xs uppercase tracking-[0.35em] mb-2" style={{ color: LAVEND }}>
            Our Story
          </p>
          <h2 className="text-3xl font-light mb-2">The Happy Couple</h2>
          <FloralDivider />

          <div className="grid md:grid-cols-2 gap-10 max-w-3xl mx-auto">
            {[
              { name: data.bridegroom.groom_name, desc: data.bridegroom.groom_description, img: data.bridegroom.groom_image, emoji: "🤵" },
              { name: data.bridegroom.bride_name, desc: data.bridegroom.bride_description, img: data.bridegroom.bride_image, emoji: "👰" },
            ].map(({ name, desc, img, emoji }) => (
              <div key={name} className="text-center">
                <div className="relative inline-block mb-4">
                  {img ? (
                    <img src={`${API}${img}`}
                      className="w-40 h-40 rounded-full object-cover mx-auto border-4"
                      style={{ borderColor: PINK }} alt={name} />
                  ) : (
                    <div className="w-40 h-40 rounded-full mx-auto border-4 flex items-center justify-center text-5xl"
                      style={{ borderColor: PINK, background: BLUSH }}>
                      {emoji}
                    </div>
                  )}
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full border-4 border-white
                                  flex items-center justify-center text-lg"
                    style={{ background: BLUSH }}>
                    🌸
                  </div>
                </div>
                <h3 className="text-2xl font-light mb-2" style={{ color: PINK }}>{name}</h3>
                <p className="text-sm opacity-70 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Events ────────────────────────────── */}
      {data.events?.length > 0 && (
        <section className="py-20 px-6 text-center" style={{ background: LILAC }}>
          <p className="text-xs uppercase tracking-[0.35em] mb-2" style={{ color: LAVEND }}>
            Join us for
          </p>
          <h2 className="text-3xl font-light mb-2">Wedding Events</h2>
          <FloralDivider />

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {data.events.map((ev: any) => (
              <div key={ev.id} className="rounded-2xl p-6 text-left"
                style={{ background: "white", boxShadow: `0 4px 20px ${LAVEND}20` }}>
                {ev.image && (
                  <img src={`${API}${ev.image}`}
                    className="w-full h-36 object-cover rounded-xl mb-4" alt={ev.title} />
                )}
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: LAVEND }}>
                  {ev.time}
                </p>
                <h3 className="text-lg font-medium mb-1" style={{ color: PINK }}>{ev.title}</h3>
                <p className="text-sm opacity-60 mb-2">📍 {ev.location_name}</p>
                <p className="text-sm opacity-70">{ev.desc}</p>
                {ev.location_link && (
                  <a href={ev.location_link} target="_blank" rel="noopener"
                    className="text-xs mt-2 inline-block hover:underline" style={{ color: LAVEND }}>
                    View on Maps →
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── RSVP ──────────────────────────────── */}
      <section className="py-20 px-6 text-center" style={{ background: "white" }}>
        <p className="text-xs uppercase tracking-[0.35em] mb-2" style={{ color: SAGE }}>
          Kindly let us know
        </p>
        <h2 className="text-3xl font-light mb-2">Will you join us?</h2>
        <FloralDivider />

        <form onSubmit={submitRSVP} className="max-w-sm mx-auto space-y-4 text-left">
          <input required value={rsvp.name} placeholder="Your full name"
            onChange={(e) => setRsvp({ ...rsvp, name: e.target.value })}
            className="w-full border-2 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2"
            style={{ borderColor: `${PINK}50`, background: BLUSH }} />
          <select value={rsvp.attendance}
            onChange={(e) => setRsvp({ ...rsvp, attendance: e.target.value })}
            className="w-full border-2 rounded-2xl px-4 py-3 text-sm focus:outline-none"
            style={{ borderColor: `${PINK}50`, background: BLUSH }}>
            <option value="YES">🌸 Joyfully Accepts</option>
            <option value="NO">💔 Regretfully Declines</option>
            <option value="MAYBE">🤍 Maybe</option>
          </select>
          <textarea value={rsvp.message} placeholder="A sweet note for us (optional)"
            onChange={(e) => setRsvp({ ...rsvp, message: e.target.value })}
            className="w-full border-2 rounded-2xl px-4 py-3 text-sm focus:outline-none h-24 resize-none"
            style={{ borderColor: `${PINK}50`, background: BLUSH }} />
          <button type="submit" disabled={sending}
            className="w-full py-3 rounded-2xl text-sm font-medium text-white tracking-wider"
            style={{ background: PINK }}>
            {sending ? "Sending..." : "RSVP 🌸"}
          </button>
        </form>
      </section>

      {/* ── Wishes ──────────────────────────── */}
      <section className="py-20 px-6" style={{ background: BLUSH }}>
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.35em] mb-2" style={{ color: LAVEND }}>
            Shower your love
          </p>
          <h2 className="text-3xl font-light mb-2">Leave a Wish 💌</h2>
          <FloralDivider />
        </div>

        <form onSubmit={submitWish} className="max-w-sm mx-auto space-y-4">
          <input required value={wish.name} placeholder="Your name"
            onChange={(e) => setWish({ ...wish, name: e.target.value })}
            className="w-full border-2 rounded-2xl px-4 py-3 text-sm focus:outline-none"
            style={{ borderColor: `${LAVEND}50`, background: "white" }} />
          <input value={wish.relationship} placeholder="How do you know them?"
            onChange={(e) => setWish({ ...wish, relationship: e.target.value })}
            className="w-full border-2 rounded-2xl px-4 py-3 text-sm focus:outline-none"
            style={{ borderColor: `${LAVEND}50`, background: "white" }} />
          <textarea required value={wish.message} placeholder="Write a heartfelt message..."
            onChange={(e) => setWish({ ...wish, message: e.target.value })}
            className="w-full border-2 rounded-2xl px-4 py-3 text-sm focus:outline-none h-28 resize-none"
            style={{ borderColor: `${LAVEND}50`, background: "white" }} />
          <button type="submit" disabled={sending}
            className="w-full py-3 rounded-2xl text-sm font-medium text-white tracking-wider"
            style={{ background: LAVEND }}>
            {sending ? "Sending..." : "SEND WISH 💜"}
          </button>
        </form>

        {data.wishes?.length > 0 && (
          <div className="max-w-lg mx-auto mt-12 grid gap-4">
            {data.wishes.map((w: any) => (
              <div key={w.id} className="rounded-2xl p-5"
                style={{ background: "white", boxShadow: `0 2px 12px ${PINK}20` }}>
                <p className="text-sm italic opacity-80 mb-2">"{w.message}"</p>
                <p className="text-xs opacity-50">
                  — {w.name}{w.relationship ? `, ${w.relationship}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="text-center py-8 text-xs opacity-40">
        Made with 🌸 on <span style={{ color: PINK }}>Planazo</span>
      </footer>
    </div>
  );
}
