import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import logo from '../assets/logo.png'
import { customEventsApi, EVENT_TYPES, STATUSES, VISIBILITIES } from '../lib/customEventsApi'

const THEME_COLORS = ['#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#ef4444', '#6366f1', '#14b8a6']

const STATUS_STYLE = {
  PLANNING:  { bg: 'rgba(168,85,247,0.15)', color: '#c4b5fd', border: 'rgba(168,85,247,0.3)' },
  UPCOMING:  { bg: 'rgba(56,189,248,0.15)', color: '#7dd3fc', border: 'rgba(56,189,248,0.3)' },
  ONGOING:   { bg: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: 'rgba(16,185,129,0.3)' },
  COMPLETED: { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', border: 'rgba(255,255,255,0.15)' },
  CANCELLED: { bg: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: 'rgba(239,68,68,0.3)' },
}

function fmtRange(start, end) {
  if (!start && !end) return ''
  const s = start ? new Date(start) : null
  const e = end ? new Date(end) : null
  const opts = { day: 'numeric', month: 'short' }
  if (s && e && s.toDateString() !== e.toDateString()) {
    return `${s.toLocaleDateString('en-IN', opts)} – ${e.toLocaleDateString('en-IN', opts)}`
  }
  return (s || e).toLocaleDateString('en-IN', { ...opts, year: 'numeric' })
}

const emptyForm = { title: '', event_type: 'Travel', customType: '', description: '', location: '', start_date: '', end_date: '', color_theme: THEME_COLORS[0], visibility: 'PRIVATE', status: 'PLANNING' }

export default function CustomEvents() {
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [formErr, setFormErr] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')

  const load = () => {
    setLoading(true)
    const params = {}
    if (typeFilter !== 'All') params.event_type = typeFilter
    if (statusFilter !== 'All') params.status = statusFilter
    if (search.trim()) params.search = search.trim()
    customEventsApi.list(params)
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [typeFilter, statusFilter])
  useEffect(() => {
    const t = setTimeout(load, 350)
    return () => clearTimeout(t)
  }, [search])

  const handleCreate = async () => {
    if (!form.title.trim()) { setFormErr('Event title is required'); return }
    const eventType = form.event_type === 'Other' && form.customType.trim() ? form.customType.trim() : form.event_type
    setFormErr('')
    try {
      const created = await customEventsApi.create({
        title: form.title,
        event_type: eventType,
        description: form.description,
        location: form.location,
        start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
        end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
        color_theme: form.color_theme,
        visibility: form.visibility,
        status: form.status,
      })
      setShowCreate(false)
      setForm(emptyForm)
      navigate(`/custom-events/${created.id}`)
    } catch (e) {
      setFormErr(e?.response?.data?.detail || 'Could not create event')
    }
  }

  const handleDelete = async (id) => {
    try { await customEventsApi.remove(id) } catch { /* ignore */ }
    setEvents(prev => prev.filter(e => e.id !== id))
    setConfirmDelete(null)
  }

  return (
    <div className="min-h-screen bg-[#060412] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="bg-orb orb-blue" style={{ opacity: 0.12 }} />
        <div className="bg-orb orb-purple" style={{ opacity: 0.09 }} />
        <div className="grid-lines" />
      </div>

      <header className="relative sticky top-0 z-20 border-b border-white/[0.06] bg-[#060412]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/home')}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-white/40 hover:text-white/80 hover:bg-white/[0.07] transition-all duration-200">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <img src={logo} alt="" className="w-6 h-6 opacity-70" />
              <span className="text-white/40 text-[13px]">/</span>
              <span className="text-white font-semibold text-[15px]">Custom Events</span>
            </div>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-semibold text-white transition-all duration-200 hover:-translate-y-px active:translate-y-0"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', boxShadow: '0 4px 16px rgba(14,165,233,0.35)' }}>
            <span className="text-[16px] leading-none font-light">+</span>
            New Event
          </button>
        </div>
      </header>

      <main className="relative max-w-6xl mx-auto px-5 py-8">

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5 mb-6">
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, location, or type…"
            className="glass-input flex-1 min-w-[200px]" style={{ maxWidth: '360px' }} />
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="glass-input" style={{ width: 'auto' }}>
            <option value="All">All Types</option>
            {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="glass-input" style={{ width: 'auto' }}>
            <option value="All">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s[0] + s.slice(1).toLowerCase()}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-28">
            <div className="w-7 h-7 border border-sky-500/40 border-t-sky-500 rounded-full animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5 text-[32px]"
              style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.18)' }}>
              🧳
            </div>
            <h2 className="text-white font-bold text-[22px] mb-2 tracking-tight">No custom events yet</h2>
            <p className="text-white/40 text-[14px] mb-8 max-w-xs leading-relaxed">
              Plan a trip, festival, meetup, or any everyday occasion — without the full wedding workflow.
            </p>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-full text-[14px] font-semibold text-white transition-all duration-200 hover:-translate-y-px"
              style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', boxShadow: '0 4px 24px rgba(14,165,233,0.38)' }}>
              <span className="text-[18px] leading-none font-light">+</span>
              Create First Event
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map(ev => {
              const st = STATUS_STYLE[ev.status] || STATUS_STYLE.PLANNING
              return (
                <div key={ev.id} className="glass-card overflow-hidden group hover:border-white/20 transition-all duration-300 hover:-translate-y-1">
                  <div className="relative h-28 flex flex-col items-center justify-center gap-1 overflow-hidden"
                    style={{ background: `linear-gradient(135deg, ${ev.color_theme}55, ${ev.color_theme}15)` }}>
                    {ev.cover_image && (
                      <img src={ev.cover_image} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    )}
                    <div className="absolute top-3 right-3 z-10">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider border"
                        style={{ background: st.bg, color: st.color, borderColor: st.border }}>
                        {ev.status}
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-3 z-10">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider"
                        style={{ background: 'rgba(0,0,0,0.4)', color: ev.color_theme, border: `1px solid ${ev.color_theme}55` }}>
                        {ev.event_type}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-white font-bold text-[15px] mb-1 truncate">{ev.title}</h3>
                    <p className="text-white/35 text-[12px] mb-3">
                      {fmtRange(ev.start_date, ev.end_date)}
                      {ev.location && <>&nbsp;·&nbsp;{ev.location}</>}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => navigate(`/custom-events/${ev.id}`)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-semibold text-white transition-all duration-200 hover:-translate-y-px"
                        style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)' }}>
                        View
                      </button>
                      <button onClick={() => setConfirmDelete(ev.id)}
                        className="ml-auto w-7 h-7 flex items-center justify-center rounded-full text-white/25 hover:text-rose-400 hover:bg-rose-500/[0.08] transition-all duration-200">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ animation: 'modal-bg-in 0.2s ease both' }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
          <div className="relative glass-card w-full max-w-[360px] p-6 text-center"
            style={{ borderRadius: '36px', animation: 'modal-card-in 0.28s cubic-bezier(0.34,1.38,0.64,1) both' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.22)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </div>
            <h3 className="text-white font-bold text-[16px] mb-1">Delete Event?</h3>
            <p className="text-white/40 text-[13px] mb-6 leading-relaxed">
              This will permanently delete the event and everything in it — checklist, budget, notes, gallery, files, and members.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="px-6 py-2.5 rounded-full text-[13px] font-semibold text-white/60 hover:text-white/90 bg-white/[0.055] hover:bg-white/[0.09] border border-white/[0.09] hover:border-white/[0.16] transition-all duration-200">
                Cancel
              </button>
              <button onClick={() => handleDelete(confirmDelete)}
                className="px-6 py-2.5 rounded-full text-[13px] font-semibold text-white transition-all duration-200 hover:-translate-y-px"
                style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', boxShadow: '0 4px 16px rgba(220,38,38,0.35)' }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ animation: 'modal-bg-in 0.22s ease both' }}>
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative glass-card w-full max-w-[520px] p-6 max-h-[88vh] overflow-y-auto sidebar-scroll"
            style={{ borderRadius: '36px', animation: 'modal-card-in 0.3s cubic-bezier(0.34,1.38,0.64,1) both' }}>

            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg"
                  style={{ background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.22)' }}>
                  🧳
                </div>
                <h2 className="text-white font-bold text-[17px]">New Event</h2>
              </div>
              <button onClick={() => setShowCreate(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-white/35 hover:text-white hover:bg-white/[0.08] transition-all duration-150">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="field-group">
                <label className="field-label">Title <span className="text-rose-400 normal-case font-normal">*</span></label>
                <input className="glass-input" placeholder="e.g. Goa Vacation" value={form.title}
                  onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setFormErr('') }} />
                {formErr && <p className="text-rose-400 text-[11px] mt-1">{formErr}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="field-group">
                  <label className="field-label">Event Type</label>
                  <select className="glass-input" value={form.event_type} onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))}>
                    {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                {form.event_type === 'Other' && (
                  <div className="field-group">
                    <label className="field-label">Custom Type</label>
                    <input className="glass-input" placeholder="Type your own" value={form.customType}
                      onChange={e => setForm(f => ({ ...f, customType: e.target.value }))} />
                  </div>
                )}
              </div>

              <div className="field-group">
                <label className="field-label">Description</label>
                <textarea className="glass-input resize-none" rows={2} value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What's this event about?" />
              </div>

              <div className="field-group">
                <label className="field-label">Location</label>
                <input className="glass-input" placeholder="e.g. Kochi → Goa" value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="field-group">
                  <label className="field-label">Start Date</label>
                  <input type="date" className="glass-input" value={form.start_date}
                    onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div className="field-group">
                  <label className="field-label">End Date</label>
                  <input type="date" className="glass-input" value={form.end_date}
                    onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
                </div>
              </div>

              <div className="field-group">
                <label className="field-label">Color Theme</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {THEME_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color_theme: c }))}
                      className="w-8 h-8 rounded-full transition-all duration-150"
                      style={{ background: c, border: form.color_theme === c ? '2px solid white' : '2px solid transparent', boxShadow: form.color_theme === c ? `0 0 0 2px ${c}` : 'none' }} />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="field-group">
                  <label className="field-label">Visibility</label>
                  <select className="glass-input" value={form.visibility} onChange={e => setForm(f => ({ ...f, visibility: e.target.value }))}>
                    {VISIBILITIES.map(v => <option key={v} value={v}>{v[0] + v.slice(1).toLowerCase()}</option>)}
                  </select>
                </div>
                <div className="field-group">
                  <label className="field-label">Status</label>
                  <select className="glass-input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {STATUSES.map(s => <option key={s} value={s}>{s[0] + s.slice(1).toLowerCase()}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2.5 mt-6">
              <button onClick={() => setShowCreate(false)}
                className="px-7 py-2.5 rounded-full text-[13.5px] font-semibold text-white/60 hover:text-white/90 bg-white/[0.055] hover:bg-white/[0.09] border border-white/[0.09] hover:border-white/[0.16] transition-all duration-200">
                Cancel
              </button>
              <button onClick={handleCreate} disabled={!form.title.trim()}
                className="px-7 py-2.5 rounded-full text-[13.5px] font-semibold text-white transition-all duration-200 hover:-translate-y-px active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', boxShadow: '0 4px 16px rgba(14,165,233,0.35)' }}>
                Create →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
