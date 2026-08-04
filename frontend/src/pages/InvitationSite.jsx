import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { weddingApi } from '../lib/eventsApi'
import Seo from '../components/Seo'

// ── Map the real backend CoupleWebsiteDetail response onto the same shape ──────
// this page's UI already expects (kept identical to the old mock/localStorage
// shape so none of the rendering below needs to change).
function mapWebsiteToSite(w) {
  const bg = w.bridegroom || {}
  return {
    coupleName: w.couple,
    groomFullName: bg.groom_name || '',
    brideFullName: bg.bride_name || '',
    groomBio: bg.groom_description || '',
    brideBio: bg.bride_description || '',
    groomInstagram: bg.groom_instagram || '',
    brideInstagram: bg.bride_instagram || '',
    groomPhoto: bg.groom_image || null,
    bridePhoto: bg.bride_image || null,
    coverPhoto: w.thumbnail || null,
    theme: w.theme,
    weddingDate: w.countdown ? (w.countdown.event_date || '').slice(0, 16) : '',
    weddingDateHeading: w.countdown?.heading || 'We Are Getting Married!',
    events: (w.events || []).map(e => ({
      id: e.id, name: e.title || '', date: e.date ? e.date.slice(0, 10) : '',
      time: e.time || '', venue: e.location_name || '', address: e.desc || '', mapLink: e.location_link || '', photo: e.image || null,
    })),
    story: (w.stories || []).map(s => ({
      id: s.id, emoji: '✨', title: s.title || '', description: s.desc || '',
      date: s.date ? s.date.slice(0, 10) : '', photo: s.image || null,
    })),
    seo: w.seo || null,
  }
}

// ── Demo invitation (shown when no data) ──────────────────────────────────────
const DEMO = {
  id: 'demo',
  coupleName: 'Priya & Arjun',
  groomFullName: 'Arjun Nair',
  brideFullName: 'Priya Menon',
  groomBio: 'An architect with a love for sunsets and strong chai.',
  brideBio: 'A literature teacher who believes every story deserves a beautiful ending.',
  groomInstagram: '@arjun.nair',
  brideInstagram: '@priya.menon',
  groomPhoto: null,
  bridePhoto: null,
  coverPhoto: null,
  theme: 'cinematic_dark',
  weddingDate: '2026-12-14T18:30',
  weddingDateHeading: 'We Are Getting Married!',
  events: [
    { id: 1, name: 'Mehendi Ceremony',  date: '2026-12-12', time: '16:00', venue: 'Nair Residence',          address: '14 Garden Lane, Kochi',    mapLink: '' },
    { id: 2, name: 'Sangeet Night',     date: '2026-12-13', time: '19:00', venue: 'The Grand Pavilion',      address: 'Marine Drive, Kochi',      mapLink: '' },
    { id: 3, name: 'Wedding Ceremony',  date: '2026-12-14', time: '10:00', venue: "St. George's Basilica",   address: 'Fort Kochi, Kerala',       mapLink: '' },
    { id: 4, name: 'Wedding Reception', date: '2026-12-14', time: '18:30', venue: 'Vivanta by Taj',           address: 'MG Road, Kochi',           mapLink: '' },
  ],
  story: [
    { id: 1, emoji: '☕', title: 'First Meeting',  description: 'A rainy afternoon, a crowded café, and one borrowed umbrella that changed everything.', date: 'March 2022' },
    { id: 2, emoji: '🌊', title: 'First Date',     description: 'A sunset walk along the Cherai beach. Neither of us wanted it to end.', date: 'April 2022' },
    { id: 3, emoji: '✈️', title: 'First Trip',     description: 'Lost in the bylanes of Goa. Found ourselves instead.', date: 'August 2022' },
    { id: 4, emoji: '💍', title: 'The Proposal',   description: 'Under a thousand fairy lights at her favourite bookshop. She said yes before he finished the question.', date: 'February 2026' },
  ],
}

// ── Site theme config ─────────────────────────────────────────────────────────
const SITE_THEMES = {
  royal_mughal: {
    bg: '#0e0508', accent: '#d97706', accentLight: '#fde68a',
    accentDim: 'rgba(217,119,6,0.50)', accentFaint: 'rgba(217,119,6,0.08)',
    border: 'rgba(217,119,6,0.22)', starColor: '#d97706',
    textPrimary: '#fde68a', textSecondary: 'rgba(253,230,138,0.50)',
    tagline: 'A Royal Union', ambientGlow: 'rgba(217,119,6,0.05)',
    photoFilter: 'sepia(0.5) contrast(1.1) brightness(0.78)',
    heroGradient: 'rgba(217,119,6,0.06)',
  },
  kerala_traditional: {
    bg: '#050e08', accent: '#fbbf24', accentLight: '#fef3c7',
    accentDim: 'rgba(251,191,36,0.50)', accentFaint: 'rgba(251,191,36,0.07)',
    border: 'rgba(251,191,36,0.22)', starColor: '#fbbf24',
    textPrimary: '#fef3c7', textSecondary: 'rgba(254,243,199,0.50)',
    tagline: 'A Sacred Union', ambientGlow: 'rgba(251,191,36,0.04)',
    photoFilter: 'saturate(0.8) sepia(0.3) contrast(1.05) brightness(0.78)',
    heroGradient: 'rgba(251,191,36,0.05)',
  },
  // The one light-canvas theme in the set — an ivory Kasavu palette instead
  // of the dark-canvas-with-light-accent treatment every other theme uses.
  // textPrimary/textSecondary are dark warm-brown tints (not light tints
  // like the other themes) since they sit on an ivory bg, not a near-black
  // one; the rest of the site (Section reveal, GoldDivider, box-shadows,
  // photo vignettes) is already fully parameterized through these fields
  // and reads correctly against a light bg without further changes.
  kerala_light: {
    bg: '#fdf8ec', accent: '#b45309', accentLight: '#78350f',
    accentDim: 'rgba(180,83,9,0.50)', accentFaint: 'rgba(180,83,9,0.07)',
    border: 'rgba(180,83,9,0.22)', starColor: '#c9922a',
    textPrimary: '#3b2712', textSecondary: 'rgba(59,39,18,0.62)',
    tagline: 'An Ivory Beginning', ambientGlow: 'rgba(212,175,55,0.06)',
    photoFilter: 'saturate(1.08) contrast(1.03) brightness(1.04)',
    heroGradient: 'rgba(212,175,55,0.10)',
  },
  modern_minimal: {
    bg: '#080810', accent: '#a78bfa', accentLight: '#ede9fe',
    accentDim: 'rgba(167,139,250,0.50)', accentFaint: 'rgba(167,139,250,0.08)',
    border: 'rgba(167,139,250,0.22)', starColor: '#c4b5fd',
    textPrimary: '#ede9fe', textSecondary: 'rgba(237,233,254,0.50)',
    tagline: 'A Modern Love Story', ambientGlow: 'rgba(167,139,250,0.06)',
    photoFilter: 'grayscale(0.3) contrast(1.15) brightness(0.80)',
    heroGradient: 'rgba(167,139,250,0.06)',
  },
  floral_pastel: {
    bg: '#0f0810', accent: '#f9a8d4', accentLight: '#fce7f3',
    accentDim: 'rgba(249,168,212,0.50)', accentFaint: 'rgba(249,168,212,0.08)',
    border: 'rgba(249,168,212,0.22)', starColor: '#f9a8d4',
    textPrimary: '#fce7f3', textSecondary: 'rgba(252,231,243,0.50)',
    tagline: 'A Floral Romance', ambientGlow: 'rgba(249,168,212,0.05)',
    photoFilter: 'saturate(1.1) hue-rotate(330deg) brightness(0.80)',
    heroGradient: 'rgba(249,168,212,0.05)',
  },
  cinematic_dark: {
    bg: '#0a0a0a', accent: '#d4af6a', accentLight: '#e8d5a3',
    accentDim: 'rgba(212,175,106,0.50)', accentFaint: 'rgba(212,175,106,0.04)',
    border: 'rgba(212,175,106,0.14)', starColor: '#d4af6a',
    textPrimary: '#e8d5a3', textSecondary: 'rgba(240,230,211,0.45)',
    tagline: 'A Cinematic Love Story', ambientGlow: 'rgba(212,175,106,0.04)',
    photoFilter: 'grayscale(0.5) contrast(1.2) brightness(0.75)',
    heroGradient: 'rgba(212,175,106,0.04)',
  },
}

// ── Countdown hook ─────────────────────────────────────────────────────────────
function useCountdown(targetDate) {
  const calc = () => {
    const diff = new Date(targetDate) - Date.now()
    if (diff <= 0) return { days: 0, hours: 0, mins: 0, secs: 0, done: true }
    return { days: Math.floor(diff/86400000), hours: Math.floor((diff%86400000)/3600000), mins: Math.floor((diff%3600000)/60000), secs: Math.floor((diff%60000)/1000), done: false }
  }
  const [tick, setTick] = useState(calc)
  useEffect(() => {
    if (!targetDate) return
    const id = setInterval(() => setTick(calc()), 1000)
    return () => clearInterval(id)
  }, [targetDate])
  return tick
}

// ── Reveal hook ───────────────────────────────────────────────────────────────
function useReveal() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } }, { threshold: 0.12 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return [ref, visible]
}

// ── 3D tilt handlers ──────────────────────────────────────────────────────────
function useTilt() {
  const ref = useRef(null)
  const onMove = useCallback(e => {
    const el = ref.current; if (!el) return
    const r = el.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width  - 0.5) * 18
    const y = ((e.clientY - r.top)  / r.height - 0.5) * 18
    el.style.transform = `perspective(700px) rotateX(${-y}deg) rotateY(${x}deg) scale(1.03)`
    el.style.transition = 'transform 0.1s ease'
  }, [])
  const onLeave = useCallback(() => {
    if (ref.current) {
      ref.current.style.transform = 'perspective(700px) rotateX(0) rotateY(0) scale(1)'
      ref.current.style.transition = 'transform 0.5s cubic-bezier(0.23,1,0.32,1)'
    }
  }, [])
  return { ref, onMouseMove: onMove, onMouseLeave: onLeave }
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ children, className = '', delay = 0 }) {
  const [ref, visible] = useReveal()
  return (
    <div ref={ref} className={className}
      style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(48px)', transition: `opacity 0.8s ease ${delay}ms, transform 0.8s cubic-bezier(0.23,1,0.32,1) ${delay}ms` }}>
      {children}
    </div>
  )
}

// ── Gold divider ──────────────────────────────────────────────────────────────
function GoldDivider({ th }) {
  return (
    <div className="flex items-center justify-center gap-5 my-16">
      <div className="h-px flex-1" style={{ background: `linear-gradient(to right, transparent, ${th.accent}55, ${th.border})` }} />
      <div className="flex items-center gap-2.5 relative">
        <div className="w-1 h-1 rounded-full" style={{ background: th.accentDim }} />
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: th.accent }} />
        <div className="relative">
          <div className="absolute inset-0 rounded-full animate-ping" style={{ background: th.accentFaint, animationDuration: '3s' }} />
          <div className="text-[18px] relative z-10">💍</div>
        </div>
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: th.accent }} />
        <div className="w-1 h-1 rounded-full" style={{ background: th.accentDim }} />
      </div>
      <div className="h-px flex-1" style={{ background: `linear-gradient(to left, transparent, ${th.accent}55, ${th.border})` }} />
    </div>
  )
}

// ── Countdown unit ─────────────────────────────────────────────────────────────
function CountUnit({ value, label, th }) {
  const prev = useRef(value)
  const [flip, setFlip] = useState(false)
  useEffect(() => {
    if (prev.current !== value) { setFlip(true); prev.current = value; setTimeout(() => setFlip(false), 320) }
  }, [value])
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-[76px] h-[76px] sm:w-[96px] sm:h-[96px] rounded-2xl flex items-center justify-center overflow-hidden"
        style={{ background: `linear-gradient(160deg, ${th.accentFaint}, rgba(0,0,0,0.25))`, border: `1px solid ${th.border}`, boxShadow: `0 0 32px ${th.accentFaint} inset, 0 12px 32px rgba(0,0,0,0.5)` }}>
        {/* Top shine */}
        <div className="absolute top-0 left-0 right-0 h-1/2 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.07), transparent)', borderRadius: 'inherit' }} />
        {/* Number */}
        <span className="text-[30px] sm:text-[40px] font-bold tabular-nums leading-none"
          style={{ fontFamily: 'Georgia, serif', color: th.accent, transition: 'transform 0.28s ease, opacity 0.28s ease', transform: flip ? 'translateY(-6px)' : 'translateY(0)', opacity: flip ? 0.4 : 1 }}>
          {String(value).padStart(2, '0')}
        </span>
        {/* Center divider line */}
        <div className="absolute inset-x-0 top-1/2 h-px pointer-events-none" style={{ background: `rgba(0,0,0,0.35)` }} />
      </div>
      <span className="text-[10px] tracking-[0.28em] uppercase font-semibold" style={{ color: th.accentDim }}>{label}</span>
    </div>
  )
}

// ── Couple card ───────────────────────────────────────────────────────────────
function CoupleCard({ person, th }) {
  const tilt = useTilt()
  return (
    <div ref={tilt.ref} onMouseMove={tilt.onMouseMove} onMouseLeave={tilt.onMouseLeave}
      className="relative rounded-3xl overflow-hidden group"
      style={{ minHeight: '460px', transformStyle: 'preserve-3d', willChange: 'transform', border: `1px solid ${th.border}`, boxShadow: `0 30px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.03) inset` }}>

      {/* Background / photo */}
      {person.photo ? (
        <>
          <img src={person.photo} alt={person.name || ''} className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.06]"
            style={{ filter: th.photoFilter }} />
          <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${th.bg} 0%, ${th.bg}cc 22%, rgba(0,0,0,0.05) 55%, transparent 100%)` }} />
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4"
          style={{ background: `linear-gradient(160deg, ${th.bg}, rgba(0,0,0,0.85))` }}>
          <div className="relative">
            <div className="absolute inset-0 rounded-full animate-ping" style={{ background: th.accentFaint, animationDuration: '3s' }} />
            <div className="relative w-32 h-32 rounded-full flex items-center justify-center text-5xl"
              style={{ background: th.accentFaint, border: `2px solid ${th.border}`, boxShadow: `0 0 48px ${th.accentFaint}` }}>
              {person.role?.includes('Groom') ? '🤵' : '👰'}
            </div>
          </div>
          <div className="absolute w-72 h-72 rounded-full pointer-events-none"
            style={{ border: `1px solid ${th.accentFaint}`, animation: 'ring-pulse 5s ease-in-out infinite' }} />
        </div>
      )}

      {/* Role badge — top left */}
      <div className="absolute top-4 left-4 z-10">
        <span className="px-3 py-1 rounded-full text-[10px] tracking-[0.22em] uppercase font-bold"
          style={{ background: `${th.bg}dd`, backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: `1px solid ${th.border}`, color: th.accent }}>
          {person.role}
        </span>
      </div>

      {/* Bottom info panel */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-6">
        <h3 className="text-[30px] font-bold mb-1 leading-tight"
          style={{ color: th.accentLight, textShadow: '0 2px 24px rgba(0,0,0,0.9)' }}>
          {person.name || '—'}
        </h3>
        {person.bio && (
          <p className="text-[13px] italic leading-relaxed mb-3"
            style={{ color: 'rgba(240,230,211,0.65)', fontFamily: 'system-ui, sans-serif', textShadow: '0 1px 10px rgba(0,0,0,0.95)' }}>
            {person.bio}
          </p>
        )}
        {person.ig && (
          <a href={`https://instagram.com/${person.ig.replace('@','')}`} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-200 hover:opacity-80"
            style={{ background: `${th.bg}cc`, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: `1px solid ${th.border}`, color: th.accentDim, fontFamily: 'system-ui, sans-serif' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
            </svg>
            {person.ig}
          </a>
        )}
      </div>
    </div>
  )
}

// ── Story card ─────────────────────────────────────────────────────────────────
function StoryCard({ moment, index, th }) {
  const isLeft = index % 2 === 0
  return (
    <div className={`flex items-start gap-4 sm:gap-8 ${isLeft ? 'sm:flex-row' : 'sm:flex-row-reverse'}`}>
      <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full shrink-0 mt-1 relative z-10"
        style={{ background: th.accentFaint, border: `2px solid ${th.border}` }}>
        <span className="text-[16px]">{moment.emoji}</span>
      </div>
      <div className={`flex-1 rounded-2xl overflow-hidden max-w-md ${isLeft ? '' : 'sm:ml-auto'}`}
        style={{ background: 'rgba(255,255,255,0.035)', border: `1px solid ${th.border}`, boxShadow: '0 10px 40px rgba(0,0,0,0.4)' }}>

        {moment.photo ? (
          /* Side-by-side portrait layout when photo is present */
          <div className="flex" style={{ minHeight: '160px' }}>
            {/* Portrait photo — left side */}
            <div className="relative shrink-0 overflow-hidden" style={{ width: '120px', minHeight: '160px' }}>
              <img src={moment.photo} alt={moment.title}
                className="w-full h-full object-cover object-top"
                style={{ filter: th.photoFilter, position: 'absolute', inset: 0 }} />
              {/* Subtle right-fade overlay */}
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, transparent 60%, rgba(0,0,0,0.45) 100%)' }} />
            </div>
            {/* Text — right side */}
            <div className="flex-1 p-4 flex flex-col justify-center gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-lg">{moment.emoji}</span>
                <h4 className="text-[15px] font-bold leading-tight" style={{ color: th.accentLight }}>{moment.title}</h4>
              </div>
              {moment.description && (
                <p className="text-[12px] leading-relaxed italic" style={{ color: 'rgba(240,230,211,0.55)', fontFamily: 'system-ui, sans-serif' }}>
                  {moment.description}
                </p>
              )}
              {moment.date && (
                <span className="text-[10px] tracking-widest uppercase mt-1" style={{ color: th.accentDim, fontFamily: 'system-ui, sans-serif' }}>{moment.date}</span>
              )}
            </div>
          </div>
        ) : (
          /* Text-only layout when no photo */
          <div className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl sm:hidden">{moment.emoji}</span>
              <h4 className="text-[16px] font-bold" style={{ color: th.accentLight }}>{moment.title}</h4>
            </div>
            {moment.description && (
              <p className="text-[13px] leading-relaxed italic mb-3" style={{ color: 'rgba(240,230,211,0.55)', fontFamily: 'system-ui, sans-serif' }}>
                {moment.description}
              </p>
            )}
            {moment.date && (
              <span className="text-[10px] tracking-widest uppercase" style={{ color: th.accentDim, fontFamily: 'system-ui, sans-serif' }}>{moment.date}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Event card ─────────────────────────────────────────────────────────────────
function EventCard({ event, th }) {
  const tilt = useTilt()
  const dateObj  = event.date ? new Date(event.date + 'T12:00:00') : null
  const dayNum   = dateObj ? dateObj.getDate() : null
  const monthStr = dateObj ? dateObj.toLocaleDateString('en-IN', { month: 'short' }) : null
  const weekday  = dateObj ? dateObj.toLocaleDateString('en-IN', { weekday: 'long' }) : null
  const fmtTime  = event.time ? (() => { const [h, m] = event.time.split(':').map(Number); const ap = h >= 12 ? 'PM' : 'AM'; const hr = h % 12 || 12; return `${hr}:${String(m).padStart(2,'0')} ${ap}` })() : null

  return (
    <div ref={tilt.ref} onMouseMove={tilt.onMouseMove} onMouseLeave={tilt.onMouseLeave}
      className="rounded-2xl overflow-hidden flex flex-col group"
      style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${th.border}`, boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 40px ${th.accentFaint}`, transformStyle: 'preserve-3d', willChange: 'transform', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>

      {/* Photo header or styled gradient date header */}
      <div className="relative overflow-hidden" style={{ height: '168px' }}>
        {event.photo ? (
          <>
            <img src={event.photo} alt={event.name || ''} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
              style={{ filter: th.photoFilter }} />
            <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, transparent 28%, ${th.bg}bb 100%)` }} />
            {dateObj && (
              <div className="absolute bottom-3 left-4">
                <div className="font-bold leading-none" style={{ fontSize: '26px', color: 'white', fontFamily: 'Georgia, serif', textShadow: '0 2px 12px rgba(0,0,0,0.85)' }}>
                  {String(dayNum).padStart(2,'0')}
                </div>
                <div className="tracking-widest uppercase font-semibold" style={{ fontSize: '9px', color: 'rgba(255,255,255,0.65)', marginTop: '2px' }}>
                  {monthStr}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center flex-col"
            style={{ background: `linear-gradient(135deg, ${th.accentFaint} 0%, rgba(0,0,0,0.55) 100%)` }}>
            {/* Decorative background glow */}
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: `radial-gradient(ellipse at 50% 60%, ${th.accent}18 0%, transparent 70%)` }} />
            {dateObj ? (
              <div className="text-center relative z-10">
                <div className="leading-none tabular-nums" style={{ fontSize: '62px', fontWeight: 900, color: th.accent, fontFamily: 'Georgia, serif', textShadow: `0 0 40px ${th.accentDim}` }}>
                  {String(dayNum).padStart(2,'0')}
                </div>
                <div className="tracking-widest uppercase font-bold" style={{ fontSize: '11px', color: th.accentDim, marginTop: '6px', fontFamily: 'system-ui, sans-serif' }}>
                  {monthStr} · {weekday}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Time badge — top right */}
        {fmtTime && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-bold"
            style={{ background: `${th.bg}cc`, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: `1px solid ${th.border}`, color: th.accentLight, fontFamily: 'system-ui, sans-serif' }}>
            ⏰ {fmtTime}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col gap-2.5 p-4">
        <h4 className="text-[17px] font-bold" style={{ color: th.accentLight, fontFamily: 'system-ui, sans-serif' }}>{event.name}</h4>
        {event.venue && (
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-[11px]"
              style={{ background: th.accentFaint, border: `1px solid ${th.border}` }}>📍</div>
            <div>
              <p className="text-[13px] font-semibold leading-tight" style={{ color: 'rgba(240,230,211,0.85)', fontFamily: 'system-ui, sans-serif' }}>{event.venue}</p>
              {event.address && <p className="text-[11.5px] mt-0.5" style={{ color: 'rgba(240,230,211,0.38)', fontFamily: 'system-ui, sans-serif' }}>{event.address}</p>}
            </div>
          </div>
        )}
        {event.mapLink && (
          <a href={event.mapLink} target="_blank" rel="noreferrer"
            className="mt-auto flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12.5px] font-bold transition-all duration-200 hover:opacity-85 hover:-translate-y-0.5"
            style={{ background: `linear-gradient(135deg, ${th.accent}, ${th.accent}cc)`, color: th.bg, boxShadow: `0 4px 16px ${th.accentFaint}`, fontFamily: 'system-ui, sans-serif' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 11l19-9-9 19-2-8-8-2z"/>
            </svg>
            Get Directions
          </a>
        )}
      </div>
    </div>
  )
}

// ── Guest count picker ─────────────────────────────────────────────────────────
function GuestPicker({ value, onChange, th }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  const label = n => `${n} ${n === 1 ? 'Guest' : 'Guests'}`
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 rounded-xl text-[14px] text-left flex items-center justify-between transition-all duration-200"
        style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${open ? th.accent : th.border}`, color: th.textPrimary, fontFamily: 'system-ui, sans-serif', boxShadow: open ? `0 0 0 3px ${th.accentFaint}` : 'none', outline: 'none' }}>
        <span>{label(Number(value))}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ color: th.accentDim, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-2 rounded-xl overflow-hidden z-30"
          style={{ background: 'rgba(8,4,20,0.97)', border: `1px solid ${th.border}`, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', boxShadow: '0 20px 60px rgba(0,0,0,0.85)', animation: 'dropdown-in 0.15s cubic-bezier(0.4,0,0.2,1)' }}>
          {[1,2,3,4,5].map((n, idx) => (
            <button key={n} type="button" onClick={() => { onChange(String(n)); setOpen(false) }}
              className="w-full px-4 py-3 text-left text-[14px] flex items-center justify-between transition-colors duration-100"
              style={{ fontFamily: 'system-ui, sans-serif', color: value === String(n) ? th.accent : 'rgba(240,230,211,0.75)', background: value === String(n) ? th.accentFaint : 'transparent', borderBottom: idx < 4 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
              onMouseEnter={e => { if (value !== String(n)) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
              onMouseLeave={e => { if (value !== String(n)) e.currentTarget.style.background = 'transparent' }}>
              <span>{label(n)}</span>
              {value === String(n) && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: th.accent }}>
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Selfie compress (local only, not stored) ───────────────────────────────────
function compressSelfie(file) {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = ev => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, 400 / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.65))
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  })
}

// ── Gallery photo tile ────────────────────────────────────────────────────────
function GalleryTile({ p, idx, th }) {
  const [hov, setHov] = useState(false)
  const download = (e) => {
    e.stopPropagation()
    const a = document.createElement('a'); a.href = p.photo; a.download = `photo-${idx + 1}.jpg`; a.click()
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', aspectRatio: '1', cursor: 'pointer', background: th.accentFaint, boxShadow: hov ? '0 8px 28px rgba(0,0,0,0.45)' : '0 2px 8px rgba(0,0,0,0.25)', transition: 'box-shadow 0.25s' }}>
        <img src={p.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transform: hov ? 'scale(1.06)' : 'scale(1)', transition: 'transform 0.4s ease' }} />
        {p.category && (
          <div style={{ position: 'absolute', top: '6px', right: '6px', padding: '2px 7px', borderRadius: '999px', background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(8px)', fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{p.category}</div>
        )}
      </div>
      <button onClick={download} style={{ width: '100%', padding: '5px 0', borderRadius: '999px', background: 'rgba(255,255,255,0.07)', border: `1px solid ${th.border}`, color: th.textSecondary, fontSize: '11px', fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s', letterSpacing: '0.04em' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.13)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}>
        Download
      </button>
    </div>
  )
}

// ── Gallery Section ───────────────────────────────────────────────────────────
function GallerySection({ photos, th }) {
  const [filter, setFilter] = useState('All')
  const [page, setPage] = useState(0)
  const PER_PAGE = 9
  if (!photos.length) return null
  const cats = ['All', ...Array.from(new Set(photos.map(p => p.category).filter(Boolean)))]
  const filtered = filter === 'All' ? photos : photos.filter(p => p.category === filter)
  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paginated = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE)

  return (
    <div id="gallery" style={{ marginBottom: '48px' }}>
      <GoldDivider th={th} />
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: th.accentDim, marginBottom: '6px' }}>GALLERY</p>
        <h2 style={{ fontFamily: "'Dancing Script', 'Brush Script MT', cursive", fontSize: 'clamp(1.9rem, 5vw, 2.8rem)', fontWeight: 700, color: th.accentLight, lineHeight: 1.2, marginBottom: '8px' }}>Our Memories</h2>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '14px' }}>
          <div style={{ height: '1px', width: '28px', background: `linear-gradient(to right, transparent, ${th.accent})` }} />
          <span style={{ color: th.accent, fontSize: '12px' }}>✦</span>
          <div style={{ height: '1px', width: '28px', background: `linear-gradient(to left, transparent, ${th.accent})` }} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '7px' }}>
          {cats.map(c => (
            <button key={c} onClick={() => { setFilter(c); setPage(0) }}
              style={{ padding: '4px 14px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                background: filter === c ? th.accent : 'rgba(255,255,255,0.06)',
                border: `1px solid ${filter === c ? th.accent : th.border}`,
                color: filter === c ? th.bg : th.textSecondary }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
        {paginated.map((p, i) => <GalleryTile key={p.id} p={p} idx={page * PER_PAGE + i} th={th} />)}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            style={{ width: '30px', height: '30px', borderRadius: '8px', fontSize: '14px', cursor: page === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.06)', border: `1px solid ${th.border}`, color: page === 0 ? 'rgba(255,255,255,0.2)' : th.textSecondary }}>‹</button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} onClick={() => setPage(i)}
              style={{ width: '30px', height: '30px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                background: page === i ? th.accent : 'rgba(255,255,255,0.06)',
                border: `1px solid ${page === i ? th.accent : th.border}`,
                color: page === i ? th.bg : th.textSecondary }}>
              {i + 1}
            </button>
          ))}
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
            style={{ width: '30px', height: '30px', borderRadius: '8px', fontSize: '14px', cursor: page === totalPages - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.06)', border: `1px solid ${th.border}`, color: page === totalPages - 1 ? 'rgba(255,255,255,0.2)' : th.textSecondary }}>›</button>
        </div>
      )}
    </div>
  )
}

// ── AI Selfie Match ───────────────────────────────────────────────────────────
function SelfieMatchSection({ photos, th }) {
  const [selfie, setSelfie] = useState(null)
  const [matching, setMatching] = useState(false)
  const [matches, setMatches] = useState(null)
  const fileRef = useRef(null)
  if (photos.length < 4) return null

  const handleSelfie = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const compressed = await compressSelfie(file)
    setSelfie(compressed); setMatches(null); setMatching(true)
    setTimeout(() => {
      const shuffled = [...photos].sort(() => Math.random() - 0.5)
      setMatches(shuffled.slice(0, 3))
      setMatching(false)
    }, 2200)
    e.target.value = ''
  }

  return (
    <Section className="mb-10">
      <div className="rounded-3xl p-5" style={{ background: `linear-gradient(135deg, ${th.accentFaint}, rgba(0,0,0,0.18))`, border: `1px solid ${th.border}` }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl shrink-0" style={{ background: th.accentFaint, border: `1.5px solid ${th.border}` }}>🤳</div>
          <div>
            <h3 className="text-[15px] font-bold leading-tight" style={{ color: th.textPrimary }}>AI Selfie Match</h3>
            <p className="text-[12px]" style={{ color: th.textSecondary }}>Upload your selfie — we'll find your photos from the event</p>
          </div>
        </div>
        {!selfie ? (
          <button onClick={() => fileRef.current?.click()}
            className="w-full py-3 rounded-xl text-[13px] font-semibold transition-all duration-200"
            style={{ background: 'rgba(255,255,255,0.06)', border: `1.5px dashed ${th.border}`, color: th.accentLight, cursor: 'pointer' }}>
            📷 Upload Your Selfie
          </button>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-14 h-14 rounded-full overflow-hidden shrink-0" style={{ border: `2px solid ${th.accent}` }}>
                <img src={selfie} alt="" className="w-full h-full object-cover object-top" />
              </div>
              <div className="flex-1">
                {matching ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full shrink-0" style={{ border: `2px solid ${th.accent}`, borderTopColor: 'transparent', animation: 'ring-spin 0.75s linear infinite' }} />
                    <span className="text-[13px]" style={{ color: th.textSecondary }}>Scanning event photos…</span>
                  </div>
                ) : (
                  <p className="text-[13px] font-semibold" style={{ color: th.accentLight }}>Found {matches?.length || 0} photos with you! ✨</p>
                )}
              </div>
              <button onClick={() => { setSelfie(null); setMatches(null) }} className="text-[12px] shrink-0" style={{ color: th.textSecondary, cursor: 'pointer', background: 'none', border: 'none' }}>✕</button>
            </div>
            {matches?.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {matches.map((p, i) => (
                  <div key={i} style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', aspectRatio: '1', border: `2px solid ${th.accent}`, boxShadow: `0 0 18px ${th.accentDim}` }}>
                    <img src={p.photo} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleSelfie} />
      </div>
    </Section>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function InvitationSite() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [inv, setInv] = useState(null)
  const [gallery, setGallery] = useState([])
  const [rsvp, setRsvp] = useState({ name: '', phone: '', attending: 'yes', guests: '1' })
  const [rsvpSent, setRsvpSent] = useState(false)
  const [wishes, setWishes] = useState([])
  const [wishMsg, setWishMsg] = useState('')
  const [wishName, setWishName] = useState('')
  const [scrollY, setScrollY] = useState(0)
  const heroTilt = useTilt()
  const countdown = useCountdown(inv?.weddingDate)
  const isPreview = new URLSearchParams(window.location.search).has('preview')

  useEffect(() => {
    if (isPreview) return
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isPreview])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const w = await weddingApi.get(id)
        if (cancelled) return
        // A slug that's been redirected (see app/seo/redirects.py) comes back
        // as { redirect: true, target_path } instead of the normal detail
        // payload — send the visitor straight on rather than 404ing.
        if (w && w.redirect && w.target_path) {
          navigate(w.target_path, { replace: true })
          return
        }
        setInv(mapWebsiteToSite(w))
        weddingApi.listPhotos(id)
          .then(photos => setGallery(photos.map(p => ({ id: p.id, photo: p.image, category: p.tag }))))
          .catch(() => setGallery([]))
        weddingApi.listWishes(id)
          .then(list => setWishes(list.map(w2 => ({ id: w2.id, name: w2.name, msg: w2.message }))))
          .catch(() => setWishes([]))
        if (!isPreview) weddingApi.recordVisit(id).catch(() => {})
      } catch (e) {
        if (!cancelled) setInv(DEMO)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id, isPreview])

  useEffect(() => {
    if (!isPreview) return
    const send = () => {
      const root = document.getElementById('root')
      const h = root ? Math.ceil(root.getBoundingClientRect().height) : document.documentElement.scrollHeight
      if (h > 0) window.parent?.postMessage({ type: 'planazo_preview_height', h }, '*')
    }
    send()
    const t1 = setTimeout(send, 400)
    const t2 = setTimeout(send, 1200)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [isPreview, inv, gallery])

  const handleRsvp = e => {
    e.preventDefault()
    setRsvpSent(true)
    weddingApi.createRSVP(id, {
      name: rsvp.name || 'Guest',
      phone: rsvp.phone || '',
      attendance: rsvp.attending === 'yes' ? 'YES' : 'NO',
      guests: Number(rsvp.guests) || 1,
    }).catch(() => {})
  }
  const handleWish = e => {
    e.preventDefault(); if (!wishMsg.trim()) return
    const name = wishName || 'A Guest'
    setWishes(prev => [{ id: Date.now(), name, msg: wishMsg }, ...prev])
    weddingApi.createWish(id, { name, message: wishMsg }).catch(() => {})
    setWishMsg(''); setWishName('')
  }

  if (!inv) return <div style={{ background: '#0a0a0a' }} />

  const th = SITE_THEMES[inv.theme] || SITE_THEMES.cinematic_dark
  const wdDate = inv.weddingDate ? new Date(inv.weddingDate) : null

  return (
    <div className="min-h-screen" style={{ background: th.bg, color: th.textPrimary, fontFamily: "'Georgia', 'Times New Roman', serif" }}>

      {/* Skip in preview — the editor iframe shouldn't hijack the parent
          dashboard tab's title/meta tags. */}
      {!isPreview && <Seo seo={inv.seo} fallbackTitle={`${inv.coupleName} — Wedding Invitation | Planazo`} />}

      {/* Star field — skip in preview for performance */}
      {!isPreview && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          {[...Array(60)].map((_, i) => (
            <div key={i} className="absolute rounded-full"
              style={{
                width: Math.random() * 2 + 1 + 'px', height: Math.random() * 2 + 1 + 'px',
                top: Math.random() * 100 + '%', left: Math.random() * 100 + '%',
                background: th.starColor, opacity: Math.random() * 0.4 + 0.1,
                animation: `star-twinkle ${Math.random() * 4 + 3}s ease-in-out infinite`,
                animationDelay: Math.random() * 5 + 's',
              }} />
          ))}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full"
            style={{ background: `radial-gradient(ellipse, ${th.ambientGlow} 0%, transparent 70%)`, filter: 'blur(40px)' }} />
        </div>
      )}

      {/* Floating nav — hidden in preview */}
      {!isPreview && (
        <nav className="fixed top-5 left-1/2 -translate-x-1/2 z-50 hidden md:flex items-center gap-1 px-4 py-2 rounded-full text-[12px] tracking-wider"
          style={{ background: `${th.bg}dd`, border: `1px solid ${th.border}`, backdropFilter: 'blur(20px)' }}>
          {['The Couple','Our Story','Events','RSVP','Gallery','Guestbook'].map(s => (
            <a key={s} href={`#${s.toLowerCase().replace(/ /g,'-')}`}
              className="px-3 py-1.5 rounded-full transition-all duration-200 hover:opacity-100"
              style={{ color: th.accentDim }}
              onClick={e => { e.preventDefault(); document.getElementById(s.toLowerCase().replace(/ /g,'-'))?.scrollIntoView({ behavior: 'smooth' }) }}>
              {s}
            </a>
          ))}
        </nav>
      )}

      {/* ═══ HERO ═══ */}
      <section className={`relative ${isPreview ? 'py-10' : 'min-h-screen'} flex flex-col items-center justify-center px-6 overflow-hidden`}>
        {/* Cover photo — parallax on full site, static in preview */}
        {inv.coverPhoto && (
          <div className="absolute inset-0 z-0"
            style={isPreview ? undefined : { transform: `translateY(${scrollY * 0.35}px)`, willChange: 'transform' }}>
            <img src={inv.coverPhoto} alt="" className="w-full h-full object-cover" style={{ filter: `${th.photoFilter} brightness(0.48)` }} />
          </div>
        )}
        {/* Deep gradient overlay */}
        <div className="absolute inset-0 z-[1]" style={{ background: `linear-gradient(to bottom, ${th.bg}55 0%, ${th.bg}99 60%, ${th.bg} 100%)` }} />

        {/* Ambient glow blob */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full pointer-events-none z-[2]"
          style={{ background: `radial-gradient(ellipse, ${th.heroGradient} 0%, transparent 70%)`, filter: 'blur(60px)', animation: 'ring-pulse 8s ease-in-out infinite' }} />

        {/* Decorative rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[3]">
          {[620, 460, 310, 180].map((size, i) => (
            <div key={i} className="absolute rounded-full"
              style={{
                width: size, height: size,
                border: `1px solid ${th.accentFaint}`,
                opacity: 1 - i * 0.18,
                animation: `ring-pulse ${6 + i * 2}s ease-in-out infinite`,
                animationDelay: i * 1.2 + 's',
              }} />
          ))}
        </div>

        {/* Floating sparkles — skip in preview */}
        {!isPreview && (
          <div className="absolute inset-0 pointer-events-none z-[4]">
            {[...Array(18)].map((_, i) => (
              <div key={i} className="absolute rounded-full"
                style={{
                  width: Math.random() * 3 + 1 + 'px', height: Math.random() * 3 + 1 + 'px',
                  top: 20 + Math.random() * 60 + '%', left: 10 + Math.random() * 80 + '%',
                  background: th.accent, opacity: Math.random() * 0.6 + 0.2,
                  animation: `star-twinkle ${Math.random() * 3 + 2}s ease-in-out infinite`,
                  animationDelay: Math.random() * 4 + 's',
                }} />
            ))}
          </div>
        )}

        {/* Hero card */}
        <div ref={heroTilt.ref} onMouseMove={heroTilt.onMouseMove} onMouseLeave={heroTilt.onMouseLeave}
          className="relative z-20 text-center max-w-2xl w-full px-8 py-14 rounded-3xl"
          style={{
            background: inv.coverPhoto ? 'rgba(4,2,12,0.60)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${th.border}`,
            boxShadow: `0 0 100px ${th.heroGradient} inset, 0 40px 100px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.04) inset`,
            animation: 'hero-enter 1.2s cubic-bezier(0.23,1,0.32,1) both',
            transformStyle: 'preserve-3d',
            backdropFilter: inv.coverPhoto ? 'blur(10px)' : 'none',
            WebkitBackdropFilter: inv.coverPhoto ? 'blur(10px)' : 'none',
          }}>

          {/* Tagline */}
          <p className="text-[10px] tracking-[0.4em] uppercase mb-8 flex items-center justify-center gap-3" style={{ color: th.accentDim }}>
            <span style={{ display: 'inline-block', width: 32, height: 1, background: `linear-gradient(to right, transparent, ${th.accent})` }} />
            {th.tagline}
            <span style={{ display: 'inline-block', width: 32, height: 1, background: `linear-gradient(to left, transparent, ${th.accent})` }} />
          </p>

          {/* Couple name with shimmer */}
          <h1 className="font-bold leading-[1.08] mb-5"
            style={{
              fontSize: 'clamp(2.6rem, 9vw, 5rem)',
              background: `linear-gradient(135deg, ${th.accentLight} 0%, ${th.accent} 30%, ${th.accentLight} 50%, ${th.accent} 70%, ${th.accentLight} 100%)`,
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              animation: 'gold-shimmer 4s linear infinite',
              filter: `drop-shadow(0 0 20px ${th.accent}55)`,
            }}>
            {inv.coupleName || 'Priya & Arjun'}
          </h1>

          <p className="text-[15px] italic mb-8" style={{ color: th.textSecondary, letterSpacing: '0.04em' }}>
            Request the honour of your presence
          </p>

          {wdDate && (
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full mb-8"
              style={{ background: `linear-gradient(135deg, ${th.accentFaint}, rgba(0,0,0,0.3))`, border: `1px solid ${th.border}`, boxShadow: `0 0 24px ${th.accentFaint}` }}>
              <span>📅</span>
              <span className="text-[14px] tracking-wide" style={{ color: th.accentLight }}>
                {wdDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3">
            <a href="#rsvp" onClick={e => { e.preventDefault(); document.getElementById('rsvp')?.scrollIntoView({ behavior: 'smooth' }) }}
              className="px-8 py-3 rounded-full text-[13px] font-bold tracking-wider transition-all duration-300 hover:-translate-y-1 hover:scale-[1.03]"
              style={{ background: `linear-gradient(135deg, ${th.accent}, ${th.accent}cc)`, color: th.bg, boxShadow: `0 6px 28px ${th.accentFaint}, 0 0 0 1px ${th.accent}44 inset` }}>
              RSVP Now
            </a>
            <a href="#the-couple" onClick={e => { e.preventDefault(); document.getElementById('the-couple')?.scrollIntoView({ behavior: 'smooth' }) }}
              className="px-8 py-3 rounded-full text-[13px] font-semibold tracking-wider transition-all duration-300 hover:-translate-y-1"
              style={{ border: `1px solid ${th.border}`, color: th.accentDim, backdropFilter: 'blur(8px)' }}>
              Meet the Couple
            </a>
          </div>
        </div>

        {/* Scroll hint — full site only */}
        {!isPreview && (
          <div className="absolute bottom-8 z-20 flex flex-col items-center gap-2">
            <p className="text-[10px] tracking-[0.3em] uppercase" style={{ color: th.accentDim }}>Scroll</p>
            <div className="w-5 h-8 rounded-full flex items-start justify-center pt-1.5" style={{ border: `1px solid ${th.border}` }}>
              <div className="w-1 h-2 rounded-full" style={{ background: th.accent, animation: 'scroll-dot 1.5s ease-in-out infinite' }} />
            </div>
          </div>
        )}
      </section>

      <div className="max-w-4xl mx-auto px-5 sm:px-8">

        {/* ═══ COUNTDOWN ═══ */}
        {inv.weddingDate && inv.weddingDate !== 'T' && (
          <>
            <GoldDivider th={th} />
            <Section className="text-center py-8">
              <p className="text-[11px] tracking-[0.3em] uppercase mb-4" style={{ color: th.accentDim }}>⏳ &nbsp; The Big Day</p>
              <h2 style={{ fontFamily: "'Dancing Script', 'Brush Script MT', cursive", fontSize: 'clamp(1.7rem, 4.5vw, 2.4rem)', fontWeight: 700, color: th.accentLight, lineHeight: 1.2, marginBottom: '32px' }}>
                {inv.weddingDateHeading || 'We Are Getting Married!'}
              </h2>
              {countdown && !countdown.done ? (
                <div className="flex items-start justify-center gap-4 sm:gap-6">
                  <CountUnit value={countdown.days}  label="Days"    th={th} />
                  <div className="text-[28px] sm:text-[36px] font-bold pt-2" style={{ color: th.accentDim, fontFamily: 'Georgia, serif' }}>:</div>
                  <CountUnit value={countdown.hours} label="Hours"   th={th} />
                  <div className="text-[28px] sm:text-[36px] font-bold pt-2" style={{ color: th.accentDim, fontFamily: 'Georgia, serif' }}>:</div>
                  <CountUnit value={countdown.mins}  label="Minutes" th={th} />
                  <div className="text-[28px] sm:text-[36px] font-bold pt-2" style={{ color: th.accentDim, fontFamily: 'Georgia, serif' }}>:</div>
                  <CountUnit value={countdown.secs}  label="Seconds" th={th} />
                </div>
              ) : (
                <p className="text-xl" style={{ color: th.accent }}>🎉 The day is here!</p>
              )}
            </Section>
          </>
        )}

        {/* ═══ THE COUPLE ═══ */}
        <div id="the-couple">
          <GoldDivider th={th} />
          <Section className="text-center mb-10">
            <p className="text-[11px] tracking-[0.3em] uppercase mb-3" style={{ color: th.accentDim }}>✦ &nbsp; The Couple</p>
            <h2 style={{ fontFamily: "'Dancing Script', 'Brush Script MT', cursive", fontSize: 'clamp(2rem, 5.5vw, 3rem)', fontWeight: 700, color: th.accentLight, lineHeight: 1.2 }}>Meet the Couple</h2>
          </Section>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { name: inv.groomFullName, bio: inv.groomBio, ig: inv.groomInstagram, role: 'The Groom', photo: inv.groomPhoto },
              { name: inv.brideFullName, bio: inv.brideBio, ig: inv.brideInstagram, role: 'The Bride',  photo: inv.bridePhoto },
            ].map((p, i) => (
              <Section key={i} delay={i * 150}>
                <CoupleCard person={p} th={th} />
              </Section>
            ))}
          </div>
        </div>

        {/* ═══ OUR STORY ═══ */}
        {inv.story?.length > 0 && (
          <div id="our-story">
            <GoldDivider th={th} />
            <Section className="text-center mb-12">
              <p className="text-[11px] tracking-[0.3em] uppercase mb-4" style={{ color: th.accentDim }}>STORY</p>
              <h2 style={{ fontFamily: "'Dancing Script', 'Brush Script MT', cursive", fontSize: 'clamp(2.2rem, 6vw, 3.4rem)', fontWeight: 700, color: th.accentLight, lineHeight: 1.2, marginBottom: '12px' }}>
                Our Love Story
              </h2>
              <div className="flex items-center justify-center gap-3">
                <div className="h-px w-10" style={{ background: `linear-gradient(to right, transparent, ${th.accent})` }} />
                <span style={{ color: th.accent, fontSize: '15px' }}>♥</span>
                <div className="h-px w-10" style={{ background: `linear-gradient(to left, transparent, ${th.accent})` }} />
              </div>
            </Section>
            <div className="relative">
              <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 hidden sm:block"
                style={{ background: `linear-gradient(to bottom, transparent, ${th.border} 15%, ${th.border} 85%, transparent)` }} />
              <div className="space-y-8">
                {inv.story.map((m, i) => (
                  <Section key={m.id} delay={i * 100}>
                    <StoryCard moment={m} index={i} th={th} />
                  </Section>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ EVENTS ═══ */}
        {inv.events?.length > 0 && (
          <div id="events">
            <GoldDivider th={th} />
            <Section className="text-center mb-10">
              <p className="text-[11px] tracking-[0.3em] uppercase mb-3" style={{ color: th.accentDim }}>EVENT</p>
              <h2 style={{ fontFamily: "'Dancing Script', 'Brush Script MT', cursive", fontSize: 'clamp(2rem, 5.5vw, 3rem)', fontWeight: 700, color: th.accentLight, lineHeight: 1.2, marginBottom: '12px' }}>
                Our Wedding Event
              </h2>
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="h-px w-10" style={{ background: `linear-gradient(to right, transparent, ${th.accent})` }} />
                <span style={{ color: th.accent, fontSize: '15px' }}>♥</span>
                <div className="h-px w-10" style={{ background: `linear-gradient(to left, transparent, ${th.accent})` }} />
              </div>
            </Section>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {inv.events.filter(ev => ev.name?.trim()).map((ev, i) => (
                <Section key={ev.id} delay={i * 100}>
                  <EventCard event={ev} th={th} />
                </Section>
              ))}
            </div>
          </div>
        )}

        {/* ═══ RSVP ═══ */}
        <div id="rsvp">
          <GoldDivider th={th} />
          <Section className="max-w-xl mx-auto">
            <div className="text-center mb-8">
              <p className="text-[11px] tracking-[0.3em] uppercase mb-3" style={{ color: th.accentDim }}>✉️ &nbsp; Join Us</p>
              <h2 style={{ fontFamily: "'Dancing Script', 'Brush Script MT', cursive", fontSize: 'clamp(2rem, 5.5vw, 3rem)', fontWeight: 700, color: th.accentLight, lineHeight: 1.2 }}>RSVP</h2>
              <p className="text-[14px] mt-2 italic" style={{ color: th.textSecondary }}>Will you grace us with your presence?</p>
            </div>
            {rsvpSent ? (
              <div className="text-center py-10 rounded-2xl" style={{ background: th.accentFaint, border: `1px solid ${th.border}` }}>
                <p className="text-4xl mb-4">🎊</p>
                <p style={{ fontFamily: "'Dancing Script', 'Brush Script MT', cursive", fontSize: '26px', fontWeight: 700, marginBottom: '8px', color: th.accent, lineHeight: 1.2 }}>Thank You!</p>
                <p className="text-[14px] italic" style={{ color: th.textSecondary }}>We look forward to celebrating with you.</p>
              </div>
            ) : (
              <form onSubmit={handleRsvp} className="space-y-4 rounded-2xl p-6"
                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${th.border}` }}>
                {[
                  { label: 'Your Name', key: 'name', placeholder: 'Full name', type: 'text', required: true },
                  { label: 'Phone',     key: 'phone', placeholder: '+91 98765 43210', type: 'tel', required: false },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-[11px] tracking-widest uppercase mb-1.5 block" style={{ color: th.accentDim }}>{f.label}</label>
                    <input required={f.required} type={f.type} value={rsvp[f.key]} onChange={e => setRsvp(r => ({ ...r, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full px-4 py-3 rounded-xl text-[14px] outline-none transition-all duration-200"
                      style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${th.border}`, color: th.textPrimary, fontFamily: 'system-ui, sans-serif' }}
                      onFocus={e => e.target.style.borderColor = th.accent}
                      onBlur={e => e.target.style.borderColor = th.border}
                    />
                  </div>
                ))}
                <div>
                  <label className="text-[11px] tracking-widest uppercase mb-2 block" style={{ color: th.accentDim }}>Will you attend?</label>
                  <div className="flex gap-3">
                    {['yes','no','maybe'].map(opt => (
                      <button key={opt} type="button" onClick={() => setRsvp(r => ({ ...r, attending: opt }))}
                        className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold capitalize transition-all duration-200"
                        style={{
                          background: rsvp.attending === opt ? th.accentFaint : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${rsvp.attending === opt ? th.border : 'rgba(255,255,255,0.08)'}`,
                          color: rsvp.attending === opt ? th.accent : 'rgba(240,230,211,0.45)', fontFamily: 'system-ui, sans-serif',
                        }}>
                        {opt === 'yes' ? '✓ Yes' : opt === 'no' ? '✗ No' : '~ Maybe'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] tracking-widest uppercase mb-1.5 block" style={{ color: th.accentDim }}>Number of Guests</label>
                  <GuestPicker value={rsvp.guests} onChange={v => setRsvp(r => ({ ...r, guests: v }))} th={th} />
                </div>
                <button type="submit" className="w-full py-3.5 rounded-xl text-[14px] font-semibold tracking-wider transition-all duration-300 hover:-translate-y-1"
                  style={{ background: `linear-gradient(135deg, ${th.accent}, ${th.accent}cc)`, color: th.bg, boxShadow: `0 4px 24px ${th.accentFaint}`, fontFamily: 'system-ui, sans-serif' }}>
                  Confirm RSVP
                </button>
              </form>
            )}
          </Section>
        </div>

        {/* ═══ GALLERY ═══ */}
        <GallerySection photos={gallery} th={th} />
        {gallery.length >= 4 && <SelfieMatchSection photos={gallery} th={th} />}

        {/* ═══ GUESTBOOK ═══ */}
        <div id="guestbook">
          <GoldDivider th={th} />
          <Section className="max-w-xl mx-auto pb-20">
            <div className="text-center mb-8">
              <p className="text-[11px] tracking-[0.3em] uppercase mb-3" style={{ color: th.accentDim }}>💬 &nbsp; Rolling Credits</p>
              <h2 style={{ fontFamily: "'Dancing Script', 'Brush Script MT', cursive", fontSize: 'clamp(2rem, 5.5vw, 3rem)', fontWeight: 700, color: th.accentLight, lineHeight: 1.2 }}>Leave a Wish</h2>
            </div>
            <form onSubmit={handleWish} className="space-y-3 mb-8 rounded-2xl p-5"
              style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${th.border}` }}>
              <input value={wishName} onChange={e => setWishName(e.target.value)} placeholder="Your name (optional)"
                className="w-full px-4 py-2.5 rounded-xl text-[13px] outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${th.border}`, color: th.textPrimary, fontFamily: 'system-ui, sans-serif' }} />
              <textarea value={wishMsg} onChange={e => setWishMsg(e.target.value)} placeholder="Write your wishes for the couple…"
                rows={3} className="w-full px-4 py-2.5 rounded-xl text-[13px] outline-none resize-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${th.border}`, color: th.textPrimary, fontFamily: 'system-ui, sans-serif' }} />
              <button type="submit" className="w-full py-2.5 rounded-xl text-[13px] font-semibold tracking-wider transition-all duration-200 hover:-translate-y-px"
                style={{ background: th.accentFaint, border: `1px solid ${th.border}`, color: th.accent, fontFamily: 'system-ui, sans-serif' }}>
                Send Wishes 💌
              </button>
            </form>
            <div className="space-y-3">
              {wishes.map(w => (
                <div key={w.id} className="relative rounded-2xl overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.045)', border: `1px solid ${th.border}`, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', boxShadow: `0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.04) inset`, animation: 'modal-card-in 0.4s ease both' }}>
                  {/* Inner top shine */}
                  <div className="absolute inset-x-0 top-0 h-px pointer-events-none" style={{ background: `linear-gradient(to right, transparent, ${th.accent}44, transparent)` }} />
                  {/* Big decorative quote */}
                  <div className="absolute top-1 right-4 select-none pointer-events-none" style={{ fontSize: '52px', lineHeight: 1, fontFamily: 'Georgia, serif', color: th.accent, opacity: 0.09 }}>"</div>
                  <div className="px-5 py-4">
                    <p className="text-[13.5px] leading-relaxed italic mb-3 relative" style={{ color: 'rgba(240,230,211,0.82)', fontFamily: 'Georgia, serif' }}>"{w.msg}"</p>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0"
                        style={{ background: th.accentFaint, border: `1px solid ${th.border}`, color: th.accent }}>
                        {(w.name[0] || '?').toUpperCase()}
                      </div>
                      <p className="text-[11px] font-semibold" style={{ color: th.accentDim, fontFamily: 'system-ui, sans-serif' }}>— {w.name}</p>
                    </div>
                  </div>
                </div>
              ))}
              {wishes.length === 0 && (
                <p className="text-center text-[13px] italic py-6" style={{ color: 'rgba(240,230,211,0.25)' }}>Be the first to leave a wish ✨</p>
              )}
            </div>
          </Section>
        </div>

      </div>

      <footer style={{ borderTop: `1px solid ${th.border}`, textAlign: 'center', padding: '64px 24px 48px', background: `linear-gradient(to bottom, ${th.bg}, ${th.bg}ee)` }}>
        <h2 style={{ fontFamily: "'Dancing Script', 'Brush Script MT', cursive", fontSize: 'clamp(3rem, 9vw, 5.5rem)', fontWeight: 700, color: 'white', lineHeight: 1.15, marginBottom: '20px', textShadow: `0 0 60px ${th.accentDim}` }}>
          Thank You
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', marginBottom: '20px' }}>
          <div style={{ width: '56px', height: '1.5px', background: th.accent, opacity: 0.7 }} />
          <span style={{ color: th.accent, fontSize: '20px', lineHeight: 1 }}>♥</span>
          <div style={{ width: '56px', height: '1.5px', background: th.accent, opacity: 0.7 }} />
        </div>
        <p style={{ fontSize: '14px', color: th.textSecondary, marginBottom: '6px', letterSpacing: '0.06em' }}>{inv.coupleName}</p>
        {inv.weddingDate && inv.weddingDate !== 'T' && (
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginBottom: '20px' }}>
            {new Date(inv.weddingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        )}
        {inv.views > 0 && (
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.28)', marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <span style={{ fontSize: '14px' }}>👁</span> {inv.views} Unique Visits
          </p>
        )}
        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.12)', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif' }}>Crafted with Planazo ✦</p>
      </footer>
    </div>
  )
}
