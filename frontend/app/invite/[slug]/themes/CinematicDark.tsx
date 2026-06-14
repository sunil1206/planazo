// "use client";
// import { useState, useEffect } from "react";
// import Link from "next/link";
// import { Clock, MapPin, Send, ExternalLink, Play } from "lucide-react";
// import { ThemeProps, imgUrl, formatDate, CATEGORY_ICONS } from "./types";

// const SLATE  = "#0F172A";
// const INDIGO = "#6366F1";
// const ACCENT = "#818CF8";
// const SILVER = "#94A3B8";
// const LIGHT  = "#E2E8F0";
// const GLOW   = "#C7D2FE";

// function Countdown({ target }: { target: string }) {
//   const calc = () => {
//     const diff = new Date(target).getTime() - Date.now();
//     if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0 };
//     return { d: Math.floor(diff / 86400000), h: Math.floor((diff % 86400000) / 3600000), m: Math.floor((diff % 3600000) / 60000), s: Math.floor((diff % 60000) / 1000) };
//   };
//   const [time, setTime] = useState(calc());
//   useEffect(() => { const t = setInterval(() => setTime(calc()), 1000); return () => clearInterval(t); }, [target]);
//   return (
//     <div className="flex justify-center gap-3 md:gap-6 my-10">
//       {([["Days", time.d], ["Hours", time.h], ["Mins", time.m], ["Secs", time.s]] as [string, number][]).map(([label, val]) => (
//         <div key={label} className="text-center">
//           <div className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center text-2xl md:text-3xl font-bold rounded-lg border"
//             style={{ background: `linear-gradient(135deg, ${SLATE}, #1e293b)`, borderColor: `${INDIGO}55`, color: ACCENT, boxShadow: `0 0 20px ${INDIGO}33` }}>
//             {String(val).padStart(2, "0")}
//           </div>
//           <p className="text-[10px] mt-2 font-bold tracking-widest uppercase" style={{ color: SILVER }}>{label}</p>
//         </div>
//       ))}
//     </div>
//   );
// }

// function CinematicDivider() {
//   return (
//     <div className="flex items-center justify-center gap-3 my-6">
//       <div className="h-px flex-1" style={{ background: `linear-gradient(to right, transparent, ${INDIGO})` }} />
//       <Play size={10} style={{ color: ACCENT }} fill={ACCENT} />
//       <div className="h-px flex-1" style={{ background: `linear-gradient(to left, transparent, ${INDIGO})` }} />
//     </div>
//   );
// }

// export default function CinematicDark({ inv, galleryImages, galleryCategories, onRsvp, onWish, onUploadPhoto }: ThemeProps) {
//   const bride = inv.bridegroom;
//   const brideImg = imgUrl(bride?.bride_photo || bride?.bride_image);
//   const groomImg = imgUrl(bride?.groom_photo || bride?.groom_image);
//   const coverImg = imgUrl(inv.background_image || inv.thumbnail);

//   const [activeCategory, setActiveCategory] = useState<string | null>(null);
//   const [mobileNav, setMobileNav] = useState(false);
//   const [rsvpForm, setRsvpForm] = useState({ name: "", email: "", phone: "", attendance: "YES", guests: 1, message: "", meal_preference: "VEG" });
//   const [rsvpSent, setRsvpSent] = useState(false);
//   const [rsvpBusy, setRsvpBusy] = useState(false);
//   const [wishForm, setWishForm] = useState({ name: "", relationship: "", message: "" });
//   const [wishSent, setWishSent] = useState(false);
//   const [wishBusy, setWishBusy] = useState(false);

//   const filteredGallery = activeCategory ? galleryImages.filter(img => img.category?.name === activeCategory) : galleryImages;
//   const countdownDate = inv.wedding_date || inv.countdown?.event_date;

//   const handleRsvp = async (e: React.FormEvent) => {
//     e.preventDefault(); setRsvpBusy(true);
//     try { await onRsvp(rsvpForm as any); setRsvpSent(true); }
//     catch { alert("Failed to submit RSVP."); }
//     finally { setRsvpBusy(false); }
//   };
//   const handleWish = async (e: React.FormEvent) => {
//     e.preventDefault(); setWishBusy(true);
//     try { await onWish(wishForm as any); setWishSent(true); }
//     catch { alert("Failed to send wish."); }
//     finally { setWishBusy(false); }
//   };

//   const navLinks = [
//     { id: "couple", label: "Couple" }, { id: "events", label: "Events" }, { id: "story", label: "Story" },
//     { id: "gallery", label: "Gallery" }, { id: "rsvp", label: "RSVP" }, { id: "wishes", label: "Wishes" },
//     ...(inv.vendors?.length ? [{ id: "vendors", label: "Vendors" }] : []),
//   ];

//   const inputBase = "w-full px-4 py-3 text-sm border rounded-lg focus:outline-none";
//   const inputStyle = { background: "#1e293b", borderColor: `${INDIGO}44`, color: LIGHT };

//   return (
//     <div className="min-h-screen" style={{ background: SLATE, color: LIGHT, fontFamily: "'Georgia', serif" }}>

//       {/* ── Sticky Nav ───────────────────────────────────────────── */}
//       <header className="sticky top-0 z-50 border-b" style={{ background: `${SLATE}ee`, borderColor: `${INDIGO}33`, backdropFilter: "blur(10px)" }}>
//         <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
//           <span className="text-sm font-bold tracking-[0.2em] uppercase" style={{ color: ACCENT }}>{inv.couple}</span>
//           <nav className="hidden md:flex gap-6">
//             {navLinks.map(n => (
//               <a key={n.id} href={`#${n.id}`} className="text-xs font-bold tracking-widest uppercase transition-all hover:opacity-100 opacity-50" style={{ color: ACCENT }}>{n.label}</a>
//             ))}
//           </nav>
//           <button className="md:hidden p-2" onClick={() => setMobileNav(!mobileNav)}>
//             <div className="space-y-1.5">{[0,1,2].map(i => <span key={i} className="block w-5 h-0.5 rounded-full" style={{ background: ACCENT }} />)}</div>
//           </button>
//         </div>
//         {mobileNav && (
//           <div className="md:hidden border-t grid grid-cols-3 gap-2 p-3" style={{ borderColor: `${INDIGO}22` }}>
//             {navLinks.map(n => (
//               <a key={n.id} href={`#${n.id}`} onClick={() => setMobileNav(false)}
//                 className="text-center py-2 text-xs font-bold tracking-widest uppercase rounded-lg border" style={{ borderColor: `${INDIGO}44`, color: ACCENT }}>
//                 {n.label}
//               </a>
//             ))}
//           </div>
//         )}
//       </header>

//       {/* ── Hero ─────────────────────────────────────────────────── */}
//       <section id="hero" className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
//         {coverImg ? (
//           <>
//             <img src={coverImg} alt="cover" className="absolute inset-0 w-full h-full object-cover opacity-25" />
//             <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, ${SLATE}99, ${SLATE}ee)` }} />
//           </>
//         ) : (
//           <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at center, #1e293b, ${SLATE})` }} />
//         )}

//         {/* Cinematic grain texture */}
//         <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} />

//         <div className="relative z-10 text-center px-6 max-w-3xl">
//           {/* Film strip top */}
//           <div className="flex justify-center gap-2 mb-8 opacity-30">
//             {[...Array(8)].map((_, i) => <div key={i} className="w-3 h-5 border rounded-sm" style={{ borderColor: INDIGO }} />)}
//           </div>

//           <p className="text-xs tracking-[0.5em] uppercase mb-8 font-bold" style={{ color: ACCENT }}>
//             — A Cinematic Love Story —
//           </p>

//           {(brideImg || groomImg) && (
//             <div className="flex justify-center items-center gap-6 mb-10">
//               {brideImg && (
//                 <div className="relative">
//                   <div className="w-28 h-28 md:w-40 md:h-40 overflow-hidden rounded-lg border-2" style={{ borderColor: `${INDIGO}66`, boxShadow: `0 0 30px ${INDIGO}33` }}>
//                     <img src={brideImg} alt={bride?.bride_name} className="w-full h-full object-cover" style={{ filter: "contrast(1.1) brightness(0.9)" }} />
//                   </div>
//                   <div className="absolute inset-0 rounded-lg" style={{ boxShadow: `inset 0 0 30px ${SLATE}88` }} />
//                 </div>
//               )}
//               {brideImg && groomImg && (
//                 <div className="text-3xl" style={{ color: ACCENT }}>⋆</div>
//               )}
//               {groomImg && (
//                 <div className="relative">
//                   <div className="w-28 h-28 md:w-40 md:h-40 overflow-hidden rounded-lg border-2" style={{ borderColor: `${INDIGO}66`, boxShadow: `0 0 30px ${INDIGO}33` }}>
//                     <img src={groomImg} alt={bride?.groom_name} className="w-full h-full object-cover" style={{ filter: "contrast(1.1) brightness(0.9)" }} />
//                   </div>
//                   <div className="absolute inset-0 rounded-lg" style={{ boxShadow: `inset 0 0 30px ${SLATE}88` }} />
//                 </div>
//               )}
//             </div>
//           )}

//           <h1 className="text-4xl md:text-6xl font-bold mb-2 leading-tight" style={{ color: LIGHT, textShadow: `0 0 60px ${INDIGO}44` }}>{bride?.bride_name}</h1>
//           <div className="text-2xl md:text-3xl my-3 font-thin" style={{ color: ACCENT }}>&amp;</div>
//           <h1 className="text-4xl md:text-6xl font-bold mb-8 leading-tight" style={{ color: LIGHT, textShadow: `0 0 60px ${INDIGO}44` }}>{bride?.groom_name}</h1>

//           <CinematicDivider />

//           {inv.wedding_date && <p className="text-sm font-bold tracking-widest mb-1" style={{ color: SILVER }}>{formatDate(inv.wedding_date)}</p>}
//           {inv.venue && <p className="flex items-center justify-center gap-1.5 text-sm mb-6 opacity-60"><MapPin size={14} />{inv.venue}</p>}
//           {countdownDate && <Countdown target={countdownDate} />}
//           <a href="#rsvp"
//             className="inline-block mt-4 px-8 py-3 text-xs font-bold tracking-[0.3em] uppercase rounded-lg transition-all hover:opacity-80"
//             style={{ background: `linear-gradient(135deg, ${INDIGO}, #4338ca)`, color: "white", boxShadow: `0 0 30px ${INDIGO}55` }}>
//             Reserve Your Seat
//           </a>

//           {/* Film strip bottom */}
//           <div className="flex justify-center gap-2 mt-8 opacity-30">
//             {[...Array(8)].map((_, i) => <div key={i} className="w-3 h-5 border rounded-sm" style={{ borderColor: INDIGO }} />)}
//           </div>
//         </div>
//       </section>

//       {/* ── Couple Profiles ──────────────────────────────────────── */}
//       {bride && (
//         <section id="couple" className="py-20 px-4 md:px-8" style={{ background: "#0d1526" }}>
//           <div className="max-w-5xl mx-auto">
//             <div className="text-center mb-12">
//               <h2 className="text-2xl font-bold tracking-[0.2em] uppercase" style={{ color: ACCENT }}>The Couple</h2>
//               <CinematicDivider />
//             </div>
//             <div className="grid md:grid-cols-2 gap-10">
//               {(brideImg || bride.bride_name) && (
//                 <div className="p-8 rounded-lg border" style={{ background: "#1e293b", borderColor: `${INDIGO}33` }}>
//                   {brideImg && (
//                     <div className="aspect-[3/4] overflow-hidden rounded-lg mb-6 border" style={{ borderColor: `${INDIGO}44` }}>
//                       <img src={brideImg} alt={bride.bride_name} className="w-full h-full object-cover" style={{ filter: "contrast(1.1) brightness(0.9)" }} />
//                     </div>
//                   )}
//                   <h3 className="text-2xl font-bold mb-3" style={{ color: LIGHT }}>{bride.bride_name}</h3>
//                   {bride.bride_description && <p className="text-sm leading-relaxed" style={{ color: SILVER }}>{bride.bride_description}</p>}
//                 </div>
//               )}
//               {(groomImg || bride.groom_name) && (
//                 <div className="p-8 rounded-lg border" style={{ background: "#1e293b", borderColor: `${INDIGO}33` }}>
//                   {groomImg && (
//                     <div className="aspect-[3/4] overflow-hidden rounded-lg mb-6 border" style={{ borderColor: `${INDIGO}44` }}>
//                       <img src={groomImg} alt={bride.groom_name} className="w-full h-full object-cover" style={{ filter: "contrast(1.1) brightness(0.9)" }} />
//                     </div>
//                   )}
//                   <h3 className="text-2xl font-bold mb-3" style={{ color: LIGHT }}>{bride.groom_name}</h3>
//                   {bride.groom_description && <p className="text-sm leading-relaxed" style={{ color: SILVER }}>{bride.groom_description}</p>}
//                 </div>
//               )}
//             </div>
//           </div>
//         </section>
//       )}

//       {/* ── Events ───────────────────────────────────────────────── */}
//       {inv.events?.length > 0 && (
//         <section id="events" className="py-20 px-4 md:px-8">
//           <div className="max-w-5xl mx-auto">
//             <div className="text-center mb-12">
//               <h2 className="text-2xl font-bold tracking-[0.2em] uppercase" style={{ color: ACCENT }}>The Screenplay</h2>
//               <p className="text-xs opacity-50 mt-1">Wedding Events</p>
//               <CinematicDivider />
//             </div>
//             <div className="grid gap-4 md:grid-cols-2">
//               {inv.events.map((ev, idx) => (
//                 <div key={ev.id} className="p-6 rounded-lg border group hover:border-indigo-500 transition-all" style={{ background: "#1e293b", borderColor: `${INDIGO}33` }}>
//                   <div className="flex gap-4 items-start">
//                     <div className="flex-shrink-0 text-center w-10">
//                       <div className="text-xs font-bold uppercase" style={{ color: ACCENT }}>{String(idx + 1).padStart(2, "0")}</div>
//                       <div className="h-full w-px mt-2 mx-auto" style={{ background: `${INDIGO}44` }} />
//                     </div>
//                     <div className="flex-1">
//                       <h3 className="text-base font-bold mb-2" style={{ color: LIGHT }}>{ev.title}</h3>
//                       <div className="space-y-1">
//                         {ev.date && <p className="flex items-center gap-2 text-xs" style={{ color: SILVER }}><Clock size={11} style={{ color: ACCENT }} />{new Date(ev.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long" })}{ev.time ? ` · ${ev.time}` : ""}</p>}
//                         {(ev.location_name || ev.venue) && <p className="flex items-center gap-2 text-xs" style={{ color: SILVER }}><MapPin size={11} style={{ color: ACCENT }} />{ev.location_name || ev.venue}</p>}
//                       </div>
//                       {(ev.desc || ev.description) && <p className="text-xs opacity-50 mt-3 leading-relaxed">{ev.desc || ev.description}</p>}
//                       {ev.location_link && <a href={ev.location_link} target="_blank" rel="noopener" className="text-xs mt-2 inline-block hover:underline" style={{ color: ACCENT }}>View Location →</a>}
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </section>
//       )}

//       {/* ── Our Story ────────────────────────────────────────────── */}
//       {inv.stories?.length > 0 && (
//         <section id="story" className="py-20 px-4 md:px-8" style={{ background: "#0d1526" }}>
//           <div className="max-w-4xl mx-auto">
//             <div className="text-center mb-16">
//               <h2 className="text-2xl font-bold tracking-[0.2em] uppercase" style={{ color: ACCENT }}>Origin Story</h2>
//               <p className="text-xs opacity-50 mt-1">How it all began</p>
//               <CinematicDivider />
//             </div>
//             <div className="space-y-8">
//               {inv.stories.map((s, idx) => (
//                 <div key={s.id} className={`flex gap-6 items-start ${idx % 2 === 0 ? "" : "flex-row-reverse"}`}>
//                   {s.photo && (
//                     <div className="w-1/3 flex-shrink-0">
//                       <div className="aspect-square overflow-hidden rounded-lg border" style={{ borderColor: `${INDIGO}44` }}>
//                         <img src={imgUrl(s.photo)} alt={s.title} className="w-full h-full object-cover" style={{ filter: "contrast(1.1) brightness(0.8)" }} />
//                       </div>
//                     </div>
//                   )}
//                   <div className="flex-1 p-6 rounded-lg border" style={{ background: "#1e293b", borderColor: `${INDIGO}33` }}>
//                     <div className="flex items-center gap-2 mb-3">
//                       <span className="text-xs font-bold" style={{ color: ACCENT }}>S{String(idx + 1).padStart(2, "0")}</span>
//                       <div className="h-px flex-1" style={{ background: `${INDIGO}33` }} />
//                     </div>
//                     {s.date && (
//                       <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: SILVER, opacity: 0.6 }}>
//                         {new Date(s.date).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
//                       </p>
//                     )}
//                     <h3 className="text-xl font-bold mb-3" style={{ color: LIGHT }}>{s.title}</h3>
//                     <p className="text-sm leading-relaxed" style={{ color: SILVER }}>{s.desc || s.description}</p>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </section>
//       )}

//       {/* ── Gallery ──────────────────────────────────────────────── */}
//       <section id="gallery" className="py-20 px-4 md:px-8">
//         <div className="max-w-6xl mx-auto">
//           <div className="text-center mb-12">
//             <h2 className="text-2xl font-bold tracking-[0.2em] uppercase" style={{ color: ACCENT }}>The Frame</h2>
//             <p className="text-xs opacity-50 mt-1">Photo Gallery</p>
//             <CinematicDivider />
//           </div>
//           {galleryCategories.length > 0 && (
//             <div className="flex gap-2 mb-8 overflow-x-auto pb-2 justify-center flex-wrap">
//               <button onClick={() => setActiveCategory(null)}
//                 className="px-4 py-2 text-xs font-bold tracking-widest uppercase border rounded-lg transition-all"
//                 style={{ borderColor: activeCategory === null ? INDIGO : `${INDIGO}33`, color: activeCategory === null ? "white" : SILVER, background: activeCategory === null ? INDIGO : "transparent" }}>
//                 All
//               </button>
//               {galleryCategories.map(cat => (
//                 <button key={cat.id} onClick={() => setActiveCategory(cat.name)}
//                   className="px-4 py-2 text-xs font-bold tracking-widest uppercase border rounded-lg transition-all"
//                   style={{ borderColor: activeCategory === cat.name ? INDIGO : `${INDIGO}33`, color: activeCategory === cat.name ? "white" : SILVER, background: activeCategory === cat.name ? INDIGO : "transparent" }}>
//                   {cat.name}
//                 </button>
//               ))}
//             </div>
//           )}
//           {filteredGallery.length > 0 ? (
//             <>
//               <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
//                 {filteredGallery.slice(0, 9).map((img, i) => (
//                   <div key={img.id} className={`overflow-hidden rounded-lg border group ${i === 0 ? "col-span-2 row-span-2" : ""}`}
//                     style={{ aspectRatio: "1/1", borderColor: `${INDIGO}33` }}>
//                     <img src={imgUrl(img.image) || ""} alt={img.caption || "Gallery"}
//                       className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
//                       style={{ filter: "contrast(1.1) brightness(0.85)" }} />
//                   </div>
//                 ))}
//               </div>
//               {inv.gallery_count > 9 && (
//                 <div className="text-center mt-8">
//                   <Link href={`/invite/${inv.slug}/gallery`}
//                     className="inline-block px-8 py-3 text-xs font-bold tracking-widest uppercase rounded-lg transition-all hover:opacity-80"
//                     style={{ background: `linear-gradient(135deg, ${INDIGO}, #4338ca)`, color: "white" }}>
//                     View All {inv.gallery_count} Frames
//                   </Link>
//                 </div>
//               )}
//             </>
//           ) : (
//             <p className="text-center opacity-40 py-16 text-sm">Frames coming soon</p>
//           )}
//         </div>
//       </section>

//       {/* ── RSVP ─────────────────────────────────────────────────── */}
//       <section id="rsvp" className="py-20 px-4 md:px-8" style={{ background: "#0d1526" }}>
//         <div className="max-w-xl mx-auto">
//           <div className="text-center mb-12">
//             <h2 className="text-2xl font-bold tracking-[0.2em] uppercase" style={{ color: ACCENT }}>Will You Join Us?</h2>
//             <p className="text-xs opacity-50 mt-1">Reserve your seat for the show</p>
//             <CinematicDivider />
//           </div>
//           {rsvpSent ? (
//             <div className="text-center py-12 rounded-lg border" style={{ background: "#1e293b", borderColor: `${INDIGO}44` }}>
//               <div className="text-4xl mb-4">🎬</div>
//               <h3 className="text-xl font-bold mb-2" style={{ color: ACCENT }}>Seat Reserved!</h3>
//               <p className="text-sm" style={{ color: SILVER }}>Your attendance has been confirmed.</p>
//             </div>
//           ) : (
//             <form onSubmit={handleRsvp} className="space-y-4 p-6 rounded-lg border" style={{ background: "#1e293b", borderColor: `${INDIGO}33` }}>
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <input required placeholder="Your Full Name" value={rsvpForm.name}
//                   onChange={e => setRsvpForm(f => ({ ...f, name: e.target.value }))}
//                   className={inputBase} style={inputStyle} />
//                 <input type="email" placeholder="Email Address" value={rsvpForm.email}
//                   onChange={e => setRsvpForm(f => ({ ...f, email: e.target.value }))}
//                   className={inputBase} style={inputStyle} />
//               </div>
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <input type="tel" placeholder="Phone" value={rsvpForm.phone}
//                   onChange={e => setRsvpForm(f => ({ ...f, phone: e.target.value }))}
//                   className={inputBase} style={inputStyle} />
//                 <input type="number" min="1" max="10" placeholder="No. of Guests" value={rsvpForm.guests}
//                   onChange={e => setRsvpForm(f => ({ ...f, guests: parseInt(e.target.value) || 1 }))}
//                   className={inputBase} style={inputStyle} />
//               </div>
//               <div className="grid grid-cols-3 gap-2">
//                 {([["YES", "Attending"], ["NO", "Regrets"], ["MAYBE", "Pending"]] as [string, string][]).map(([val, lbl]) => (
//                   <button key={val} type="button" onClick={() => setRsvpForm(f => ({ ...f, attendance: val }))}
//                     className="py-3 text-xs font-bold uppercase tracking-wide border rounded-lg transition-all"
//                     style={{ borderColor: rsvpForm.attendance === val ? INDIGO : `${INDIGO}33`, color: rsvpForm.attendance === val ? "white" : SILVER, background: rsvpForm.attendance === val ? INDIGO : "transparent" }}>
//                     {lbl}
//                   </button>
//                 ))}
//               </div>
//               <textarea rows={3} placeholder="Message (optional)" value={rsvpForm.message}
//                 onChange={e => setRsvpForm(f => ({ ...f, message: e.target.value }))}
//                 className={`${inputBase} resize-none`} style={inputStyle} />
//               <button type="submit" disabled={rsvpBusy}
//                 className="w-full py-4 text-xs font-bold uppercase tracking-[0.3em] rounded-lg hover:opacity-80 transition disabled:opacity-50"
//                 style={{ background: `linear-gradient(135deg, ${INDIGO}, #4338ca)`, color: "white" }}>
//                 {rsvpBusy ? "Processing…" : "Submit RSVP"}
//               </button>
//             </form>
//           )}
//         </div>
//       </section>

//       {/* ── Wishes ───────────────────────────────────────────────── */}
//       <section id="wishes" className="py-20 px-4 md:px-8">
//         <div className="max-w-4xl mx-auto">
//           <div className="text-center mb-12">
//             <h2 className="text-2xl font-bold tracking-[0.2em] uppercase" style={{ color: ACCENT }}>Make Your Wish</h2>
//             <p className="text-xs opacity-50 mt-1">Leave a message in the credits</p>
//             <CinematicDivider />
//           </div>
//           {wishSent ? (
//             <div className="text-center py-8 mb-12 rounded-lg border" style={{ background: "#1e293b", borderColor: `${INDIGO}44` }}>
//               <p className="font-bold" style={{ color: ACCENT }}>✨ Your message has been added to the credits!</p>
//             </div>
//           ) : (
//             <form onSubmit={handleWish} className="mb-12 p-6 rounded-lg border space-y-4" style={{ background: "#1e293b", borderColor: `${INDIGO}33` }}>
//               <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
//                 <input required placeholder="Your Name" value={wishForm.name}
//                   onChange={e => setWishForm(f => ({ ...f, name: e.target.value }))}
//                   className={inputBase} style={inputStyle} />
//                 <input placeholder="Relationship" value={wishForm.relationship}
//                   onChange={e => setWishForm(f => ({ ...f, relationship: e.target.value }))}
//                   className={inputBase} style={inputStyle} />
//                 <input required placeholder="Your blessing or message" value={wishForm.message}
//                   onChange={e => setWishForm(f => ({ ...f, message: e.target.value }))}
//                   className={inputBase} style={inputStyle} />
//               </div>
//               <button type="submit" disabled={wishBusy}
//                 className="px-8 py-3 text-xs font-bold uppercase tracking-widest rounded-lg hover:opacity-80 transition disabled:opacity-50 flex items-center gap-2"
//                 style={{ background: `linear-gradient(135deg, ${INDIGO}, #4338ca)`, color: "white" }}>
//                 <Send size={12} />{wishBusy ? "Sending…" : "Send Message"}
//               </button>
//             </form>
//           )}
//           {inv.wishes?.length > 0 && (
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               {inv.wishes.slice(0, 20).map(w => (
//                 <div key={w.id} className="p-5 rounded-lg border" style={{ background: "#1e293b", borderColor: `${INDIGO}33` }}>
//                   <p className="text-sm italic leading-relaxed mb-4" style={{ color: SILVER }}>&ldquo;{w.message}&rdquo;</p>
//                   <div className="flex items-center justify-between">
//                     <div>
//                       <p className="text-sm font-bold" style={{ color: ACCENT }}>{w.name}</p>
//                       {w.relationship && <p className="text-xs opacity-50">{w.relationship}</p>}
//                     </div>
//                     <span className="text-xs opacity-30">{new Date(w.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       </section>

//       {/* ── Vendors ──────────────────────────────────────────────── */}
//       {inv.vendors?.length > 0 && (
//         <section id="vendors" className="py-20 px-4 md:px-8" style={{ background: "#0d1526" }}>
//           <div className="max-w-5xl mx-auto">
//             <div className="text-center mb-12">
//               <h2 className="text-2xl font-bold tracking-[0.2em] uppercase" style={{ color: ACCENT }}>The Crew</h2>
//               <p className="text-xs opacity-50 mt-1">Our talented vendors</p>
//               <CinematicDivider />
//             </div>
//             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
//               {inv.vendors.map(v => (
//                 <Link key={v.id} href={`/vendors/${v.slug}`}
//                   className="group p-5 text-center rounded-lg border hover:border-indigo-500 transition-all"
//                   style={{ background: "#1e293b", borderColor: `${INDIGO}33` }}>
//                   {v.thumbnail ? (
//                     <div className="w-16 h-16 mx-auto mb-3 overflow-hidden rounded-full border" style={{ borderColor: `${INDIGO}55` }}>
//                       <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover" style={{ filter: "brightness(0.9)" }} />
//                     </div>
//                   ) : (
//                     <div className="w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center text-2xl border" style={{ borderColor: `${INDIGO}44`, background: `${INDIGO}22` }}>
//                       {CATEGORY_ICONS[v.category] || "🎯"}
//                     </div>
//                   )}
//                   <p className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-50" style={{ color: ACCENT }}>{v.category_label}</p>
//                   <h4 className="text-sm font-bold leading-tight" style={{ color: LIGHT }}>{v.title}</h4>
//                   {v.city && <p className="text-[10px] opacity-40 mt-1">{v.city}</p>}
//                   {v.service_note && <p className="text-[10px] opacity-40 mt-1 italic">{v.service_note}</p>}
//                   <div className="mt-3 flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-widest opacity-40 group-hover:opacity-80 transition" style={{ color: ACCENT }}>
//                     Profile <ExternalLink size={9} />
//                   </div>
//                 </Link>
//               ))}
//             </div>
//           </div>
//         </section>
//       )}

//       {/* ── Footer ───────────────────────────────────────────────── */}
//       <footer className="py-16 px-4 text-center border-t" style={{ background: SLATE, borderColor: `${INDIGO}22` }}>
//         <div className="flex justify-center gap-2 mb-6 opacity-20">
//           {[...Array(6)].map((_, i) => <div key={i} className="w-3 h-5 border rounded-sm" style={{ borderColor: INDIGO }} />)}
//         </div>
//         <p className="text-2xl font-bold mb-2" style={{ color: LIGHT }}>{inv.couple}</p>
//         {inv.wedding_date && <p className="text-sm mb-4" style={{ color: SILVER }}>{formatDate(inv.wedding_date)}</p>}
//         <CinematicDivider />
//         <p className="text-xs opacity-30">Made with ♥ on Snapshare</p>
//       </footer>

//       <Link href={`/invite/${inv.slug}/gifts`}
//         className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center text-xl shadow-xl hover:scale-110 transition-transform"
//         style={{ background: `linear-gradient(135deg, ${INDIGO}, #4338ca)`, color: "white", boxShadow: `0 0 30px ${INDIGO}66` }}
//         title="Gift Registry">🎁
//       </Link>
//     </div>
//   );
// }


"use client";
import { useState, useEffect, useRef } from "react";
import { Clock, MapPin, Send, ExternalLink, Play, Music, VolumeX, Camera, ChevronRight } from "lucide-react";
import { ThemeProps, imgUrl, formatDate, CATEGORY_ICONS } from "./types";
import ShareThisPage from "./_sections/ShareThisPage";
import ShareYourMemories from "./_sections/ShareYourMemories";

// Cinematic Luxury Palette
const BG_DARK    = "#050505"; // Deepest black/gray
const BG_SURFACE = "#0f0f11"; // Slightly lighter for cards
const ACCENT     = "#C8A97E"; // Elegant Champagne/Gold
const INDIGO     = "#4F46E5"; // Cinematic moody blue
const SILVER     = "#A1A1AA"; // Muted text
const LIGHT      = "#FAFAFA"; // Primary text

function Countdown({ target }: { target: string }) {
  const calc = () => {
    const diff = new Date(target).getTime() - Date.now();
    if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0 };
    return { 
      d: Math.floor(diff / 86400000), 
      h: Math.floor((diff % 86400000) / 3600000), 
      m: Math.floor((diff % 3600000) / 60000), 
      s: Math.floor((diff % 60000) / 1000) 
    };
  };
  const [time, setTime] = useState(calc());
  useEffect(() => { const t = setInterval(() => setTime(calc()), 1000); return () => clearInterval(t); }, [target]);
  
  return (
    <div className="flex justify-center gap-4 md:gap-8 my-12">
      {(Object.entries(time) as [string, number][]).map(([label, val]) => (
        <div key={label} className="text-center group">
          <div className="w-16 h-20 md:w-24 md:h-28 flex items-center justify-center text-3xl md:text-5xl font-light rounded-sm border border-white/10 bg-white/5 backdrop-blur-sm shadow-[0_0_15px_rgba(200,169,126,0.05)] relative overflow-hidden transition-all duration-700 group-hover:border-[#C8A97E]/30">
            <div className="absolute top-0 w-full h-1/2 bg-black/20 border-b border-black/40"></div>
            <span className="relative z-10" style={{ color: ACCENT, fontFamily: "'Playfair Display', serif" }}>
              {String(val).padStart(2, "0")}
            </span>
          </div>
          <p className="text-[10px] md:text-xs mt-4 font-bold tracking-[0.3em] uppercase" style={{ color: SILVER }}>
            {label === 'd' ? 'Days' : label === 'h' ? 'Hours' : label === 'm' ? 'Mins' : 'Secs'}
          </p>
        </div>
      ))}
    </div>
  );
}

function CinematicDivider() {
  return (
    <div className="flex items-center justify-center gap-4 my-8 w-full max-w-xs mx-auto opacity-70">
      <div className="h-px flex-1" style={{ background: `linear-gradient(to right, transparent, ${ACCENT})` }} />
      <div className="w-1.5 h-1.5 rotate-45" style={{ background: ACCENT }} />
      <div className="h-px flex-1" style={{ background: `linear-gradient(to left, transparent, ${ACCENT})` }} />
    </div>
  );
}

export default function CinematicDark({ inv, galleryImages, galleryCategories, onRsvp, onWish, onUploadPhoto }: ThemeProps) {
  const bride = inv.bridegroom;
  const brideImg = imgUrl(bride?.bride_photo || bride?.bride_image);
  const groomImg = imgUrl(bride?.groom_photo || bride?.groom_image);
  const coverImg = imgUrl(inv.background_image || inv.thumbnail);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // RSVP & Wish States
  const [rsvpForm, setRsvpForm] = useState({ name: "", email: "", phone: "", attendance: "YES", guests: 1, message: "", meal_preference: "VEG" });
  const [rsvpSent, setRsvpSent] = useState(false);
  const [rsvpBusy, setRsvpBusy] = useState(false);
  const [wishForm, setWishForm] = useState({ name: "", relationship: "", message: "" });
  const [wishSent, setWishSent] = useState(false);
  const [wishBusy, setWishBusy] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const filteredGallery = activeCategory ? galleryImages.filter(img => img.category?.name === activeCategory) : galleryImages;
  const countdownDate = inv.wedding_date || inv.countdown?.event_date;

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleRsvp = async (e: React.FormEvent) => {
    e.preventDefault(); setRsvpBusy(true);
    try { await onRsvp(rsvpForm as any); setRsvpSent(true); }
    catch { alert("Failed to submit RSVP."); }
    finally { setRsvpBusy(false); }
  };
  const handleWish = async (e: React.FormEvent) => {
    e.preventDefault(); setWishBusy(true);
    try { await onWish(wishForm as any); setWishSent(true); }
    catch { alert("Failed to send wish."); }
    finally { setWishBusy(false); }
  };

  const navLinks = [
    { id: "couple", label: "Cast" }, { id: "story", label: "Screenplay" }, { id: "events", label: "Showtimes" },
    { id: "gallery", label: "Frames" }, { id: "rsvp", label: "RSVP" }, { id: "wishes", label: "Credits" },
  ];

  // Minimalist Input Style for Editorial Look
  const inputBase = "w-full py-4 text-sm bg-transparent border-b focus:outline-none transition-colors duration-300 placeholder:text-gray-600";
  const inputStyle = { borderColor: "rgba(255,255,255,0.1)", color: LIGHT };

  return (
    <div className="min-h-screen selection:bg-[#C8A97E] selection:text-black overflow-x-hidden" style={{ background: BG_DARK, color: LIGHT, fontFamily: "'Inter', sans-serif" }}>
      
      {/* Background Audio */}
      {/* Replace src with inv.music_url if available in your schema */}
      <audio ref={audioRef} loop src="/audio/romantic-cinematic.mp3" preload="auto" />
      <button 
        onClick={toggleAudio}
        className="fixed bottom-6 left-6 z-50 w-12 h-12 rounded-full flex items-center justify-center bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl hover:bg-white/10 transition-all mix-blend-difference"
      >
        {isPlaying ? <Music size={18} color={ACCENT} className="animate-pulse" /> : <VolumeX size={18} color={SILVER} />}
      </button>

      {/* ── Sticky Nav ───────────────────────────────────────────── */}
      <header className="fixed top-0 w-full z-50 border-b border-white/5 transition-all duration-300" style={{ background: "rgba(5,5,5,0.75)", backdropFilter: "blur(12px)" }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-sm font-light tracking-[0.3em] uppercase" style={{ color: LIGHT, fontFamily: "'Playfair Display', serif" }}>
            {inv.couple}
          </span>
          <nav className="hidden md:flex gap-8">
            {navLinks.map(n => (
              <a key={n.id} href={`#${n.id}`} className="text-[10px] font-semibold tracking-[0.2em] uppercase transition-all hover:text-[#C8A97E] text-gray-400">
                {n.label}
              </a>
            ))}
          </nav>
          <button className="md:hidden p-2 text-white" onClick={() => setMobileNav(!mobileNav)}>
            <div className="space-y-1.5">
              <span className={`block w-6 h-px bg-white transition-transform ${mobileNav ? 'rotate-45 translate-y-1.5' : ''}`} />
              <span className={`block w-6 h-px bg-white transition-opacity ${mobileNav ? 'opacity-0' : ''}`} />
              <span className={`block w-6 h-px bg-white transition-transform ${mobileNav ? '-rotate-45 -translate-y-1.5' : ''}`} />
            </div>
          </button>
        </div>
        
        {/* Mobile Nav Overlay */}
        <div className={`md:hidden absolute w-full bg-[#050505] border-b border-white/10 transition-all duration-500 overflow-hidden ${mobileNav ? 'max-h-96 py-4' : 'max-h-0'}`}>
          <div className="flex flex-col items-center gap-6">
            {navLinks.map(n => (
              <a key={n.id} href={`#${n.id}`} onClick={() => setMobileNav(false)} className="text-xs font-semibold tracking-[0.3em] uppercase text-gray-300 hover:text-[#C8A97E]">
                {n.label}
              </a>
            ))}
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {coverImg && (
          <div className="absolute inset-0 z-0">
            <img src={coverImg} alt="cover" className="w-full h-full object-cover opacity-40 animate-[pulse_20s_ease-in-out_infinite] scale-105" style={{ filter: "contrast(1.1) brightness(0.8)" }} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/60 to-transparent" />
          </div>
        )}

        {/* Cinematic grain texture */}
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none z-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} />

        <div className="relative z-20 text-center px-4 w-full mt-16">
          <p className="text-[10px] md:text-xs tracking-[0.6em] uppercase mb-12 font-medium text-[#C8A97E] drop-shadow-lg">
            A Cinematic Love Story
          </p>

          <h1 className="text-6xl md:text-8xl lg:text-9xl mb-4 leading-none" style={{ fontFamily: "'Playfair Display', serif", textShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>
            {bride?.bride_name}
          </h1>
          <div className="text-3xl md:text-5xl my-4 font-serif italic text-white/50">&</div>
          <h1 className="text-6xl md:text-8xl lg:text-9xl mb-12 leading-none" style={{ fontFamily: "'Playfair Display', serif", textShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>
            {bride?.groom_name}
          </h1>

          <div className="flex flex-col items-center justify-center mb-8">
            <div className="h-16 w-px bg-gradient-to-b from-transparent via-[#C8A97E] to-transparent mb-6"></div>
            {inv.wedding_date && (
              <p className="text-sm md:text-base font-light tracking-[0.4em] uppercase text-gray-300">
                {formatDate(inv.wedding_date)}
              </p>
            )}
            {inv.venue && (
              <p className="flex items-center gap-2 text-xs uppercase tracking-widest mt-4 text-gray-500">
                <MapPin size={12} /> {inv.venue}
              </p>
            )}
          </div>

          <a href="#rsvp" className="inline-block mt-8 border border-white/20 hover:border-[#C8A97E] px-10 py-4 text-[10px] md:text-xs font-semibold tracking-[0.3em] uppercase bg-white/5 backdrop-blur-sm transition-all duration-500 hover:bg-[#C8A97E]/10">
            Request an Invitation
          </a>
        </div>
      </section>

      {/* ── Couple Profiles (Editorial Layout) ────────────────────── */}
      {bride && (
        <section id="couple" className="py-32 px-6 bg-[#050505] relative">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-24">
              <p className="text-[10px] tracking-[0.3em] uppercase text-[#C8A97E] mb-4">Leading Roles</p>
              <h2 className="text-4xl md:text-5xl font-light" style={{ fontFamily: "'Playfair Display', serif" }}>The Cast</h2>
              <CinematicDivider />
            </div>

            <div className="grid md:grid-cols-2 gap-20 md:gap-10">
              {/* Bride Profile */}
              {(brideImg || bride.bride_name) && (
                <div className="flex flex-col md:flex-row items-center gap-8 group">
                  {brideImg && (
                    <div className="w-full md:w-1/2 aspect-[4/5] overflow-hidden">
                      <img src={brideImg} alt={bride.bride_name} className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 transition-all duration-1000 scale-100 group-hover:scale-105" />
                    </div>
                  )}
                  <div className="w-full md:w-1/2 text-center md:text-left">
                    <p className="text-[10px] tracking-[0.2em] text-[#C8A97E] uppercase mb-2">The Bride</p>
                    <h3 className="text-3xl mb-4 font-light" style={{ fontFamily: "'Playfair Display', serif" }}>{bride.bride_name}</h3>
                    {bride.bride_description && <p className="text-xs md:text-sm leading-loose text-gray-400 font-light">{bride.bride_description}</p>}
                  </div>
                </div>
              )}
              
              {/* Groom Profile */}
              {(groomImg || bride.groom_name) && (
                <div className="flex flex-col md:flex-row-reverse items-center gap-8 group md:mt-32">
                  {groomImg && (
                    <div className="w-full md:w-1/2 aspect-[4/5] overflow-hidden">
                      <img src={groomImg} alt={bride.groom_name} className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 transition-all duration-1000 scale-100 group-hover:scale-105" />
                    </div>
                  )}
                  <div className="w-full md:w-1/2 text-center md:text-right">
                    <p className="text-[10px] tracking-[0.2em] text-[#C8A97E] uppercase mb-2">The Groom</p>
                    <h3 className="text-3xl mb-4 font-light" style={{ fontFamily: "'Playfair Display', serif" }}>{bride.groom_name}</h3>
                    {bride.groom_description && <p className="text-xs md:text-sm leading-loose text-gray-400 font-light">{bride.groom_description}</p>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Story / Screenplay ─────────────────────────────────────── */}
      {inv.stories?.length > 0 && (
        <section id="story" className="py-32 px-6 bg-[#0a0a0c]">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-20">
              <p className="text-[10px] tracking-[0.3em] uppercase text-[#C8A97E] mb-4">Origin Story</p>
              <h2 className="text-4xl md:text-5xl font-light" style={{ fontFamily: "'Playfair Display', serif" }}>The Screenplay</h2>
              <CinematicDivider />
            </div>

            <div className="space-y-24">
              {inv.stories.map((s, idx) => (
                <div key={s.id} className={`flex flex-col md:flex-row gap-12 items-center ${idx % 2 === 0 ? "" : "md:flex-row-reverse"}`}>
                  {s.photo && (
                    <div className="w-full md:w-1/2 aspect-[16/9] md:aspect-[4/3] overflow-hidden relative group">
                      <div className="absolute inset-0 bg-[#C8A97E]/10 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                      <img src={imgUrl(s.photo)} alt={s.title} className="w-full h-full object-cover scale-100 group-hover:scale-105 transition-transform duration-1000" style={{ filter: "contrast(1.1) brightness(0.7)" }} />
                    </div>
                  )}
                  <div className="w-full md:w-1/2">
                    <div className="flex items-center gap-4 mb-6">
                      <span className="text-[10px] tracking-widest font-semibold text-[#C8A97E]">SCENE {String(idx + 1).padStart(2, "0")}</span>
                      <div className="h-px flex-1 bg-white/10" />
                    </div>
                    {s.date && (
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-2 text-gray-500">
                        {new Date(s.date).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                      </p>
                    )}
                    <h3 className="text-3xl mb-6 font-light" style={{ fontFamily: "'Playfair Display', serif" }}>{s.title}</h3>
                    <p className="text-sm leading-loose text-gray-400 font-light">{s.desc || s.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Events (Vertical Timeline) ─────────────────────────────── */}
      {inv.events?.length > 0 && (
        <section id="events" className="py-32 px-6 bg-[#050505]">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-24">
              <p className="text-[10px] tracking-[0.3em] uppercase text-[#C8A97E] mb-4">Event Schedule</p>
              <h2 className="text-4xl md:text-5xl font-light" style={{ fontFamily: "'Playfair Display', serif" }}>Showtimes</h2>
              <CinematicDivider />
            </div>

            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent transform md:-translate-x-1/2" />
              
              <div className="space-y-16">
                {inv.events.map((ev, idx) => (
                  <div key={ev.id} className={`relative flex flex-col md:flex-row items-center justify-between ${idx % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>
                    {/* Timeline Dot */}
                    <div className="absolute left-4 md:left-1/2 w-3 h-3 bg-[#050505] border-2 border-[#C8A97E] rounded-full transform -translate-x-[5px] md:-translate-x-1/2 mt-6 md:mt-0 z-10 shadow-[0_0_10px_#C8A97E]" />
                    
                    {/* Content Box */}
                    <div className={`w-full pl-12 md:pl-0 md:w-[45%] ${idx % 2 === 0 ? 'md:text-left' : 'md:text-right'}`}>
                      <div className="p-8 bg-white/[0.02] border border-white/5 hover:border-[#C8A97E]/30 transition-colors duration-500 backdrop-blur-sm group">
                        <div className={`flex items-center gap-3 mb-4 ${idx % 2 === 0 ? 'md:justify-start' : 'md:justify-end'}`}>
                           <span className="text-[10px] tracking-[0.2em] font-semibold text-[#C8A97E] uppercase">Part {String(idx + 1).padStart(2, "0")}</span>
                        </div>
                        <h3 className="text-2xl mb-4 font-light" style={{ fontFamily: "'Playfair Display', serif" }}>{ev.title}</h3>
                        
                        <div className={`space-y-2 mb-6 text-xs text-gray-400 font-light ${idx % 2 === 0 ? 'md:items-start' : 'md:items-end'} flex flex-col`}>
                          {ev.date && (
                            <p className="flex items-center gap-2">
                              <Clock size={12} className="text-[#C8A97E]" />
                              {new Date(ev.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long" })}{ev.time ? ` · ${ev.time}` : ""}
                            </p>
                          )}
                          {(ev.location_name || ev.venue) && (
                            <p className="flex items-center gap-2">
                              <MapPin size={12} className="text-[#C8A97E]" />
                              {ev.location_name || ev.venue}
                            </p>
                          )}
                        </div>
                        
                        {(ev.desc || ev.description) && (
                          <p className="text-xs leading-relaxed text-gray-500 mb-6 font-light">{ev.desc || ev.description}</p>
                        )}
                        
                        {ev.location_link && (
                          <a href={ev.location_link} target="_blank" rel="noopener" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#C8A97E] hover:text-white transition-colors">
                            View Map <ChevronRight size={10} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {countdownDate && <Countdown target={countdownDate} />}
          </div>
        </section>
      )}

      {/* ── Gallery ──────────────────────────────────────────────── */}
      <section id="gallery" className="py-32 px-6 bg-[#0a0a0c]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-[#C8A97E] mb-4">Visuals</p>
              <h2 className="text-4xl md:text-5xl font-light" style={{ fontFamily: "'Playfair Display', serif" }}>The Frames</h2>
            </div>
            {/* Interactive Upload Button for Guests */}
            <a href={`/invite/${inv.slug}/gallery`} className="inline-flex items-center gap-3 px-6 py-3 border border-[#C8A97E]/50 text-[10px] tracking-widest uppercase hover:bg-[#C8A97E] hover:text-black transition-all duration-300">
              <Camera size={14} /> Contribute Memories
            </a>
          </div>

          {galleryCategories.length > 0 && (
            <div className="flex gap-4 mb-12 overflow-x-auto pb-4 scrollbar-hide">
              <button onClick={() => setActiveCategory(null)}
                className={`px-6 py-2 text-[10px] tracking-[0.2em] uppercase border transition-all whitespace-nowrap ${activeCategory === null ? 'border-[#C8A97E] text-[#C8A97E]' : 'border-white/10 text-gray-500 hover:text-white'}`}>
                All Shots
              </button>
              {galleryCategories.map(cat => (
                <button key={cat.id} onClick={() => setActiveCategory(cat.name)}
                  className={`px-6 py-2 text-[10px] tracking-[0.2em] uppercase border transition-all whitespace-nowrap ${activeCategory === cat.name ? 'border-[#C8A97E] text-[#C8A97E]' : 'border-white/10 text-gray-500 hover:text-white'}`}>
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {filteredGallery.length > 0 ? (
            <>
              {/* Masonry-style Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[200px] md:auto-rows-[300px]">
                {filteredGallery.slice(0, 8).map((img, i) => (
                  <div key={img.id} className={`relative overflow-hidden group cursor-pointer ${i === 0 || i === 4 ? 'col-span-2 row-span-2' : ''}`}>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 flex items-center justify-center">
                      <span className="text-[10px] tracking-widest uppercase border border-white/50 px-4 py-2 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500">View</span>
                    </div>
                    <img src={imgUrl(img.image) || ""} alt={img.caption || "Gallery"}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                      style={{ filter: "contrast(1.1) brightness(0.8)" }} />
                  </div>
                ))}
              </div>
              {inv.gallery_count > 8 && (
                <div className="text-center mt-16">
                  <a href={`/invite/${inv.slug}/gallery`} className="inline-block border-b border-[#C8A97E] pb-2 text-xs tracking-[0.2em] uppercase text-[#C8A97E] hover:text-white hover:border-white transition-colors">
                    View Complete Reel ({inv.gallery_count})
                  </a>
                </div>
              )}
            </>
          ) : (
            <div className="py-32 text-center border border-white/5 bg-white/[0.02]">
              <Camera size={32} className="mx-auto mb-4 text-gray-700" />
              <p className="text-sm font-light text-gray-500 tracking-widest uppercase">Frames loading soon</p>
            </div>
          )}
        </div>
      </section>

      {/* ── RSVP (Minimalist Editorial Form) ───────────────────────── */}
      <section id="rsvp" className="py-32 px-6 bg-[#050505]">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#C8A97E] mb-4">Admit One</p>
            <h2 className="text-4xl md:text-5xl font-light" style={{ fontFamily: "'Playfair Display', serif" }}>Will You Join Us?</h2>
            <CinematicDivider />
          </div>

          {rsvpSent ? (
            <div className="text-center py-20 px-8 border border-white/10 bg-white/[0.02]">
              <div className="text-[#C8A97E] mb-6 flex justify-center"><Send size={40} strokeWidth={1} /></div>
              <h3 className="text-2xl font-light mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>Seat Reserved</h3>
              <p className="text-sm text-gray-400 font-light">Your presence is confirmed for the premiere.</p>
            </div>
          ) : (
            <form onSubmit={handleRsvp} className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="relative group">
                  <input required placeholder="Your Full Name" value={rsvpForm.name} onChange={e => setRsvpForm(f => ({ ...f, name: e.target.value }))} className={inputBase} style={inputStyle} />
                  <div className="absolute bottom-0 left-0 w-0 h-px bg-[#C8A97E] transition-all duration-500 group-focus-within:w-full"></div>
                </div>
                <div className="relative group">
                  <input type="email" placeholder="Email Address" value={rsvpForm.email} onChange={e => setRsvpForm(f => ({ ...f, email: e.target.value }))} className={inputBase} style={inputStyle} />
                  <div className="absolute bottom-0 left-0 w-0 h-px bg-[#C8A97E] transition-all duration-500 group-focus-within:w-full"></div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="relative group">
                  <input type="tel" placeholder="Phone Number" value={rsvpForm.phone} onChange={e => setRsvpForm(f => ({ ...f, phone: e.target.value }))} className={inputBase} style={inputStyle} />
                  <div className="absolute bottom-0 left-0 w-0 h-px bg-[#C8A97E] transition-all duration-500 group-focus-within:w-full"></div>
                </div>
                <div className="relative group flex items-end">
                  <span className="text-sm text-gray-600 mr-4 pb-4">Guests:</span>
                  <input type="number" min="1" max="10" value={rsvpForm.guests} onChange={e => setRsvpForm(f => ({ ...f, guests: parseInt(e.target.value) || 1 }))} className={`${inputBase} text-center w-16`} style={inputStyle} />
                  <div className="absolute bottom-0 left-[60px] w-0 h-px bg-[#C8A97E] transition-all duration-500 group-focus-within:w-[64px]"></div>
                </div>
              </div>

              <div className="pt-6">
                <p className="text-[10px] tracking-widest uppercase text-gray-500 mb-6 text-center">Attendance</p>
                <div className="flex flex-col md:flex-row justify-center gap-4">
                  {([["YES", "Joyfully Accepts"], ["NO", "Regretfully Declines"]] as [string, string][]).map(([val, lbl]) => (
                    <button key={val} type="button" onClick={() => setRsvpForm(f => ({ ...f, attendance: val }))}
                      className={`px-8 py-4 text-[10px] tracking-[0.2em] uppercase border transition-all duration-300 w-full md:w-auto
                      ${rsvpForm.attendance === val ? 'border-[#C8A97E] text-[#C8A97E] bg-[#C8A97E]/5' : 'border-white/10 text-gray-500 hover:border-white/30'}`}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative group pt-4">
                <textarea rows={1} placeholder="Dietary requirements or special notes..." value={rsvpForm.message} onChange={e => setRsvpForm(f => ({ ...f, message: e.target.value }))} className={`${inputBase} resize-none`} style={inputStyle} />
                <div className="absolute bottom-0 left-0 w-0 h-px bg-[#C8A97E] transition-all duration-500 group-focus-within:w-full"></div>
              </div>

              <div className="text-center pt-8">
                <button type="submit" disabled={rsvpBusy} className="px-12 py-4 bg-white text-black text-[10px] font-bold tracking-[0.3em] uppercase hover:bg-[#C8A97E] transition-colors duration-300 disabled:opacity-50">
                  {rsvpBusy ? "Processing..." : "Confirm RSVP"}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* ── Wishes (Credits) ───────────────────────────────────────── */}
      <section id="wishes" className="py-32 px-6 bg-[#0a0a0c]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#C8A97E] mb-4">Guestbook</p>
            <h2 className="text-4xl md:text-5xl font-light" style={{ fontFamily: "'Playfair Display', serif" }}>Rolling Credits</h2>
            <CinematicDivider />
          </div>

          {wishSent ? (
            <div className="text-center py-12 border border-white/5 mb-16 bg-white/[0.02]">
              <p className="text-sm font-light text-[#C8A97E] tracking-widest uppercase">Your line has been added to the script.</p>
            </div>
          ) : (
            <form onSubmit={handleWish} className="mb-24 space-y-8 p-8 md:p-12 border border-white/5 bg-[#050505]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="relative group">
                  <input required placeholder="Your Name" value={wishForm.name} onChange={e => setWishForm(f => ({ ...f, name: e.target.value }))} className={inputBase} style={inputStyle} />
                  <div className="absolute bottom-0 left-0 w-0 h-px bg-[#C8A97E] transition-all duration-500 group-focus-within:w-full"></div>
                </div>
                <div className="relative group">
                  <input placeholder="Relationship to Couple" value={wishForm.relationship} onChange={e => setWishForm(f => ({ ...f, relationship: e.target.value }))} className={inputBase} style={inputStyle} />
                  <div className="absolute bottom-0 left-0 w-0 h-px bg-[#C8A97E] transition-all duration-500 group-focus-within:w-full"></div>
                </div>
              </div>
              <div className="relative group">
                <textarea required rows={2} placeholder="Write your blessing or message..." value={wishForm.message} onChange={e => setWishForm(f => ({ ...f, message: e.target.value }))} className={`${inputBase} resize-none`} style={inputStyle} />
                <div className="absolute bottom-[4px] left-0 w-0 h-px bg-[#C8A97E] transition-all duration-500 group-focus-within:w-full"></div>
              </div>
              <div className="text-right">
                <button type="submit" disabled={wishBusy} className="inline-flex items-center gap-3 px-8 py-3 border border-white/20 text-[10px] tracking-[0.2em] uppercase hover:border-[#C8A97E] hover:text-[#C8A97E] transition-colors disabled:opacity-50">
                  <Send size={12} /> {wishBusy ? "Sending..." : "Publish Line"}
                </button>
              </div>
            </form>
          )}

          {inv.wishes?.length > 0 && (
            <div className="space-y-8">
              {inv.wishes.slice(0, 10).map((w, idx) => (
                <div key={w.id} className="text-center pb-8 border-b border-white/5">
                  <p className="text-base md:text-lg italic leading-relaxed text-gray-300 font-light mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                    &ldquo;{w.message}&rdquo;
                  </p>
                  <p className="text-[10px] tracking-widest uppercase text-[#C8A97E]">
                    {w.name} {w.relationship && <span className="text-gray-600 ml-2">/ {w.relationship}</span>}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Vendors (The Crew) ─────────────────────────────────────── */}
      {inv.vendors?.length > 0 && (
        <section id="vendors" className="py-32 px-6 bg-[#050505]">
          <div className="max-w-6xl mx-auto text-center">
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#C8A97E] mb-4">Behind The Scenes</p>
            <h2 className="text-4xl md:text-5xl font-light mb-16" style={{ fontFamily: "'Playfair Display', serif" }}>The Crew</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-16">
              {inv.vendors.map(v => (
                <a key={v.id} href={`/vendors/${v.slug}`} className="group block text-center">
                  <p className="text-[10px] font-semibold tracking-widest uppercase text-[#C8A97E] mb-3">{v.category_label}</p>
                  <h4 className="text-sm tracking-wide text-white mb-2 group-hover:text-[#C8A97E] transition-colors">{v.title}</h4>
                  {v.city && <p className="text-[10px] uppercase tracking-wider text-gray-600">{v.city}</p>}
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

            {/* Share This Page */}
      <ShareThisPage
        coupleName={inv.couple}
        slug={inv.slug}
        background={BG_DARK}
        surface={BG_SURFACE}
        textColor={LIGHT}
        mutedColor={SILVER}
        accent={ACCENT}
        accentText={BG_DARK}
        eyebrow="Share the story"
        heading="Share This Page"
        intro="Send this invitation to anyone whose presence would make our story complete."
      />

      {/* Share Your Memories */}
      <ShareYourMemories
        onUploadPhoto={onUploadPhoto}
        background={BG_SURFACE}
        surface="rgba(255,255,255,0.03)"
        textColor={LIGHT}
        mutedColor={SILVER}
        accent={ACCENT}
        accentText={BG_DARK}
        eyebrow="Capture the moment"
        heading="Share Your Memories"
        intro="Add a frame to our shared reel — every photo becomes part of the cinematic story we are writing together."
      />

      {/* ── Footer / Credits End ─────────────────────────────────── */}
      <footer className="py-24 px-6 text-center bg-[#020202]">
        <div className="max-w-2xl mx-auto">
          <div className="w-12 h-px bg-white/20 mx-auto mb-12" />
          <h2 className="text-4xl md:text-6xl mb-6 font-light" style={{ fontFamily: "'Playfair Display', serif" }}>
            {inv.couple}
          </h2>
          {inv.wedding_date && (
            <p className="text-[10px] md:text-xs tracking-[0.4em] uppercase text-gray-500 mb-16">
              {formatDate(inv.wedding_date)}
            </p>
          )}
          <p className="text-[9px] tracking-widest uppercase text-gray-700">Directed & Produced with ♥ via Snapshare</p>
        </div>
      </footer>

      {/* Floating Action Button for Gifts */}
      <a href={`/invite/${inv.slug}/gifts`}
        className="fixed bottom-24 left-6 md:bottom-6 md:left-auto md:right-6 z-50 px-6 py-3 border border-[#C8A97E]/30 bg-black/50 backdrop-blur-md text-[10px] tracking-widest uppercase hover:bg-[#C8A97E] hover:text-black transition-all duration-300 shadow-2xl flex items-center gap-2"
        title="Gift Registry">
        <span className="text-sm">🎁</span> Registry
      </a>
    </div>
  );
}