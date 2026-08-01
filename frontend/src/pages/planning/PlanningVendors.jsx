import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { planningApi, VENDOR_BOOKING_STATUSES } from '../../lib/planningApi'
import { getErrorMessage } from '../../lib/api'
import { usePlanningEvent } from '../../context/usePlanningEvent'
import { GRADIENT, Spinner, LoadError, EmptyState, InlineFormError, PlanningModulePage } from './shared'

function VendorsContent({ eventType, eventId, onChanged, prefill }) {
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

  // Arrives here via navigate('/planning/vendors', { state: { vendor_name, category, vendor_id } })
  // from the "Book" button on the Find Vendors page.
  useEffect(() => {
    if (prefill) {
      setForm(f => ({ ...f, vendor_name: prefill.vendor_name, category: prefill.category, vendor_id: prefill.vendor_id }))
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
        {bookings.length === 0 && <EmptyState title="No vendors booked yet." hint="Try the Find Vendors page, or add one manually above." />}
      </div>
    </div>
  )
}

export default function PlanningVendors() {
  const { eventType, eventId, hasSelection, refresh } = usePlanningEvent()
  const location = useLocation()
  return (
    <PlanningModulePage title="My Vendors">
      {hasSelection && (
        <VendorsContent eventType={eventType} eventId={eventId} onChanged={refresh} prefill={location.state} />
      )}
    </PlanningModulePage>
  )
}
