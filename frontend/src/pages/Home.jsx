import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { weddingApi, birthdayApi } from '../lib/eventsApi'
import api from '../lib/api'
import AppLayout from '../components/AppLayout'

// ── Icon helper ───────────────────────────────────────────────────────────────
// Only the icons this page's own content (stat tiles, invitation cards, quick
// actions) actually renders — the full nav icon set now lives in Sidebar.jsx.
function Ico({ children, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}

const Icons = {
  check:    <Ico><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></Ico>,
  dollar:   <Ico><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></Ico>,
  users:    <Ico><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Ico>,
  robot:    <Ico><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M12 2v4M9 2h6"/><path d="M8 15h.01M16 15h.01M9 19h6"/><circle cx="12" cy="6" r="1"/></Ico>,
  trophy:   <Ico><path d="M6 9H4a2 2 0 0 0 0 4h2"/><path d="M18 9h2a2 2 0 0 1 0 4h-2"/><path d="M6 3h12v10a6 6 0 0 1-6 6v0a6 6 0 0 1-6-6z"/><path d="M10 19v2M14 19v2M8 21h8"/></Ico>,
  bolt:     <Ico><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></Ico>,
  eye:      <Ico><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></Ico>,
  external: <Ico><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/></Ico>,
  star:     <Ico><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z"/></Ico>,
}

function StatCard({ label, value, sub, icon, iconColor, glow, border }) {
  return (
    <div className="glass-card p-5 flex items-center gap-4" style={{ borderColor: border }}>
      <div className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{ background: glow, color: iconColor }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {icon.props.children}
        </svg>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold tracking-widest text-white/35 uppercase mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-white leading-none mb-1">{value}</p>
        <p className="text-[12px] text-white/40">{sub}</p>
      </div>
    </div>
  )
}

function InvitationCard({ couple, status, theme, engagements, initials, editHref, previewHref }) {
  const navigate = useNavigate()
  return (
    <div className="glass-card p-4 flex items-center gap-4 hover:border-white/20 transition-colors duration-200">
      <div className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center text-sm font-bold text-white cursor-pointer"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}
        onClick={() => editHref && navigate(editHref)}>
        {initials}
      </div>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => editHref && navigate(editHref)}>
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-white font-semibold text-[14px]">{couple}</span>
          {status === 'LIVE' && (
            <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
              LIVE
            </span>
          )}
        </div>
        <p className="text-white/40 text-[12px]">{theme} &bull; {engagements} engagements</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => previewHref && window.open(previewHref, '_blank')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/8 hover:border-white/15 transition-all duration-200">
          <span className="text-white/50">{Icons.eye}</span>
          Preview
        </button>
        <button
          onClick={() => editHref && navigate(editHref)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white/75 bg-white/5 hover:bg-white/10 border border-white/8 transition-all duration-200">
          {Icons.external}
        </button>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate()
  const [weddings, setWeddings]       = useState([])
  const [birthdays, setBirthdays]     = useState([])
  const [membership, setMembership]   = useState('FREE')

  useEffect(() => {
    weddingApi.list().then(setWeddings).catch(() => setWeddings([]))
    birthdayApi.list().then(setBirthdays).catch(() => setBirthdays([]))
    api.get('/api/payment/subscription/')
      .then(({ data }) => setMembership(data.plan))
      .catch(() => setMembership('FREE'))
  }, [])

  const publishedCount = weddings.filter(w => w.is_published).length + birthdays.filter(b => b.is_published).length
  const totalEvents = weddings.length + birthdays.length
  const totalViews = weddings.reduce((s, w) => s + (w.views || 0), 0) + birthdays.reduce((s, b) => s + (b.views || 0), 0)

  const STATS = [
    {
      label: 'ACTIVE EVENTS', value: String(totalEvents), sub: `${publishedCount} Published`,
      icon: Icons.trophy, iconColor: '#f59e0b',
      glow: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.18)',
    },
    {
      label: 'EXPERIENCE VIEWS', value: String(totalViews), sub: 'Real-time tracking',
      icon: Icons.users, iconColor: '#38bdf8',
      glow: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.18)',
    },
    {
      label: 'CURRENT MEMBERSHIP', value: membership, sub: membership === 'FREE' ? 'Standard Access' : 'Active Plan',
      icon: Icons.bolt, iconColor: '#e879f9',
      glow: 'rgba(232,121,249,0.12)', border: 'rgba(232,121,249,0.18)',
    },
  ]

  const initialsFrom = (text) => (text || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const recentInvitations = [
    ...weddings.map(w => ({
      id: `wedding-${w.slug}`,
      couple: w.couple,
      status: w.is_published ? 'LIVE' : 'DRAFT',
      theme: w.theme,
      engagements: w.views || 0,
      initials: initialsFrom(w.couple),
      editHref: `/weddings/editor/${w.slug}`,
      previewHref: `/invite/${w.slug}`,
      created_at: w.created_at,
    })),
    ...birthdays.map(b => ({
      id: `birthday-${b.slug}`,
      couple: b.title || b.honoree_name,
      status: b.is_published ? 'LIVE' : 'DRAFT',
      theme: b.theme,
      engagements: b.views || 0,
      initials: initialsFrom(b.honoree_name || b.title),
      editHref: `/birthdays/editor/${b.slug}`,
      previewHref: `/birthday/${b.slug}`,
      created_at: b.created_at,
    })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5)

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 w-full max-w-[1100px]">

        {/* ── Hero banner ─────────────────────────────────────── */}
        <div className="relative rounded-2xl overflow-hidden p-5 sm:p-7 lg:p-8"
          style={{
            background: 'linear-gradient(135deg, rgba(109,28,209,0.75) 0%, rgba(79,46,180,0.65) 40%, rgba(37,99,235,0.5) 100%)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 8px 40px rgba(79,46,180,0.3)',
          }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%)' }} />
          <div className="absolute top-6 left-6 text-white/20 hidden lg:block">{Icons.star}</div>

          <div className="relative flex flex-col lg:flex-row lg:items-center gap-5">
            <div className="flex-1">
              <p className="text-white/55 text-[11px] font-semibold tracking-[0.18em] uppercase mb-2 flex items-center gap-2">
                <span className="inline-block w-4 h-px bg-white/40" />
                WELCOME BACK TO PLANAZO
              </p>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 sm:mb-3 leading-tight">
                Your Event Space
              </h1>
              <p className="text-white/55 text-[13px] sm:text-[14px] leading-relaxed max-w-md">
                Create magic for every special moment. Manage your digital experiences and track guest engagement in real-time.
              </p>
            </div>
            <div className="shrink-0 w-full sm:w-auto">
              <button
                onClick={() => navigate('/create-event')}
                className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-3 rounded-xl font-semibold text-[14px] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: 'rgba(255,255,255,0.95)',
                  color: '#4f46e5',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                }}>
                <span className="text-lg leading-none">+</span>
                Create New Event
              </button>
            </div>
          </div>
        </div>

        {/* ── Stats ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {STATS.map(s => <StatCard key={s.label} {...s} />)}
        </div>

        {/* ── Recent Invitations ──────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold text-[17px]">Recent Invitations</h2>
            <button className="flex items-center gap-1 text-[13px] font-medium text-purple-400 hover:text-purple-300 transition-colors duration-200">
              View All
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>
          <div className="space-y-3">
            {recentInvitations.length === 0 ? (
              <div className="glass-card p-6 text-center text-white/35 text-[13px]">
                No events yet. Create your first invitation to see it here.
              </div>
            ) : (
              recentInvitations.map(inv => <InvitationCard key={inv.id} {...inv} />)
            )}
          </div>
        </div>

        {/* ── Quick actions ───────────────────────────────────── */}
        <div>
          <h2 className="text-white font-bold text-[17px] mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Icons.check,  label: 'Checklist',  color: '#a78bfa', route: '/planning/checklist' },
              { icon: Icons.dollar, label: 'Budget',     color: '#34d399', route: '/planning/budget' },
              { icon: Icons.users,  label: 'Guest List', color: '#38bdf8', route: '/planning/guests' },
              { icon: Icons.robot,  label: 'AI Planner', color: '#f472b6', route: null },
            ].map(a => (
              <button key={a.label}
                onClick={() => a.route && navigate(a.route)}
                disabled={!a.route}
                className="glass-card p-4 flex flex-col items-center gap-3 text-center hover:border-white/20 active:scale-[0.97] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ color: a.color }}>
                {a.icon}
                <span className="text-white/70 text-[13px] font-medium">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </AppLayout>
  )
}
