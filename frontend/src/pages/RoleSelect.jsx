import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import logo from '../assets/logo.png'

// ── Role definitions ──────────────────────────────────────────────────────────
const ROLES = [
  {
    value:     'user',
    label:     'User',
    emoji:     '👫',
    emojiGrad: 'linear-gradient(135deg, #be185d 0%, #7c3aed 100%)',
    desc:      'Plan your dream wedding',
    tags:      ['Digital Invitations', 'Photo Gallery'],
    tagBg:     'rgba(236,72,153,0.14)',
    tagColor:  '#f9a8d4',
    accent:    '#ec4899',
    glow:      'rgba(236,72,153,0.32)',
    border:    'rgba(236,72,153,0.3)',
  },
  {
    value:     'vendor',
    label:     'Vendor',
    emoji:     '🎪',
    emojiGrad: 'linear-gradient(135deg, #6d28d9 0%, #4338ca 100%)',
    desc:      'Grow your wedding business',
    tags:      ['Portfolio Builder', 'Package Management'],
    tagBg:     'rgba(168,85,247,0.14)',
    tagColor:  '#d8b4fe',
    accent:    '#a855f7',
    glow:      'rgba(168,85,247,0.32)',
    border:    'rgba(168,85,247,0.3)',
  },
  {
    value:     'gift_seller',
    label:     'Gift Seller',
    emoji:     '🎁',
    emojiGrad: 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)',
    desc:      "Sell on India's wedding marketplace",
    tags:      ['Product Listings', 'Order Management'],
    tagBg:     'rgba(20,184,166,0.14)',
    tagColor:  '#5eead4',
    accent:    '#14b8a6',
    glow:      'rgba(20,184,166,0.32)',
    border:    'rgba(20,184,166,0.3)',
    hidden:    true, // disabled for now — flip back to false to bring this role back
  },
]

const VISIBLE_ROLES = ROLES.filter(r => !r.hidden)

// ── Logo loading overlay ──────────────────────────────────────────────────────
function LoadingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/65 backdrop-blur-md">
      <div className="relative flex items-center justify-center">
        <div className="loading-ring-outer" />
        <div className="loading-ring-inner" />
        <img src={logo} alt="Planazo" className="w-[72px] h-[72px] relative z-10 logo-pulse" />
      </div>
      <p className="mt-7 text-white/40 text-[11px] tracking-[0.25em] uppercase font-medium animate-pulse select-none">
        Loading
      </p>
    </div>
  )
}

// ── 3D tilt card ──────────────────────────────────────────────────────────────
function RoleCard({ role, onSelect }) {
  const ref    = useRef(null)
  const rafRef = useRef(null)

  const onMove = useCallback((e) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const { clientX, clientY } = e
    rafRef.current = requestAnimationFrame(() => {
      const el   = ref.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const cx   = rect.width  / 2
      const cy   = rect.height / 2
      const rotX = -((clientY - rect.top  - cy) / cy) * 10
      const rotY =  ((clientX - rect.left - cx) / cx) * 10
      el.style.transition  = 'box-shadow 0.2s ease, border-color 0.2s ease'
      el.style.transform   = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(12px) scale(1.015)`
      el.style.boxShadow   = `0 24px 64px ${role.glow}, 0 0 0 1px ${role.border}`
      el.style.borderColor = role.border
    })
  }, [role])

  const onLeave = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const el = ref.current
    if (!el) return
    el.style.transition  = 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.5s ease, border-color 0.3s ease'
    el.style.transform   = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0px) scale(1)'
    el.style.boxShadow   = ''
    el.style.borderColor = ''
  }, [])

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={() => onSelect(role.value)}
      className="glass-card p-5 sm:p-6 flex flex-col items-center text-center gap-3.5 cursor-pointer select-none"
      style={{ willChange: 'transform' }}
    >
      {/* Emoji icon */}
      <div className="w-[60px] h-[60px] rounded-[18px] flex items-center justify-center text-[32px]"
        style={{
          background: role.emojiGrad,
          boxShadow:  `0 8px 28px ${role.glow}`,
          transform:  'translateZ(20px)',
        }}>
        {role.emoji}
      </div>

      {/* Label + description */}
      <div style={{ transform: 'translateZ(10px)' }}>
        <h3 className="text-white font-bold text-[18px] mb-1">{role.label}</h3>
        <p className="text-white/40 text-[12.5px] leading-snug">{role.desc}</p>
      </div>

      {/* Feature tags */}
      <div className="flex flex-wrap gap-1.5 justify-center" style={{ transform: 'translateZ(8px)' }}>
        {role.tags.map(t => (
          <span key={t}
            className="px-2.5 py-0.5 rounded-full text-[11px] font-medium"
            style={{ background: role.tagBg, color: role.tagColor, border: `1px solid ${role.tagColor}35` }}>
            {t}
          </span>
        ))}
      </div>

      {/* CTA */}
      <p className="text-[13px] font-semibold mt-0.5" style={{ color: role.accent, transform: 'translateZ(8px)' }}>
        Get started →
      </p>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function RoleSelect() {
  const navigate  = useNavigate()
  const [loading, setLoading] = useState(false)

  const handleSelect = (value) => {
    setLoading(true)
    setTimeout(() => navigate(`/login?role=${value}`), 700)
  }

  return (
    <div className="relative h-screen overflow-hidden bg-[#060412] flex flex-col items-center justify-center px-5">

      {loading && <LoadingOverlay />}

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="bg-orb orb-purple" style={{ opacity: 0.52 }} />
        <div className="bg-orb orb-blue"   style={{ opacity: 0.42 }} />
        <div className="bg-orb orb-pink"   style={{ opacity: 0.28 }} />
        <div className="grid-lines" />
        <div className="noise-overlay" />
      </div>

      {/* Logo link */}
      <button onClick={() => navigate('/')} className="relative flex items-center gap-2.5 mb-5 hover:opacity-80 transition-opacity">
        <img src={logo} alt="Planazo" className="w-8 h-8 drop-shadow-[0_0_10px_rgba(139,92,246,0.65)]" />
        <span className="text-white font-bold text-[17px] tracking-tight">Planazo</span>
      </button>

      {/* Heading */}
      <div className="relative text-center mb-6">
        <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-purple-400/65 mb-2">
          India's Wedding Platform
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-1.5 leading-tight">Who are you?</h1>
        <p className="text-white/38 text-[14px]">Choose your role to get the right experience</p>
      </div>

      {/* Role cards */}
      <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-[600px]"
        style={{ perspective: '1200px' }}>
        {VISIBLE_ROLES.map(r => <RoleCard key={r.value} role={r} onSelect={handleSelect} />)}
      </div>

      {/* Sign in link */}
      <p className="relative text-white/32 text-[13px] mt-6">
        Already have an account?{' '}
        <button onClick={() => navigate('/login')} className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
          Sign in
        </button>
      </p>

    </div>
  )
}
