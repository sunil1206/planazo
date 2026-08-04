import { useState, useEffect, useCallback } from 'react'
import { planningApi, RSVP_STATUSES } from '../../lib/planningApi'
import { getErrorMessage } from '../../lib/api'
import { usePlanningEvent } from '../../context/usePlanningEvent'
import { GRADIENT, Spinner, LoadError, EmptyState, InlineFormError, PlanningModulePage } from './shared'
import Select from '../../components/Select'

const RSVP_STYLE = {
  PENDING:  { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' },
  ACCEPTED: { bg: 'rgba(16,185,129,0.14)',  color: '#6ee7b7' },
  DECLINED: { bg: 'rgba(239,68,68,0.14)',   color: '#fca5a5' },
}

function GuestsContent({ eventType, eventId, onChanged }) {
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
              <Select
                compact value={g.rsvp} onChange={v => updateRsvp(g, v)}
                ariaLabel={`RSVP status for ${g.name}`}
                style={{ background: rs.bg, color: rs.color }}
                options={RSVP_STATUSES.map(r => ({ value: r, label: r[0] + r.slice(1).toLowerCase() }))}
              />
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

export default function PlanningGuests() {
  const { eventType, eventId, hasSelection, refresh } = usePlanningEvent()
  return (
    <PlanningModulePage title="Guest List">
      {hasSelection && <GuestsContent eventType={eventType} eventId={eventId} onChanged={refresh} />}
    </PlanningModulePage>
  )
}
