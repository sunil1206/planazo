import { useState, useEffect, useCallback } from 'react'
import { planningApi } from '../../lib/planningApi'
import { getErrorMessage } from '../../lib/api'
import { usePlanningEvent } from '../../context/usePlanningEvent'
import { GRADIENT, Spinner, LoadError, EmptyState, InlineFormError, PlanningModulePage } from './shared'

function BudgetContent({ eventType, eventId, onChanged }) {
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

export default function PlanningBudget() {
  const { eventType, eventId, hasSelection, refresh } = usePlanningEvent()
  return (
    <PlanningModulePage title="Budget">
      {hasSelection && <BudgetContent eventType={eventType} eventId={eventId} onChanged={refresh} />}
    </PlanningModulePage>
  )
}
