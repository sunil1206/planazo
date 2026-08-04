// Shared pieces used across every Planning Suite module page
// (Overview/Checklist/Budget/Guests/Vendors/Find Vendors) — the event-first
// picker, the small loading/error/empty states, and the per-page shell that
// gates a module behind "pick an event first" exactly like every module in
// the original request's workflow diagrams.
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { planningApi } from '../../lib/planningApi'
import { getErrorMessage } from '../../lib/api'
import { usePlanningEvent } from '../../context/usePlanningEvent'
import AppLayout from '../../components/AppLayout'
import PlanningEventCard from '../../components/PlanningEventCard'
import Select from '../../components/Select'
import logo from '../../assets/logo.png'

export const ACCENT = '#10b981'
export const ACCENT2 = '#0ea5e9'
export const GRADIENT = `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`

export const STATUS_STYLE = {
  PLANNING:  { bg: 'rgba(168,85,247,0.15)', color: '#c4b5fd', border: 'rgba(168,85,247,0.3)' },
  UPCOMING:  { bg: 'rgba(56,189,248,0.15)', color: '#7dd3fc', border: 'rgba(56,189,248,0.3)' },
  ONGOING:   { bg: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: 'rgba(16,185,129,0.3)' },
  COMPLETED: { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', border: 'rgba(255,255,255,0.15)' },
  CANCELLED: { bg: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: 'rgba(239,68,68,0.3)' },
}

export const EVENT_TYPE_META = {
  wedding:  { label: 'Wedding',  icon: '💍' },
  birthday: { label: 'Birthday', icon: '🎂' },
  custom:   { label: 'Event',    icon: '🧳' },
}

export function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function Spinner() {
  return <div className="flex justify-center py-10"><div className="w-6 h-6 border rounded-full animate-spin" style={{ borderColor: `${ACCENT}44`, borderTopColor: ACCENT }} /></div>
}

// Shared "couldn't load this list" state — distinct from a genuinely empty
// list, with a Retry button, so a network hiccup never looks like empty data.
export function LoadError({ message, onRetry }) {
  return (
    <div className="glass-card p-6 flex flex-col items-center text-center gap-3">
      <p className="text-white/60 text-[13px]">{message || 'Something went wrong loading this.'}</p>
      <button onClick={onRetry}
        className="px-4 py-1.5 rounded-full text-[12px] font-semibold text-white transition-all duration-200 hover:-translate-y-px"
        style={{ background: GRADIENT }}>
        Retry
      </button>
    </div>
  )
}

export function EmptyState({ title, hint }) {
  return (
    <div className="text-center py-8">
      <p className="text-white/40 text-[13px] font-medium">{title}</p>
      {hint && <p className="text-white/25 text-[12px] mt-1">{hint}</p>}
    </div>
  )
}

export function InlineFormError({ message }) {
  if (!message) return null
  return <p className="text-rose-400 text-[11.5px] -mt-1">{message}</p>
}

// ── Event picker — shown by every module until an event is selected ────────────
export function EventPicker({ onSelect }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')

  const load = useCallback(() => {
    setLoading(true)
    setLoadErr('')
    const params = {}
    if (typeFilter !== 'All') params.event_type = typeFilter
    if (search.trim()) params.search = search.trim()
    planningApi.listEvents(params)
      .then(res => setEvents(res.items || []))
      .catch(e => setLoadErr(getErrorMessage(e, 'Could not load your events.')))
      .finally(() => setLoading(false))
  }, [typeFilter, search])

  useEffect(() => { load() }, [typeFilter])
  useEffect(() => { const t = setTimeout(load, 350); return () => clearTimeout(t) }, [search])

  return (
    <main className="max-w-6xl mx-auto px-5 py-8">
      <div className="mb-6">
        <h1 className="text-white font-bold text-[20px] mb-1">Choose an event to plan</h1>
        <p className="text-white/40 text-[13px]">Every Planning Suite module — Checklist, Budget, Guests, Vendors — works on one event at a time.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 mb-6">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search your events…"
          aria-label="Search your events"
          className="glass-input flex-1 min-w-[200px]" style={{ maxWidth: '360px' }} />
        <Select
          value={typeFilter} onChange={setTypeFilter} ariaLabel="Filter by event type"
          options={[
            { value: 'All', label: 'All Event Types' },
            { value: 'wedding', label: 'Wedding' },
            { value: 'birthday', label: 'Birthday' },
            { value: 'custom', label: 'Custom Events' },
          ]}
        />
      </div>

      {loading ? <Spinner /> : loadErr ? (
        <LoadError message={loadErr} onRetry={load} />
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5 text-[32px]"
            style={{ background: `${ACCENT}14`, border: `1px solid ${ACCENT}30` }}>
            🗂️
          </div>
          <h2 className="text-white font-bold text-[22px] mb-2 tracking-tight">No events to plan yet</h2>
          <p className="text-white/40 text-[14px] max-w-sm leading-relaxed">
            Create a Wedding, Birthday or Custom Event first — Planning Suite manages checklist, budget,
            guests and vendors for events that already exist.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.map(ev => {
            const st = STATUS_STYLE[ev.status] || STATUS_STYLE.PLANNING
            const meta = EVENT_TYPE_META[ev.event_type] || EVENT_TYPE_META.custom
            return (
              <button key={`${ev.event_type}-${ev.id}`} onClick={() => onSelect(ev.event_type, ev.id)}
                className="glass-card overflow-hidden text-left group hover:border-white/20 transition-all duration-300 hover:-translate-y-1">
                <div className="relative h-24 flex items-center justify-center overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${ACCENT}40, ${ACCENT2}15)` }}>
                  {ev.cover_image
                    ? <img src={ev.cover_image} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    : <span className="text-3xl">{meta.icon}</span>}
                  <div className="absolute top-2.5 right-2.5 z-10">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider border"
                      style={{ background: st.bg, color: st.color, borderColor: st.border }}>{ev.status}</span>
                  </div>
                  <div className="absolute bottom-2.5 left-2.5 z-10">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider"
                      style={{ background: 'rgba(0,0,0,0.45)', color: 'white' }}>{meta.icon} {meta.label}</span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-white font-bold text-[15px] mb-1 truncate">{ev.title}</h3>
                  <p className="text-white/35 text-[12px]">
                    {ev.event_date ? fmtDate(ev.event_date) : 'No date set'}
                    {ev.location && ` · 📍 ${ev.location}`}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </main>
  )
}

// ── Shared header — every /planning/* route shows the same breadcrumb strip ────
function PlanningHeader({ title }) {
  const navigate = useNavigate()
  return (
    <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#060412]/90 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-5 h-14 flex items-center gap-4">
        <button onClick={() => navigate('/home')} aria-label="Back to dashboard"
          className="w-8 h-8 flex items-center justify-center rounded-xl text-white/40 hover:text-white/80 hover:bg-white/[0.07] transition-all duration-200 shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <img src={logo} alt="" className="w-6 h-6 opacity-70" />
          <span className="text-white/40 text-[13px]">/</span>
          <span className="text-white/60 font-medium text-[14px]">Planning Suite</span>
          <span className="text-white/40 text-[13px]">/</span>
          <span className="text-white font-semibold text-[15px]">{title}</span>
        </div>
      </div>
    </header>
  )
}

/**
 * Shared page shell for every Planning Suite module route. Handles the
 * event-first gate (no event selected → EventPicker; selected → the
 * persistent PlanningEventCard header + this module's content) so each
 * route file (PlanningChecklist.jsx etc.) only has to supply its own tab
 * content, not repeat this workflow six times.
 */
export function PlanningModulePage({ title, children }) {
  const { hasSelection, selectEvent } = usePlanningEvent()
  const orbOpacity = { purple: 0.08, blue: 0.1 }

  return (
    <AppLayout orbOpacity={orbOpacity}>
      <PlanningHeader title={title} />
      {!hasSelection ? (
        <EventPicker onSelect={selectEvent} />
      ) : (
        <main className="max-w-6xl mx-auto px-5 py-6 space-y-5">
          <PlanningEventCard />
          {children}
        </main>
      )}
    </AppLayout>
  )
}
