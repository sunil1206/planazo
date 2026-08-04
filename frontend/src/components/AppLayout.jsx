import { useState } from 'react'
import logo from '../assets/logo.png'
import Sidebar from './Sidebar'

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h18M3 6h18M3 18h18"/>
    </svg>
  )
}

/**
 * Shared shell for every internal (signed-in) page: fixed left Sidebar,
 * background orbs, a mobile top bar with a hamburger that slides the sidebar
 * in, and a backdrop to dismiss it. Replaces the sidebar/layout markup that
 * used to be duplicated inline in Home.jsx — now Weddings/Birthdays/Custom
 * Events/Gallery/Planning Suite all render inside the same shell, so the
 * sidebar never disappears while navigating between them (no full page
 * reloads either — React Router just swaps the <main> content).
 *
 * `orbOpacity` lets a page nudge the ambient background glow like the old
 * per-page values did (Home used {purple:0.18, blue:0.14}, Weddings used
 * {purple:0.12, blue:0.09}) — cosmetic only, defaults match Home's.
 */
export default function AppLayout({ children, orbOpacity = { purple: 0.18, blue: 0.14 } }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="h-screen bg-[#060412] flex relative overflow-hidden">
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="bg-orb orb-purple" style={{ opacity: orbOpacity.purple }} />
        <div className="bg-orb orb-blue" style={{ opacity: orbOpacity.blue }} />
        <div className="grid-lines" />
      </div>

      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <main className="flex-1 lg:ml-56 min-h-0 overflow-y-auto overflow-x-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.07] bg-[#060412]/80 backdrop-blur-xl sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="text-white/60 hover:text-white transition-colors p-1" aria-label="Open menu">
            <MenuIcon />
          </button>
          <img src={logo} alt="Planazo" className="w-7 h-7" />
          <span className="text-white font-bold text-[15px]">Planazo</span>
        </div>

        {children}
      </main>
    </div>
  )
}
