import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import logo from '../assets/logo.png'
import { useAuth } from '../context/useAuth'
import { weddingApi, birthdayApi } from '../lib/eventsApi'
import api from '../lib/api'

// ── Icon helper ───────────────────────────────────────────────────────────────
function Ico({ children, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}

const Icons = {
  grid:     <Ico><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></Ico>,
  plus:     <Ico><path d="M12 5v14M5 12h14"/></Ico>,
  cake:     <Ico><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 21h16"/><path d="M12 3v4m0 0c-1.1 0-2 .9-2 2M12 7c1.1 0 2 .9 2 2"/><path d="M4 13h16"/></Ico>,
  image:    <Ico><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></Ico>,
  check:    <Ico><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></Ico>,
  dollar:   <Ico><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></Ico>,
  users:    <Ico><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Ico>,
  store:    <Ico><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></Ico>,
  search:   <Ico><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></Ico>,
  robot:    <Ico><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M12 2v4M9 2h6"/><path d="M8 15h.01M16 15h.01M9 19h6"/><circle cx="12" cy="6" r="1"/></Ico>,
  gift:     <Ico><path d="M20 12v10H4V12"/><path d="M2 7h20v5H2z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></Ico>,
  bag:      <Ico><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></Ico>,
  chart:    <Ico><path d="M18 20V10M12 20V4M6 20v-6"/></Ico>,
  vendor:   <Ico><path d="M3 3h18v4H3z"/><path d="M3 7v14h18V7"/><path d="M9 7v14M15 7v14"/></Ico>,
  upgrade:  <Ico><path d="M12 19V5M5 12l7-7 7 7"/></Ico>,
  logout:   <Ico><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></Ico>,
  trophy:   <Ico><path d="M6 9H4a2 2 0 0 0 0 4h2"/><path d="M18 9h2a2 2 0 0 1 0 4h-2"/><path d="M6 3h12v10a6 6 0 0 1-6 6v0a6 6 0 0 1-6-6z"/><path d="M10 19v2M14 19v2M8 21h8"/></Ico>,
  bolt:     <Ico><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></Ico>,
  eye:      <Ico><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></Ico>,
  external: <Ico><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/></Ico>,
  menu:     <Ico><path d="M3 12h18M3 6h18M3 18h18"/></Ico>,
  close:    <Ico><path d="M18 6L6 18M6 6l12 12"/></Ico>,
  star:     <Ico><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z"/></Ico>,
  ring:     <Ico><path d="M6 9a6 6 0 1 0 12 0A6 6 0 0 0 6 9"/><path d="M12 15v7"/><path d="M9 18l3 4 3-4"/></Ico>,
  chevron:  <Ico size={14}><path d="M6 9l6 6 6-6"/></Ico>,
}

// ── User type display ─────────────────────────────────────────────────────────
const USER_TYPE_LABELS = { user: 'User', vendor: 'Vendor', gift_seller: 'Gift Seller' }

const USER_TYPE_STYLES = {
  user:        { background: 'rgba(139,92,246,0.14)', color: '#c4b5fd', borderColor: 'rgba(139,92,246,0.25)' },
  vendor:      { background: 'rgba(251,146,60,0.12)', color: '#fdba74', borderColor: 'rgba(251,146,60,0.25)' },
  gift_seller: { background: 'rgba(52,211,153,0.12)', color: '#6ee7b7', borderColor: 'rgba(52,211,153,0.25)' },
}

const NAV_GROUPS = [
  {
    key: 'MyEvents',
    icon: Icons.grid,
    label: 'My Events',
    children: [
      { key: 'Weddings',     icon: Icons.ring,   label: 'Weddings',      route: '/weddings' },
      { key: 'Birthdays',    icon: Icons.cake,   label: 'Birthdays',     route: '/birthdays' },
      { key: 'CustomEvents', icon: Icons.trophy, label: 'Custom Events', route: '/custom-events' },
      { key: 'Gallery',      icon: Icons.image,  label: 'Gallery & AI',  route: '/gallery' },
    ],
  },
  {
    key: 'PlanningSuite',
    icon: Icons.check,
    label: 'Planning Suite',
    children: [
      { key: 'Checklist',   icon: Icons.check,  label: 'Checklist',    route: '/planning?tab=checklist' },
      { key: 'Budget',      icon: Icons.dollar, label: 'Budget',       route: '/planning?tab=budget' },
      { key: 'GuestList',   icon: Icons.users,  label: 'Guest List',   route: '/planning?tab=guests' },
      { key: 'MyVendors',   icon: Icons.store,  label: 'My Vendors',   route: '/planning?tab=vendors' },
      { key: 'FindVendors', icon: Icons.search, label: 'Find Vendors', route: '/planning?tab=findvendors' },
      { key: 'AIPlanner',   icon: Icons.robot,  label: 'AI Planner' },
    ],
  },
  {
    key: 'GiftsShop',
    icon: Icons.gift,
    label: 'Gifts & Shop',
    children: [
      { key: 'ScheduleGifts', icon: Icons.gift, label: 'Schedule Gifts' },
      { key: 'GiftShop',      icon: Icons.bag,  label: 'Gift Shop' },
    ],
  },
]

const BOTTOM_NAV = [
  { key: 'SellerDashboard', icon: Icons.chart,   label: 'Seller Dashboard', accent: 'purple' },
  { key: 'VendorHub',       icon: Icons.vendor,  label: 'Vendor Hub',       accent: 'amber' },
  { key: 'UpgradePlan',     icon: Icons.upgrade, label: 'Upgrade Plan',     accent: null },
]

// ── Components ────────────────────────────────────────────────────────────────
function NavItem({ icon, label, active, accent, onClick }) {
  const accentColors = {
    purple: 'text-purple-400',
    amber:  'text-amber-400',
  }
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all duration-200 text-left
        ${active
          ? 'bg-gradient-to-r from-purple-600/70 to-indigo-600/60 text-white shadow-[0_0_16px_rgba(124,58,237,0.25)]'
          : `text-white/50 hover:text-white/85 hover:bg-white/[0.06] ${accent ? accentColors[accent] : ''}`
        }`}
    >
      <span className={`shrink-0 ${active ? 'text-white' : ''}`}>{icon}</span>
      {label}
    </button>
  )
}

// Hover-to-expand nav group with smooth max-height animation
function NavGroup({ groupKey, icon, label, children, activeNav, setActiveNav, setSidebarOpen }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const timerRef = useRef(null)
  const childActive = children.some(c => c.key === activeNav)
  const isGroupActive = activeNav === groupKey || childActive

  const expand = () => {
    clearTimeout(timerRef.current)
    setOpen(true)
  }
  const collapse = () => {
    timerRef.current = setTimeout(() => setOpen(false), 120)
  }

  return (
    <div onMouseEnter={expand} onMouseLeave={collapse}>
      {/* Group header */}
      <button
        onClick={() => { setOpen(o => !o); setActiveNav(groupKey) }}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all duration-200 text-left
          ${isGroupActive
            ? 'bg-gradient-to-r from-purple-600/70 to-indigo-600/60 text-white shadow-[0_0_16px_rgba(124,58,237,0.25)]'
            : 'text-white/50 hover:text-white/85 hover:bg-white/[0.06]'
          }`}
      >
        <span className="shrink-0">{icon}</span>
        <span className="flex-1 text-left">{label}</span>
        <span className={`shrink-0 text-white/35 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}>
          {Icons.chevron}
        </span>
      </button>

      {/* Sub-items with smooth expand */}
      <div
        style={{
          maxHeight: open ? `${children.length * 52}px` : '0px',
          opacity: open ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.32s cubic-bezier(0.4,0,0.2,1), opacity 0.22s ease',
        }}
      >
        <div className="ml-3 mt-1 mb-1 pl-3 space-y-0.5"
          style={{ borderLeft: '1px solid rgba(255,255,255,0.07)' }}>
          {children.map(item => (
            <NavItem
              key={item.key}
              icon={item.icon}
              label={item.label}
              active={activeNav === item.key}
              onClick={() => {
                setActiveNav(item.key)
                setSidebarOpen(false)
                if (item.route) navigate(item.route)
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
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

// ── Sign-out confirmation modal ───────────────────────────────────────────────
function SignOutModal({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ animation: 'modal-bg-in 0.22s ease both' }}>

      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onCancel} />

      {/* Card — uses project glass-card style */}
      <div className="relative glass-card w-full max-w-[320px] px-6 py-6 text-center"
        style={{ animation: 'modal-card-in 0.3s cubic-bezier(0.34,1.38,0.64,1) both', borderRadius: '44px' }}>

        {/* Icon */}
        <div className="w-10 h-10 rounded-full mx-auto mb-3.5 flex items-center justify-center"
          style={{
            background: 'rgba(244,63,94,0.10)',
            border: '1px solid rgba(244,63,94,0.18)',
          }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fb7185"
            strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <path d="M16 17l5-5-5-5"/>
            <path d="M21 12H9"/>
          </svg>
        </div>

        <h3 className="text-white font-bold text-[20px] tracking-tight mb-1">
          Sign out ?
        </h3>
        <p className="text-white/40 text-[12.5px] leading-relaxed mb-5">
          You'll be returned to the login screen.<br />Any unsaved changes will be lost.
        </p>

        {/* Medium side-by-side buttons */}
        <div className="flex items-center justify-center gap-2.5">
          <button
            onClick={onCancel}
            className="px-7 py-2.5 rounded-full text-[13.5px] font-semibold text-white/60 hover:text-white/90
              bg-white/[0.055] hover:bg-white/[0.09] border border-white/[0.09] hover:border-white/[0.16]
              transition-all duration-200"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-7 py-2.5 rounded-full text-[13.5px] font-semibold text-white
              hover:-translate-y-px active:translate-y-0 transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, #f43f5e, #e11d48)',
              boxShadow: '0 4px 18px rgba(244,63,94,0.32)',
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate()
  const { user: authUser, logout } = useAuth()
  const [activeNav, setActiveNav]     = useState('MyEvents')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showSignOut, setShowSignOut] = useState(false)
  const [weddings, setWeddings]       = useState([])
  const [birthdays, setBirthdays]     = useState([])
  const [membership, setMembership]   = useState('FREE')
  const user = authUser ?? { name: 'Sunil Ma', email: 'sunilma94@gmail.com' }

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

  const confirmSignOut = () => {
    navigate('/', { replace: true })
    logout()
  }

  const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  const Sidebar = (
    <aside className={`fixed top-0 left-0 h-screen w-64 z-40 flex flex-col overflow-hidden
      bg-white/[0.035] backdrop-blur-2xl border-r border-white/[0.07]
      transition-transform duration-300
      ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>

      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/[0.06]">
        <img src={logo} alt="Planazo" className="w-8 h-8 drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
        <span className="text-white font-bold text-[17px] tracking-tight">Planazo</span>
      </div>

      {/* User info */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
        <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-white text-[13px] font-semibold leading-tight truncate">{user.name}</p>
          <p className="text-white/35 text-[11px] truncate">{user.email}</p>
          {user.userType && (
            <span className="inline-block mt-1 px-2 py-px text-[10px] font-semibold rounded-full tracking-wide border"
              style={USER_TYPE_STYLES[user.userType] ?? USER_TYPE_STYLES.user}>
              {USER_TYPE_LABELS[user.userType] ?? user.userType}
            </span>
          )}
        </div>
      </div>

      {/* Scrollable nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1 sidebar-scroll">
        {NAV_GROUPS.map(group => (
          <NavGroup
            key={group.key}
            groupKey={group.key}
            icon={group.icon}
            label={group.label}
            children={group.children}
            activeNav={activeNav}
            setActiveNav={setActiveNav}
            setSidebarOpen={setSidebarOpen}
          />
        ))}
      </nav>

      {/* Bottom nav */}
      <div className="px-3 py-3 border-t border-white/[0.06] space-y-0.5">
        {BOTTOM_NAV.map(item => (
          <NavItem
            key={item.key}
            icon={item.icon}
            label={item.label}
            active={activeNav === item.key}
            accent={item.accent}
            onClick={() => setActiveNav(item.key)}
          />
        ))}
        <button
          onClick={() => setShowSignOut(true)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/[0.08] transition-all duration-200"
        >
          <span className="shrink-0">{Icons.logout}</span>
          Sign Out
        </button>
      </div>
    </aside>
  )

  return (
    <div className="min-h-screen bg-[#060412] flex relative overflow-x-hidden">

      {/* Sign-out confirmation */}
      {showSignOut && (
        <SignOutModal
          onConfirm={confirmSignOut}
          onCancel={() => setShowSignOut(false)}
        />
      )}

      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="bg-orb orb-purple" style={{ opacity: 0.18 }} />
        <div className="bg-orb orb-blue"   style={{ opacity: 0.14 }} />
        <div className="grid-lines" />
      </div>

      {/* Sidebar */}
      {Sidebar}

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <main className="flex-1 lg:ml-64 min-h-screen overflow-y-auto overflow-x-hidden">

        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.07] bg-[#060412]/80 backdrop-blur-xl sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="text-white/60 hover:text-white transition-colors p-1">
            {Icons.menu}
          </button>
          <img src={logo} alt="Planazo" className="w-7 h-7" />
          <span className="text-white font-bold text-[15px]">Planazo</span>
        </div>

        <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 w-full max-w-[1100px]">

          {/* ── Hero banner ─────────────────────────────────────── */}
          <div className="relative rounded-2xl overflow-hidden p-5 sm:p-7 lg:p-8"
            style={{
              background: 'linear-gradient(135deg, rgba(109,28,209,0.75) 0%, rgba(79,46,180,0.65) 40%, rgba(37,99,235,0.5) 100%)',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 8px 40px rgba(79,46,180,0.3)',
            }}>
            {/* Glass sheen */}
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%)' }} />
            {/* Decorative star */}
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
                { icon: Icons.check,  label: 'Checklist',  color: '#a78bfa' },
                { icon: Icons.dollar, label: 'Budget',     color: '#34d399' },
                { icon: Icons.users,  label: 'Guest List', color: '#38bdf8' },
                { icon: Icons.robot,  label: 'AI Planner', color: '#f472b6' },
              ].map(a => (
                <button key={a.label}
                  className="glass-card p-4 flex flex-col items-center gap-3 text-center hover:border-white/20 active:scale-[0.97] transition-all duration-200"
                  style={{ color: a.color }}>
                  {a.icon}
                  <span className="text-white/70 text-[13px] font-medium">{a.label}</span>
                </button>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
