import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import logo from '../assets/logo.png'
import {
  planningApi, CHECKLIST_PRIORITIES, RSVP_STATUSES, VENDOR_BOOKING_STATUSES,
} from '../lib/planningApi'
import { getErrorMessage } from '../lib/api'
import { PlanningEventProvider } from '../context/PlanningEventContext'
import { usePlanningEvent } from '../context/usePlanningEvent'
import PlanningEventCard from '../components/PlanningEventCard'

const ACCENT = '#10b981'
const ACCENT2 = '#0ea5e9'
const GRADIENT = `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`

const STATUS_STYLE = {
  PLANNING:  { bg: 'rgba(168,85,247,0.15)', color: '#c4b5fd', border: 'rgba(168,85,247,0.3)' },
  UPCOMING:  { bg: 'rgba(56,189,248,0.15)', color: '#7dd3fc', border: 'rgba(56,189,248,0.3)' },
  ONGOING:   { bg: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: 'rgba(16,185,129,0.3)' },
  COMPLETED: { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', border: 'rgba(255,255,255,0.15)' },
  CANCELLED: { bg: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: 'rgba(239,68,68,0.3)' },
}

const EVENT_TYPE_META = {
  wedding:  { label: 'Wedding',  icon: '💍' },
  birthday: { label: 'Birthday', icon: '🎂' },
  custom:   { label: 'Event',    icon: '🧳' },
}

const PRIORITY_STYLE = {
  LOW:      { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' },
  MEDIUM:   { bg: 'rgba(56,189,248,0.14)',  color: '#7dd3fc' },
  HIGH:     { bg: 'rgba(245,158,11,0.14)',  color: '#fbbf24' },
  CRITICAL: { bg: 'rgba(239,68,68,0.14)',   color: '#fca5a5' },
}

const RSVP_STYLE = {
  PENDING:  { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' },
  ACCEPTED: { bg: 'rgba(16,185,129,0.14)',  color: '#6ee7b7' },
  DECLINED: { bg: 'rgba(239,68,68,0.14)',   color: '#fca5a5' },
}

const TABS = [
  { id: 'overview',     label: 'Overview',     icon: '📋' },
  { id: 'checklist',    label: 'Checklist',    icon: '✅' },
  { id: 'budget',       label: 'Budget',       icon: '💰' },
  { id: 'guests',       label: 'Guest List',   icon: '👥' },
  { id: 'vendors',      label: 'My Vendors',   icon: '🤝' },
  { id: 'findvendors',  label: 'Find Vendors', icon: '🔍' },
]

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Spinner() {
  return <div className="flex justify-center py-10"><div className="w-6 h-6 border rounded-full animate-spin" style={{ borderColor: `${ACCENT}44`, borderTopColor: ACCENT }} /></div>
}

// Shared "couldn't load this list" state — distinct from a genuinely empty
// list, with a Retry button, so a network hiccup never looks like empty data.
function LoadError({ message, onRetry }) {
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

function EmptyState({ title, hint }) {
  return (
    <div className="text-center py-8">
      <p className="text-white/40 text-[13px] font-medium">{title}</p>
      {hint && <p className="text-white/25 text-[12px] mt-1">{hint}</p>}
    </div>
  )
}

function InlineFormError({ message }) {
  if (!message) return null
  return <p className="text-rose-400 text-[11.5px] -mt-1">{message}</p>
}

// ── Event picker ──────────────────────────────────────────────────────────────
function EventPicker({ onSelect }) {
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
    <main className="relative max-w-6xl mx-auto px-5 py-8">
      <div className="flex flex-wrap items-center gap-2.5 mb-6">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search your events…"
          aria-label="Search your events"
          className="glass-input flex-1 min-w-[200px]" style={{ maxWidth: '360px' }} />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="glass-input" style={{ width: 'auto' }}
          aria-label="Filter by event type">
          <option value="All">All Event Types</option>
          <option value="wedding">Wedding</option>
          <option value="birthday">Birthday</option>
          <option value="custom">Custom Events</option>
        </select>
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

// ── Overview tab ──────────────────────────────────────────────────────────────
function OverviewTab({ dashboard }) {
  const { stats } = dashboard
  const tiles = [
    { label: 'Tasks Done', value: `${stats.completed_tasks}/${stats.total_tasks}`, icon: '✅' },
    { label: 'Budget Spent', value: `₹${Number(stats.budget_used).toLocaleString('en-IN')}`, icon: '💰' },
    { label: 'Guests RSVP\'d', value: `${stats.accepted_guests + stats.declined_guests}/${stats.guest_count}`, icon: '👥' },
    { label: 'Vendors Confirmed', value: `${stats.confirmed_vendors}/${stats.vendor_count}`, icon: '🤝' },
  ]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {tiles.map(t => (
        <div key={t.label} className="glass-card p-4 text-center">
          <p className="text-xl mb-1">{t.icon}</p>
          <p className="text-white font-bold text-[15px] leading-none">{t.value}</p>
          <p className="text-white/35 text-[10px] mt-1.5">{t.label}</p>
        </div>
      ))}
    </div>
  )
}

// ── Checklist tab ─────────────────────────────────────────────────────────────
function ChecklistTab({ eventType, eventId, onChanged }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState('')
  const [formErr, setFormErr] = useState('')
  const [form, setForm] = useState({ title: '', category: 'General', priority: 'MEDIUM', due_date: '' })

  const load = useCallback(() => {
    setLoading(true); setLoadErr('')
    planningApi.listChecklist(eventType, eventId).then(setItems)
      .catch(e => setLoadErr(getErrorMessage(e, 'Could not load the checklist.')))
      .finally(() => setLoading(false))
  }, [eventType, eventId])
  useEffect(() => { load() }, [load])

  const addItem = async () => {
    if (!form.title.trim()) return
    setFormErr('')
    try {
      const created = await planningApi.createChecklistItem(eventType, eventId, {
        title: form.title, category: form.category, priority: form.priority,
        due_date: form.due_date || null,
      })
      setItems(prev => [...prev, created])
      setForm({ title: '', category: 'General', priority: 'MEDIUM', due_date: '' })
      onChanged?.()
    } catch (e) { setFormErr(getErrorMessage(e, 'Could not add that task.')) }
  }

  const toggle = async (item) => {
    const nextStatus = item.status === 'DONE' ? 'PENDING' : 'DONE'
    try {
      const updated = await planningApi.updateChecklistItem(eventType, eventId, item.id, { status: nextStatus })
      setItems(prev => prev.map(i => i.id === item.id ? updated : i))
      onChanged?.()
    } catch { /* transient failure — item stays in its previous state, user can retry the click */ }
  }

  const remove = async (id) => {
    const prev = items
    setItems(items.filter(i => i.id !== id))
    try {
      await planningApi.deleteChecklistItem(eventType, eventId, id)
      onChanged?.()
    } catch { setItems(prev) }
  }

  const completed = items.filter(i => i.status === 'DONE').length
  const pct = items.length ? Math.round((completed / items.length) * 100) : 0

  if (loading) return <Spinner />
  if (loadErr) return <LoadError message={loadErr} onRetry={load} />

  return (
    <div className="space-y-4">
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-1.5">
          <p className="field-label">Progress</p>
          <p className="text-white text-[12px] font-semibold">{completed}/{items.length} · {pct}%</p>
        </div>
        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: GRADIENT }} />
        </div>
      </div>

      <div className="glass-card p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2">
          <input className="glass-input" placeholder="Add a task…" value={form.title}
            onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setFormErr('') }}
            onKeyDown={e => e.key === 'Enter' && addItem()} />
          <input className="glass-input" placeholder="Category" value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
          <select className="glass-input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
            {CHECKLIST_PRIORITIES.map(p => <option key={p} value={p}>{p[0] + p.slice(1).toLowerCase()}</option>)}
          </select>
          <input type="date" className="glass-input" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
        </div>
        <InlineFormError message={formErr} />
        <button onClick={addItem} disabled={!form.title.trim()}
          className="px-5 py-2 rounded-full text-[13px] font-semibold text-white transition-all duration-200 disabled:opacity-40"
          style={{ background: GRADIENT }}>
          + Add Task
        </button>
      </div>

      <div className="space-y-2">
        {items.map(item => {
          const ps = PRIORITY_STYLE[item.priority] || PRIORITY_STYLE.MEDIUM
          const done = item.status === 'DONE'
          return (
            <div key={item.id} className="glass-card p-3.5 flex items-center gap-3 flex-wrap">
              <button onClick={() => toggle(item)} aria-label={done ? 'Mark task as not done' : 'Mark task as done'}
                className="w-5 h-5 rounded-md shrink-0 flex items-center justify-center border transition-all duration-150"
                style={{ background: done ? ACCENT : 'transparent', borderColor: done ? ACCENT : 'rgba(255,255,255,0.25)' }}>
                {done && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-[13.5px] font-medium truncate ${done ? 'text-white/35 line-through' : 'text-white'}`}>{item.title}</p>
                <p className="text-white/30 text-[11px] mt-0.5">{item.category}{item.due_date && ` · Due ${fmtDate(item.due_date)}`}</p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0" style={{ background: ps.bg, color: ps.color }}>{item.priority}</span>
              <button onClick={() => remove(item.id)} aria-label="Delete task" className="text-white/25 hover:text-rose-400 transition-colors shrink-0">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          )
        })}
        {items.length === 0 && <EmptyState title="No checklist items yet." hint="Create your first task above." />}
      </div>
    </div>
  )
}

// ── Budget tab ────────────────────────────────────────────────────────────────
function BudgetTab({ eventType, eventId, onChanged }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState('')
  const [formErr, setFormErr] = useState('')
  const [form, setForm] = useState({ category: '', title: '', planned_amount: '', notes: '' })

  const load = useCallback(() => {
    setLoading(true); setLoadErr('')
    planningApi.listBudget(eventType, eventId).then(setItems)
      .catch(e => setLoadErr(getErrorMessage(e, 'Could not load the budget.')))
      .finally(() => setLoading(false))
  }, [eventType, eventId])
  useEffect(() => { load() }, [load])

  const addItem = async () => {
    if (!form.category.trim()) return
    setFormErr('')
    try {
      const created = await planningApi.createBudgetItem(eventType, eventId, {
        category: form.category, title: form.title,
        planned_amount: Number(form.planned_amount) || 0, spent_amount: 0, notes: form.notes,
      })
      setItems(prev => [...prev, created])
      setForm({ category: '', title: '', planned_amount: '', notes: '' })
      onChanged?.()
    } catch (e) { setFormErr(getErrorMessage(e, 'Could not add that budget item.')) }
  }

  const updateSpent = async (item, spent) => {
    try {
      const updated = await planningApi.updateBudgetItem(eventType, eventId, item.id, { spent_amount: Number(spent) || 0 })
      setItems(prev => prev.map(i => i.id === item.id ? updated : i))
      onChanged?.()
    } catch { /* input keeps its typed value; next successful edit will sync */ }
  }

  const remove = async (id) => {
    const prev = items
    setItems(items.filter(i => i.id !== id))
    try {
      await planningApi.deleteBudgetItem(eventType, eventId, id)
      onChanged?.()
    } catch { setItems(prev) }
  }

  const totalPlanned = items.reduce((s, i) => s + Number(i.planned_amount || 0), 0)
  const totalSpent = items.reduce((s, i) => s + Number(i.spent_amount || 0), 0)

  if (loading) return <Spinner />
  if (loadErr) return <LoadError message={loadErr} onRetry={load} />

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Budget', value: totalPlanned },
          { label: 'Spent', value: totalSpent },
          { label: 'Remaining', value: totalPlanned - totalSpent },
        ].map(s => (
          <div key={s.label} className="glass-card p-4 text-center">
            <p className="text-white font-bold text-[17px] leading-none">₹{s.value.toLocaleString('en-IN')}</p>
            <p className="text-white/35 text-[10px] mt-1.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="glass-card p-4 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <input className="glass-input" placeholder="Category" value={form.category}
            onChange={e => { setForm(f => ({ ...f, category: e.target.value })); setFormErr('') }} />
          <input className="glass-input" placeholder="Title (optional)" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <input className="glass-input" type="number" placeholder="Planned amount" value={form.planned_amount} onChange={e => setForm(f => ({ ...f, planned_amount: e.target.value }))} />
          <input className="glass-input" placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </div>
        <InlineFormError message={formErr} />
        <button onClick={addItem} disabled={!form.category.trim()}
          className="px-5 py-2 rounded-full text-[13px] font-semibold text-white transition-all duration-200 disabled:opacity-40"
          style={{ background: GRADIENT }}>
          + Add Budget Item
        </button>
      </div>

      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="glass-card p-3.5 flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[120px]">
              <p className="text-white text-[13.5px] font-medium">{item.category}{item.title && ` — ${item.title}`}</p>
              {item.notes && <p className="text-white/30 text-[11px]">{item.notes}</p>}
            </div>
            <p className="text-white/50 text-[12px]">Planned ₹{Number(item.planned_amount).toLocaleString('en-IN')}</p>
            <input type="number" className="glass-input py-1 w-24" value={item.spent_amount}
              aria-label={`Amount spent on ${item.category}`}
              onChange={e => updateSpent(item, e.target.value)} />
            <button onClick={() => remove(item.id)} aria-label={`Delete ${item.category} budget item`} className="text-white/25 hover:text-rose-400 transition-colors">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        ))}
        {items.length === 0 && <EmptyState title="No budget items yet." hint="Add your first budget item above." />}
      </div>
    </div>
  )
}

// ── Guest List tab ────────────────────────────────────────────────────────────
function GuestsTab({ eventType, eventId, onChanged }) {
  const [guests, setGuests] = useState([])
  const [summary, setSummary] = useState({ total: 0, accepted: 0, declined: 0, pending: 0 })
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState('')
  const [formErr, setFormErr] = useState('')
  const [form, setForm] = useState({ name: '', phone: '', email: '', side: '', plus_one: false })

  const load = useCallback(() => {
    setLoading(true); setLoadErr('')
    Promise.all([
      planningApi.listGuests(eventType, eventId),
      planningApi.guestsSummary(eventType, eventId),
    ]).then(([g, s]) => { setGuests(g); setSummary(s) })
      .catch(e => setLoadErr(getErrorMessage(e, 'Could not load the guest list.')))
      .finally(() => setLoading(false))
  }, [eventType, eventId])
  useEffect(() => { load() }, [load])

  const addGuest = async () => {
    if (!form.name.trim()) return
    setFormErr('')
    try {
      const created = await planningApi.createGuest(eventType, eventId, form)
      setGuests(prev => [...prev, created])
      setForm({ name: '', phone: '', email: '', side: '', plus_one: false })
      load(); onChanged?.()
    } catch (e) {
      setFormErr(getErrorMessage(e, 'Could not add that guest — check the email and phone number.'))
    }
  }

  const updateRsvp = async (guest, rsvp) => {
    try {
      const updated = await planningApi.updateGuest(eventType, eventId, guest.id, { rsvp })
      setGuests(prev => prev.map(g => g.id === guest.id ? updated : g))
      load(); onChanged?.()
    } catch { /* select reverts on next load() */ }
  }

  const remove = async (id) => {
    const prev = guests
    setGuests(guests.filter(g => g.id !== id))
    try {
      await planningApi.deleteGuest(eventType, eventId, id)
      load(); onChanged?.()
    } catch { setGuests(prev) }
  }

  if (loading) return <Spinner />
  if (loadErr) return <LoadError message={loadErr} onRetry={load} />

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2.5">
        {[
          { label: 'Total', value: summary.total },
          { label: 'Accepted', value: summary.accepted },
          { label: 'Pending', value: summary.pending },
          { label: 'Declined', value: summary.declined },
        ].map(s => (
          <div key={s.label} className="glass-card p-3 text-center">
            <p className="text-white font-bold text-[16px] leading-none">{s.value}</p>
            <p className="text-white/35 text-[10px] mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="glass-card p-4 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <input className="glass-input" placeholder="Name" value={form.name}
            onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setFormErr('') }} />
          <input className="glass-input" placeholder="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          <input className="glass-input" placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <input className="glass-input" placeholder="Side / Family" value={form.side} onChange={e => setForm(f => ({ ...f, side: e.target.value }))} />
          <label className="flex items-center gap-2 text-white/60 text-[12.5px] px-2">
            <input type="checkbox" checked={form.plus_one} onChange={e => setForm(f => ({ ...f, plus_one: e.target.checked }))} />
            Plus one
          </label>
        </div>
        <InlineFormError message={formErr} />
        <button onClick={addGuest} disabled={!form.name.trim()}
          className="px-5 py-2 rounded-full text-[13px] font-semibold text-white transition-all duration-200 disabled:opacity-40"
          style={{ background: GRADIENT }}>
          + Add Guest
        </button>
      </div>

      <div className="space-y-2">
        {guests.map(g => {
          const rs = RSVP_STYLE[g.rsvp] || RSVP_STYLE.PENDING
          return (
            <div key={g.id} className="glass-card p-3.5 flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-[140px]">
                <p className="text-white text-[13.5px] font-medium">{g.name}{g.plus_one && ' (+1)'}</p>
                <p className="text-white/30 text-[11px]">{[g.phone, g.email, g.side].filter(Boolean).join(' · ')}</p>
              </div>
              <select className="glass-input py-1 w-auto" value={g.rsvp} onChange={e => updateRsvp(g, e.target.value)}
                aria-label={`RSVP status for ${g.name}`}
                style={{ background: rs.bg, color: rs.color }}>
                {RSVP_STATUSES.map(r => <option key={r} value={r}>{r[0] + r.slice(1).toLowerCase()}</option>)}
              </select>
              <button onClick={() => remove(g.id)} aria-label={`Remove ${g.name}`} className="text-white/25 hover:text-rose-400 transition-colors">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          )
        })}
        {guests.length === 0 && <EmptyState title="No guests yet." hint="Add your first guest above." />}
      </div>
    </div>
  )
}

// ── My Vendors tab ────────────────────────────────────────────────────────────
function VendorsTab({ eventType, eventId, onChanged, prefill, onPrefillConsumed }) {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState('')
  const [formErr, setFormErr] = useState('')
  const [form, setForm] = useState({ vendor_name: '', category: '', price: '', advance_paid: '' })

  const load = useCallback(() => {
    setLoading(true); setLoadErr('')
    planningApi.listVendorBookings(eventType, eventId).then(setBookings)
      .catch(e => setLoadErr(getErrorMessage(e, 'Could not load your vendor bookings.')))
      .finally(() => setLoading(false))
  }, [eventType, eventId])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (prefill) {
      setForm(f => ({ ...f, vendor_name: prefill.vendor_name, category: prefill.category, vendor_id: prefill.vendor_id }))
      onPrefillConsumed?.()
    }
  }, [prefill])

  const addBooking = async () => {
    if (!form.vendor_name.trim()) return
    setFormErr('')
    try {
      const created = await planningApi.createVendorBooking(eventType, eventId, {
        vendor_id: form.vendor_id || null, vendor_name: form.vendor_name, category: form.category,
        price: Number(form.price) || 0, advance_paid: Number(form.advance_paid) || 0,
      })
      setBookings(prev => [...prev, created])
      setForm({ vendor_name: '', category: '', price: '', advance_paid: '' })
      onChanged?.()
    } catch (e) {
      setFormErr(getErrorMessage(e, 'Could not add that booking — advance paid cannot exceed price.'))
    }
  }

  const updateStatus = async (booking, booking_status) => {
    try {
      const updated = await planningApi.updateVendorBooking(eventType, eventId, booking.id, { booking_status })
      setBookings(prev => prev.map(b => b.id === booking.id ? updated : b))
      onChanged?.()
    } catch { /* select reverts on next load() */ }
  }

  const remove = async (id) => {
    const prev = bookings
    setBookings(bookings.filter(b => b.id !== id))
    try {
      await planningApi.deleteVendorBooking(eventType, eventId, id)
      onChanged?.()
    } catch { setBookings(prev) }
  }

  if (loading) return <Spinner />
  if (loadErr) return <LoadError message={loadErr} onRetry={load} />

  return (
    <div className="space-y-4">
      <div className="glass-card p-4 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <input className="glass-input" placeholder="Vendor name" value={form.vendor_name}
            onChange={e => { setForm(f => ({ ...f, vendor_name: e.target.value })); setFormErr('') }} />
          <input className="glass-input" placeholder="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
          <input className="glass-input" type="number" placeholder="Price" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
          <input className="glass-input" type="number" placeholder="Advance paid" value={form.advance_paid} onChange={e => setForm(f => ({ ...f, advance_paid: e.target.value }))} />
        </div>
        <InlineFormError message={formErr} />
        <button onClick={addBooking} disabled={!form.vendor_name.trim()}
          className="px-5 py-2 rounded-full text-[13px] font-semibold text-white transition-all duration-200 disabled:opacity-40"
          style={{ background: GRADIENT }}>
          + Add Vendor Booking
        </button>
      </div>

      <div className="space-y-2">
        {bookings.map(b => (
          <div key={b.id} className="glass-card p-3.5 flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[140px]">
              <p className="text-white text-[13.5px] font-medium">{b.vendor_name}</p>
              <p className="text-white/30 text-[11px]">{b.category || '—'} · ₹{Number(b.price).toLocaleString('en-IN')} · Remaining ₹{Number(b.remaining).toLocaleString('en-IN')}</p>
            </div>
            <select className="glass-input py-1 w-auto" value={b.booking_status} onChange={e => updateStatus(b, e.target.value)}
              aria-label={`Booking status for ${b.vendor_name}`}>
              {VENDOR_BOOKING_STATUSES.map(s => <option key={s} value={s}>{s[0] + s.slice(1).toLowerCase()}</option>)}
            </select>
            <button onClick={() => remove(b.id)} aria-label={`Remove ${b.vendor_name} booking`} className="text-white/25 hover:text-rose-400 transition-colors">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        ))}
        {bookings.length === 0 && <EmptyState title="No vendors booked yet." hint="Try the Find Vendors tab, or add one manually above." />}
      </div>
    </div>
  )
}

// ── Find Vendors tab ──────────────────────────────────────────────────────────
function FindVendorsTab({ onBook }) {
  const [results, setResults] = useState({ items: [], total: 0 })
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState('')
  const [filters, setFilters] = useState({ category: '', city: '', verified: false, featured: false })

  const load = useCallback(() => {
    setLoading(true); setLoadErr('')
    const params = {}
    if (filters.category.trim()) params.category = filters.category.trim()
    if (filters.city.trim()) params.city = filters.city.trim()
    if (filters.verified) params.verified = true
    if (filters.featured) params.featured = true
    planningApi.searchVendors(params).then(setResults)
      .catch(e => setLoadErr(getErrorMessage(e, 'Could not search vendors.')))
      .finally(() => setLoading(false))
  }, [filters])

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t) }, [load])

  return (
    <div className="space-y-4">
      <div className="glass-card p-4 flex flex-wrap gap-2 items-center">
        <input className="glass-input flex-1 min-w-[140px]" placeholder="Category (e.g. Catering)"
          value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))} />
        <input className="glass-input flex-1 min-w-[140px]" placeholder="City"
          value={filters.city} onChange={e => setFilters(f => ({ ...f, city: e.target.value }))} />
        <label className="flex items-center gap-1.5 text-white/60 text-[12.5px]">
          <input type="checkbox" checked={filters.verified} onChange={e => setFilters(f => ({ ...f, verified: e.target.checked }))} />
          Verified only
        </label>
        <label className="flex items-center gap-1.5 text-white/60 text-[12.5px]">
          <input type="checkbox" checked={filters.featured} onChange={e => setFilters(f => ({ ...f, featured: e.target.checked }))} />
          Featured
        </label>
      </div>

      {loading ? <Spinner /> : loadErr ? <LoadError message={loadErr} onRetry={load} /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {results.items.map(v => (
            <div key={v.id} className="glass-card p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl shrink-0 overflow-hidden" style={{ background: `${v.theme_color || ACCENT}22` }}>
                {v.thumbnail && <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-[13.5px] font-medium truncate">{v.title} {v.is_verified && '✓'}</p>
                <p className="text-white/30 text-[11px]">{v.category || '—'} · {v.city || '—'}</p>
              </div>
              <button onClick={() => onBook({ vendor_id: v.id, vendor_name: v.title, category: v.category })}
                className="px-3.5 py-1.5 rounded-full text-[12px] font-semibold text-white shrink-0"
                style={{ background: GRADIENT }}>
                Book
              </button>
            </div>
          ))}
          {results.items.length === 0 && (
            <div className="col-span-2">
              <EmptyState title="No vendors match those filters." hint="Try widening your search." />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Inner component (has access to PlanningEventContext) ─────────────────────
function PlanningSuiteInner() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { eventType, eventId, dashboard, hasSelection, selectEvent, clearEvent, refresh } = usePlanningEvent()
  const activeTab = params.get('tab') || 'overview'
  const [prefillVendor, setPrefillVendor] = useState(null)

  const handleSelectEvent = (type, id) => {
    selectEvent(type, id)
    setParams({ tab: 'overview' })
  }

  const handleSwitchEvent = () => {
    clearEvent()
    setParams({})
  }

  const setTab = (tab) => setParams(prev => {
    const next = new URLSearchParams(prev)
    next.set('tab', tab)
    return next
  })

  return (
    <div className="min-h-screen bg-[#060412] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="bg-orb orb-blue" style={{ opacity: 0.1 }} />
        <div className="bg-orb orb-purple" style={{ opacity: 0.08 }} />
        <div className="grid-lines" />
      </div>

      <header className="relative sticky top-0 z-20 border-b border-white/[0.06] bg-[#060412]/90 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center gap-4">
          <button onClick={() => (hasSelection ? handleSwitchEvent() : navigate('/home'))}
            aria-label={hasSelection ? 'Back to event selection' : 'Back to dashboard'}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-white/40 hover:text-white/80 hover:bg-white/[0.07] transition-all duration-200 shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <img src={logo} alt="" className="w-6 h-6 opacity-70" />
            <span className="text-white/40 text-[13px]">/</span>
            <span className="text-white font-semibold text-[15px]">Planning Suite</span>
          </div>
        </div>

        {hasSelection && (
          <div className="max-w-6xl mx-auto px-5 flex gap-1 overflow-x-auto sidebar-scroll pb-2">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setTab(tab.id)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12.5px] font-medium whitespace-nowrap transition-all duration-200"
                style={activeTab === tab.id
                  ? { background: `${ACCENT}22`, border: `1px solid ${ACCENT}55`, color: 'white' }
                  : { border: '1px solid transparent', color: 'rgba(255,255,255,0.45)' }}>
                <span>{tab.icon}</span>{tab.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {!hasSelection ? (
        <EventPicker onSelect={handleSelectEvent} />
      ) : (
        <main className="max-w-6xl mx-auto px-5 py-6 space-y-5">
          <PlanningEventCard />
          {dashboard && (
            <>
              {activeTab === 'overview' && <OverviewTab dashboard={dashboard} />}
              {activeTab === 'checklist' && <ChecklistTab eventType={eventType} eventId={eventId} onChanged={refresh} />}
              {activeTab === 'budget' && <BudgetTab eventType={eventType} eventId={eventId} onChanged={refresh} />}
              {activeTab === 'guests' && <GuestsTab eventType={eventType} eventId={eventId} onChanged={refresh} />}
              {activeTab === 'vendors' && (
                <VendorsTab eventType={eventType} eventId={eventId} onChanged={refresh}
                  prefill={prefillVendor} onPrefillConsumed={() => setPrefillVendor(null)} />
              )}
              {activeTab === 'findvendors' && (
                <FindVendorsTab onBook={(v) => { setPrefillVendor(v); setTab('vendors') }} />
              )}
            </>
          )}
        </main>
      )}
    </div>
  )
}

// ── Page (wraps with the shared event context) ────────────────────────────────
export default function PlanningSuite() {
  return (
    <PlanningEventProvider>
      <PlanningSuiteInner />
    </PlanningEventProvider>
  )
}
