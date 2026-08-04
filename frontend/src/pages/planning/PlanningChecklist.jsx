import { useState, useEffect, useCallback } from 'react'
import { planningApi, CHECKLIST_PRIORITIES } from '../../lib/planningApi'
import { getErrorMessage } from '../../lib/api'
import { usePlanningEvent } from '../../context/usePlanningEvent'
import { ACCENT, GRADIENT, fmtDate, Spinner, LoadError, EmptyState, InlineFormError, PlanningModulePage } from './shared'
import Select from '../../components/Select'

const PRIORITY_STYLE = {
  LOW:      { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' },
  MEDIUM:   { bg: 'rgba(56,189,248,0.14)',  color: '#7dd3fc' },
  HIGH:     { bg: 'rgba(245,158,11,0.14)',  color: '#fbbf24' },
  CRITICAL: { bg: 'rgba(239,68,68,0.14)',   color: '#fca5a5' },
}

function ChecklistContent({ eventType, eventId, onChanged }) {
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
          <Select
            className="w-full" value={form.priority} onChange={v => setForm(f => ({ ...f, priority: v }))}
            options={CHECKLIST_PRIORITIES.map(p => ({ value: p, label: p[0] + p.slice(1).toLowerCase() }))}
          />
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

export default function PlanningChecklist() {
  const { eventType, eventId, hasSelection, refresh } = usePlanningEvent()
  return (
    <PlanningModulePage title="Checklist">
      {hasSelection && <ChecklistContent eventType={eventType} eventId={eventId} onChanged={refresh} />}
    </PlanningModulePage>
  )
}
