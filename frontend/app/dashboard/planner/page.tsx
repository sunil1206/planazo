"use client";
/**
 * /dashboard/planner — AI Wedding Planning Studio (Dashboard-embedded)
 * 4-step wizard: Event Details → Style & Vibe → Budget Allocation → Results
 * Results: vendor matches, budget breakdown, timeline, colour palette
 */
import { useState, useEffect } from "react";
import Link from "next/link";
import { vendorApi } from "@/lib/api";
import { Loader2, ChevronRight, ChevronLeft, Sparkles, CheckCircle2, Star, MapPin } from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────
const BRAND = "#8B1A4A";
const GOLD  = "#C9952A";

const EVENT_TYPES = [
  { id: "wedding",     label: "Wedding",      emoji: "💍", desc: "Main celebration" },
  { id: "reception",   label: "Reception",    emoji: "🥂", desc: "Evening party" },
  { id: "engagement",  label: "Engagement",   emoji: "💑", desc: "Ring ceremony" },
  { id: "birthday",    label: "Birthday",     emoji: "🎂", desc: "Special bday" },
  { id: "corporate",   label: "Corporate",    emoji: "🏢", desc: "Office event" },
  { id: "anniversary", label: "Anniversary",  emoji: "💝", desc: "Milestone celebration" },
];

const THEMES = [
  { id: "royal_mughal",   label: "Royal Mughal",       emoji: "👑", desc: "Burgundy & Gold",   palettes: ["#5C0F2A","#C9952A","#F5E6CC","#2B1A0E"] },
  { id: "kerala_trad",    label: "Kerala Traditional", emoji: "🌿", desc: "Kasavu & Red",       palettes: ["#7B1C1C","#C9952A","#FFFDE7","#2E7D32"] },
  { id: "modern_minimal", label: "Modern Minimal",     emoji: "✨", desc: "Clean & sleek",      palettes: ["#1A1A2E","#E0E0E0","#F5F5F5","#757575"] },
  { id: "floral_pastel",  label: "Floral Pastel",      emoji: "🌸", desc: "Pink & dreamy",     palettes: ["#E91E8C","#CE93D8","#F8BBD0","#F3E5F5"] },
  { id: "cinematic_dark", label: "Cinematic Dark",     emoji: "🎬", desc: "Black & Gold",      palettes: ["#0C0C0C","#C9952A","#1A1A2E","#2D2D2D"] },
  { id: "luxury_wedding", label: "Luxury Wedding",     emoji: "✨", desc: "Dark & Gold luxury", palettes: ["#080808","#C9A84C","#F5EED7","#1A1A1A"] },
];

const VIBES = [
  { id: "grand",   label: "Grand & Luxurious",  emoji: "👸", desc: "No expense spared",   multiplier: 1.3 },
  { id: "elegant", label: "Intimate & Elegant", emoji: "🕯️", desc: "Beautiful + tasteful", multiplier: 1.0 },
  { id: "fun",     label: "Fun & Vibrant",       emoji: "🎉", desc: "Party atmosphere",    multiplier: 0.9 },
  { id: "trad",    label: "Traditional",         emoji: "🪔", desc: "Culture first",       multiplier: 1.1 },
];

const CATEGORIES = [
  { key: "CATERING",     label: "Catering",    emoji: "🍽️", defaultPct: 0.30, desc: "Food & beverages" },
  { key: "DECOR",        label: "Décor",       emoji: "🌸", defaultPct: 0.25, desc: "Flowers & lighting" },
  { key: "PHOTOGRAPHER", label: "Photography", emoji: "📷", defaultPct: 0.15, desc: "Photos + video" },
  { key: "EVENT",        label: "Event Mgmt",  emoji: "🎪", defaultPct: 0.12, desc: "Coordination" },
  { key: "MAKEUP",       label: "Makeup",      emoji: "💄", defaultPct: 0.08, desc: "Bridal makeup" },
  { key: "MUSIC",        label: "Music / DJ",  emoji: "🎵", defaultPct: 0.10, desc: "Entertainment" },
];

const STEPS = [
  { id: 1, label: "Event",   emoji: "📅" },
  { id: 2, label: "Style",   emoji: "🎨" },
  { id: 3, label: "Budget",  emoji: "💰" },
  { id: 4, label: "Results", emoji: "✨" },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function DashboardPlannerPage() {
  const [step,      setStep]      = useState(1);
  const [loading,   setLoading]   = useState(false);
  const [results,   setResults]   = useState<any>(null);
  const [animDots,  setAnimDots]  = useState(".");

  const [eventType,  setEventType]  = useState("wedding");
  const [guestCount, setGuestCount] = useState("200");
  const [eventDate,  setEventDate]  = useState("");
  const [city,       setCity]       = useState("");
  const [themeId,    setThemeId]    = useState("royal_mughal");
  const [vibeId,     setVibeId]     = useState("elegant");
  const [budget,     setBudget]     = useState("500000");
  const [priorities, setPriorities] = useState<Record<string, number>>(
    Object.fromEntries(CATEGORIES.map(c => [c.key, c.defaultPct]))
  );

  useEffect(() => {
    if (!loading) return;
    const t = setInterval(() => setAnimDots(d => d.length >= 3 ? "." : d + "."), 400);
    return () => clearInterval(t);
  }, [loading]);

  const vibe       = VIBES.find(v => v.id === vibeId)!;
  const theme      = THEMES.find(t => t.id === themeId)!;
  const totalBudget = parseFloat(budget) * (vibe?.multiplier || 1);
  const fmt = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

  const totalPct = Object.values(priorities).reduce((a, b) => a + b, 0);
  const adjustPct = (key: string, val: number) => setPriorities(p => ({ ...p, [key]: val }));

  const run = async () => {
    setLoading(true);
    setStep(4);
    try {
      const data: any = await vendorApi.plannerRecommend({
        event_type:   eventType,
        guest_count:  parseInt(guestCount),
        city,
        total_budget: totalBudget,
        priorities,
      });
      setResults(data.recommendations);
    } catch {
      setResults({});
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setStep(1); setResults(null); };

  // ── Subcomponents ─────────────────────────────────────────────────────────
  const StepBar = () => (
    <div className="flex items-center gap-0 mb-6 sm:mb-8">
      {STEPS.map((s, idx) => (
        <div key={s.id} className="flex items-center flex-1 last:flex-none">
          <div className={`flex flex-col items-center gap-1 ${step >= s.id ? "opacity-100" : "opacity-40"}`}>
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-base sm:text-lg border-2 transition-all ${
              step > s.id  ? "border-green-400 bg-green-400 text-white" :
              step === s.id ? "border-rose-600 bg-rose-600 text-white" :
              "border-gray-200 bg-white text-gray-400"
            }`}>
              {step > s.id ? "✓" : s.emoji}
            </div>
            <span className="text-[10px] sm:text-xs text-gray-500 font-medium whitespace-nowrap">{s.label}</span>
          </div>
          {idx < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mx-1 sm:mx-2 mt-[-12px] transition-all ${step > s.id ? "bg-green-400" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  );

  const Card = ({ children, className = "" }: any) => (
    <div className={`bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-8 ${className}`}>
      {children}
    </div>
  );

  const NavButtons = ({ canNext, onNext, nextLabel = "Continue", isLast = false }: any) => (
    <div className="flex justify-between mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-gray-100">
      {step > 1
        ? <button onClick={() => setStep(s => s - 1)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition">
            <ChevronLeft size={16} /> Back
          </button>
        : <div />
      }
      <button
        onClick={onNext || (() => setStep(s => s + 1))}
        disabled={!canNext}
        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-40 transition shadow-md hover:opacity-90"
        style={{ background: `linear-gradient(135deg, ${BRAND}, ${GOLD})` }}
      >
        {isLast ? <><Sparkles size={16} /> Get My Plan</> : <>{nextLabel} <ChevronRight size={16} /></>}
      </button>
    </div>
  );

  // ── Step 1 ────────────────────────────────────────────────────────────────
  const Step1 = () => (
    <Card>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Tell us about your event</h2>
      <p className="text-sm text-gray-400 mb-6">We'll tailor vendor suggestions just for you</p>

      <div className="mb-6">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Event Type</label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {EVENT_TYPES.map(et => (
            <button key={et.id} onClick={() => setEventType(et.id)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition text-center ${
                eventType === et.id ? "border-rose-500 bg-rose-50" : "border-gray-100 hover:border-rose-200"
              }`}>
              <span className="text-2xl">{et.emoji}</span>
              <span className="text-xs font-medium text-gray-700 leading-tight">{et.label}</span>
              <span className="text-[10px] text-gray-400">{et.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">City / Location *</label>
          <input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Kochi, Kerala"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-rose-300" />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Guest Count</label>
          <input type="number" min="10" value={guestCount} onChange={e => setGuestCount(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-rose-300" />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Event Date</label>
          <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-rose-300" />
        </div>
      </div>

      <NavButtons canNext={!!city} />
    </Card>
  );

  // ── Step 2 ────────────────────────────────────────────────────────────────
  const Step2 = () => (
    <Card>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Choose your style</h2>
      <p className="text-sm text-gray-400 mb-6">Pick a theme and vibe that speaks to you</p>

      <div className="mb-7">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Wedding Theme</label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {THEMES.map(t => (
            <button key={t.id} onClick={() => setThemeId(t.id)}
              className={`flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl border-2 transition ${
                themeId === t.id ? "border-rose-500 bg-rose-50" : "border-gray-100 hover:border-rose-200"
              }`}>
              <span className="text-3xl">{t.emoji}</span>
              <span className="text-xs font-semibold text-gray-800 text-center">{t.label}</span>
              <span className="text-[10px] text-gray-400">{t.desc}</span>
              <div className="flex gap-1">
                {t.palettes.map(c => (
                  <div key={c} className="w-4 h-4 rounded-full border border-white shadow-sm" style={{ background: c }} />
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Event Vibe</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {VIBES.map(v => (
            <button key={v.id} onClick={() => setVibeId(v.id)}
              className={`flex flex-col gap-1.5 p-4 rounded-2xl border-2 transition ${
                vibeId === v.id ? "border-rose-500 bg-rose-50" : "border-gray-100 hover:border-rose-200"
              }`}>
              <span className="text-2xl">{v.emoji}</span>
              <span className="text-sm font-semibold text-gray-800">{v.label}</span>
              <span className="text-xs text-gray-400">{v.desc}</span>
              {v.multiplier !== 1 && (
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${v.multiplier > 1 ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600"}`}>
                  {v.multiplier > 1 ? `+${Math.round((v.multiplier - 1) * 100)}%` : `−${Math.round((1 - v.multiplier) * 100)}%`} budget
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <NavButtons canNext={true} />
    </Card>
  );

  // ── Step 3 ────────────────────────────────────────────────────────────────
  const Step3 = () => (
    <Card>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Set your budget</h2>
      <p className="text-sm text-gray-400 mb-6">Adjust how to allocate across categories</p>

      <div className="mb-6">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Total Wedding Budget (₹)</label>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
            <input type="number" min="50000" step="50000" value={budget}
              onChange={e => setBudget(e.target.value)}
              className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold focus:outline-none focus:border-rose-300" />
          </div>
          <div className="bg-rose-50 rounded-xl px-4 py-3 text-center sm:min-w-32">
            <p className="text-xs text-rose-400 font-medium">With {vibe?.label}</p>
            <p className="font-bold text-rose-700 text-sm">{fmt(totalBudget)}</p>
          </div>
        </div>

        <div className="flex gap-2 mt-2 flex-wrap">
          {[200000, 500000, 1000000, 2000000].map(b => (
            <button key={b} onClick={() => setBudget(String(b))}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${budget === String(b) ? "border-rose-500 bg-rose-50 text-rose-700" : "border-gray-200 text-gray-600 hover:border-rose-300"}`}>
              {fmt(b)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Budget Allocation</p>
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${Math.abs(totalPct - 1) < 0.001 ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"}`}>
            {Math.round(totalPct * 100)}% allocated
          </span>
        </div>
        {CATEGORIES.map(cat => {
          const pct = priorities[cat.key] || 0;
          const amt = totalBudget * pct;
          return (
            <div key={cat.key} className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{cat.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{cat.label}</p>
                    <p className="text-xs text-gray-400">{cat.desc}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-800">{fmt(amt)}</p>
                  <p className="text-xs text-gray-400">{Math.round(pct * 100)}%</p>
                </div>
              </div>
              <input type="range" min="0" max="0.6" step="0.01" value={pct}
                onChange={e => adjustPct(cat.key, parseFloat(e.target.value))}
                className="w-full accent-rose-600 h-2" />
            </div>
          );
        })}
      </div>

      <NavButtons canNext={parseFloat(budget) >= 50000} isLast onNext={run} nextLabel="Get My Plan" />
    </Card>
  );

  // ── Step 4: Results ───────────────────────────────────────────────────────
  const Step4 = () => {
    if (loading) {
      return (
        <Card className="text-center py-20">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-rose-100 animate-ping" />
            <div className="absolute inset-2 rounded-full border-4 border-rose-200 animate-spin" style={{ borderTopColor: BRAND }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles size={28} className="text-rose-600" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Planning your perfect wedding{animDots}</h3>
          <p className="text-sm text-gray-400">Matching vendors · Calculating budget · Building your timeline</p>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        {/* Hero result */}
        <div className="rounded-3xl p-8 text-white shadow-xl"
          style={{ background: `linear-gradient(135deg, ${BRAND} 0%, ${GOLD} 100%)` }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl">
              {theme.emoji}
            </div>
            <div>
              <p className="text-white/70 text-sm">Your personalised plan is ready</p>
              <h2 className="text-xl font-bold">{theme.label} · {vibe.label}</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "Total Budget", value: fmt(totalBudget) },
              { label: "Event Type",   value: EVENT_TYPES.find(e => e.id === eventType)?.label || eventType },
              { label: "Guest Count",  value: `${guestCount} guests` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/10 rounded-xl p-3 text-center">
                <p className="text-white font-bold text-base sm:text-lg">{value}</p>
                <p className="text-white/60 text-xs">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Colour palette */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-bold text-gray-900 mb-4">🎨 Your Colour Palette</h3>
          <div className="flex gap-3">
            {theme.palettes.map((c, i) => (
              <div key={i} className="flex-1">
                <div className="h-16 rounded-xl shadow-sm border border-white" style={{ background: c }} />
                <p className="text-xs text-gray-400 text-center mt-1">{c}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Budget breakdown */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-bold text-gray-900 mb-4">💰 Budget Breakdown</h3>
          <div className="space-y-3">
            {CATEGORIES.map(cat => {
              const pct = priorities[cat.key] || 0;
              const amt = totalBudget * pct;
              return (
                <div key={cat.key} className="flex items-center gap-3">
                  <span className="text-lg flex-shrink-0">{cat.emoji}</span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{cat.label}</span>
                      <span className="text-sm font-bold text-gray-900">{fmt(amt)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: `linear-gradient(90deg, ${BRAND}, ${GOLD})` }} />
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 w-8 text-right">{Math.round(pct * 100)}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Vendor recommendations */}
        {results && Object.keys(results).length > 0 && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-4">🤝 Matched Vendors in {city}</h3>
            {Object.entries(results as Record<string, any>).map(([cat, data]) => {
              const catInfo = CATEGORIES.find(c => c.key === cat);
              const vendors = data.vendors || [];
              if (!vendors.length) return null;
              return (
                <div key={cat} className="mb-6 last:mb-0">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">{catInfo?.emoji}</span>
                    <span className="text-sm font-bold text-gray-700">{catInfo?.label}</span>
                    <span className="text-xs text-gray-400">· Budget: {fmt(data.budget)}</span>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {vendors.map((v: any) => (
                      <Link key={v.id} href={`/vendors/${v.slug}`}
                        className="block p-4 border border-gray-100 rounded-2xl hover:border-rose-200 hover:shadow-sm transition group">
                        {v.thumbnail && (
                          <img src={v.thumbnail} alt={v.title}
                            className="w-full h-28 object-cover rounded-xl mb-3" />
                        )}
                        <p className="font-semibold text-gray-900 text-sm group-hover:text-rose-700 transition">{v.title}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin size={10} className="text-gray-400" />
                          <span className="text-xs text-gray-400">{v.city}</span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          {v.avg_rating && (
                            <div className="flex items-center gap-1">
                              <Star size={11} className="text-amber-400 fill-amber-400" />
                              <span className="text-xs font-medium text-gray-700">{v.avg_rating}</span>
                            </div>
                          )}
                          {v.starting_price && (
                            <span className="text-xs font-bold text-rose-700">From {fmt(v.starting_price)}</span>
                          )}
                          {v.is_verified && (
                            <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">✓ Verified</span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* No vendors fallback */}
        {results && Object.values(results as Record<string, any>).every((d: any) => !d.vendors?.length) && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <p className="font-semibold text-gray-700">No vendors found in {city} yet</p>
            <p className="text-sm text-gray-400 mt-1">Be among the first vendors to join in your city!</p>
            <Link href="/vendors" className="inline-block mt-4 px-5 py-2.5 rounded-xl text-sm text-white font-semibold"
              style={{ background: BRAND }}>
              Browse All Vendors
            </Link>
          </div>
        )}

        {/* Wedding timeline */}
        {eventDate && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-4">📅 Planning Timeline</h3>
            <div className="relative pl-6 border-l-2 border-rose-100 space-y-4">
              {generateTimeline(eventDate).map((item, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-[1.4rem] w-4 h-4 rounded-full bg-white border-2" style={{ borderColor: item.done ? "#10B981" : BRAND }} />
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="text-xs text-gray-400">{item.when}</p>
                      <p className="text-sm font-medium text-gray-800">{item.task}</p>
                    </div>
                    {item.done && <CheckCircle2 size={16} className="text-green-500 flex-shrink-0 mt-1" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="flex gap-3 flex-wrap">
          <button onClick={reset}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
            ← Start Over
          </button>
          <Link href="/dashboard/vendor-manager"
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white text-center transition shadow-md"
            style={{ background: `linear-gradient(135deg, ${BRAND}, ${GOLD})` }}>
            Save to My Vendors →
          </Link>
        </div>
      </div>
    );
  };

  // ── Page wrapper (no navbar/hero — handled by dashboard layout) ───────────
  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-2"
          style={{ background: `${GOLD}20`, color: GOLD, border: `1px solid ${GOLD}40` }}>
          <Sparkles size={12} /> AI-Powered Planning Studio
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Plan Your Perfect Event</h1>
        <p className="text-sm text-gray-400 mt-1">
          Answer a few questions — we'll instantly match the best vendors and build a personalised budget plan.
        </p>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-6 mb-8 text-center">
        {[["4", "Simple steps"], ["2 min", "To complete"], ["Free", "Always free"]].map(([n, l]) => (
          <div key={l}>
            <p className="text-base font-bold" style={{ color: BRAND }}>{n}</p>
            <p className="text-[11px] text-gray-400">{l}</p>
          </div>
        ))}
      </div>

      <StepBar />
      {step === 1 && <Step1 />}
      {step === 2 && <Step2 />}
      {step === 3 && <Step3 />}
      {step === 4 && <Step4 />}
    </div>
  );
}

// ── Timeline generator ────────────────────────────────────────────────────────
function generateTimeline(eventDate: string) {
  const wedding = new Date(eventDate);
  const now     = new Date();
  const months  = (d: Date) => Math.round((wedding.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 30));
  const m = months(now);

  return [
    { when: "12+ months before",  task: "Book your venue and photographer",              done: m < 12 },
    { when: "9–12 months before", task: "Book caterer, DJ, and decor vendor",            done: m < 9  },
    { when: "6–9 months before",  task: "Order wedding attire & send save-the-dates",   done: m < 6  },
    { when: "3–6 months before",  task: "Send invitations & book transport",             done: m < 3  },
    { when: "1–3 months before",  task: "Final fittings & confirm all vendors",          done: m < 1  },
    { when: "Wedding day! 🎉",    task: new Date(eventDate).toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" }), done: false },
  ];
}
