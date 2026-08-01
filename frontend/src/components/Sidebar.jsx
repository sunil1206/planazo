import { useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import logo from '../assets/logo.png'
import { useAuth } from '../context/useAuth'

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
  menu:     <Ico><path d="M3 12h18M3 6h18M3 18h18"/></Ico>,
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

// Every route below is real and wired up today. Planning Suite links point at
// the new per-module routes (frontend/src/pages/planning/) instead of the old
// ?tab= query-param pattern. Deliberately NOT listed yet: Seating, Tasks (as
// distinct from Checklist), Notes, Files, Gallery-within-Planning, Messages,
// and an AI Planner — none of those have a real backend/UI behind them yet
// (see the Phase 1 scoping decision), and this sidebar only links to things
// that actually work when clicked.
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
      { key: 'Overview',    icon: Icons.grid,   label: 'Overview',     route: '/planning' },
      { key: 'Checklist',   icon: Icons.check,  label: 'Checklist',    route: '/planning/checklist' },
      { key: 'Budget',      icon: Icons.dollar, label: 'Budget',       route: '/planning/budget' },
      { key: 'GuestList',   icon: Icons.users,  label: 'Guest List',   route: '/planning/guests' },
      { key: 'MyVendors',   icon: Icons.store,  label: 'My Vendors',   route: '/planning/vendors' },
      { key: 'FindVendors', icon: Icons.search, label: 'Find Vendors', route: '/planning/find-vendors' },
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

// A nav item is "active" if the current path is that route, or a sub-path of
// it (e.g. /weddings/editor/foo still highlights "Weddings"). /planning is
// matched exactly for Overview so it doesn't also light up for every other
// /planning/* child.
function isRouteActive(pathname, route) {
  if (!route) return false
  if (route === '/planning') return pathname === '/planning'
  return pathname === route || pathname.startsWith(`${route}/`)
}

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

// Hover-to-expand nav group with smooth max-height animation. Starts expanded
// if one of its children matches the current route, so a direct link/refresh
// into e.g. /planning/budget shows the Planning Suite group already open.
function NavGroup({ groupKey, icon, label, children, pathname, onNavigate }) {
  const navigate = useNavigate()
  const childActive = children.some(c => isRouteActive(pathname, c.route))
  const [open, setOpen] = useState(childActive)
  const timerRef = useRef(null)

  const expand = () => {
    clearTimeout(timerRef.current)
    setOpen(true)
  }
  const collapse = () => {
    timerRef.current = setTimeout(() => setOpen(childActive), 120)
  }

  return (
    <div onMouseEnter={expand} onMouseLeave={collapse}>
      {/* Group header */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all duration-200 text-left
          ${childActive
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
              active={isRouteActive(pathname, item.route)}
              onClick={() => {
                onNavigate?.()
                if (item.route) navigate(item.route)
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Sign-out confirmation modal ───────────────────────────────────────────────
function SignOutModal({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ animation: 'modal-bg-in 0.22s ease both' }}>
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative glass-card w-full max-w-[320px] px-6 py-6 text-center"
        style={{ animation: 'modal-card-in 0.3s cubic-bezier(0.34,1.38,0.64,1) both', borderRadius: '44px' }}>
        <div className="w-10 h-10 rounded-full mx-auto mb-3.5 flex items-center justify-center"
          style={{ background: 'rgba(244,63,94,0.10)', border: '1px solid rgba(244,63,94,0.18)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fb7185"
            strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <path d="M16 17l5-5-5-5"/>
            <path d="M21 12H9"/>
          </svg>
        </div>
        <h3 className="text-white font-bold text-[20px] tracking-tight mb-1">Sign out ?</h3>
        <p className="text-white/40 text-[12.5px] leading-relaxed mb-5">
          You'll be returned to the login screen.<br />Any unsaved changes will be lost.
        </p>
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
            style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)', boxShadow: '0 4px 18px rgba(244,63,94,0.32)' }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Persistent left navigation — rendered once by AppLayout and shared across
 * every internal page (Home, Weddings, Birthdays, Custom Events, Gallery,
 * and the whole Planning Suite) instead of each page rebuilding its own copy.
 * `open` / `onNavigate` are controlled by AppLayout so the mobile
 * slide-in/overlay/hamburger state lives in one place.
 */
export default function Sidebar({ open, onNavigate }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user: authUser, logout } = useAuth()
  const [showSignOut, setShowSignOut] = useState(false)
  const user = authUser ?? { name: 'Sunil Ma', email: 'sunilma94@gmail.com' }
  const initials = (user.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  const confirmSignOut = () => {
    navigate('/', { replace: true })
    logout()
  }

  return (
    <>
      {showSignOut && (
        <SignOutModal onConfirm={confirmSignOut} onCancel={() => setShowSignOut(false)} />
      )}

      <aside className={`fixed top-0 left-0 h-screen w-64 z-40 flex flex-col overflow-hidden
        bg-white/[0.035] backdrop-blur-2xl border-r border-white/[0.07]
        transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>

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
              pathname={location.pathname}
              onNavigate={onNavigate}
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
              active={false}
              accent={item.accent}
              onClick={() => onNavigate?.()}
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
    </>
  )
}
