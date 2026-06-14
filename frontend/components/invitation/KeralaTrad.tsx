"use client";
/**
 * Theme 2 — Kerala Traditional
 * Cream + deep red + gold. Kasavu border aesthetic.
 * Classic South Indian wedding look.
 */
import { useState } from "react";
import { invitationApi } from "@/lib/api";
import toast from "react-hot-toast";

const RED    = "#9B1C1C";
const GOLD   = "#B7860B";
const CREAM  = "#FFFBF2";
const DARK   = "#1A0A00";

function KasavuBorder() {
  return (
    <div className="flex items-center gap-0 w-full">
      <div className="flex-1 h-1" style={{ background: RED }} />
      <div className="flex-1 h-0.5" style={{ background: GOLD }} />
      <div className="flex-1 h-1" style={{ background: RED }} />
    </div>
  );
}

function KasavuDivider() {
  return (
    <div className="my-8 flex flex-col gap-1 max-w-xs mx-auto">
      <KasavuBorder />
      <div className="text-center text-lg" style={{ color: GOLD }}>✦ ✦ ✦</div>
      <KasavuBorder />
    </div>
  );
}

export default function KeralaTrad({ data }: { data: any }) {
  const [rsvp, setRsvp]    = useState({ name: "", attendance: "YES", message: "" });
  const [wish, setWish]    = useState({ name: "", message: "", relationship: "" });
  const [sending, setSending] = useState(false);
  const API = process.env.NEXT_PUBLIC_API_URL || "";

  const submitRSVP = async (e: React.FormEvent) => {
    e.preventDefault(); setSending(true);
    try {
      await invitationApi.rsvp(data.slug, rsvp);
      toast.success("RSVP received! 🙏");
      setRsvp({ name: "", attendance: "YES", message: "" });
    } catch { toast.error("Failed. Please try again."); }
    finally { setSending(false); }
  };

  const submitWish = async (e: React.FormEvent) => {
    e.preventDefault(); setSending(true);
    try {
      await invitationApi.wish(data.slug, wish);
      toast.success("Wish sent! 🌸");
      setWish({ name: "", message: "", relationship: "" });
    } catch { toast.error("Failed. Please try again."); }
    finally { setSending(false); }
  };

  return (
    <div className="min-h-screen font-serif" style={{ background: CREAM, color: DARK }}>

      {/* Top Kasavu stripe */}
      <div style={{ background: RED, height: "12px" }} />
      <div style={{ background: GOLD, height: "4px" }} />

      {/* ── Hero ────────────────────────────── */}
      <section className="py-20 px-6 text-center relative">
        {data.thumbnail && (
          <div className="w-48 h-48 mx-auto mb-8 rounded-full overflow-hidden border-4"
            style={{ borderColor: RED }}>
            <img src={`${API}${data.thumbnail}`}
              className="w-full h-full object-cover" alt={data.couple} />
          </div>
        )}

        <p className="text-xs uppercase tracking-[0.4em] mb-4 opacity-60" style={{ color: RED }}>
          Thirumanam Nimanthranapadhram
        </p>

        <h1 className="text-5xl md:text-6xl font-light mb-4" style={{ color: RED }}>
          {data.couple}
        </h1>

        {data.groom_info && data.bride_info && (
          <div className="text-sm opacity-70 mb-4">
            <p>{data.groom_info}</p>
            <p className="my-1" style={{ color: GOLD }}>✦</p>
            <p>{data.bride_info}</p>
          </div>
        )}

        {data.countdown?.event_date && (
          <div className="inline-block px-8 py-3 border-2 rounded-full mt-4"
            style={{ borderColor: GOLD, color: DARK }}>
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: GOLD }}>Wedding Day</p>
            <p className="text-base font-medium">
              {new Date(data.countdown.event_date).toLocaleDateString("en-IN", {
                weekday: "long", year: "numeric", month: "long", day: "numeric",
              })}
            </p>
          </div>
        )}

        <KasavuDivider />
      </section>

      {/* ── Couple ──────────────────────────── */}
      {data.bridegroom && (
        <section className="py-16 px-6" style={{ background: `${RED}08` }}>
          <h2 className="text-center text-2xl font-light mb-2">The Couple</h2>
          <p className="text-center text-xs tracking-widest mb-8 opacity-50">
            VADHU VARAN PARICHAYAM
          </p>
          <div className="grid md:grid-cols-2 gap-10 max-w-3xl mx-auto">
            {[
              { name: data.bridegroom.groom_name, desc: data.bridegroom.groom_description, img: data.bridegroom.groom_image, label: "വരൻ (Varan)" },
              { name: data.bridegroom.bride_name, desc: data.bridegroom.bride_description, img: data.bridegroom.bride_image, label: "വധു (Vadhu)" },
            ].map(({ name, desc, img, label }) => (
              <div key={label} className="text-center">
                {img ? (
                  <img src={`${API}${img}`}
                    className="w-36 h-36 rounded-full object-cover mx-auto mb-4 border-4"
                    style={{ borderColor: GOLD }} alt={name} />
                ) : (
                  <div className="w-36 h-36 rounded-full mx-auto mb-4 border-4 flex items-center justify-center text-4xl"
                    style={{ borderColor: GOLD, background: `${RED}10` }}>
                    🪷
                  </div>
                )}
                <p className="text-xs opacity-50 mb-1">{label}</p>
                <h3 className="text-xl font-medium mb-2" style={{ color: RED }}>{name}</h3>
                <p className="text-sm opacity-70 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Events ──────────────────────────── */}
      {data.events?.length > 0 && (
        <section className="py-16 px-6 text-center">
          <h2 className="text-2xl font-light mb-2">Events</h2>
          <p className="text-xs tracking-widest opacity-50 mb-8">KALYANAM VIVARAM</p>
          <div className="max-w-2xl mx-auto space-y-6">
            {data.events.map((ev: any) => (
              <div key={ev.id} className="flex gap-6 items-start text-left border-l-4 pl-5"
                style={{ borderColor: GOLD }}>
                {ev.image && (
                  <img src={`${API}${ev.image}`}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0" alt={ev.title} />
                )}
                <div>
                  <h3 className="font-medium text-base" style={{ color: RED }}>{ev.title}</h3>
                  <p className="text-sm opacity-60 mt-0.5">{ev.time} · {ev.location_name}</p>
                  <p className="text-sm opacity-70 mt-1">{ev.desc}</p>
                  {ev.location_link && (
                    <a href={ev.location_link} target="_blank" rel="noopener"
                      className="text-xs mt-1 inline-block hover:underline" style={{ color: RED }}>
                      📍 View on Map
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── RSVP ──────────────────────────── */}
      <section className="py-16 px-6" style={{ background: `${RED}08` }}>
        <h2 className="text-center text-2xl font-light mb-2">RSVP</h2>
        <p className="text-center text-xs tracking-widest opacity-50 mb-10">PADHEYAM STHIRIKARIKKANAM</p>
        <form onSubmit={submitRSVP} className="max-w-sm mx-auto space-y-4">
          <input required value={rsvp.name} placeholder="Your full name"
            onChange={(e) => setRsvp({ ...rsvp, name: e.target.value })}
            className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2"
            style={{ borderColor: `${RED}50` }} />
          <select value={rsvp.attendance}
            onChange={(e) => setRsvp({ ...rsvp, attendance: e.target.value })}
            className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none"
            style={{ borderColor: `${RED}50` }}>
            <option value="YES">I will attend</option>
            <option value="NO">Unable to attend</option>
            <option value="MAYBE">Will try to make it</option>
          </select>
          <textarea value={rsvp.message} placeholder="A blessing for the couple (optional)"
            onChange={(e) => setRsvp({ ...rsvp, message: e.target.value })}
            className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none h-24 resize-none"
            style={{ borderColor: `${RED}50` }} />
          <button type="submit" disabled={sending}
            className="w-full py-3 rounded-xl text-sm font-medium text-white tracking-wider"
            style={{ background: RED }}>
            {sending ? "Sending..." : "CONFIRM RSVP 🙏"}
          </button>
        </form>
      </section>

      {/* ── Wishes ──────────────────────────── */}
      <section className="py-16 px-6">
        <h2 className="text-center text-2xl font-light mb-2">Leave a Wish</h2>
        <p className="text-center text-xs tracking-widest opacity-50 mb-10">AASHAMSAKAL</p>
        <form onSubmit={submitWish} className="max-w-sm mx-auto space-y-4">
          <input required value={wish.name} placeholder="Your name"
            onChange={(e) => setWish({ ...wish, name: e.target.value })}
            className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none"
            style={{ borderColor: `${GOLD}50` }} />
          <input value={wish.relationship} placeholder="Relation (e.g. Uncle, Friend)"
            onChange={(e) => setWish({ ...wish, relationship: e.target.value })}
            className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none"
            style={{ borderColor: `${GOLD}50` }} />
          <textarea required value={wish.message} placeholder="Your blessings..."
            onChange={(e) => setWish({ ...wish, message: e.target.value })}
            className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none h-28 resize-none"
            style={{ borderColor: `${GOLD}50` }} />
          <button type="submit" disabled={sending}
            className="w-full py-3 rounded-xl text-sm font-medium tracking-wider"
            style={{ background: GOLD, color: "white" }}>
            {sending ? "Sending..." : "SEND BLESSINGS 🌸"}
          </button>
        </form>

        {data.wishes?.length > 0 && (
          <div className="max-w-lg mx-auto mt-12 space-y-4">
            {data.wishes.map((w: any) => (
              <div key={w.id} className="border-l-4 pl-5 py-2"
                style={{ borderColor: GOLD }}>
                <p className="text-sm italic opacity-80">"{w.message}"</p>
                <p className="text-xs opacity-50 mt-1">— {w.name}{w.relationship ? `, ${w.relationship}` : ""}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Bottom Kasavu stripe */}
      <div style={{ background: GOLD, height: "4px" }} />
      <div style={{ background: RED, height: "12px" }} />
      <footer className="text-center py-6 text-xs opacity-40" style={{ background: CREAM }}>
        Crafted with love on <span style={{ color: RED }}>Planazo</span>
      </footer>
    </div>
  );
}
