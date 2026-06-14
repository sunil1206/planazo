"use client";
/**
 * Theme 3 — Modern Minimal
 * Clean editorial style. Full-bleed hero photo.
 * Thin serif typography. Dark overlay.
 */
import { useState } from "react";
import { invitationApi } from "@/lib/api";
import toast from "react-hot-toast";

export default function ModernMinimal({ data }: { data: any }) {
  const [rsvp, setRsvp]    = useState({ name: "", attendance: "YES", message: "" });
  const [wish, setWish]    = useState({ name: "", message: "", relationship: "" });
  const [sending, setSending] = useState(false);

  const submitRSVP = async (e: React.FormEvent) => {
    e.preventDefault(); setSending(true);
    try {
      await invitationApi.rsvp(data.slug, rsvp);
      toast.success("RSVP sent! Thank you.");
      setRsvp({ name: "", attendance: "YES", message: "" });
    } catch { toast.error("Failed. Please try again."); }
    finally { setSending(false); }
  };

  const submitWish = async (e: React.FormEvent) => {
    e.preventDefault(); setSending(true);
    try {
      await invitationApi.wish(data.slug, wish);
      toast.success("Your wish has been sent!");
      setWish({ name: "", message: "", relationship: "" });
    } catch { toast.error("Failed. Please try again."); }
    finally { setSending(false); }
  };

  const API = process.env.NEXT_PUBLIC_API_URL || "";

  return (
    <div className="min-h-screen bg-white font-serif">
      {/* Hero */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {data.thumbnail ? (
          <img
            src={`${API}${data.thumbnail}`}
            className="absolute inset-0 w-full h-full object-cover"
            alt={data.couple}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900" />
        )}
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative text-center text-white px-4">
          <p className="text-sm uppercase tracking-[0.3em] mb-6 opacity-80">
            Together with their families
          </p>
          <h1 className="text-6xl md:text-8xl font-light mb-6 leading-tight">
            {data.couple}
          </h1>
          <div className="w-24 h-px bg-white/60 mx-auto mb-6" />
          {data.countdown?.event_date && (
            <p className="text-lg tracking-widest opacity-80">
              {new Date(data.countdown.event_date).toLocaleDateString("en-IN", {
                weekday: "long", year: "numeric", month: "long", day: "numeric",
              })}
            </p>
          )}
        </div>
        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-px h-12 bg-white/60 mx-auto" />
        </div>
      </section>

      {/* Bride & Groom */}
      {data.bridegroom && (
        <section className="max-w-4xl mx-auto py-24 px-6">
          <h2 className="text-center text-3xl font-light tracking-wider text-gray-800 mb-16">
            The Couple
          </h2>
          <div className="grid md:grid-cols-2 gap-12">
            {[
              { name: data.bridegroom.groom_name, desc: data.bridegroom.groom_description, img: data.bridegroom.groom_image },
              { name: data.bridegroom.bride_name, desc: data.bridegroom.bride_description, img: data.bridegroom.bride_image },
            ].map(({ name, desc, img }) => (
              <div key={name} className="text-center">
                {img && (
                  <img src={`${API}${img}`}
                    className="w-40 h-40 rounded-full object-cover mx-auto mb-6 border-4 border-gray-100 shadow-lg"
                    alt={name} />
                )}
                <h3 className="text-2xl font-light text-gray-900 mb-3">{name}</h3>
                <p className="text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Events */}
      {data.events?.length > 0 && (
        <section className="bg-gray-50 py-24 px-6">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-center text-3xl font-light tracking-wider text-gray-800 mb-16">
              Events
            </h2>
            <div className="space-y-10">
              {data.events.map((ev: any) => (
                <div key={ev.id} className="flex gap-6 items-start">
                  {ev.image && (
                    <img src={`${API}${ev.image}`}
                      className="w-20 h-20 rounded-xl object-cover flex-shrink-0" alt={ev.title} />
                  )}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{ev.title}</h3>
                    <p className="text-sm text-gray-400 mb-1">{ev.time} · {ev.location_name}</p>
                    <p className="text-gray-600 text-sm">{ev.desc}</p>
                    {ev.location_link && (
                      <a href={ev.location_link} target="_blank" rel="noopener"
                        className="text-xs text-blue-500 hover:underline mt-1 inline-block">
                        📍 View on Map
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* RSVP */}
      <section className="py-24 px-6 max-w-lg mx-auto">
        <h2 className="text-center text-3xl font-light tracking-wider text-gray-800 mb-12">
          RSVP
        </h2>
        <form onSubmit={submitRSVP} className="space-y-4">
          <input required value={rsvp.name} placeholder="Your full name"
            onChange={(e) => setRsvp({ ...rsvp, name: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
          <select value={rsvp.attendance}
            onChange={(e) => setRsvp({ ...rsvp, attendance: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none">
            <option value="YES">Joyfully Accepts</option>
            <option value="NO">Regretfully Declines</option>
            <option value="MAYBE">Maybe</option>
          </select>
          <textarea value={rsvp.message} placeholder="A message for the couple (optional)"
            onChange={(e) => setRsvp({ ...rsvp, message: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none h-24 resize-none" />
          <button type="submit" disabled={sending}
            className="w-full py-3 rounded-xl font-medium tracking-wider text-sm transition"
            style={{ background: "#1C1C1E", color: "white" }}>
            {sending ? "Sending..." : "SEND RSVP"}
          </button>
        </form>
      </section>

      {/* Wishes */}
      <section className="bg-gray-50 py-24 px-6">
        <div className="max-w-lg mx-auto">
          <h2 className="text-center text-3xl font-light tracking-wider text-gray-800 mb-12">
            Leave a Wish
          </h2>
          <form onSubmit={submitWish} className="space-y-4 mb-12">
            <input required value={wish.name} placeholder="Your name"
              onChange={(e) => setWish({ ...wish, name: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none" />
            <input value={wish.relationship} placeholder="Your relationship (e.g. Friend)"
              onChange={(e) => setWish({ ...wish, relationship: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none" />
            <textarea required value={wish.message} placeholder="Your heartfelt message..."
              onChange={(e) => setWish({ ...wish, message: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none h-28 resize-none" />
            <button type="submit" disabled={sending}
              className="w-full py-3 rounded-xl font-medium tracking-wider text-sm"
              style={{ background: "#8B1A4A", color: "white" }}>
              {sending ? "Sending..." : "SEND WISH"}
            </button>
          </form>

          {/* Approved wishes */}
          <div className="space-y-4">
            {data.wishes?.map((w: any) => (
              <div key={w.id} className="bg-white rounded-xl p-5 border border-gray-100">
                <p className="text-gray-700 italic mb-3">"{w.message}"</p>
                <p className="text-sm text-gray-400">— {w.name} {w.relationship ? `(${w.relationship})` : ""}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="text-center py-8 text-xs text-gray-300">
        Made with ❤️ on <span className="font-medium" style={{ color: "#8B1A4A" }}>Planazo</span>
      </footer>
    </div>
  );
}
