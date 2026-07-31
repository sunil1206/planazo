import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import logo from '../assets/logo.png'
import { weddingApi, uploadIfLocal, uploadImage, searchVendors } from '../lib/eventsApi'
import api from '../lib/api'
import SeoAnalysisPanel from '../components/SeoAnalysisPanel'

// ── Image compression (client-side preview only; real upload happens on save) ──
function compressImage(file, maxPx = 800, quality = 0.68) {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = ev => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width  = Math.round(img.width  * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  })
}

// ── Theme palettes ─────────────────────────────────────────────────────────────
const THEME_PALETTE = {
  royal_mughal:       { bg: 'linear-gradient(135deg,#5c1b0a,#92400e)', accent: '#d97706', emoji: '👑' },
  kerala_traditional: { bg: 'linear-gradient(135deg,#4a0d0d,#92400e)', accent: '#fbbf24', emoji: '🌿' },
  modern_minimal:     { bg: 'linear-gradient(135deg,#1f2937,#4b5563)', accent: '#e5e7eb', emoji: '✨' },
  floral_pastel:      { bg: 'linear-gradient(135deg,#4a0525,#9d174d)', accent: '#fbcfe8', emoji: '🌸' },
  cinematic_dark:     { bg: 'linear-gradient(135deg,#0a0a0a,#16213e)', accent: '#d4af6a', emoji: '🎬' },
}

const TABS = [
  { id: 'general', label: 'General',    icon: '🎨' },
  { id: 'couple',  label: 'The Couple', icon: '💑' },
  { id: 'events',  label: 'Events',     icon: '🗓️' },
  { id: 'story',   label: 'Our Story',  icon: '📖' },
  { id: 'date',    label: 'Date',       icon: '⏳' },
  { id: 'gallery', label: 'Gallery',    icon: '🖼️' },
  { id: 'vendors', label: 'Vendors',    icon: '🤝' },
  { id: 'seo',     label: 'SEO',        icon: '🔍' },
  { id: 'publish', label: 'Publish',    icon: '🚀' },
]

// ── Custom Date Picker ─────────────────────────────────────────────────────────
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

function DatePicker({ value, onChange, placeholder = 'Select date' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const sel = value ? new Date(value + 'T12:00:00') : null
  const [vm, setVm] = useState(() => ({ m: sel?.getMonth() ?? new Date().getMonth(), y: sel?.getFullYear() ?? new Date().getFullYear() }))

  useEffect(() => {
    if (!open) return
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const prevM = () => setVm(v => v.m === 0  ? { m: 11, y: v.y - 1 } : { ...v, m: v.m - 1 })
  const nextM = () => setVm(v => v.m === 11 ? { m: 0,  y: v.y + 1 } : { ...v, m: v.m + 1 })
  const days  = new Date(vm.y, vm.m + 1, 0).getDate()
  const first = new Date(vm.y, vm.m, 1).getDay()

  const pick = (d) => {
    const mm = String(vm.m + 1).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    onChange(`${vm.y}-${mm}-${dd}`)
    setOpen(false)
  }

  const display = sel ? sel.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="glass-input w-full text-left flex items-center justify-between gap-2">
        <span className={display ? 'text-white/90' : 'text-white/25'}>{display || placeholder}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </button>
      {open && (
        <div className="absolute z-[60] top-full mt-2 left-0 w-[254px] rounded-2xl p-3"
          style={{ background: 'rgba(12,8,28,0.98)', backdropFilter: 'blur(32px)', border: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 24px 64px rgba(0,0,0,0.85)' }}>
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevM} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/35 hover:text-white hover:bg-white/[0.07] transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <span className="text-white/80 text-[13px] font-semibold">{MONTH_NAMES[vm.m]}, {vm.y}</span>
            <button type="button" onClick={nextM} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/35 hover:text-white hover:bg-white/[0.07] transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-white/22 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: first }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: days }).map((_, i) => {
              const d = i + 1
              const isSel   = sel && sel.getFullYear() === vm.y && sel.getMonth() === vm.m && sel.getDate() === d
              const isToday = new Date().getFullYear() === vm.y && new Date().getMonth() === vm.m && new Date().getDate() === d
              return (
                <button key={d} type="button" onClick={() => pick(d)}
                  className={`aspect-square text-[12px] rounded-lg font-medium flex items-center justify-center transition-all duration-100
                    ${isSel ? 'bg-purple-600 text-white' : isToday ? 'text-purple-400 ring-1 ring-purple-500/40' : 'text-white/55 hover:bg-white/[0.07] hover:text-white'}`}>
                  {d}
                </button>
              )
            })}
          </div>
          <div className="flex justify-between mt-3 pt-2.5 border-t border-white/[0.07]">
            <button type="button" onClick={() => { onChange(''); setOpen(false) }} className="text-[11px] text-white/30 hover:text-white/60 transition-colors">Clear</button>
            <button type="button" onClick={() => { const t = new Date(); setVm({ m: t.getMonth(), y: t.getFullYear() }); pick(t.getDate()) }}
              className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold transition-colors">Today</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Custom Time Picker ─────────────────────────────────────────────────────────
function TimePicker({ value, onChange, placeholder = 'Select time' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const parse = (v) => {
    if (!v) return { h: 10, m: 0, ap: 'AM' }
    const [hr, mn] = v.split(':').map(Number)
    return { h: hr % 12 || 12, m: mn, ap: hr >= 12 ? 'PM' : 'AM' }
  }
  const [ts, setTs] = useState(() => parse(value))
  useEffect(() => { if (value) setTs(parse(value)) }, [value])

  useEffect(() => {
    if (!open) return
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const toVal = ({ h, m, ap }) => { let hr = h % 12; if (ap === 'PM') hr += 12; return `${String(hr).padStart(2,'0')}:${String(m).padStart(2,'0')}` }
  const display = value ? (() => { const { h, m, ap } = parse(value); return `${h}:${String(m).padStart(2,'0')} ${ap}` })() : ''
  const HOURS = [12,1,2,3,4,5,6,7,8,9,10,11]
  const MINS  = [0,5,10,15,20,25,30,35,40,45,50,55]

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="glass-input w-full text-left flex items-center justify-between gap-2">
        <span className={display ? 'text-white/90' : 'text-white/25'}>{display || placeholder}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      </button>
      {open && (
        <div className="absolute z-[60] top-full mt-2 left-0 rounded-2xl p-3"
          style={{ width: '210px', background: 'rgba(12,8,28,0.98)', backdropFilter: 'blur(32px)', border: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 24px 64px rgba(0,0,0,0.85)' }}>
          <p className="text-[10px] font-bold tracking-widest uppercase text-white/25 mb-2.5 text-center">Select Time</p>
          <div className="flex gap-1.5">
            <div className="flex-1 flex flex-col gap-0.5 max-h-[164px] overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
              {HOURS.map(h => (
                <button key={h} type="button" onClick={() => setTs(s => ({ ...s, h }))}
                  className={`py-1.5 rounded-lg text-[12px] font-semibold text-center transition-all duration-100
                    ${ts.h === h ? 'bg-purple-600 text-white' : 'text-white/40 hover:bg-white/[0.07] hover:text-white'}`}>
                  {h}
                </button>
              ))}
            </div>
            <div className="flex-1 flex flex-col gap-0.5 max-h-[164px] overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
              {MINS.map(m => (
                <button key={m} type="button" onClick={() => setTs(s => ({ ...s, m }))}
                  className={`py-1.5 rounded-lg text-[12px] font-semibold text-center transition-all duration-100
                    ${ts.m === m ? 'bg-purple-600 text-white' : 'text-white/40 hover:bg-white/[0.07] hover:text-white'}`}>
                  {String(m).padStart(2,'0')}
                </button>
              ))}
            </div>
            <div className="w-[46px] flex flex-col gap-0.5">
              {['AM','PM'].map(ap => (
                <button key={ap} type="button" onClick={() => setTs(s => ({ ...s, ap }))}
                  className={`py-2.5 rounded-lg text-[11px] font-bold text-center transition-all duration-100
                    ${ts.ap === ap ? 'bg-purple-600 text-white' : 'text-white/40 hover:bg-white/[0.07] hover:text-white'}`}>
                  {ap}
                </button>
              ))}
            </div>
          </div>
          <button type="button" onClick={() => { onChange(toVal(ts)); setOpen(false) }}
            className="w-full mt-3 py-2 rounded-xl text-[12px] font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
            Confirm
          </button>
        </div>
      )}
    </div>
  )
}

// ── Phone Preview ──────────────────────────────────────────────────────────────
const PREVIEW_SCALE = 210 / 390  // ≈ 0.5385

function PhonePreview({ id, version }) {
  const [loaded, setLoaded] = useState(false)
  const [iframeH, setIframeH] = useState(6000)

  useEffect(() => { setLoaded(false); setIframeH(6000) }, [version])

  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === 'planazo_preview_height' && e.data.h > 50) {
        setIframeH(e.data.h + 80)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  if (!id) return null
  const wrapperH = Math.round(iframeH * PREVIEW_SCALE)
  return (
    <div className="phone-frame">
      <div className="phone-notch" />
      <div className="phone-screen">
        <div style={{ width: '210px', height: wrapperH + 'px', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: '#0a0a0a' }}>
              <div className="w-5 h-5 rounded-full border border-purple-500/30 border-t-purple-400 animate-spin" />
            </div>
          )}
          <iframe
            key={version}
            src={`/invite/${id}?preview=1`}
            title="Live Preview"
            onLoad={() => setLoaded(true)}
            style={{
              width: '390px',
              height: iframeH + 'px',
              border: 'none',
              display: 'block',
              transform: `scale(${PREVIEW_SCALE})`,
              transformOrigin: 'top left',
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>
    </div>
  )
}

// ── Person Section (module-level to prevent focus loss on re-render) ───────────
function PersonSection({ prefix, title, emoji, data, onChange }) {
  const photoRef = useRef(null)
  const handlePhoto = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const compressed = await compressImage(file)
    onChange(`${prefix}Photo`, compressed)
  }
  const photo = data[`${prefix}Photo`]
  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <span>{emoji}</span>
        <h3 className="text-white font-semibold text-[14px]">{title}</h3>
      </div>
      <div className="flex justify-center">
        <div onClick={() => photoRef.current?.click()}
          className="rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 hover:bg-white/[0.055] overflow-hidden relative"
          style={{ width: '180px', height: '250px', background: 'rgba(255,255,255,0.03)', border: '1.5px dashed rgba(255,255,255,0.12)' }}>
          {photo
            ? <img src={photo} alt="" className="w-full h-full object-cover object-top" />
            : <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <p className="text-white/30 text-[11px]">Upload photo</p>
              </>
          }
        </div>
      </div>
      <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
      <div className="field-group">
        <label className="field-label">Full Name</label>
        <input className="glass-input" value={data[`${prefix}FullName`] || ''} onChange={e => onChange(`${prefix}FullName`, e.target.value)} />
      </div>
      <div className="field-group">
        <label className="field-label">Bio</label>
        <textarea className="glass-input resize-none" rows={2} value={data[`${prefix}Bio`] || ''} onChange={e => onChange(`${prefix}Bio`, e.target.value)} placeholder="A short introduction…" />
      </div>
      <div className="field-group">
        <label className="field-label">Instagram</label>
        <input className="glass-input" placeholder="@username" value={data[`${prefix}Instagram`] || ''} onChange={e => onChange(`${prefix}Instagram`, e.target.value)} />
      </div>
    </div>
  )
}

// ── Tab panels ─────────────────────────────────────────────────────────────────
function TabGeneral({ data, onChange, onNext, isLast }) {
  const coverRef = useRef(null)
  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const compressed = await compressImage(file, 900, 0.72)
    onChange('coverPhoto', compressed)
  }
  const THEMES = [
    { id: 'royal_mughal',       emoji: '👑', name: 'Royal Mughal' },
    { id: 'kerala_traditional', emoji: '🌿', name: 'Kerala Traditional' },
    { id: 'modern_minimal',     emoji: '✨', name: 'Modern Minimal' },
    { id: 'floral_pastel',      emoji: '🌸', name: 'Floral Pastel' },
    { id: 'cinematic_dark',     emoji: '🎬', name: 'Cinematic Dark' },
  ]
  return (
    <div className="space-y-5">
      <div className="field-group">
        <label className="field-label">Couple Name</label>
        <input className="glass-input" value={data.coupleName || ''} onChange={e => onChange('coupleName', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="field-group">
          <label className="field-label">Groom's Full Name</label>
          <input className="glass-input" value={data.groomFullName || ''} onChange={e => onChange('groomFullName', e.target.value)} />
        </div>
        <div className="field-group">
          <label className="field-label">Bride's Full Name</label>
          <input className="glass-input" value={data.brideFullName || ''} onChange={e => onChange('brideFullName', e.target.value)} />
        </div>
      </div>
      <div className="field-group">
        <label className="field-label">Cover Photo</label>
        <div className="flex justify-center">
          <div onClick={() => coverRef.current?.click()}
            className="rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 hover:bg-white/[0.055] overflow-hidden relative"
            style={{ width: '200px', height: '280px', background: 'rgba(255,255,255,0.03)', border: '1.5px dashed rgba(255,255,255,0.15)' }}>
            {data.coverPhoto
              ? <img src={data.coverPhoto} alt="" className="w-full h-full object-cover object-top" />
              : <>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <p className="text-white/30 text-[12px]">Click to upload cover photo</p>
                </>
            }
          </div>
        </div>
        <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
      </div>
      <div className="field-group">
        <label className="field-label">Theme</label>
        <div className="grid grid-cols-5 gap-2 mt-1">
          {THEMES.map(t => (
            <button key={t.id} type="button" onClick={() => onChange('theme', t.id)}
              className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl border transition-all duration-150
                ${data.theme === t.id ? 'border-purple-500/50 bg-purple-500/10' : 'border-white/[0.07] bg-white/[0.03] hover:border-white/[0.13]'}`}>
              <span className="text-xl">{t.emoji}</span>
              <p className="text-[9px] text-white/50 text-center leading-tight">{t.name.split(' ')[0]}</p>
            </button>
          ))}
        </div>
      </div>
      <SaveBtn onNext={onNext} isLast={isLast} />
    </div>
  )
}

function TabCouple({ data, onChange, onNext, isLast }) {
  return (
    <div className="space-y-4">
      <PersonSection prefix="groom" title="The Groom" emoji="🤵" data={data} onChange={onChange} />
      <PersonSection prefix="bride" title="The Bride"  emoji="👰" data={data} onChange={onChange} />
      <SaveBtn onNext={onNext} isLast={isLast} />
    </div>
  )
}

function TabEvents({ data, onChange, onNext, isLast }) {
  const events = data.events || []
  const addEvent    = () => onChange('events', [...events, { id: Date.now(), name: '', date: '', time: '', venue: '', address: '', mapLink: '' }])
  const updateEvent = (id, field, val) => onChange('events', events.map(e => e.id === id ? { ...e, [field]: val } : e))
  const removeEvent = (id) => onChange('events', events.filter(e => e.id !== id))
  return (
    <div className="space-y-4">
      {events.map((ev, i) => (
        <div key={ev.id} className="glass-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-white/50 text-[11px] font-bold tracking-widest uppercase">Event {i + 1}</p>
            <button onClick={() => removeEvent(ev.id)} className="text-white/25 hover:text-rose-400 transition-colors duration-200">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="field-group col-span-2">
              <label className="field-label">Event Name</label>
              <input className="glass-input" placeholder="e.g. Wedding Ceremony" value={ev.name} onChange={e => updateEvent(ev.id, 'name', e.target.value)} />
            </div>
            <div className="field-group">
              <label className="field-label">Date</label>
              <DatePicker value={ev.date} onChange={v => updateEvent(ev.id, 'date', v)} placeholder="Event date" />
            </div>
            <div className="field-group">
              <label className="field-label">Time</label>
              <TimePicker value={ev.time} onChange={v => updateEvent(ev.id, 'time', v)} placeholder="Event time" />
            </div>
            <div className="field-group col-span-2">
              <label className="field-label">Venue</label>
              <input className="glass-input" placeholder="Venue name" value={ev.venue} onChange={e => updateEvent(ev.id, 'venue', e.target.value)} />
            </div>
            <div className="field-group col-span-2">
              <label className="field-label">Address</label>
              <input className="glass-input" placeholder="Full address" value={ev.address} onChange={e => updateEvent(ev.id, 'address', e.target.value)} />
            </div>
            <div className="field-group col-span-2">
              <label className="field-label">Google Maps Link</label>
              <input className="glass-input" placeholder="https://maps.google.com/..." value={ev.mapLink || ''} onChange={e => updateEvent(ev.id, 'mapLink', e.target.value)} />
            </div>
          </div>
        </div>
      ))}
      <button onClick={addEvent}
        className="w-full py-3 rounded-xl text-[13px] font-semibold text-purple-400 hover:text-purple-300 transition-colors duration-200"
        style={{ background: 'rgba(124,58,237,0.07)', border: '1.5px dashed rgba(124,58,237,0.30)' }}>
        + Add Event
      </button>
      <SaveBtn onNext={onNext} isLast={isLast} />
    </div>
  )
}

function TabStory({ data, onChange, onNext, isLast }) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft]   = useState({ emoji: '✨', title: '', description: '', date: '', photo: null })
  const imgRef = useRef(null)
  const moments = data.story || []

  const handleMomentPhoto = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const compressed = await compressImage(file, 500, 0.65)
    setDraft(d => ({ ...d, photo: compressed }))
  }

  const submitDraft = () => {
    if (!draft.title.trim()) return
    onChange('story', [...moments, { ...draft, id: Date.now() }])
    setDraft({ emoji: '✨', title: '', description: '', date: '', photo: null })
    setAdding(false)
  }
  const remove = (id) => onChange('story', moments.filter(m => m.id !== id))

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-white/[0.07]">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0"
          style={{ background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.22)' }}>
          📖
        </div>
        <div>
          <h3 className="text-white font-semibold text-[15px]">Our Story</h3>
          <p className="text-white/40 text-[12px]">Share the journey that brought you together</p>
        </div>
      </div>

      {/* Timeline */}
      {moments.length > 0 && (
        <div className="space-y-0">
          {moments.map((m, i) => (
            <div key={m.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0"
                  style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.22)' }}>
                  {m.emoji}
                </div>
                {i < moments.length - 1 && (
                  <div className="w-px flex-1 my-1" style={{ background: 'rgba(124,58,237,0.18)', minHeight: '16px' }} />
                )}
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-[14px] leading-tight">{m.title || 'Untitled'}</p>
                    {m.date && (
                      <p className="text-white/35 text-[11px] mt-0.5">
                        {new Date(m.date + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    )}
                    {m.description && <p className="text-white/50 text-[12.5px] mt-1.5 leading-relaxed">{m.description}</p>}
                    {m.photo && (
                      <div className="mt-2 rounded-lg overflow-hidden" style={{ width: '80px', height: '60px' }}>
                        <img src={m.photo} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                  <button onClick={() => remove(m.id)} className="text-white/20 hover:text-rose-400 transition-colors mt-0.5 shrink-0">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {adding ? (
        <div className="rounded-2xl p-5 space-y-4"
          style={{ background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.20)' }}>
          <div className="flex items-center gap-2">
            <span className="text-purple-400 text-lg">✨</span>
            <h4 className="text-white font-bold text-[14px]">New Story Moment</h4>
          </div>
          <div className="field-group">
            <label className="field-label">Title <span className="text-rose-400 normal-case font-normal">*</span></label>
            <input className="glass-input" placeholder="e.g. How We Met, The Proposal…" value={draft.title}
              onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} />
          </div>
          <div className="field-group">
            <label className="field-label">Date</label>
            <DatePicker value={draft.date} onChange={v => setDraft(d => ({ ...d, date: v }))} placeholder="When did this happen?" />
          </div>
          <div className="field-group">
            <label className="field-label">Story</label>
            <textarea className="glass-input resize-none" rows={3} placeholder="Tell the story behind this moment…"
              value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} />
          </div>
          <div className="field-group">
            <label className="field-label">
              Photo <span className="text-white/30 normal-case font-normal ml-1">(optional)</span>
            </label>
            <div className="flex justify-center">
            <div onClick={() => imgRef.current?.click()}
              className="rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 hover:bg-white/[0.055] overflow-hidden relative"
              style={{ width: '160px', height: '220px', background: 'rgba(255,255,255,0.03)', border: '1.5px dashed rgba(255,255,255,0.12)' }}>
              {draft.photo
                ? <>
                    <img src={draft.photo} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                      style={{ background: 'rgba(0,0,0,0.45)' }}>
                      <span className="text-white/80 text-[12px] font-semibold">Click to change</span>
                    </div>
                  </>
                : <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    <p className="text-white/30 text-[11px]">Upload a photo for this moment</p>
                  </>
              }
            </div>
            </div>
            <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={handleMomentPhoto} />
            {draft.photo && (
              <button onClick={() => setDraft(d => ({ ...d, photo: null }))}
                className="text-[11px] text-white/30 hover:text-rose-400 transition-colors mt-1 text-right w-full">
                Remove photo
              </button>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <button onClick={submitDraft} disabled={!draft.title.trim()}
              className="px-5 py-2 rounded-full text-[13px] font-semibold text-white transition-all duration-200 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow: '0 4px 12px rgba(124,58,237,0.30)' }}>
              Add Story
            </button>
            <button onClick={() => { setAdding(false); setDraft({ emoji: '✨', title: '', description: '', date: '', photo: null }) }}
              className="px-5 py-2 rounded-full text-[13px] font-semibold text-white/50 hover:text-white bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.09] transition-all duration-200">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="w-full py-3 rounded-xl text-[13px] font-semibold text-purple-400 hover:text-purple-300 transition-colors duration-200"
          style={{ background: 'rgba(124,58,237,0.07)', border: '1.5px dashed rgba(124,58,237,0.30)' }}>
          + Add Story Moment
        </button>
      )}

      <SaveBtn onNext={onNext} isLast={isLast} />
    </div>
  )
}

function TabDate({ data, onChange, onNext, isLast }) {
  const [dateStr, timeStr] = (data.weddingDate || 'T').split('T')
  const handleDate = (d) => onChange('weddingDate', d ? `${d}T${timeStr || '09:00'}` : '')
  const handleTime = (t) => onChange('weddingDate', dateStr ? `${dateStr}T${t}` : '')

  return (
    <div className="space-y-5">
      <div className="field-group">
        <label className="field-label">Countdown Heading</label>
        <input className="glass-input" value={data.weddingDateHeading || ''} onChange={e => onChange('weddingDateHeading', e.target.value)} placeholder="We Are Getting Married!" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="field-group">
          <label className="field-label">Wedding Date</label>
          <DatePicker value={dateStr} onChange={handleDate} placeholder="Choose date" />
        </div>
        <div className="field-group">
          <label className="field-label">Wedding Time</label>
          <TimePicker value={timeStr} onChange={handleTime} placeholder="Choose time" />
        </div>
      </div>
      {data.weddingDate && data.weddingDate !== 'T' && (
        <div className="glass-card p-4 text-center">
          <p className="text-white/40 text-[11px] tracking-widest uppercase mb-2">Preview</p>
          <p className="text-white font-bold text-[17px]">
            {new Date(data.weddingDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <p className="text-white/50 text-[13px] mt-0.5">
            {new Date(data.weddingDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      )}
      <SaveBtn onNext={onNext} isLast={isLast} />
    </div>
  )
}

// ── Vendors tab — real search against the public vendor directory ─────────────
function TabVendors({ vendors, onAdd, onRemove, onNext, isLast }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    setSearching(true)
    const t = setTimeout(() => {
      searchVendors(query)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false))
    }, 350)
    return () => clearTimeout(t)
  }, [query])

  return (
    <div className="space-y-4">
      <div className="field-group">
        <label className="field-label">Search Vendors</label>
        <input className="glass-input" value={query} onChange={e => setQuery(e.target.value)} placeholder="Photography, catering, decoration…" />
        {searching && <p className="text-white/30 text-[11px] mt-1">Searching…</p>}
        {results.length > 0 && (
          <div className="mt-2 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.09)' }}>
            {results.map(v => (
              <button key={v.id} onClick={() => { onAdd(v); setQuery('') }}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.05] transition-colors duration-150 border-b border-white/[0.05] last:border-b-0">
                <div>
                  <p className="text-white text-[13px] font-medium">{v.title}</p>
                  <p className="text-white/40 text-[11px]">{v.category}</p>
                </div>
                <span className="text-purple-400 text-[12px] font-semibold">Add +</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {vendors.length > 0 && (
        <div className="space-y-2">
          <p className="field-label">Selected Vendors</p>
          {vendors.map(v => (
            <div key={v._rowId || v.vendor_id} className="flex items-center justify-between px-3.5 py-2.5 rounded-xl"
              style={{ background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.18)' }}>
              <div>
                <p className="text-white text-[13px] font-medium">{v.title}</p>
                <p className="text-white/40 text-[11px]">{v.category}</p>
              </div>
              <button onClick={() => onRemove(v)} className="text-white/25 hover:text-rose-400 transition-colors ml-3">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
      <SaveBtn onNext={onNext} isLast={isLast} />
    </div>
  )
}

// ── Gallery tab — real uploads to backend storage ──────────────────────────────
function TabGallery({ slug, onNext, isLast }) {
  const [photos, setPhotos] = useState([])
  const [category, setCategory] = useState('Ceremony')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)
  const CATS = ['Ceremony', 'Reception', 'Mehndi', 'Sangeet', 'Couple', 'Group']

  useEffect(() => {
    weddingApi.listPhotos(slug).then(setPhotos).catch(() => setPhotos([]))
  }, [slug])

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return
    setUploading(true)
    for (const file of files) {
      try {
        const cdnUrl = await uploadImage(file, 'gallery')
        const photo = await weddingApi.addPhoto(slug, { image: cdnUrl, tag: category })
        setPhotos(prev => [...prev, photo])
      } catch (err) { /* skip failed upload, continue with the rest */ }
    }
    setUploading(false)
  }

  const remove = async (photoId) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId))
    try { await weddingApi.deletePhoto(slug, photoId) } catch { /* ignore */ }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 pb-3 border-b border-white/[0.07]">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0"
          style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.22)' }}>🖼️</div>
        <div>
          <h3 className="text-white font-semibold text-[15px]">Event Gallery</h3>
          <p className="text-white/40 text-[12px]">Upload event photos for guests to browse & download</p>
        </div>
      </div>
      <div className="field-group">
        <label className="field-label">Category for next upload</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {CATS.map(c => (
            <button key={c} type="button" onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all duration-150 border
                ${category === c ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' : 'bg-white/[0.04] text-white/40 border-white/[0.08] hover:border-white/20'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
        className="w-full py-3 rounded-xl text-[13px] font-semibold text-purple-400 hover:text-purple-300 transition-colors duration-200 disabled:opacity-50"
        style={{ background: 'rgba(124,58,237,0.07)', border: '1.5px dashed rgba(124,58,237,0.30)' }}>
        {uploading ? 'Uploading…' : `+ Upload Photos (${category})`}
      </button>
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
      {photos.length > 0 ? (
        <div style={{ maxWidth: '420px', margin: '0 auto' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginBottom: '10px', textAlign: 'center' }}>
            {photos.length} {photos.length === 1 ? 'PHOTO' : 'PHOTOS'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {photos.map(p => (
              <div key={p.id} className="relative group rounded-xl overflow-hidden" style={{ aspectRatio: '1' }}>
                <img src={p.image} alt="" className="w-full h-full object-cover" />
                <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white"
                  style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}>{p.tag}</div>
                <button onClick={() => remove(p.id)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'rgba(239,68,68,0.90)' }}>
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-white/25 text-[13px] italic">No photos uploaded yet. Start building your gallery!</div>
      )}
      <SaveBtn onNext={onNext} isLast={isLast} />
    </div>
  )
}

function TabPublish({ data, invId, onPublish, onUnpublish, onNext }) {
  const invUrl = `${window.location.origin}/invite/${invId}`
  const [copied, setCopied] = useState(false)
  const copyUrl = () => { navigator.clipboard.writeText(invUrl); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  return (
    <div className="space-y-4">
      {/* Status */}
      <div className="glass-card p-6 text-center space-y-4">
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-bold
          ${data.status === 'live'
            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
            : 'bg-amber-500/12 text-amber-400 border border-amber-500/22'}`}>
          <span className={`w-2 h-2 rounded-full ${data.status === 'live' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          {data.status === 'live' ? 'Published — Live' : 'Draft — Not Published'}
        </div>
        <p className="text-white/40 text-[13px]">
          {data.status === 'live' ? 'Your invitation is visible to guests.' : 'Publish to share with guests.'}
        </p>
        {data.status === 'live' ? (
          <button onClick={onUnpublish}
            className="px-6 py-2.5 rounded-full text-[13px] font-semibold text-white/60 hover:text-white bg-white/[0.07] hover:bg-white/[0.11] border border-white/[0.10] transition-all duration-200">
            Unpublish
          </button>
        ) : (
          <button onClick={onPublish}
            className="relative group overflow-hidden px-8 py-3 rounded-full text-[14px] font-bold text-white transition-all duration-300 hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg,#7c3aed 0%,#4f46e5 50%,#6366f1 100%)', boxShadow: '0 6px 28px rgba(124,58,237,0.50), 0 0 0 1px rgba(255,255,255,0.08) inset' }}>
            <span className="relative z-10 flex items-center gap-2">
              <span className="text-[16px]">🚀</span>
              Publish Now
            </span>
            <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.10) 0%,transparent 60%)' }} />
          </button>
        )}
      </div>

      {/* Share URL */}
      <div className="glass-card p-4 space-y-3">
        <p className="field-label">Invitation URL</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 glass-input text-[12px] text-white/50 truncate py-2.5 select-all cursor-text">{invUrl}</div>
          <button onClick={copyUrl}
            className={`px-4 py-2.5 rounded-xl text-[12px] font-semibold transition-all duration-200 shrink-0
              ${copied ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' : 'bg-purple-500/12 text-purple-400 border border-purple-500/25 hover:bg-purple-500/20'}`}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <a href={`https://wa.me/?text=${encodeURIComponent('You are invited! ' + invUrl)}`} target="_blank" rel="noreferrer"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white/70 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] transition-all duration-200">
          <span className="text-base">📱</span>
          Share on WhatsApp
        </a>
      </div>

      {/* Stats */}
      <div className="glass-card p-4">
        <p className="field-label mb-3">Engagement Stats</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[{ label: 'Views', value: data.views || 0, icon: '👁' },{ label: 'RSVPs', value: data.rsvpCount || 0, icon: '✉️' },{ label: 'Wishes', value: data.wishCount || 0, icon: '💬' }].map(s => (
            <div key={s.label} className="rounded-xl py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xl mb-1">{s.icon}</p>
              <p className="text-white font-bold text-[18px] leading-none">{s.value}</p>
              <p className="text-white/35 text-[10px] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Save all changes */}
      <button onClick={onNext}
        className="w-full py-2.5 rounded-xl text-[13.5px] font-semibold text-white transition-all duration-200 hover:-translate-y-px active:translate-y-0 flex items-center justify-center gap-2"
        style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow: '0 4px 16px rgba(124,58,237,0.28)' }}>
        Save Changes
      </button>
    </div>
  )
}

function SaveBtn({ onNext, isLast }) {
  return (
    <button onClick={onNext}
      className="w-full py-2.5 rounded-xl text-[13.5px] font-semibold text-white transition-all duration-200 hover:-translate-y-px active:translate-y-0 flex items-center justify-center gap-2"
      style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow: '0 4px 16px rgba(124,58,237,0.28)' }}>
      {isLast
        ? 'Save'
        : <>Next <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></>
      }
    </button>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function InvitationEditor() {
  const { id: slug } = useParams()
  const navigate = useNavigate()
  const [inv, setInv]       = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [activeTab, setTab] = useState('general')
  const [saved,      setSaved]      = useState(false)
  const [saving, setSaving] = useState(false)
  const [previewVer, setPreviewVer] = useState(0)
  const originalIdsRef = useRef({ events: new Set(), stories: new Set() })

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const w = await weddingApi.get(slug)
        const bg = w.bridegroom || {}

        const vendorRows = await weddingApi.listVendors(slug).catch(() => [])
        let vendors = []
        if (vendorRows.length) {
          const allVendors = await api.get('/api/vendors/', { params: { page_size: 100 } })
            .then(r => r.data).catch(() => [])
          const byId = Object.fromEntries(allVendors.map(v => [v.id, v]))
          vendors = vendorRows.map(r => ({
            _rowId: r.id,
            vendor_id: r.vendor_id,
            title: byId[r.vendor_id]?.title || `Vendor #${r.vendor_id}`,
            category: byId[r.vendor_id]?.category || '',
          }))
        }

        const [rsvps, wishes] = await Promise.all([
          weddingApi.listRSVPs(slug).catch(() => []),
          weddingApi.listWishes(slug).catch(() => []),
        ])

        if (cancelled) return

        const events = (w.events || []).map(e => ({
          id: e.id, _id: e.id,
          name: e.title || '', date: e.date ? e.date.slice(0, 10) : '',
          time: e.time || '', venue: e.location_name || '', address: e.desc || '', mapLink: e.location_link || '',
        }))
        const story = (w.stories || []).map(s => ({
          id: s.id, _id: s.id, emoji: '✨',
          title: s.title || '', description: s.desc || '',
          date: s.date ? s.date.slice(0, 10) : '', photo: s.image || null,
        }))

        originalIdsRef.current = {
          events: new Set(events.map(e => e._id)),
          stories: new Set(story.map(s => s._id)),
        }

        setInv({
          coupleName: w.couple,
          theme: w.theme,
          coverPhoto: w.thumbnail || null,
          status: w.is_published ? 'live' : 'draft',
          views: w.views || 0,
          groomFullName: bg.groom_name || '',
          groomBio: bg.groom_description || '',
          groomPhoto: bg.groom_image || null,
          groomInstagram: bg.groom_instagram || '',
          brideFullName: bg.bride_name || '',
          brideBio: bg.bride_description || '',
          bridePhoto: bg.bride_image || null,
          brideInstagram: bg.bride_instagram || '',
          events,
          story,
          weddingDate: w.countdown ? (w.countdown.event_date || '').slice(0, 16) : '',
          weddingDateHeading: w.countdown?.heading || 'We Are Getting Married!',
          vendors,
          rsvpCount: rsvps.length,
          wishCount: wishes.length,
        })
      } catch (e) {
        if (cancelled) return
        console.error('Failed to load invitation for editing:', e)
        setLoadError(e?.response?.status === 404
          ? "This invitation doesn't exist or was deleted."
          : (e?.response?.data?.detail || e?.message || 'Something went wrong loading this invitation.'))
      }
    }
    load()
    return () => { cancelled = true }
  }, [slug, navigate])

  useEffect(() => {
    const onVisible = () => { if (!document.hidden) setPreviewVer(v => v + 1) }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  const tabIds = TABS.map(t => t.id)
  const onChange = (field, val) => {
    setInv(prev => ({ ...prev, [field]: val }))
    setSaved(false)
  }

  const persistCore = async () => {
    const thumbnail = await uploadIfLocal(inv.coverPhoto, 'covers')
    await weddingApi.update(slug, { couple: inv.coupleName, theme: inv.theme, thumbnail })

    const [groomImage, brideImage] = await Promise.all([
      uploadIfLocal(inv.groomPhoto, 'couple'),
      uploadIfLocal(inv.bridePhoto, 'couple'),
    ])
    await weddingApi.upsertBridegroom(slug, {
      groom_name: inv.groomFullName || '',
      groom_description: inv.groomBio || '',
      groom_image: groomImage,
      groom_instagram: inv.groomInstagram || '',
      bride_name: inv.brideFullName || '',
      bride_description: inv.brideBio || '',
      bride_image: brideImage,
      bride_instagram: inv.brideInstagram || '',
    })

    if (inv.weddingDate) {
      await weddingApi.upsertCountdown(slug, {
        heading: inv.weddingDateHeading || 'We Are Getting Married!',
        event_date: new Date(inv.weddingDate).toISOString(),
      })
    }

    // Sync events (create new, update existing, delete removed)
    const keptEventIds = new Set()
    const newEvents = []
    for (const ev of inv.events) {
      const body = {
        title: ev.name || 'Untitled Event',
        date: ev.date ? new Date(ev.date).toISOString() : null,
        time: ev.time || '',
        desc: ev.address || '',
        location_name: ev.venue || '',
        location_link: ev.mapLink || null,
      }
      if (ev._id) {
        await weddingApi.updateEvent(slug, ev._id, body).catch(() => {})
        keptEventIds.add(ev._id)
        newEvents.push(ev)
      } else {
        const created = await weddingApi.createEvent(slug, body).catch(() => null)
        if (created) { keptEventIds.add(created.id); newEvents.push({ ...ev, _id: created.id }) }
        else newEvents.push(ev)
      }
    }
    for (const oldId of originalIdsRef.current.events) {
      if (!keptEventIds.has(oldId)) await weddingApi.deleteEvent(slug, oldId).catch(() => {})
    }
    originalIdsRef.current.events = keptEventIds

    // Sync story moments
    const keptStoryIds = new Set()
    const newStory = []
    for (const s of inv.story) {
      const image = await uploadIfLocal(s.photo, 'stories')
      const body = {
        title: s.title || 'Untitled',
        date: s.date ? new Date(s.date).toISOString() : null,
        desc: s.description || '',
        image,
      }
      if (s._id) {
        await weddingApi.updateStory(slug, s._id, body).catch(() => {})
        keptStoryIds.add(s._id)
        newStory.push({ ...s, photo: image })
      } else {
        const created = await weddingApi.createStory(slug, body).catch(() => null)
        if (created) { keptStoryIds.add(created.id); newStory.push({ ...s, _id: created.id, photo: image }) }
        else newStory.push(s)
      }
    }
    for (const oldId of originalIdsRef.current.stories) {
      if (!keptStoryIds.has(oldId)) await weddingApi.deleteStory(slug, oldId).catch(() => {})
    }
    originalIdsRef.current.stories = keptStoryIds

    setInv(prev => ({ ...prev, coverPhoto: thumbnail, groomPhoto: groomImage, bridePhoto: brideImage, events: newEvents, story: newStory }))
  }

  const handleNext = async () => {
    if (!inv || saving) return
    setSaving(true)
    try {
      await persistCore()
      setPreviewVer(v => v + 1)
      const idx = tabIds.indexOf(activeTab)
      if (idx < tabIds.length - 1) {
        setTab(tabIds[idx + 1])
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    const updated = await weddingApi.publish(slug).catch(() => null)
    if (updated) { setInv(prev => ({ ...prev, status: 'live' })); setPreviewVer(v => v + 1) }
  }

  const handleUnpublish = async () => {
    const updated = await weddingApi.unpublish(slug).catch(() => null)
    if (updated) { setInv(prev => ({ ...prev, status: 'draft' })); setPreviewVer(v => v + 1) }
  }

  const handleAddVendor = async (vendor) => {
    try {
      const row = await weddingApi.addVendor(slug, vendor.id)
      setInv(prev => ({ ...prev, vendors: [...prev.vendors, { _rowId: row.id, vendor_id: vendor.id, title: vendor.title, category: vendor.category }] }))
    } catch (e) { /* likely already added */ }
  }

  const handleRemoveVendor = async (v) => {
    setInv(prev => ({ ...prev, vendors: prev.vendors.filter(x => x !== v) }))
    try { if (v._rowId) await weddingApi.removeVendor(slug, v._rowId) } catch { /* ignore */ }
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#060412] text-white flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.22)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <p className="text-white/70 text-[14px] max-w-sm">{loadError}</p>
        <button
          onClick={() => navigate('/weddings')}
          className="px-6 py-2.5 rounded-full text-[13px] font-semibold text-white transition-all duration-200 hover:-translate-y-px"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
        >
          Back to Weddings
        </button>
      </div>
    )
  }

  if (!inv) {
    return (
      <div className="min-h-screen bg-[#060412] flex items-center justify-center">
        <div className="w-7 h-7 border border-purple-500/40 border-t-purple-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-screen bg-[#060412] text-white flex flex-col overflow-hidden">

      {/* Header */}
      <header className="shrink-0 border-b border-white/[0.06] bg-[#060412]/90 backdrop-blur-xl">
        <div className="h-14 flex items-center justify-between px-5 gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/weddings')}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-white/40 hover:text-white/80 hover:bg-white/[0.07] transition-all duration-200">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
            </button>
            <div>
              <p className="text-white font-semibold text-[14px] leading-tight">{inv.coupleName}</p>
              <p className="text-white/35 text-[11px]">Wedding Invitation Editor</p>
            </div>
          </div>
          {(saved || saving) && (
            <span className="text-emerald-400 text-[12px] font-medium flex items-center gap-1.5 animate-pulse">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              {saving ? 'Saving…' : 'Saved'}
            </span>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* Tab sidebar */}
        <div className="w-[180px] shrink-0 border-r border-white/[0.06] bg-white/[0.02] flex flex-col pt-3 pb-4 hidden sm:flex">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setTab(tab.id)}
              className="flex items-center gap-3 px-4 py-3 text-[13px] font-medium transition-all duration-200 text-left mx-2"
              style={activeTab === tab.id ? {
                background: 'rgba(139,92,246,0.18)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(139,92,246,0.32)',
                borderRadius: '16px',
                boxShadow: '0 4px 20px rgba(139,92,246,0.20), 0 1px 0 rgba(255,255,255,0.08) inset',
                color: 'white',
              } : { borderRadius: '16px', color: 'rgba(255,255,255,0.45)' }}
              onMouseEnter={e => { if (activeTab !== tab.id) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
              onMouseLeave={e => { if (activeTab !== tab.id) e.currentTarget.style.background = '' }}>
              <span className="text-base">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Mobile tab bar */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-20 flex border-t border-white/[0.07] bg-[#060412]/95 backdrop-blur-xl">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setTab(tab.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[9px] font-semibold transition-colors duration-200
                ${activeTab === tab.id ? 'text-purple-400' : 'text-white/30'}`}>
              <span className="text-[16px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form area */}
        <div className="flex-1 overflow-y-auto p-5 sidebar-scroll pb-20 sm:pb-5">
          <div key={activeTab} className="max-w-xl" style={{ animation: 'tab-enter 0.22s cubic-bezier(0.23,1,0.32,1)' }}>
            {activeTab === 'general' && <TabGeneral  data={inv} onChange={onChange} onNext={handleNext} isLast={false} />}
            {activeTab === 'couple'  && <TabCouple   data={inv} onChange={onChange} onNext={handleNext} isLast={false} />}
            {activeTab === 'events'  && <TabEvents   data={inv} onChange={onChange} onNext={handleNext} isLast={false} />}
            {activeTab === 'story'   && <TabStory    data={inv} onChange={onChange} onNext={handleNext} isLast={false} />}
            {activeTab === 'date'    && <TabDate     data={inv} onChange={onChange} onNext={handleNext} isLast={false} />}
            {activeTab === 'gallery' && <TabGallery  slug={slug} onNext={handleNext} isLast={false} />}
            {activeTab === 'vendors' && <TabVendors  vendors={inv.vendors} onAdd={handleAddVendor} onRemove={handleRemoveVendor} onNext={handleNext} isLast={false} />}
            {activeTab === 'seo' && (
              <SeoAnalysisPanel
                slug={slug}
                pathPrefix="/invite"
                fallbackTitle={`${inv.coupleName || 'Our'} — Wedding Invitation | Planazo`}
                fallbackDescription={[inv.brideBio, inv.groomBio].filter(Boolean).join(' & ') || `You're invited to ${inv.coupleName || 'our'}'s wedding. RSVP, see the schedule, and view photos on Planazo.`}
                content={[inv.groomBio, inv.brideBio, ...(inv.story || []).map(m => m.description)].filter(Boolean).join('\n\n')}
                load={() => weddingApi.getSeoSettings(slug)}
                save={(body) => weddingApi.updateSeoSettings(slug, body)}
              />
            )}
            {activeTab === 'publish' && <TabPublish  data={inv} invId={slug} onPublish={handlePublish} onUnpublish={handleUnpublish} onNext={handleNext} />}
          </div>
        </div>

        {/* Phone preview panel — no outer scroll, everything centered */}
        <div className="hidden lg:flex w-[270px] shrink-0 border-l border-white/[0.06] flex-col items-center justify-center gap-4 bg-white/[0.01] overflow-hidden">
          <p className="text-white/30 text-[11px] tracking-widest uppercase text-center shrink-0">Live Preview</p>
          <PhonePreview id={slug} version={previewVer} />
          <button
            onClick={() => window.open(`/invite/${slug}`, '_blank')}
            className="shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-semibold text-white/70 hover:text-white transition-all duration-200 hover:-translate-y-px active:translate-y-0"
            style={{
              background: 'rgba(139,92,246,0.12)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(139,92,246,0.28)',
              boxShadow: '0 2px 12px rgba(139,92,246,0.15)',
            }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
            Open Full Preview
          </button>
        </div>

      </div>
    </div>
  )
}
