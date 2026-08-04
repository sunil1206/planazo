import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { customEventsApi, EVENT_TYPES, STATUSES, VISIBILITIES } from '../lib/customEventsApi'
import { uploadImage } from '../lib/eventsApi'
import Select from '../components/Select'

const ACCENT = '#0ea5e9'

const TABS = [
  { id: 'overview',  label: 'Overview',  icon: '📋' },
  { id: 'checklist', label: 'Checklist', icon: '✅' },
  { id: 'budget',    label: 'Budget',    icon: '💰' },
  { id: 'notes',     label: 'Notes',     icon: '📝' },
  { id: 'gallery',   label: 'Gallery',   icon: '🖼️' },
  { id: 'files',     label: 'Files',     icon: '📁' },
  { id: 'members',   label: 'Members',   icon: '👥' },
]

const STATUS_STYLE = {
  PLANNING:  { bg: 'rgba(168,85,247,0.15)', color: '#c4b5fd', border: 'rgba(168,85,247,0.3)' },
  UPCOMING:  { bg: 'rgba(56,189,248,0.15)', color: '#7dd3fc', border: 'rgba(56,189,248,0.3)' },
  ONGOING:   { bg: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: 'rgba(16,185,129,0.3)' },
  COMPLETED: { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', border: 'rgba(255,255,255,0.15)' },
  CANCELLED: { bg: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: 'rgba(239,68,68,0.3)' },
}

const PRIORITY_STYLE = {
  LOW:    { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' },
  MEDIUM: { bg: 'rgba(56,189,248,0.14)', color: '#7dd3fc' },
  HIGH:   { bg: 'rgba(239,68,68,0.14)', color: '#fca5a5' },
}

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Overview tab ────────────────────────────────────────────────────────────────
function OverviewTab({ event, summary, onUpdate }) {
  return (
    <div className="space-y-5">
      <div className="glass-card p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-white/35 text-[11px] font-semibold tracking-widest uppercase mb-1">Type</p>
            <p className="text-white text-[14px] font-medium">{event.event_type}</p>
          </div>
          <div>
            <p className="text-white/35 text-[11px] font-semibold tracking-widest uppercase mb-1">Status</p>
            <Select
              compact className="w-full" value={event.status} onChange={v => onUpdate({ status: v })}
              options={STATUSES.map(s => ({ value: s, label: s[0] + s.slice(1).toLowerCase() }))}
            />
          </div>
          <div>
            <p className="text-white/35 text-[11px] font-semibold tracking-widest uppercase mb-1">Location</p>
            <p className="text-white text-[14px] font-medium">{event.location || '—'}</p>
          </div>
          <div>
            <p className="text-white/35 text-[11px] font-semibold tracking-widest uppercase mb-1">Days Remaining</p>
            <p className="text-white text-[14px] font-medium">
              {summary.days_remaining === null || summary.days_remaining === undefined ? '—' : `${summary.days_remaining} days`}
            </p>
          </div>
        </div>
        {event.description && (
          <div>
            <p className="text-white/35 text-[11px] font-semibold tracking-widest uppercase mb-1">Description</p>
            <p className="text-white/70 text-[13px] leading-relaxed">{event.description}</p>
          </div>
        )}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-white/35 text-[11px] font-semibold tracking-widest uppercase">Progress</p>
            <p className="text-white text-[12px] font-semibold">{summary.progress}%</p>
          </div>
          <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${summary.progress}%`, background: `linear-gradient(90deg, ${ACCENT}, #6366f1)` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Checklist', value: `${summary.checklist.completed}/${summary.checklist.total}`, icon: '✅' },
          { label: 'Budget Left', value: `₹${summary.budget.remaining.toLocaleString('en-IN')}`, icon: '💰' },
          { label: 'Gallery', value: summary.gallery_count, icon: '🖼️' },
          { label: 'Members', value: summary.members, icon: '👥' },
        ].map(s => (
          <div key={s.label} className="glass-card p-4 text-center">
            <p className="text-xl mb-1">{s.icon}</p>
            <p className="text-white font-bold text-[16px] leading-none">{s.value}</p>
            <p className="text-white/35 text-[10px] mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Checklist tab ───────────────────────────────────────────────────────────────
function ChecklistTab({ eventId, onChanged }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [task, setTask] = useState('')
  const [priority, setPriority] = useState('MEDIUM')
  const [dueDate, setDueDate] = useState('')

  const load = () => customEventsApi.listChecklist(eventId).then(setItems).catch(() => setItems([])).finally(() => setLoading(false))
  useEffect(() => { load() }, [eventId])

  const addItem = async () => {
    if (!task.trim()) return
    const created = await customEventsApi.createChecklistItem(eventId, { task, priority, due_date: dueDate ? new Date(dueDate).toISOString() : null })
    setItems(prev => [...prev, created])
    setTask(''); setDueDate('')
    onChanged?.()
  }

  const toggle = async (id) => {
    const updated = await customEventsApi.toggleChecklistItem(eventId, id)
    setItems(prev => prev.map(i => i.id === id ? updated : i))
    onChanged?.()
  }

  const remove = async (id) => {
    await customEventsApi.deleteChecklistItem(eventId, id).catch(() => {})
    setItems(prev => prev.filter(i => i.id !== id))
    onChanged?.()
  }

  const completed = items.filter(i => i.completed).length
  const pct = items.length ? Math.round((completed / items.length) * 100) : 0

  if (loading) return <div className="flex justify-center py-10"><div className="w-6 h-6 border border-sky-500/40 border-t-sky-500 rounded-full animate-spin" /></div>

  return (
    <div className="space-y-4">
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-1.5">
          <p className="field-label">Progress</p>
          <p className="text-white text-[12px] font-semibold">{completed}/{items.length} · {pct}%</p>
        </div>
        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${ACCENT}, #6366f1)` }} />
        </div>
      </div>

      <div className="glass-card p-4 space-y-3">
        <div className="grid grid-cols-[1fr_auto_auto] gap-2">
          <input className="glass-input" placeholder="Add a task…" value={task}
            onChange={e => setTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && addItem()} />
          <Select
            className="w-full" value={priority} onChange={setPriority}
            options={[{ value: 'LOW', label: 'Low' }, { value: 'MEDIUM', label: 'Medium' }, { value: 'HIGH', label: 'High' }]}
          />
          <input type="date" className="glass-input" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div>
        <button onClick={addItem} disabled={!task.trim()}
          className="px-5 py-2 rounded-full text-[13px] font-semibold text-white transition-all duration-200 disabled:opacity-40"
          style={{ background: `linear-gradient(135deg, ${ACCENT}, #6366f1)` }}>
          + Add Task
        </button>
      </div>

      <div className="space-y-2">
        {items.map(item => {
          const ps = PRIORITY_STYLE[item.priority] || PRIORITY_STYLE.MEDIUM
          return (
            <div key={item.id} className="glass-card p-3.5 flex items-center gap-3">
              <button onClick={() => toggle(item.id)}
                className="w-5 h-5 rounded-md shrink-0 flex items-center justify-center border transition-all duration-150"
                style={{ background: item.completed ? ACCENT : 'transparent', borderColor: item.completed ? ACCENT : 'rgba(255,255,255,0.25)' }}>
                {item.completed && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-[13.5px] font-medium truncate ${item.completed ? 'text-white/35 line-through' : 'text-white'}`}>{item.task}</p>
                {item.due_date && <p className="text-white/30 text-[11px] mt-0.5">Due {fmtDate(item.due_date)}</p>}
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0" style={{ background: ps.bg, color: ps.color }}>{item.priority}</span>
              <button onClick={() => remove(item.id)} className="text-white/25 hover:text-rose-400 transition-colors shrink-0">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          )
        })}
        {items.length === 0 && <p className="text-center text-white/25 text-[13px] italic py-6">No tasks yet — add your first one above.</p>}
      </div>
    </div>
  )
}

// ── Budget tab ───────────────────────────────────────────────────────────────────
function BudgetTab({ eventId, onChanged }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ category: '', estimated: '', spent: '', notes: '' })

  const load = () => customEventsApi.listBudget(eventId).then(setItems).catch(() => setItems([])).finally(() => setLoading(false))
  useEffect(() => { load() }, [eventId])

  const addItem = async () => {
    if (!form.category.trim()) return
    const created = await customEventsApi.createBudgetItem(eventId, {
      category: form.category, estimated: Number(form.estimated) || 0, spent: Number(form.spent) || 0, notes: form.notes,
    })
    setItems(prev => [...prev, created])
    setForm({ category: '', estimated: '', spent: '', notes: '' })
    onChanged?.()
  }

  const updateSpent = async (item, spent) => {
    const updated = await customEventsApi.updateBudgetItem(eventId, item.id, { spent: Number(spent) || 0 })
    setItems(prev => prev.map(i => i.id === item.id ? updated : i))
    onChanged?.()
  }

  const remove = async (id) => {
    await customEventsApi.deleteBudgetItem(eventId, id).catch(() => {})
    setItems(prev => prev.filter(i => i.id !== id))
    onChanged?.()
  }

  const totalEst = items.reduce((s, i) => s + Number(i.estimated || 0), 0)
  const totalSpent = items.reduce((s, i) => s + Number(i.spent || 0), 0)

  if (loading) return <div className="flex justify-center py-10"><div className="w-6 h-6 border border-sky-500/40 border-t-sky-500 rounded-full animate-spin" /></div>

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Budget', value: totalEst },
          { label: 'Spent', value: totalSpent },
          { label: 'Remaining', value: totalEst - totalSpent },
        ].map(s => (
          <div key={s.label} className="glass-card p-4 text-center">
            <p className="text-white font-bold text-[17px] leading-none">₹{s.value.toLocaleString('en-IN')}</p>
            <p className="text-white/35 text-[10px] mt-1.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="glass-card p-4 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <input className="glass-input" placeholder="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
          <input className="glass-input" type="number" placeholder="Estimated" value={form.estimated} onChange={e => setForm(f => ({ ...f, estimated: e.target.value }))} />
          <input className="glass-input" type="number" placeholder="Spent" value={form.spent} onChange={e => setForm(f => ({ ...f, spent: e.target.value }))} />
          <input className="glass-input" placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </div>
        <button onClick={addItem} disabled={!form.category.trim()}
          className="px-5 py-2 rounded-full text-[13px] font-semibold text-white transition-all duration-200 disabled:opacity-40"
          style={{ background: `linear-gradient(135deg, ${ACCENT}, #6366f1)` }}>
          + Add Budget Item
        </button>
      </div>

      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="glass-card p-3.5 flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[120px]">
              <p className="text-white text-[13.5px] font-medium">{item.category}</p>
              {item.notes && <p className="text-white/30 text-[11px]">{item.notes}</p>}
            </div>
            <p className="text-white/50 text-[12px]">Est. ₹{Number(item.estimated).toLocaleString('en-IN')}</p>
            <input type="number" className="glass-input py-1 w-24" value={item.spent} onChange={e => updateSpent(item, e.target.value)} />
            <button onClick={() => remove(item.id)} className="text-white/25 hover:text-rose-400 transition-colors">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="text-center text-white/25 text-[13px] italic py-6">No budget items yet.</p>}
      </div>
    </div>
  )
}

// ── Notes tab ────────────────────────────────────────────────────────────────────
function NoteCard({ note, onSave, onDelete }) {
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)
  const timer = useRef(null)

  const scheduleSave = (t, c) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => onSave(note.id, { title: t, content: c }), 700)
  }

  return (
    <div className="glass-card p-4 space-y-2">
      <div className="flex items-center gap-2">
        <input className="glass-input flex-1 font-semibold" value={title}
          onChange={e => { setTitle(e.target.value); scheduleSave(e.target.value, content) }} />
        <button onClick={() => onDelete(note.id)} className="text-white/25 hover:text-rose-400 transition-colors shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <textarea className="glass-input resize-none font-mono text-[12.5px]" rows={5} value={content}
        placeholder="Write in Markdown…"
        onChange={e => { setContent(e.target.value); scheduleSave(title, e.target.value) }} />
    </div>
  )
}

function NotesTab({ eventId }) {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => customEventsApi.listNotes(eventId).then(setNotes).catch(() => setNotes([])).finally(() => setLoading(false))
  useEffect(() => { load() }, [eventId])

  const addNote = async () => {
    const created = await customEventsApi.createNote(eventId, { title: 'Untitled Note', content: '' })
    setNotes(prev => [created, ...prev])
  }
  const saveNote = async (id, patch) => {
    await customEventsApi.updateNote(eventId, id, patch).catch(() => {})
  }
  const removeNote = async (id) => {
    await customEventsApi.deleteNote(eventId, id).catch(() => {})
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  if (loading) return <div className="flex justify-center py-10"><div className="w-6 h-6 border border-sky-500/40 border-t-sky-500 rounded-full animate-spin" /></div>

  return (
    <div className="space-y-4">
      <button onClick={addNote}
        className="w-full py-3 rounded-xl text-[13px] font-semibold transition-colors duration-200"
        style={{ background: 'rgba(14,165,233,0.07)', border: '1.5px dashed rgba(14,165,233,0.30)', color: ACCENT }}>
        + Add Note
      </button>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {notes.map(n => <NoteCard key={n.id} note={n} onSave={saveNote} onDelete={removeNote} />)}
      </div>
      {notes.length === 0 && <p className="text-center text-white/25 text-[13px] italic py-6">No notes yet. Notes autosave as you type.</p>}
    </div>
  )
}

// ── Gallery tab ──────────────────────────────────────────────────────────────────
function GalleryTab({ eventId }) {
  const [photos, setPhotos] = useState([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  const load = () => customEventsApi.listGallery(eventId).then(setPhotos).catch(() => setPhotos([]))
  useEffect(() => { load() }, [eventId])

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return
    setUploading(true)
    for (const file of files) {
      try {
        const cdnUrl = await uploadImage(file, 'custom-events-gallery')
        const media_type = file.type.startsWith('video/') ? 'video' : 'image'
        const created = await customEventsApi.addGalleryItem(eventId, { file_url: cdnUrl, media_type })
        setPhotos(prev => [...prev, created])
      } catch { /* skip failed upload */ }
    }
    setUploading(false)
  }

  const remove = async (id) => {
    setPhotos(prev => prev.filter(p => p.id !== id))
    await customEventsApi.deleteGalleryItem(eventId, id).catch(() => {})
  }

  return (
    <div className="space-y-4">
      <button onClick={() => fileRef.current?.click()} disabled={uploading}
        className="w-full py-3 rounded-xl text-[13px] font-semibold transition-colors duration-200 disabled:opacity-50"
        style={{ background: 'rgba(14,165,233,0.07)', border: '1.5px dashed rgba(14,165,233,0.30)', color: ACCENT }}>
        {uploading ? 'Uploading…' : '+ Upload Photos / Videos'}
      </button>
      <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleUpload} />
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {photos.map(p => (
            <div key={p.id} className="relative group rounded-xl overflow-hidden" style={{ aspectRatio: '1' }}>
              {p.media_type === 'video'
                ? <video src={p.file_url} className="w-full h-full object-cover" muted />
                : <img src={p.file_url} alt={p.caption || ''} className="w-full h-full object-cover" />}
              <button onClick={() => remove(p.id)}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'rgba(239,68,68,0.9)' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-white/25 text-[13px] italic py-6">No photos or videos yet.</p>
      )}
    </div>
  )
}

// ── Files tab ────────────────────────────────────────────────────────────────────
const FILE_TYPES = ['ticket', 'receipt', 'passport', 'booking', 'other']

function FilesTab({ eventId }) {
  const [files, setFiles] = useState([])
  const [fileType, setFileType] = useState('other')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  const load = () => customEventsApi.listFiles(eventId).then(setFiles).catch(() => setFiles([]))
  useEffect(() => { load() }, [eventId])

  const handleUpload = async (e) => {
    const picked = Array.from(e.target.files || [])
    e.target.value = ''
    if (!picked.length) return
    setUploading(true)
    for (const file of picked) {
      try {
        const cdnUrl = await uploadImage(file, 'custom-events-files')
        const created = await customEventsApi.addFile(eventId, {
          file_url: cdnUrl, file_name: file.name, file_type: fileType, size_kb: Math.round(file.size / 1024),
        })
        setFiles(prev => [...prev, created])
      } catch { /* skip failed upload */ }
    }
    setUploading(false)
  }

  const remove = async (id) => {
    setFiles(prev => prev.filter(f => f.id !== id))
    await customEventsApi.deleteFile(eventId, id).catch(() => {})
  }

  return (
    <div className="space-y-4">
      <div className="glass-card p-4 space-y-3">
        <div className="field-group">
          <label className="field-label">File Type</label>
          <Select
            className="w-full" value={fileType} onChange={setFileType}
            options={FILE_TYPES.map(t => ({ value: t, label: t[0].toUpperCase() + t.slice(1) }))}
          />
        </div>
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="w-full py-3 rounded-xl text-[13px] font-semibold transition-colors duration-200 disabled:opacity-50"
          style={{ background: 'rgba(14,165,233,0.07)', border: '1.5px dashed rgba(14,165,233,0.30)', color: ACCENT }}>
          {uploading ? 'Uploading…' : '+ Upload File (PDF, ticket, receipt…)'}
        </button>
        <input ref={fileRef} type="file" accept="application/pdf,image/*" multiple className="hidden" onChange={handleUpload} />
      </div>
      <div className="space-y-2">
        {files.map(f => (
          <div key={f.id} className="glass-card p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-lg" style={{ background: 'rgba(14,165,233,0.1)' }}>📄</div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-[13.5px] font-medium truncate">{f.file_name}</p>
              <p className="text-white/30 text-[11px]">{f.file_type} {f.size_kb ? `· ${f.size_kb} KB` : ''}</p>
            </div>
            <a href={f.file_url} target="_blank" rel="noreferrer"
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white/70 hover:text-white bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] transition-all duration-200 shrink-0">
              Download
            </a>
            <button onClick={() => remove(f.id)} className="text-white/25 hover:text-rose-400 transition-colors shrink-0">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        ))}
        {files.length === 0 && <p className="text-center text-white/25 text-[13px] italic py-6">No files uploaded yet.</p>}
      </div>
    </div>
  )
}

// ── Members tab ──────────────────────────────────────────────────────────────────
const ROLE_STYLE = {
  OWNER:     { bg: 'rgba(245,158,11,0.14)', color: '#fbbf24' },
  ORGANIZER: { bg: 'rgba(56,189,248,0.14)', color: '#7dd3fc' },
  VIEWER:    { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)' },
}

function MembersTab({ eventId }) {
  const [members, setMembers] = useState([])
  const [form, setForm] = useState({ name: '', email: '', role: 'VIEWER' })
  const [invited, setInvited] = useState(null)

  const load = () => customEventsApi.listMembers(eventId).then(setMembers).catch(() => setMembers([]))
  useEffect(() => { load() }, [eventId])

  const addMember = async () => {
    if (!form.name.trim() || !form.email.trim()) return
    const created = await customEventsApi.addMember(eventId, form)
    setMembers(prev => [...prev, created])
    setForm({ name: '', email: '', role: 'VIEWER' })
  }
  const removeMember = async (id) => {
    await customEventsApi.removeMember(eventId, id).catch(() => {})
    setMembers(prev => prev.filter(m => m.id !== id))
  }
  const invite = async (id) => {
    await customEventsApi.inviteMember(eventId, id).catch(() => {})
    setInvited(id)
    setTimeout(() => setInvited(null), 2000)
  }

  return (
    <div className="space-y-4">
      <div className="glass-card p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input className="glass-input" placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <input className="glass-input" placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <Select
            className="w-full" value={form.role} onChange={v => setForm(f => ({ ...f, role: v }))}
            options={[{ value: 'ORGANIZER', label: 'Organizer' }, { value: 'VIEWER', label: 'Viewer' }]}
          />
        </div>
        <button onClick={addMember} disabled={!form.name.trim() || !form.email.trim()}
          className="px-5 py-2 rounded-full text-[13px] font-semibold text-white transition-all duration-200 disabled:opacity-40"
          style={{ background: `linear-gradient(135deg, ${ACCENT}, #6366f1)` }}>
          + Add Member
        </button>
      </div>
      <div className="space-y-2">
        {members.map(m => {
          const rs = ROLE_STYLE[m.role] || ROLE_STYLE.VIEWER
          return (
            <div key={m.id} className="glass-card p-3.5 flex items-center gap-3 flex-wrap">
              <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-[12px] font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${ACCENT}, #6366f1)` }}>
                {m.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-[120px]">
                <p className="text-white text-[13.5px] font-medium">{m.name}</p>
                <p className="text-white/30 text-[11px]">{m.email}</p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: rs.bg, color: rs.color }}>{m.role}</span>
              <span className="text-white/30 text-[11px]">{m.status}</span>
              {m.role !== 'OWNER' && (
                <button onClick={() => invite(m.id)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200"
                  style={invited === m.id
                    ? { background: 'rgba(16,185,129,0.12)', color: '#34d399' }
                    : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}>
                  {invited === m.id ? 'Invited ✓' : 'Invite'}
                </button>
              )}
              <button onClick={() => removeMember(m.id)} className="text-white/25 hover:text-rose-400 transition-colors">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          )
        })}
        {members.length === 0 && <p className="text-center text-white/25 text-[13px] italic py-6">No collaborators yet — this event is just for you.</p>}
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function CustomEventDashboard() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [dash, setDash] = useState(null)
  const [activeTab, setTab] = useState('overview')

  const loadDashboard = useCallback(() => {
    customEventsApi.dashboard(id).then(setDash).catch(() => navigate('/custom-events'))
  }, [id, navigate])

  useEffect(() => { loadDashboard() }, [loadDashboard])

  const handleUpdateEvent = async (patch) => {
    await customEventsApi.update(id, patch)
    loadDashboard()
  }

  if (!dash) {
    return (
      <div className="min-h-screen bg-[#060412] flex items-center justify-center">
        <div className="w-7 h-7 border border-sky-500/40 border-t-sky-500 rounded-full animate-spin" />
      </div>
    )
  }

  const { event, summary } = dash
  const st = STATUS_STYLE[event.status] || STATUS_STYLE.PLANNING

  return (
    <div className="min-h-screen bg-[#060412] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="bg-orb orb-blue" style={{ opacity: 0.12 }} />
        <div className="bg-orb orb-purple" style={{ opacity: 0.09 }} />
        <div className="grid-lines" />
      </div>

      <header className="relative sticky top-0 z-20 border-b border-white/[0.06] bg-[#060412]/90 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate('/custom-events')}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-white/40 hover:text-white/80 hover:bg-white/[0.07] transition-all duration-200 shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
            </button>
            <div className="min-w-0">
              <p className="text-white font-semibold text-[14px] leading-tight truncate">{event.title}</p>
              <p className="text-white/35 text-[11px]">{event.event_type}</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider border shrink-0"
            style={{ background: st.bg, color: st.color, borderColor: st.border }}>
            {event.status}
          </span>
        </div>

        {/* Tab bar */}
        <div className="max-w-5xl mx-auto px-5 flex gap-1 overflow-x-auto sidebar-scroll pb-2">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setTab(tab.id)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12.5px] font-medium whitespace-nowrap transition-all duration-200"
              style={activeTab === tab.id
                ? { background: 'rgba(14,165,233,0.16)', border: '1px solid rgba(14,165,233,0.32)', color: 'white' }
                : { border: '1px solid transparent', color: 'rgba(255,255,255,0.45)' }}>
              <span>{tab.icon}</span>{tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-6">
        {activeTab === 'overview'  && <OverviewTab event={event} summary={summary} onUpdate={handleUpdateEvent} />}
        {activeTab === 'checklist' && <ChecklistTab eventId={id} onChanged={loadDashboard} />}
        {activeTab === 'budget'    && <BudgetTab eventId={id} onChanged={loadDashboard} />}
        {activeTab === 'notes'     && <NotesTab eventId={id} />}
        {activeTab === 'gallery'   && <GalleryTab eventId={id} />}
        {activeTab === 'files'     && <FilesTab eventId={id} />}
        {activeTab === 'members'   && <MembersTab eventId={id} />}
      </main>
    </div>
  )
}
