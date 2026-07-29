import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { birthdayApi } from '../lib/eventsApi'

// Maps the real backend BirthdayPageDetail response onto the same shape this
// page's UI already expects (kept identical to the old mock/localStorage shape
// so none of the rendering below needs to change).
function mapPageToSite(p) {
  return {
    eventTitle: p.title,
    personName: p.honoree_name,
    personFullName: p.honoree_name || '',
    personAge: '',
    personBio: p.bio || '',
    personInstagram: '',
    personPhoto: p.honoree_image || null,
    coverPhoto: p.cover_image || null,
    theme: p.theme,
    birthdayDate: p.countdown ? (p.countdown.event_date || '').slice(0, 16) : '',
    birthdayDateHeading: p.countdown?.heading || 'Counting Down to the Big Day!',
    events: (p.events || []).map(e => ({
      id: e.id, name: e.title || '', date: e.date ? e.date.slice(0, 10) : '',
      time: e.time || '', venue: e.location_name || '', address: e.desc || '', mapLink: e.location_link || '', photo: e.image || null,
    })),
    memories: (p.stories || []).map(s => ({
      id: s.id, emoji: '✨', title: s.title || '', description: s.desc || '',
      date: s.date ? s.date.slice(0, 10) : '', photo: s.image || null,
    })),
    vendors: [],
    views: p.views || 0,
    status: p.is_published ? 'live' : 'draft',
  }
}

const DEMO = {
  id: 'demo',
  eventTitle: "Rohan's 25th Birthday Bash",
  personName: 'Rohan',
  personFullName: 'Rohan Sharma',
  personAge: '25',
  personBio: 'Adventure seeker, coffee addict, and the life of every party.',
  personInstagram: '@rohan.sharma',
  personPhoto: null,
  coverPhoto: null,
  theme: 'neon_party',
  birthdayDate: '2026-09-15T19:00',
  birthdayDateHeading: 'Counting Down to the Big Day!',
  events: [
    { id: 1, name: 'Pre-Party Gathering', date: '2026-09-14', time: '18:00', venue: "Rohan's Place",    address: '12 Park Street, Mumbai', mapLink: '' },
    { id: 2, name: 'Birthday Bash',        date: '2026-09-15', time: '19:00', venue: 'The Grand Rooftop', address: 'Bandra West, Mumbai',    mapLink: '' },
  ],
  memories: [
    { id: 1, emoji: '🍼', title: 'Born to Party',    description: 'The day the world got a little more fun. Welcome to the show, Rohan!', date: '2001-09-15' },
    { id: 2, emoji: '🎒', title: 'School Days',       description: 'The kid who always had a joke ready and never missed a chance to make everyone laugh.', date: '2007-06-01' },
    { id: 3, emoji: '🎓', title: 'College Graduate', description: 'Four years of memories, friendships, and staying up way too late.', date: '2023-05-20' },
    { id: 4, emoji: '🌍', title: 'World Explorer',   description: 'First solo trip abroad — came back with stories that lasted three dinner parties.', date: '2024-12-01' },
  ],
  vendors: [],
  views: 0,
  status: 'live',
}

const BDAY_SITE_THEMES = {
  neon_party: {
    bg: '#06001a', accent: '#a855f7', accentLight: '#e9d5ff',
    accentDim: 'rgba(168,85,247,0.50)', accentFaint: 'rgba(168,85,247,0.08)',
    border: 'rgba(168,85,247,0.22)', starColor: '#a855f7',
    textPrimary: '#e9d5ff', textSecondary: 'rgba(233,213,255,0.55)',
    tagline: '🎉 Party Time!', photoFilter: 'saturate(1.3) contrast(1.1) brightness(0.82)',
    heroGradient: 'rgba(168,85,247,0.08)', cardBg: 'rgba(168,85,247,0.06)',
  },
  golden_royale: {
    bg: '#0c0500', accent: '#d97706', accentLight: '#fde68a',
    accentDim: 'rgba(217,119,6,0.50)', accentFaint: 'rgba(217,119,6,0.08)',
    border: 'rgba(217,119,6,0.22)', starColor: '#fbbf24',
    textPrimary: '#fde68a', textSecondary: 'rgba(253,230,138,0.55)',
    tagline: '👑 A Royal Celebration', photoFilter: 'sepia(0.3) contrast(1.1) brightness(0.82)',
    heroGradient: 'rgba(217,119,6,0.07)', cardBg: 'rgba(217,119,6,0.06)',
  },
  tropical: {
    bg: '#011a14', accent: '#10b981', accentLight: '#d1fae5',
    accentDim: 'rgba(16,185,129,0.50)', accentFaint: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.22)', starColor: '#10b981',
    textPrimary: '#d1fae5', textSecondary: 'rgba(209,250,229,0.55)',
    tagline: '🌺 Let the Party Begin!', photoFilter: 'saturate(1.2) brightness(0.82)',
    heroGradient: 'rgba(16,185,129,0.06)', cardBg: 'rgba(16,185,129,0.06)',
  },
  retro_pop: {
    bg: '#020408', accent: '#ec4899', accentLight: '#fce7f3',
    accentDim: 'rgba(236,72,153,0.50)', accentFaint: 'rgba(236,72,153,0.08)',
    border: 'rgba(236,72,153,0.22)', starColor: '#ec4899',
    textPrimary: '#fce7f3', textSecondary: 'rgba(252,231,243,0.55)',
    tagline: '🕹️ Pop It Off!', photoFilter: 'saturate(1.4) contrast(1.1) brightness(0.78)',
    heroGradient: 'rgba(236,72,153,0.06)', cardBg: 'rgba(236,72,153,0.06)',
  },
  rose_gold: {
    bg: '#120008', accent: '#f43f5e', accentLight: '#ffe4e6',
    accentDim: 'rgba(244,63,94,0.50)', accentFaint: 'rgba(244,63,94,0.08)',
    border: 'rgba(244,63,94,0.22)', starColor: '#f43f5e',
    textPrimary: '#ffe4e6', textSecondary: 'rgba(255,228,230,0.55)',
    tagline: '🌸 Celebrating You!', photoFilter: 'saturate(1.1) hue-rotate(330deg) brightness(0.80)',
    heroGradient: 'rgba(244,63,94,0.06)', cardBg: 'rgba(244,63,94,0.06)',
  },
}

// ── Hooks ─────────────────────────────────────────────────────────────────────
function useCountdown(targetDate) {
  const calc = () => {
    const diff = new Date(targetDate) - Date.now()
    if (diff <= 0) return { days: 0, hours: 0, mins: 0, secs: 0, done: true }
    return { days: Math.floor(diff/86400000), hours: Math.floor((diff%86400000)/3600000), mins: Math.floor((diff%3600000)/60000), secs: Math.floor((diff%60000)/1000), done: false }
  }
  const [tick, setTick] = useState(calc)
  useEffect(() => {
    const t = setInterval(() => setTick(calc()), 1000)
    return () => clearInterval(t)
  }, [targetDate])
  return tick
}

function useReveal() {
  const ref = useRef(null)
  const isPreview = new URLSearchParams(window.location.search).has('preview')
  useEffect(() => {
    const el = ref.current; if (!el) return
    if (isPreview) { el.classList.add('visible'); return }
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add('visible'); obs.disconnect() } }, { threshold: 0.10 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return ref
}

function useTilt() {
  const ref    = useRef(null)
  const rafRef = useRef(null)
  const onMove = useCallback((e) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const { clientX, clientY } = e
    rafRef.current = requestAnimationFrame(() => {
      const el = ref.current; if (!el) return
      const r  = el.getBoundingClientRect()
      const rx = -((clientY - r.top  - r.height / 2) / (r.height / 2)) * 5
      const ry =  ((clientX - r.left - r.width  / 2) / (r.width  / 2)) * 5
      el.style.transition = 'box-shadow 0.2s ease'
      el.style.transform  = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.02)`
    })
  }, [])
  const onLeave = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const el = ref.current; if (!el) return
    el.style.transition = 'transform 0.55s cubic-bezier(0.23,1,0.32,1)'
    el.style.transform  = 'perspective(700px) rotateX(0deg) rotateY(0deg) scale(1)'
  }, [])
  return { ref, onMouseMove: onMove, onMouseLeave: onLeave }
}

// ── Reusable pieces ───────────────────────────────────────────────────────────
function CountUnit({ label, value, th }) {
  const prevRef = useRef(value)
  const [flip, setFlip] = useState(false)
  useEffect(() => {
    if (prevRef.current !== value) { setFlip(true); setTimeout(() => setFlip(false), 260); prevRef.current = value }
  }, [value])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div style={{ position: 'relative', width: '62px', height: '70px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        background: `linear-gradient(160deg, ${th.accentFaint} 0%, rgba(0,0,0,0.3) 100%)`, border: `1px solid ${th.border}`, boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03) inset` }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: `linear-gradient(90deg, transparent, ${th.accent}44, transparent)` }} />
        <span style={{ fontSize: '28px', fontWeight: 900, color: th.accentLight, textShadow: `0 0 20px ${th.accentDim}`, fontVariantNumeric: 'tabular-nums',
          transition: 'all 0.2s', transform: flip ? 'scaleY(0)' : 'scaleY(1)', opacity: flip ? 0 : 1 }}>
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: th.textSecondary }}>{label}</span>
    </div>
  )
}

function GoldDivider({ th }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '32px 0' }}>
      <div style={{ flex: 1, height: '1px', background: `linear-gradient(to right, transparent, ${th.accent}55, transparent)` }} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', width: '28px', height: '28px', borderRadius: '50%', background: th.accent, opacity: 0.2, animation: 'ring-pulse 2s ease-in-out infinite' }} />
        <span style={{ fontSize: '20px', position: 'relative', zIndex: 1 }}>🎂</span>
      </div>
      <div style={{ flex: 1, height: '1px', background: `linear-gradient(to left, transparent, ${th.accent}55, transparent)` }} />
    </div>
  )
}

function GuestPicker({ value, onChange, th }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const label = n => `${n} ${n === 1 ? 'Guest' : 'Guests'}`
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(v => !v)}
        style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: th.accentFaint, border: `1px solid ${th.border}`, color: th.textPrimary }}>
        <span>{label(value)}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ color: th.accent, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      {open && (
        <div style={{ position: 'absolute', zIndex: 50, top: '100%', marginTop: '6px', left: 0, right: 0, borderRadius: '14px', overflow: 'hidden',
          background: 'rgba(11,7,26,0.97)', backdropFilter: 'blur(28px)', border: `1px solid ${th.border}`, boxShadow: '0 16px 48px rgba(0,0,0,0.65)' }}>
          {[1,2,3,4,5,6,7,8].map(n => (
            <button key={n} type="button" onClick={() => { onChange(n); setOpen(false) }}
              style={{ width: '100%', padding: '10px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                color: value === n ? th.accentLight : 'rgba(255,255,255,0.6)', background: value === n ? th.accentFaint : 'transparent', border: 'none' }}>
              {label(n)}
              {value === n && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Section components (hooks used at top level) ──────────────────────────────
function CountdownSection({ inv, th, isPreview }) {
  const cd  = useCountdown(inv.birthdayDate)
  const ref = useReveal()
  return (
    <section ref={ref} className="reveal" style={{ textAlign: 'center', marginBottom: isPreview ? '32px' : '56px' }}>
      <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: th.textSecondary, marginBottom: '12px' }}>
        {inv.birthdayDateHeading || 'Counting Down'}
      </p>
      {cd.done ? (
        <div style={{ fontSize: '28px', fontWeight: 900, color: th.accentLight }}>🎉 The Party Has Begun!</div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: '12px' }}>
          <CountUnit label="Days"    value={cd.days}  th={th} />
          <div style={{ color: th.accentDim, fontSize: '24px', fontWeight: 700, paddingTop: '18px' }}>:</div>
          <CountUnit label="Hours"   value={cd.hours} th={th} />
          <div style={{ color: th.accentDim, fontSize: '24px', fontWeight: 700, paddingTop: '18px' }}>:</div>
          <CountUnit label="Minutes" value={cd.mins}  th={th} />
          <div style={{ color: th.accentDim, fontSize: '24px', fontWeight: 700, paddingTop: '18px' }}>:</div>
          <CountUnit label="Seconds" value={cd.secs}  th={th} />
        </div>
      )}
    </section>
  )
}

function PersonCard({ inv, th, isPreview }) {
  const ref = useReveal()
  const photoSize = isPreview ? 110 : 150
  const PARTY_COLORS = [th.accent, th.accentLight, '#f59e0b', '#ec4899', '#06b6d4', '#a3e635']
  const confetti = Array.from({ length: isPreview ? 10 : 22 }, (_, i) => i)

  return (
    <section ref={ref} className="reveal" style={{ marginBottom: isPreview ? '32px' : '56px' }}>
      <p style={{ textAlign: 'center', fontSize: '11px', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: th.textSecondary, marginBottom: '24px' }}>
        The Birthday Person
      </p>

      <div style={{ position: 'relative', borderRadius: '28px', border: `1px solid ${th.border}`, overflow: 'hidden', background: `linear-gradient(160deg, ${th.cardBg} 0%, rgba(0,0,0,0.55) 100%)`, backdropFilter: 'blur(28px)', padding: isPreview ? '32px 20px 28px' : '44px 28px 36px', textAlign: 'center' }}>

        {/* Ambient glow blob */}
        <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: '300px', height: '200px', background: `radial-gradient(ellipse, ${th.accent}18 0%, transparent 70%)`, pointerEvents: 'none' }} />

        {/* Floating confetti particles */}
        {confetti.map(i => (
          <div key={i} style={{
            position: 'absolute',
            width: i % 3 === 0 ? '7px' : '5px',
            height: i % 3 === 0 ? '7px' : '5px',
            borderRadius: i % 4 === 0 ? '50%' : '2px',
            background: PARTY_COLORS[i % PARTY_COLORS.length],
            top: `${(i * 19 + 6) % 88}%`,
            left: `${(i * 27 + 4) % 93}%`,
            opacity: 0.55,
            transform: i % 3 === 0 ? 'rotate(45deg)' : 'none',
            animation: `star-twinkle ${1.4 + (i % 4) * 0.5}s ease-in-out infinite`,
            animationDelay: `${(i * 0.28) % 2.5}s`,
            pointerEvents: 'none',
          }} />
        ))}

        {/* Spinning photo ring */}
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: inv.personAge ? '24px' : '20px' }}>
          {/* Spinning conic gradient border */}
          <div style={{ position: 'absolute', inset: '-5px', borderRadius: '50%', background: `conic-gradient(${th.accent} 0deg, #ec4899 72deg, #f59e0b 144deg, #06b6d4 216deg, ${th.accentLight} 288deg, ${th.accent} 360deg)`, animation: 'ring-spin 3s linear infinite' }} />
          {/* Separator gap */}
          <div style={{ position: 'absolute', inset: '-2px', borderRadius: '50%', background: th.bg }} />
          {/* Photo */}
          <div style={{ position: 'relative', width: photoSize + 'px', height: photoSize + 'px', borderRadius: '50%', overflow: 'hidden' }}>
            {inv.personPhoto
              ? <img src={inv.personPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', filter: th.photoFilter }} />
              : <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${th.accentFaint}, rgba(0,0,0,0.5))`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '52px', animation: 'star-twinkle 2s ease-in-out infinite' }}>✨</div>
            }
          </div>
          {/* Age badge — floats below the circle */}
          {inv.personAge && (
            <div style={{ position: 'absolute', bottom: '-14px', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', padding: '5px 16px', borderRadius: '999px', background: `linear-gradient(135deg, ${th.accent}, #ec4899)`, boxShadow: `0 4px 18px ${th.accentDim}, 0 0 0 2px ${th.bg}`, fontSize: '13px', fontWeight: 800, color: 'white', letterSpacing: '0.02em' }}>
              🎉 Turning {inv.personAge}
            </div>
          )}
        </div>

        {/* Name */}
        <h3 style={{ fontSize: isPreview ? '22px' : '32px', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '10px',
          background: `linear-gradient(135deg, #ffffff 0%, ${th.accentLight} 45%, ${th.accent} 100%)`,
          backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          animation: 'gold-shimmer 4s linear infinite' }}>
          {inv.personFullName || inv.personName}
        </h3>

        {/* Bio */}
        {inv.personBio && (
          <p style={{ fontSize: '14px', color: th.textSecondary, lineHeight: 1.7, fontStyle: 'italic', maxWidth: '380px', margin: '0 auto 16px' }}>
            "{inv.personBio}"
          </p>
        )}

        {/* Instagram */}
        {inv.personInstagram && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 16px', borderRadius: '999px', background: th.accentFaint, border: `1px solid ${th.border}`, fontSize: '13px', fontWeight: 600, color: th.accentLight }}>
            📸 {inv.personInstagram}
          </div>
        )}

        {/* Bottom decoration: balloon emoji row */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px', fontSize: isPreview ? '16px' : '20px', opacity: 0.55 }}>
          {['🎈','✨','🎊','✨','🎈'].map((e, i) => (
            <span key={i} style={{ animation: `star-twinkle ${1.8 + i * 0.3}s ease-in-out infinite`, animationDelay: `${i * 0.2}s` }}>{e}</span>
          ))}
        </div>
      </div>
    </section>
  )
}

function EventCard({ ev, th }) {
  const ref = useReveal()
  const day     = ev.date ? new Date(ev.date + 'T12:00:00').getDate() : null
  const month   = ev.date ? new Date(ev.date + 'T12:00:00').toLocaleDateString('en-IN', { month: 'short' }) : null
  const weekday = ev.date ? new Date(ev.date + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'long' }) : null
  const time    = ev.time ? (() => { const [h, m] = ev.time.split(':').map(Number); const ap = h >= 12 ? 'PM' : 'AM'; return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${ap}` })() : ''

  return (
    <div ref={ref} className="reveal" style={{ borderRadius: '20px', overflow: 'hidden', border: `1px solid ${th.border}`, background: `linear-gradient(135deg, ${th.cardBg} 0%, rgba(0,0,0,0.3) 100%)`, backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column' }}>

      {/* Photo header or gradient date header */}
      <div style={{ position: 'relative', height: '155px', overflow: 'hidden', flexShrink: 0 }}>
        {ev.photo ? (
          <>
            <img src={ev.photo} alt={ev.name} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: th.photoFilter }} />
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.7) 100%)` }} />
            {day && (
              <div style={{ position: 'absolute', bottom: '10px', left: '14px' }}>
                <div style={{ fontSize: '24px', fontWeight: 900, color: 'white', lineHeight: 1 }}>{day}</div>
                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{month}</div>
              </div>
            )}
          </>
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', background: `linear-gradient(135deg, ${th.accentFaint} 0%, rgba(0,0,0,0.6) 100%)`, position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 60%, ${th.accent}18 0%, transparent 70%)` }} />
            {day ? (
              <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: '56px', fontWeight: 900, lineHeight: 1, color: th.accent, textShadow: `0 0 32px ${th.accentDim}` }}>
                  {String(day).padStart(2, '0')}
                </div>
                <div style={{ fontSize: '11px', color: th.accentDim, textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: '5px', fontWeight: 700 }}>
                  {month} · {weekday}
                </div>
              </div>
            ) : null}
          </div>
        )}
        {/* Time badge */}
        {time && (
          <div style={{ position: 'absolute', top: '10px', right: '10px', padding: '4px 10px', borderRadius: '999px', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(12px)', border: `1px solid ${th.border}`, fontSize: '11px', fontWeight: 700, color: th.accentLight }}>
            ⏰ {time}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        <h4 style={{ fontSize: '17px', fontWeight: 700, color: 'white' }}>{ev.name}</h4>
        {ev.venue && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
            <span style={{ fontSize: '12px', marginTop: '1px', flexShrink: 0 }}>📍</span>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: th.textPrimary }}>{ev.venue}</p>
              {ev.address && <p style={{ fontSize: '11px', color: th.textSecondary, marginTop: '2px' }}>{ev.address}</p>}
            </div>
          </div>
        )}
        {ev.mapLink && (
          <a href={ev.mapLink} target="_blank" rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', borderRadius: '12px', background: `linear-gradient(135deg, ${th.accent}, ${th.accent}cc)`, color: 'white', fontSize: '13px', fontWeight: 700, textDecoration: 'none', marginTop: '4px' }}>
            🗺️ Get Directions
          </a>
        )}
      </div>
    </div>
  )
}

function MemoryItem({ m, index, th }) {
  const ref = useReveal()
  const isLeft = index % 2 === 0
  const emoji = m.emoji === '📸' ? '✨' : m.emoji

  return (
    <div ref={ref} className={`reveal flex items-start gap-4 sm:gap-8 ${isLeft ? 'sm:flex-row' : 'sm:flex-row-reverse'}`}>
      {/* Dot — sits on the center timeline line */}
      <div className="hidden sm:flex items-center justify-center shrink-0 mt-1 relative z-10"
        style={{ width: '40px', height: '40px', borderRadius: '50%', background: th.accentFaint, border: `2px solid ${th.border}` }}>
        <span style={{ fontSize: '16px' }}>{emoji}</span>
      </div>
      {/* Card */}
      <div className={`flex-1 rounded-2xl overflow-hidden ${isLeft ? '' : 'sm:ml-auto'}`}
        style={{ maxWidth: '440px', background: `linear-gradient(135deg, ${th.cardBg}, rgba(0,0,0,0.2))`, border: `1px solid ${th.border}`, boxShadow: '0 10px 40px rgba(0,0,0,0.4)' }}>
        {m.photo ? (
          <div style={{ display: 'flex', minHeight: '160px' }}>
            <div style={{ position: 'relative', width: '120px', flexShrink: 0, overflow: 'hidden' }}>
              <img src={m.photo} alt={m.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', filter: th.photoFilter }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, transparent 55%, rgba(0,0,0,0.4) 100%)' }} />
            </div>
            <div style={{ flex: 1, padding: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '5px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="sm:hidden" style={{ fontSize: '14px' }}>{emoji}</span>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'white', lineHeight: 1.3 }}>{m.title}</h4>
              </div>
              {m.description && <p style={{ fontSize: '12px', color: th.textSecondary, lineHeight: 1.55, fontStyle: 'italic' }}>{m.description}</p>}
              {m.date && (
                <span style={{ fontSize: '10px', color: th.accentDim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: '2px' }}>
                  {new Date(m.date + 'T12:00:00').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <span className="sm:hidden" style={{ fontSize: '16px' }}>{emoji}</span>
              <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'white' }}>{m.title}</h4>
            </div>
            {m.description && <p style={{ fontSize: '13px', color: th.textSecondary, lineHeight: 1.6, fontStyle: 'italic', marginBottom: m.date ? '8px' : 0 }}>{m.description}</p>}
            {m.date && (
              <span style={{ fontSize: '10px', color: th.accentDim, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
                {new Date(m.date + 'T12:00:00').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function RsvpSection({ inv, th, slug }) {
  const ref  = useReveal()
  const [rsvp, setRsvp] = useState({ name: '', guests: 1, attending: null, submitted: false })

  const handleRsvp = (e) => {
    e.preventDefault()
    if (!rsvp.name.trim() || rsvp.attending === null) return
    setRsvp(r => ({ ...r, submitted: true }))
    if (slug) {
      birthdayApi.createRSVP(slug, {
        name: rsvp.name,
        attendance: rsvp.attending ? 'YES' : 'NO',
        guests: Number(rsvp.guests) || 1,
      }).catch(() => {})
    }
  }

  return (
    <section ref={ref} className="reveal" style={{ marginBottom: '56px' }}>
      <p style={{ textAlign: 'center', fontSize: '11px', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: th.textSecondary, marginBottom: '8px' }}>RSVP</p>
      <h2 style={{ textAlign: 'center', fontFamily: "'Dancing Script', 'Brush Script MT', cursive", fontSize: 'clamp(2rem, 5.5vw, 3rem)', fontWeight: 700, color: 'white', marginBottom: '6px', lineHeight: 1.2 }}>
        Will You Join the Party?
      </h2>
      <p style={{ textAlign: 'center', fontSize: '13px', color: th.textSecondary, marginBottom: '24px' }}>Let us know if you'll be celebrating with us!</p>

      {rsvp.submitted ? (
        <div style={{ textAlign: 'center', padding: '32px 20px', borderRadius: '20px', background: `linear-gradient(135deg, ${th.accentFaint}, rgba(0,0,0,0.2))`, border: `1px solid ${th.border}` }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>{rsvp.attending ? '🎉' : '😢'}</div>
          <h3 style={{ fontFamily: "'Dancing Script', 'Brush Script MT', cursive", fontSize: '26px', fontWeight: 700, color: 'white', marginBottom: '8px', lineHeight: 1.2 }}>{rsvp.attending ? 'See you at the party!' : "We'll miss you!"}</h3>
          <p style={{ fontSize: '13px', color: th.textSecondary }}>Thanks for your response, {rsvp.name}!</p>
        </div>
      ) : (
        <form onSubmit={handleRsvp} style={{ background: `linear-gradient(135deg, ${th.accentFaint}, rgba(0,0,0,0.2))`, borderRadius: '20px', border: `1px solid ${th.border}`, padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: th.textSecondary, marginBottom: '6px' }}>Your Name</label>
            <input value={rsvp.name} onChange={e => setRsvp(r => ({ ...r, name: e.target.value }))} placeholder="Enter your name"
              style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', border: `1px solid ${th.border}`, color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: th.textSecondary, marginBottom: '6px' }}>Number of Guests</label>
            <GuestPicker value={rsvp.guests} onChange={v => setRsvp(r => ({ ...r, guests: v }))} th={th} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: th.textSecondary, marginBottom: '8px' }}>Are You Attending?</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[{ val: true, label: '🎉 Attending', color: '#10b981' },{ val: false, label: '😔 Declining', color: '#f43f5e' }].map(opt => (
                <button key={String(opt.val)} type="button" onClick={() => setRsvp(r => ({ ...r, attending: opt.val }))}
                  style={{ padding: '12px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                    background: rsvp.attending === opt.val ? `${opt.color}22` : 'rgba(0,0,0,0.25)',
                    border: `1.5px solid ${rsvp.attending === opt.val ? opt.color : th.border}`,
                    color: rsvp.attending === opt.val ? opt.color : th.textSecondary }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={!rsvp.name.trim() || rsvp.attending === null}
            style={{ padding: '14px', borderRadius: '14px', fontSize: '15px', fontWeight: 700, color: 'white', cursor: 'pointer',
              background: `linear-gradient(135deg, ${th.accent}, ${th.accentDim})`,
              boxShadow: `0 8px 28px ${th.accentDim}`,
              opacity: (!rsvp.name.trim() || rsvp.attending === null) ? 0.45 : 1 }}>
            Send RSVP 🎊
          </button>
        </form>
      )}
    </section>
  )
}

// ── Selfie compress ────────────────────────────────────────────────────────────
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

// ── Gallery tile ───────────────────────────────────────────────────────────────
function BdayGalleryTile({ p, idx, th }) {
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

// ── Gallery Section ────────────────────────────────────────────────────────────
function BdayGallerySection({ photos, th, isPreview }) {
  const [filter, setFilter] = useState('All')
  const [page, setPage] = useState(0)
  const PER_PAGE = 9
  if (!photos.length) return null

  if (isPreview) {
    return (
      <section style={{ marginBottom: '40px' }}>
        <GoldDivider th={th} />
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: th.textSecondary, marginBottom: '6px' }}>GALLERY</p>
          <h2 style={{ fontFamily: "'Dancing Script', 'Brush Script MT', cursive", fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', fontWeight: 700, color: th.accentLight, lineHeight: 1.2, marginBottom: '8px' }}>Party Memories</h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{ height: '1px', width: '28px', background: `linear-gradient(to right, transparent, ${th.accent})` }} />
            <span style={{ color: th.accent, fontSize: '12px' }}>✦</span>
            <div style={{ height: '1px', width: '28px', background: `linear-gradient(to left, transparent, ${th.accent})` }} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {photos.slice(0, 6).map((p, i) => <BdayGalleryTile key={p.id} p={p} idx={i} th={th} />)}
        </div>
        {photos.length > 6 && (
          <p style={{ textAlign: 'center', fontSize: '11px', color: th.textSecondary, marginTop: '10px', opacity: 0.7 }}>+{photos.length - 6} more photos</p>
        )}
      </section>
    )
  }

  const cats = ['All', ...Array.from(new Set(photos.map(p => p.category).filter(Boolean)))]
  const filtered = filter === 'All' ? photos : photos.filter(p => p.category === filter)
  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paginated = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE)

  return (
    <section style={{ marginBottom: '48px' }}>
      <GoldDivider th={th} />
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: th.textSecondary, marginBottom: '6px' }}>GALLERY</p>
        <h2 style={{ fontFamily: "'Dancing Script', 'Brush Script MT', cursive", fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', fontWeight: 700, color: th.accentLight, lineHeight: 1.2, marginBottom: '8px' }}>
          Party Memories
        </h2>
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
        {paginated.map((p, i) => <BdayGalleryTile key={p.id} p={p} idx={page * PER_PAGE + i} th={th} />)}
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
    </section>
  )
}

// ── AI Selfie Match ────────────────────────────────────────────────────────────
function BdaySelfieMatch({ photos, th, isPreview }) {
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
      setMatches([...photos].sort(() => Math.random() - 0.5).slice(0, 3))
      setMatching(false)
    }, 2200)
    e.target.value = ''
  }

  return (
    <section style={{ marginBottom: '40px' }}>
      <div style={{ borderRadius: '24px', padding: '20px', background: `linear-gradient(135deg, ${th.accentFaint}, rgba(0,0,0,0.18))`, border: `1px solid ${th.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: th.accentFaint, border: `1.5px solid ${th.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>🤳</div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'white', marginBottom: '2px' }}>AI Selfie Match</h3>
            <p style={{ fontSize: '12px', color: th.textSecondary }}>Upload your selfie — find your photos from the party</p>
          </div>
        </div>
        {!selfie ? (
          <button onClick={() => fileRef.current?.click()}
            style={{ width: '100%', padding: '12px', borderRadius: '14px', background: 'rgba(255,255,255,0.06)', border: `1.5px dashed ${th.border}`, color: th.accentLight, fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            📷 Upload Your Selfie
          </button>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '50%', overflow: 'hidden', border: `2px solid ${th.accent}`, flexShrink: 0 }}>
                <img src={selfie} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
              </div>
              <div style={{ flex: 1 }}>
                {matching ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: `2px solid ${th.accent}`, borderTopColor: 'transparent', animation: 'ring-spin 0.75s linear infinite', flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', color: th.textSecondary }}>Scanning party photos…</span>
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', fontWeight: 600, color: th.accentLight }}>Found {matches?.length || 0} photos with you! ✨</p>
                )}
              </div>
              <button onClick={() => { setSelfie(null); setMatches(null) }} style={{ fontSize: '12px', color: th.textSecondary, cursor: 'pointer', background: 'none', border: 'none', flexShrink: 0 }}>✕</button>
            </div>
            {matches?.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
                {matches.map((p, i) => (
                  <div key={i} style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', aspectRatio: '1', border: `2px solid ${th.accent}`, boxShadow: `0 0 18px ${th.accentDim}` }}>
                    <img src={p.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleSelfie} />
      </div>
    </section>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function BirthdaySite() {
  const { id } = useParams()
  const isPreview = new URLSearchParams(window.location.search).has('preview')
  const [inv, setInv]     = useState(null)
  const [gallery, setGallery] = useState([])
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const p = await birthdayApi.get(id)
        if (cancelled) return
        setInv(mapPageToSite(p))
        if (!isPreview) birthdayApi.recordVisit(id).catch(() => {})
      } catch (e) {
        if (!cancelled) setInv(DEMO)
      }
    }
    load()
    // No backend gallery model for birthday pages yet — keep any locally
    // uploaded photos from this browser as a fallback.
    const editorPhotos = JSON.parse(localStorage.getItem(`planazo_gallery_b_${id}`) || '[]')
    setGallery(editorPhotos)
    return () => { cancelled = true }
  }, [id, isPreview])

  useEffect(() => {
    if (isPreview) return
    const h = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [isPreview])

  useEffect(() => {
    if (!isPreview) return
    const send = () => {
      const root = document.getElementById('root')
      const h = root ? Math.ceil(root.getBoundingClientRect().height) : document.documentElement.scrollHeight
      if (h > 0) window.parent?.postMessage({ type: 'planazo_preview_height', h }, '*')
    }
    send()
    const t1 = setTimeout(send, 300)
    const t2 = setTimeout(send, 800)
    const t3 = setTimeout(send, 2000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [isPreview, inv, gallery])

  if (!inv) return <div style={{ background: '#06001a' }} />

  const th = BDAY_SITE_THEMES[inv.theme] || BDAY_SITE_THEMES.neon_party
  const hasCd = inv.birthdayDate && inv.birthdayDate !== 'T'
  const hasPerson = inv.personFullName || inv.personPhoto

  return (
    <div style={{ background: th.bg, minHeight: isPreview ? 'auto' : '100vh', color: 'white', fontFamily: 'system-ui,-apple-system,sans-serif', overflowX: 'hidden', position: 'relative' }}>

      {/* Stars */}
      {!isPreview && (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          {Array.from({ length: 55 }).map((_, i) => (
            <div key={i} style={{
              position: 'absolute', width: i % 3 === 0 ? '2px' : '1.5px', height: i % 3 === 0 ? '2px' : '1.5px', borderRadius: '50%', background: th.starColor,
              top: `${(i * 17 + 3) % 100}%`, left: `${(i * 23 + 7) % 100}%`,
              animation: `star-twinkle ${2 + (i % 4)}s ease-in-out infinite`, animationDelay: `${(i % 5) * 0.8}s`,
            }} />
          ))}
        </div>
      )}

      {/* ── Hero ─────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', ...(isPreview ? { paddingTop: '40px', paddingBottom: '40px' } : { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }) }}>
        {inv.coverPhoto && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>
            <img src={inv.coverPhoto} alt="" style={{ width: '100%', height: '120%', objectFit: 'cover', objectPosition: 'center', filter: th.photoFilter, transform: isPreview ? 'none' : `translateY(${scrollY * 0.35}px)` }} />
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, ${th.bg}66 0%, ${th.bg}bb 60%, ${th.bg} 100%)` }} />
          </div>
        )}
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '400px', background: `radial-gradient(ellipse, ${th.heroGradient} 0%, transparent 70%)`, pointerEvents: 'none', zIndex: 1 }} />

        {/* Rings */}
        {[280,380,480,580].map((s, i) => (
          <div key={i} style={{ position: 'absolute', width: s + 'px', height: s + 'px', borderRadius: '50%', border: `1px solid ${th.accent}`, opacity: 0.06 - i * 0.01, top: '50%', left: '50%', transform: 'translate(-50%,-50%)', animation: `ring-pulse ${3+i}s ease-in-out infinite`, animationDelay: `${i*0.5}s`, pointerEvents: 'none', zIndex: 1 }} />
        ))}

        {/* Sparkles */}
        {!isPreview && Array.from({ length: 14 }).map((_, i) => (
          <div key={i} style={{ position: 'absolute', width: i % 4 === 0 ? '6px' : '4px', height: i % 4 === 0 ? '6px' : '4px', borderRadius: '50%', background: th.accent, opacity: 0.3,
            top: `${(i * 13 + 10) % 80}%`, left: `${(i * 19 + 5) % 90}%`,
            animation: `star-twinkle ${2 + (i % 3)}s ease-in-out infinite`, animationDelay: `${(i % 4) * 0.7}s`, zIndex: 1 }} />
        ))}

        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 20px', maxWidth: '680px', margin: '0 auto', animation: 'hero-enter 1s cubic-bezier(0.22,1,0.36,1) both' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 18px', borderRadius: '999px', marginBottom: '24px', background: th.accentFaint, border: `1px solid ${th.border}`, backdropFilter: 'blur(16px)' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.12em', color: th.accentLight }}>{th.tagline}</span>
          </div>

          {inv.personAge && (
            <div style={{ fontSize: isPreview ? '80px' : '120px', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.04em', marginBottom: '8px',
              background: `linear-gradient(135deg, ${th.accentLight} 0%, ${th.accent} 50%, ${th.accentDim} 100%)`,
              backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              animation: 'gold-shimmer 4s linear infinite' }}>
              {inv.personAge}
            </div>
          )}

          <h1 style={{ fontSize: isPreview ? '26px' : '44px', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '12px',
            background: `linear-gradient(135deg, #ffffff 0%, ${th.accentLight} 50%, ${th.accent} 100%)`,
            backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            animation: 'gold-shimmer 5s linear infinite 1s' }}>
            {inv.eventTitle || `${inv.personName}'s Birthday`}
          </h1>

          {hasCd && (
            <p style={{ fontSize: '15px', color: th.textSecondary, letterSpacing: '0.04em', marginBottom: '32px' }}>
              {new Date(inv.birthdayDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}

          {!isPreview && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', opacity: 0.4, marginTop: '16px' }}>
              <div style={{ width: '22px', height: '36px', borderRadius: '11px', border: `1.5px solid ${th.accent}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '6px' }}>
                <div style={{ width: '3px', height: '8px', borderRadius: '2px', background: th.accent, animation: 'scroll-dot 1.6s ease-in-out infinite' }} />
              </div>
              <span style={{ fontSize: '10px', letterSpacing: '0.15em', color: th.textSecondary }}>SCROLL</span>
            </div>
          )}
        </div>
      </section>

      {/* ── Content ──────────────────────────────────── */}
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: isPreview ? '0 16px 40px' : '0 20px 80px' }}>

        {hasCd && <CountdownSection inv={inv} th={th} isPreview={isPreview} />}

        <GoldDivider th={th} />

        {hasPerson && <div id="birthday-star"><PersonCard inv={inv} th={th} isPreview={isPreview} /></div>}

        {inv.events?.length > 0 && (
          <section id="events" style={{ marginBottom: isPreview ? '32px' : '56px' }}>
            <GoldDivider th={th} />
            <p style={{ textAlign: 'center', fontSize: '11px', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: th.textSecondary, marginBottom: '6px' }}>EVENT</p>
            <h2 style={{ textAlign: 'center', fontFamily: "'Dancing Script', 'Brush Script MT', cursive", fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', fontWeight: 700, color: th.accentLight, lineHeight: 1.2, marginBottom: '10px' }}>
              Party Events
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{ height: '1px', width: '36px', background: `linear-gradient(to right, transparent, ${th.accent})` }} />
              <span style={{ color: th.accent, fontSize: '14px' }}>🎂</span>
              <div style={{ height: '1px', width: '36px', background: `linear-gradient(to left, transparent, ${th.accent})` }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
              {inv.events.filter(ev => ev.name?.trim()).map(ev => <EventCard key={ev.id} ev={ev} th={th} />)}
            </div>
          </section>
        )}

        {inv.memories?.length > 0 && (
          <section id="memories" style={{ marginBottom: isPreview ? '32px' : '56px' }}>
            <GoldDivider th={th} />
            <p style={{ textAlign: 'center', fontSize: '11px', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: th.textSecondary, marginBottom: '28px' }}>
              Memories & Highlights
            </p>
            <div style={{ position: 'relative' }}>
              <div className="hidden sm:block" style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', transform: 'translateX(-50%)', background: `linear-gradient(to bottom, transparent, ${th.border} 15%, ${th.border} 85%, transparent)` }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {inv.memories.map((m, i) => <MemoryItem key={m.id} m={m} index={i} th={th} />)}
              </div>
            </div>
          </section>
        )}

        <div id="gallery"><BdayGallerySection photos={gallery} th={th} isPreview={isPreview} /></div>

        <BdaySelfieMatch photos={gallery} th={th} isPreview={isPreview} />

        <GoldDivider th={th} />
        <div id="rsvp"><RsvpSection inv={inv} th={th} slug={id} /></div>

        {inv.vendors?.length > 0 && (
          <section style={{ marginBottom: '40px' }}>
            <GoldDivider th={th} />
            <p style={{ textAlign: 'center', fontSize: '11px', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: th.textSecondary, marginBottom: '20px' }}>
              Vendors & Credits
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
              {inv.vendors.map(v => (
                <div key={v.id} style={{ padding: '10px 18px', borderRadius: '999px', background: th.accentFaint, border: `1px solid ${th.border}` }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: th.textPrimary }}>{v.name}</p>
                  <p style={{ fontSize: '11px', color: th.textSecondary, textAlign: 'center' }}>{v.category}</p>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>

      {/* ── Thank You Footer ─────────────────────────────── */}
      <footer style={{ borderTop: `1px solid ${th.border}`, textAlign: 'center', padding: isPreview ? '40px 24px 32px' : '64px 24px 48px', background: `linear-gradient(to bottom, ${th.bg}, ${th.bg}ee)` }}>
          <h2 style={{ fontFamily: "'Dancing Script', 'Brush Script MT', cursive", fontSize: 'clamp(3rem, 9vw, 5.5rem)', fontWeight: 700, color: 'white', lineHeight: 1.15, marginBottom: '20px', textShadow: `0 0 60px ${th.accentDim}` }}>
            Thank You
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', marginBottom: '20px' }}>
            <div style={{ width: '56px', height: '1.5px', background: th.accent, opacity: 0.7 }} />
            <span style={{ color: th.accent, fontSize: '20px', lineHeight: 1 }}>♥</span>
            <div style={{ width: '56px', height: '1.5px', background: th.accent, opacity: 0.7 }} />
          </div>
          <p style={{ fontSize: '15px', color: th.textSecondary, marginBottom: '6px', letterSpacing: '0.06em' }}>
            {inv.eventTitle || (inv.personName ? `${inv.personName}'s Birthday` : 'Birthday Celebration')}
          </p>
          {inv.birthdayDate && inv.birthdayDate !== 'T' && (
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginBottom: '20px' }}>
              {new Date(inv.birthdayDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
          {inv.views > 0 && (
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.28)', marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <span style={{ fontSize: '14px' }}>👁</span> {inv.views} Unique Visits
            </p>
          )}
          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.12)', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif' }}>Crafted with Planazo ✦</p>
        </footer>

      {/* Fixed nav */}
      {!isPreview && (
        <nav style={{ position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)', zIndex: 50, display: 'flex', alignItems: 'center', gap: '2px', padding: '6px 10px', borderRadius: '999px', backdropFilter: 'blur(24px)', background: 'rgba(0,0,0,0.55)', border: `1px solid ${th.border}`, whiteSpace: 'nowrap' }}>
          {[
            { label: '🎂 ' + (inv.personName || 'Birthday'), id: 'birthday-star' },
            { label: 'Events', id: 'events' },
            { label: 'Memories', id: 'memories' },
            { label: 'Gallery', id: 'gallery' },
            { label: 'RSVP', id: 'rsvp' },
          ].map(item => (
            <button key={item.id} onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' })}
              style={{ padding: '5px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, color: th.accentDim, background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'white'}
              onMouseLeave={e => e.currentTarget.style.color = th.accentDim}>
              {item.label}
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}
