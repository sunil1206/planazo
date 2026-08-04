import { useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import logo from '../assets/logo.png'

const EVENT_TYPES = [
  {
    route: '/weddings',
    emoji: '💍',
    label: 'Wedding',
    desc: 'Create stunning digital wedding invitations and manage your big day end-to-end.',
    tags: ['Invitations', 'Guest List', 'Vendors'],
    grad: 'linear-gradient(135deg, #be185d 0%, #7c3aed 100%)',
    glow: 'rgba(190,24,93,0.30)',
    border: 'rgba(190,24,93,0.28)',
    tagBg: 'rgba(236,72,153,0.12)',
    tagColor: '#f9a8d4',
    accent: '#ec4899',
  },
  {
    route: '/birthdays',
    emoji: '🎂',
    label: 'Birthday',
    desc: 'Plan the perfect birthday celebration with invitations, guest management and gifts.',
    tags: ['Invitations', 'Gifts', 'Themes'],
    grad: 'linear-gradient(135deg, #d97706 0%, #dc2626 100%)',
    glow: 'rgba(217,119,6,0.30)',
    border: 'rgba(217,119,6,0.28)',
    tagBg: 'rgba(251,191,36,0.12)',
    tagColor: '#fde68a',
    accent: '#fbbf24',
  },
  {
    route: '/custom-events',
    emoji: '🧳',
    label: 'Custom Events',
    desc: 'Plan a trip, festival, meetup, or any occasion — without the full wedding workflow.',
    tags: ['Checklist', 'Budget', 'Guests'],
    grad: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
    glow: 'rgba(14,165,233,0.30)',
    border: 'rgba(14,165,233,0.28)',
    tagBg: 'rgba(56,189,248,0.12)',
    tagColor: '#7dd3fc',
    accent: '#38bdf8',
  },
  {
    route: '/gallery',
    emoji: '🖼️',
    label: 'Gallery & AI',
    desc: 'Upload photos, build AI-curated galleries and share memories with your guests.',
    tags: ['AI Curation', 'Smart Albums', 'Sharing'],
    grad: 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)',
    glow: 'rgba(13,148,136,0.30)',
    border: 'rgba(13,148,136,0.28)',
    tagBg: 'rgba(20,184,166,0.12)',
    tagColor: '#5eead4',
    accent: '#14b8a6',
  },
]

function EventCard({ type, onClick }) {
  const ref = useRef(null)
  const rafRef = useRef(null)

  const onMove = useCallback((e) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const { clientX, clientY } = e
    rafRef.current = requestAnimationFrame(() => {
      const el = ref.current; if (!el) return
      const r = el.getBoundingClientRect()
      const rx = -((clientY - r.top - r.height / 2) / (r.height / 2)) * 10
      const ry = ((clientX - r.left - r.width / 2) / (r.width / 2)) * 10
      el.style.transition = 'box-shadow 0.2s ease, border-color 0.2s ease'
      el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(14px) scale(1.02)`
      el.style.boxShadow = `0 24px 64px ${type.glow}, 0 0 0 1px ${type.border}`
      el.style.borderColor = type.border
    })
  }, [type])

  const onLeave = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const el = ref.current; if (!el) return
    el.style.transition = 'transform 0.55s cubic-bezier(0.23,1,0.32,1), box-shadow 0.45s ease, border-color 0.3s ease'
    el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0px) scale(1)'
    el.style.boxShadow = ''
    el.style.borderColor = ''
  }, [])

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={onClick}
      className="glass-card p-4 sm:p-5 flex flex-col items-center text-center gap-3 cursor-pointer select-none"
      style={{ willChange: 'transform' }}
    >
      {/* Icon */}
      <div className="w-[54px] h-[54px] rounded-[18px] flex items-center justify-center text-[28px]"
        style={{
          background: type.grad,
          boxShadow: `0 8px 28px ${type.glow}`,
          transform: 'translateZ(20px)',
        }}>
        {type.emoji}
      </div>

      {/* Text */}
      <div style={{ transform: 'translateZ(10px)' }}>
        <h3 className="text-white font-bold text-[17px] mb-1.5">{type.label}</h3>
        <p className="text-white/45 text-[12.5px] leading-relaxed">{type.desc}</p>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 justify-center" style={{ transform: 'translateZ(8px)' }}>
        {type.tags.map(t => (
          <span key={t} className="px-2.5 py-0.5 rounded-full text-[11px] font-medium"
            style={{ background: type.tagBg, color: type.tagColor, border: `1px solid ${type.tagColor}35` }}>
            {t}
          </span>
        ))}
      </div>

      {/* CTA */}
      <p className="text-[12.5px] font-semibold" style={{ color: type.accent, transform: 'translateZ(8px)' }}>
        Get started →
      </p>
    </div>
  )
}

export default function CreateEvent() {
  const navigate = useNavigate()

  return (
    <div className="relative min-h-screen overflow-y-auto bg-[#060412] flex flex-col items-center justify-center px-5 py-10">

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="bg-orb orb-purple" style={{ opacity: 0.22 }} />
        <div className="bg-orb orb-blue" style={{ opacity: 0.15 }} />
        <div className="bg-orb orb-pink" style={{ opacity: 0.12 }} />
        <div className="grid-lines" />
        <div className="noise-overlay" />
      </div>

      {/* Back button + logo */}
      <button
        onClick={() => navigate('/home')}
        className="relative flex items-center gap-2.5 mb-8 text-white/40 hover:text-white/80 transition-colors duration-200 group"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
          className="group-hover:-translate-x-0.5 transition-transform duration-200">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        <img src={logo} alt="Planazo" className="w-7 h-7 drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
        <span className="text-white font-bold text-[16px] tracking-tight">Planazo</span>
      </button>

      {/* Heading */}
      <div className="relative text-center mb-10">
        <p className="text-[11px] font-bold tracking-[0.22em] uppercase text-purple-400/65 mb-2">
          New Event
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2 leading-tight">
          What are you planning?
        </h1>
        <p className="text-white/38 text-[14px]">
          Choose an event type to get started
        </p>
      </div>

      {/* Cards */}
      <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full max-w-[1140px]"
        style={{ perspective: '1200px' }}>
        {EVENT_TYPES.map(type => (
          <EventCard
            key={type.route}
            type={type}
            onClick={() => navigate(type.route)}
          />
        ))}
      </div>

    </div>
  )
}
