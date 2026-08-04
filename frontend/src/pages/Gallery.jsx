import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import logo from '../assets/logo.png'
import AppLayout from '../components/AppLayout'

// ── Storage helpers ────────────────────────────────────────────────────────────
const getWeddings  = () => JSON.parse(localStorage.getItem('planazo_invitations') || '[]')
const getBirthdays = () => JSON.parse(localStorage.getItem('planazo_birthdays')   || '[]')
const metaKey    = (type, id) => `planazo_gallery_${type}_${id}_meta`
const photoKey   = (photoId)  => `planazo_gallery_photo_${photoId}`
const loadMeta   = (type, id) => JSON.parse(localStorage.getItem(metaKey(type, id))  || '[]')

function saveMeta(type, id, list) {
  localStorage.setItem(metaKey(type, id), JSON.stringify(list))
}
function deletePhotoData(photoId) {
  localStorage.removeItem(photoKey(photoId))
}
function getPhotoData(photoId) {
  return localStorage.getItem(photoKey(photoId))
}

// ── Image compression ─────────────────────────────────────────────────────────
function compressImage(file, maxW = 1800) {
  return new Promise(resolve => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale  = Math.min(1, maxW / Math.max(img.width, 1))
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(img.width  * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.78))
    }
    img.src = url
  })
}

// ── Mock API (replace with real endpoints later) ───────────────────────────────
const API_BASE = '/api' // replace with real base URL when backend is ready

async function apiUploadPhoto(eventType, eventId, { id, dataUrl, name, category }) {
  // TODO: POST ${API_BASE}/gallery/${eventType}/${eventId}/upload
  //       body: FormData with file + category
  await new Promise(r => setTimeout(r, 250))
  return { id, status: 'ok' }
}

async function apiDeletePhoto(eventType, eventId, photoId) {
  // TODO: DELETE ${API_BASE}/gallery/${eventType}/${eventId}/photos/${photoId}
  await new Promise(r => setTimeout(r, 150))
  return { status: 'ok' }
}

async function apiFindByFace(eventType, eventId, selfieDataUrl, { includeGroup, confidence }) {
  // TODO: POST ${API_BASE}/ai/selfie-match
  //       body: { eventType, eventId, selfie: base64, includeGroup, confidence }
  await new Promise(r => setTimeout(r, 2200)) // simulate AI processing
  // Mock: return random half of current photo IDs
  const meta = loadMeta(eventType, eventId)
  const pool = meta.filter(() => Math.random() > 0.4)
  return pool.map(p => p.id)
}

// ── Category lists ─────────────────────────────────────────────────────────────
const WEDDING_CATS  = ['Pre-Wedding', 'Engagement', 'Ceremony', 'Reception', 'Candid']
const BIRTHDAY_CATS = ['Pre-Party', 'Arrival', 'Cake Cutting', 'Games', 'Performances', 'Group', 'Candid']

// ── Accent colors per birthday theme ─────────────────────────────────────────
const BDAY_ACCENTS = { neon_party: '#a855f7', golden_royale: '#f59e0b', tropical: '#10b981', retro_pop: '#ec4899', rose_gold: '#fb7185' }

// ── Sub-components ─────────────────────────────────────────────────────────────

function EventCard({ inv, type, selected, onClick }) {
  const [hover, setHover] = useState(false)
  const cover = type === 'wedding'
    ? localStorage.getItem(`planazo_photo_${inv.id}_coverPhoto`)
    : localStorage.getItem(`planazo_bday_photo_${inv.id}_coverPhoto`)
  const label  = type === 'wedding' ? inv.coupleName : (inv.eventTitle || inv.personName)
  const accent = type === 'wedding' ? '#8b5cf6' : (BDAY_ACCENTS[inv.theme] || '#a855f7')

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        flexShrink: 0, width: '130px', borderRadius: '14px', overflow: 'hidden', cursor: 'pointer',
        border:     `1.5px solid ${selected ? accent + 'cc' : hover ? accent + '66' : 'rgba(255,255,255,0.09)'}`,
        background:  selected ? accent + '1a' : hover ? accent + '0e' : 'rgba(255,255,255,0.04)',
        boxShadow:   selected
          ? `0 0 22px ${accent}44, 0 6px 20px rgba(0,0,0,0.45)`
          : hover
            ? `0 0 14px ${accent}2a, 0 10px 28px rgba(0,0,0,0.5)`
            : 'none',
        transform:   hover ? 'translateY(-4px) scale(1.035)' : 'translateY(0) scale(1)',
        transition:  'all 0.28s cubic-bezier(0.34,1.56,0.64,1)',
        textAlign:   'left', position: 'relative',
      }}>

      {/* Shine sweep */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '14px', overflow: 'hidden', pointerEvents: 'none', zIndex: 3,
      }}>
        <div style={{
          position: 'absolute', top: 0, bottom: 0, width: '55%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.11), transparent)',
          animation: hover ? 'card-shine 0.5s ease-out forwards' : 'none',
          left: hover ? undefined : '-100%',
        }} />
      </div>

      {/* Thumbnail */}
      <div style={{ width: '100%', height: '76px', background: 'rgba(255,255,255,0.06)', position: 'relative', overflow: 'hidden' }}>
        {cover
          ? <img src={cover} alt="" style={{
              width: '100%', height: '100%', objectFit: 'cover',
              transition: 'transform 0.45s ease',
              transform: hover ? 'scale(1.12)' : 'scale(1)',
            }} />
          : <div style={{
              width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px',
              transition: 'transform 0.45s ease',
              transform: hover ? 'scale(1.18)' : 'scale(1)',
            }}>
              {type === 'wedding' ? '💍' : '🎂'}
            </div>
        }
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 35%, rgba(0,0,0,0.62))' }} />
        {selected && (
          <div style={{ position: 'absolute', top: '5px', right: '5px', width: '16px', height: '16px', borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: 'white', fontWeight: 800 }}>✓</div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '7px 9px 8px', position: 'relative', zIndex: 1 }}>
        <p style={{ fontSize: '11.5px', fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>{label}</p>
        <p style={{ fontSize: '10px', color: hover ? 'rgba(255,255,255,0.52)' : 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', gap: '3px', transition: 'color 0.2s' }}>
          {type === 'wedding' ? '💒 Wedding' : '🎂 Birthday'}
        </p>
      </div>
    </button>
  )
}

function PhotoItem({ photo, onDelete, onView, isAiMatch }) {
  const [hover, setHover] = useState(false)
  const [delHover, setDelHover] = useState(false)
  const dataUrl = getPhotoData(photo.id)
  if (!dataUrl) return null

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onView}
      style={{
        position: 'relative', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer',
        aspectRatio: '1',
        outline:    isAiMatch ? '2px solid #a855f7' : hover ? '1.5px solid rgba(255,255,255,0.14)' : '1.5px solid transparent',
        boxShadow:  isAiMatch
          ? '0 0 22px rgba(168,85,247,0.55)'
          : hover
            ? '0 12px 36px rgba(0,0,0,0.65), 0 2px 8px rgba(0,0,0,0.4)'
            : '0 2px 8px rgba(0,0,0,0.25)',
        transform:  hover ? 'scale(1.028) translateY(-3px)' : 'scale(1) translateY(0)',
        transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
      }}>

      {/* Image with subtle zoom */}
      <img src={dataUrl} alt={photo.name} style={{
        width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: '12px',
        transition: 'transform 0.45s ease',
        transform: hover ? 'scale(1.06)' : 'scale(1)',
      }} />

      {/* Shine sweep */}
      <div style={{ position: 'absolute', inset: 0, borderRadius: '12px', overflow: 'hidden', pointerEvents: 'none', zIndex: 1 }}>
        <div style={{
          position: 'absolute', top: 0, bottom: 0, width: '45%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)',
          animation: hover ? 'card-shine 0.55s ease-out forwards' : 'none',
          left: hover ? undefined : '-100%',
        }} />
      </div>

      {/* Category pill */}
      {photo.category && (
        <div style={{
          position: 'absolute', top: '7px', left: '7px', zIndex: 2,
          padding: '2px 8px', borderRadius: '999px', background: 'rgba(0,0,0,0.58)', backdropFilter: 'blur(8px)',
          fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.85)',
          transition: 'opacity 0.2s', opacity: hover ? 0 : 1,
        }}>
          {photo.category}
        </div>
      )}

      {/* AI match badge */}
      {isAiMatch && (
        <div style={{ position: 'absolute', top: '7px', right: '7px', zIndex: 2, padding: '2px 8px', borderRadius: '999px', background: '#a855f7', fontSize: '10px', fontWeight: 700, color: 'white' }}>
          AI Match ✨
        </div>
      )}

      {/* Hover overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2, borderRadius: '12px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.08) 50%, transparent 100%)',
        opacity: hover ? 1 : 0, transition: 'opacity 0.25s',
      }}>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 10px 9px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
          <p style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{photo.name}</p>
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            onMouseEnter={() => setDelHover(true)}
            onMouseLeave={() => setDelHover(false)}
            style={{
              flexShrink: 0, width: '24px', height: '24px', borderRadius: '7px', border: 'none',
              background: delHover ? 'rgba(239,68,68,1)' : 'rgba(239,68,68,0.82)',
              color: 'white', fontSize: '11px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transform: delHover ? 'scale(1.12)' : 'scale(1)',
              transition: 'all 0.15s',
            }}>
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}

function Lightbox({ photos, index, onClose, onPrev, onNext }) {
  const photo = photos[index]
  const dataUrl = photo ? getPhotoData(photo.id) : null
  useEffect(() => {
    const handler = e => {
      if (e.key === 'Escape')     onClose()
      if (e.key === 'ArrowLeft')  onPrev()
      if (e.key === 'ArrowRight') onNext()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose, onPrev, onNext])

  if (!photo || !dataUrl) return null
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(12px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '88vh' }}>
        <img src={dataUrl} alt={photo.name} style={{ maxWidth: '90vw', maxHeight: '84vh', objectFit: 'contain', borderRadius: '12px', display: 'block' }} />
        <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
          {photo.name} {photo.category ? `· ${photo.category}` : ''} · {index + 1}/{photos.length}
        </div>
      </div>
      {/* Prev */}
      {index > 0 && (
        <button onClick={e => { e.stopPropagation(); onPrev() }} style={{ position: 'fixed', left: '16px', top: '50%', transform: 'translateY(-50%)', width: '44px', height: '44px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: 'white', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
      )}
      {/* Next */}
      {index < photos.length - 1 && (
        <button onClick={e => { e.stopPropagation(); onNext() }} style={{ position: 'fixed', right: '16px', top: '50%', transform: 'translateY(-50%)', width: '44px', height: '44px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: 'white', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
      )}
      {/* Close */}
      <button onClick={onClose} style={{ position: 'fixed', top: '16px', right: '16px', width: '36px', height: '36px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: 'white', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
    </div>
  )
}

// ── Main Gallery page ──────────────────────────────────────────────────────────
export default function Gallery() {
  const navigate = useNavigate()
  const fileInputRef  = useRef()
  const selfieInputRef = useRef()
  const dropRef = useRef()

  const [eventType,    setEventType]    = useState('wedding')
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [category,     setCategory]     = useState('All')
  const [photoMeta,    setPhotoMeta]    = useState([])   // all photos for selected event
  const [uploading,    setUploading]    = useState(false)
  const [dragging,     setDragging]     = useState(false)
  const [lightboxIdx,  setLightboxIdx]  = useState(null)

  // AI state
  const [selfieDataUrl, setSelfieDataUrl] = useState(null)
  const [selfieName,    setSelfieName]    = useState('')
  const [includeGroup,  setIncludeGroup]  = useState(true)
  const [confidence,    setConfidence]    = useState(50)
  const [searching,     setSearching]     = useState(false)
  const [aiMatchIds,    setAiMatchIds]    = useState(new Set())
  const [selfieDrag,    setSelfieDrag]    = useState(false)
  const [aiPanelHover,  setAiPanelHover]  = useState(false)

  // Reload photo meta when event changes
  useEffect(() => {
    if (!selectedEvent) { setPhotoMeta([]); return }
    setPhotoMeta(loadMeta(eventType, selectedEvent.id))
    setCategory('All')
    setAiMatchIds(new Set())
  }, [selectedEvent, eventType])

  // Reset selected event when type changes
  useEffect(() => { setSelectedEvent(null); setPhotoMeta([]) }, [eventType])

  const events = eventType === 'wedding' ? getWeddings() : getBirthdays()
  const cats   = eventType === 'wedding' ? WEDDING_CATS  : BIRTHDAY_CATS
  const accent = eventType === 'wedding' ? '#8b5cf6'
    : (selectedEvent ? BDAY_ACCENTS[selectedEvent.theme] || '#a855f7' : '#a855f7')

  const filteredPhotos = category === 'All'
    ? photoMeta
    : photoMeta.filter(p => p.category === category)

  // ── Upload ──────────────────────────────────────────────────────────────────
  async function handleFiles(files) {
    if (!selectedEvent) return
    setUploading(true)
    const accepted = [...files].filter(f => f.type.startsWith('image/'))
    for (const file of accepted) {
      const dataUrl = await compressImage(file)
      const id = `g_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      const meta = { id, name: file.name, category: category === 'All' ? '' : category, uploadedAt: new Date().toISOString() }
      try {
        localStorage.setItem(photoKey(id), dataUrl)
        await apiUploadPhoto(eventType, selectedEvent.id, { ...meta, dataUrl })
        setPhotoMeta(prev => {
          const next = [...prev, meta]
          saveMeta(eventType, selectedEvent.id, next)
          return next
        })
      } catch {
        localStorage.removeItem(photoKey(id))
      }
    }
    setUploading(false)
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  async function handleDelete(photoId) {
    deletePhotoData(photoId)
    setPhotoMeta(prev => {
      const next = prev.filter(p => p.id !== photoId)
      saveMeta(eventType, selectedEvent.id, next)
      return next
    })
    setAiMatchIds(prev => { const s = new Set(prev); s.delete(photoId); return s })
    try { await apiDeletePhoto(eventType, selectedEvent.id, photoId) } catch {}
  }

  // ── Drag & drop ─────────────────────────────────────────────────────────────
  const onDrop = useCallback(e => {
    e.preventDefault(); setDragging(false)
    if (!selectedEvent) return
    handleFiles(e.dataTransfer.files)
  }, [selectedEvent, category])
  const onDragOver  = e => { e.preventDefault(); setDragging(true) }
  const onDragLeave = e => { if (!dropRef.current?.contains(e.relatedTarget)) setDragging(false) }

  // ── AI selfie ───────────────────────────────────────────────────────────────
  async function loadSelfie(file) {
    if (!file || !file.type.startsWith('image/')) return
    const dataUrl = await compressImage(file, 800)
    setSelfieDataUrl(dataUrl); setSelfieName(file.name); setAiMatchIds(new Set())
  }
  async function handleFindMyPhotos() {
    if (!selfieDataUrl || !selectedEvent) return
    setSearching(true); setAiMatchIds(new Set())
    try {
      const ids = await apiFindByFace(eventType, selectedEvent.id, selfieDataUrl, { includeGroup, confidence })
      setAiMatchIds(new Set(ids))
    } finally { setSearching(false) }
  }

  // ── Lightbox helpers ────────────────────────────────────────────────────────
  const lightboxPhotos = filteredPhotos
  function closeLightbox()     { setLightboxIdx(null) }
  function prevPhoto()         { setLightboxIdx(i => Math.max(0, i - 1)) }
  function nextPhoto()         { setLightboxIdx(i => Math.min(lightboxPhotos.length - 1, i + 1)) }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <AppLayout orbOpacity={{ purple: 0.11, blue: 0.08 }}>
      {/* Header */}
      <header className="relative sticky top-0 z-20 border-b border-white/[0.06] bg-[#060412]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-5 h-14 flex items-center gap-3">
          <button onClick={() => navigate('/home')}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-white/40 hover:text-white/80 hover:bg-white/[0.07] transition-all duration-200">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <img src={logo} alt="" className="w-6 h-6 opacity-70" />
          <span className="text-white/40 text-[13px]">/</span>
          <span className="text-white font-semibold text-[15px]">Gallery & AI</span>
        </div>
      </header>

      {/* Body */}
      <div className="relative max-w-7xl mx-auto px-5 py-7 flex gap-6 items-start">

        {/* ── Left: upload & grid ─────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col gap-5">

          {/* Event type toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {['wedding', 'birthday'].map(t => (
              <button key={t} onClick={() => setEventType(t)} style={{
                padding: '8px 20px', borderRadius: '999px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                border: `1.5px solid ${eventType === t ? (t === 'wedding' ? '#8b5cf6aa' : '#f59e0baa') : 'rgba(255,255,255,0.1)'}`,
                background: eventType === t ? (t === 'wedding' ? 'rgba(139,92,246,0.18)' : 'rgba(245,158,11,0.15)') : 'rgba(255,255,255,0.04)',
                color: eventType === t ? 'white' : 'rgba(255,255,255,0.45)',
                transition: 'all 0.2s',
              }}>
                {t === 'wedding' ? '💍 Wedding' : '🎂 Birthday'}
              </button>
            ))}
          </div>

          {/* Event cards */}
          <div style={{ borderRadius: '18px', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(16px)', padding: '16px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '12px' }}>
              Select {eventType === 'wedding' ? 'Wedding' : 'Birthday'}
            </p>
            {events.length === 0
              ? <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', padding: '12px 0' }}>
                  No {eventType === 'wedding' ? 'weddings' : 'birthdays'} yet. Create one first.
                </p>
              : <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {events.map(inv => (
                    <EventCard
                      key={inv.id} inv={inv} type={eventType}
                      selected={selectedEvent?.id === inv.id}
                      onClick={() => setSelectedEvent(inv.id === selectedEvent?.id ? null : inv)}
                    />
                  ))}
                </div>
            }
          </div>

          {/* Category pills */}
          {selectedEvent && (
            <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
              {['All', ...cats].map(cat => (
                <button key={cat} onClick={() => setCategory(cat)} style={{
                  padding: '5px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${category === cat ? accent + 'aa' : 'rgba(255,255,255,0.1)'}`,
                  background: category === cat ? accent + '22' : 'rgba(255,255,255,0.04)',
                  color: category === cat ? 'white' : 'rgba(255,255,255,0.45)',
                  transition: 'all 0.18s',
                }}>{cat}</button>
              ))}
            </div>
          )}

          {/* Upload zone */}
          <div
            ref={dropRef}
            onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
            onClick={() => selectedEvent && fileInputRef.current?.click()}
            style={{
              borderRadius: '16px', padding: '32px 20px', cursor: selectedEvent ? 'pointer' : 'default',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
              border: `1.5px dashed ${dragging ? accent : (selectedEvent ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)')}`,
              background: dragging ? accent + '0d' : 'rgba(255,255,255,0.025)',
              transition: 'all 0.2s', minHeight: '140px',
            }}>
            <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={e => handleFiles(e.target.files)} />
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>{uploading ? '⏳' : '📷'}</div>
            <p style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.75)', marginBottom: '4px' }}>
              {uploading ? 'Uploading...' : 'Drag & drop photos or click to browse'}
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginBottom: selectedEvent ? 0 : '6px' }}>
              JPG, PNG, WEBP, HEIC · up to 20 MB each
            </p>
            {!selectedEvent && (
              <p style={{ fontSize: '12px', color: accent, marginTop: '6px', fontWeight: 600 }}>
                ↑ Select a {eventType} above first
              </p>
            )}
          </div>

          {/* Photo grid */}
          {filteredPhotos.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  {filteredPhotos.length} photo{filteredPhotos.length !== 1 ? 's' : ''}
                  {aiMatchIds.size > 0 ? ` · ${aiMatchIds.size} AI matched` : ''}
                </p>
                {aiMatchIds.size > 0 && (
                  <button onClick={() => setAiMatchIds(new Set())} style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    Clear AI matches
                  </button>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {filteredPhotos.map((photo, idx) => (
                  <PhotoItem
                    key={photo.id}
                    photo={photo}
                    onDelete={() => handleDelete(photo.id)}
                    onView={() => setLightboxIdx(idx)}
                    isAiMatch={aiMatchIds.has(photo.id)}
                  />
                ))}
              </div>
            </>
          )}

          {/* Empty state */}
          {selectedEvent && filteredPhotos.length === 0 && !uploading && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.25)' }}>
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>🖼️</div>
              <p style={{ fontSize: '14px' }}>No photos yet. Upload some above!</p>
            </div>
          )}
        </div>

        {/* ── Right: AI panel ─────────────────────────────────────────────── */}
        <div style={{ width: '300px', flexShrink: 0, position: 'sticky', top: '80px' }}>
          <div
            onMouseEnter={() => setAiPanelHover(true)}
            onMouseLeave={() => setAiPanelHover(false)}
            style={{
              borderRadius: '20px', padding: '20px', overflow: 'hidden', position: 'relative',
              backdropFilter: 'blur(20px)',
              border:     `1px solid ${aiPanelHover ? 'rgba(168,85,247,0.38)' : 'rgba(255,255,255,0.09)'}`,
              background:  aiPanelHover ? 'rgba(168,85,247,0.06)' : 'rgba(255,255,255,0.04)',
              boxShadow:   aiPanelHover ? '0 16px 48px rgba(168,85,247,0.18), 0 0 0 1px rgba(168,85,247,0.12)' : 'none',
              transform:   aiPanelHover ? 'translateY(-5px)' : 'translateY(0)',
              transition:  'all 0.32s cubic-bezier(0.34,1.56,0.64,1)',
            }}>

            {/* Glow — expands on hover */}
            <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: aiPanelHover ? '180px' : '120px', height: aiPanelHover ? '180px' : '120px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.22), transparent)', pointerEvents: 'none', transition: 'all 0.4s ease' }} />

            {/* Shine sweep on hover */}
            <div style={{ position: 'absolute', inset: 0, borderRadius: '20px', overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
              <div style={{
                position: 'absolute', top: 0, bottom: 0, width: '60%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)',
                animation: aiPanelHover ? 'card-shine 0.7s ease-out forwards' : 'none',
                left: aiPanelHover ? undefined : '-100%',
              }} />
            </div>

            {/* Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '20px' }}>🪄</span>
              <span style={{ fontWeight: 800, fontSize: '15px', color: 'white' }}>AI Selfie Match</span>
              <span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 700, background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.35)', color: '#c084fc' }}>Enhanced</span>
            </div>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.38)', marginBottom: '16px', lineHeight: 1.5 }}>
              Upload a selfie — AI finds you in solo & group photos, then highlights your matches.
            </p>

            {/* Selfie drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setSelfieDrag(true) }}
              onDragLeave={() => setSelfieDrag(false)}
              onDrop={e => { e.preventDefault(); setSelfieDrag(false); loadSelfie(e.dataTransfer.files[0]) }}
              onClick={() => selfieInputRef.current?.click()}
              style={{
                borderRadius: '14px', height: '110px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '6px', cursor: 'pointer', marginBottom: '14px', overflow: 'hidden', position: 'relative',
                border: `1.5px dashed ${selfieDrag ? '#a855f7' : 'rgba(168,85,247,0.3)'}`,
                background: selfieDrag ? 'rgba(168,85,247,0.12)' : 'rgba(168,85,247,0.05)',
                transition: 'all 0.2s',
              }}>
              <input ref={selfieInputRef} type="file" accept="image/*" hidden onChange={e => loadSelfie(e.target.files[0])} />
              {selfieDataUrl
                ? <>
                    <img src={selfieDataUrl} alt="selfie" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: '14px', opacity: 0.85 }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', borderRadius: '14px' }} />
                    <div style={{ position: 'relative', textAlign: 'center' }}>
                      <p style={{ fontSize: '12px', fontWeight: 700, color: 'white' }}>✓ {selfieName || 'Selfie loaded'}</p>
                      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.55)' }}>Click to change</p>
                    </div>
                  </>
                : <>
                    <span style={{ fontSize: '28px' }}>🤳</span>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>Drop selfie here</p>
                  </>
              }
            </div>

            {/* Options */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <div
                onClick={() => setIncludeGroup(v => !v)}
                style={{ width: '16px', height: '16px', borderRadius: '4px', cursor: 'pointer', flexShrink: 0,
                  background: includeGroup ? '#a855f7' : 'transparent',
                  border: `1.5px solid ${includeGroup ? '#a855f7' : 'rgba(255,255,255,0.3)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}>
                {includeGroup && <span style={{ fontSize: '9px', color: 'white', lineHeight: 1 }}>✓</span>}
              </div>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }} onClick={() => setIncludeGroup(v => !v)}>
                Include group photos
              </label>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>Min confidence</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{confidence}%</span>
              </div>
              <input
                type="range" min={20} max={90} value={confidence}
                onChange={e => setConfidence(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#a855f7', cursor: 'pointer' }}
              />
            </div>

            {/* Find button */}
            <button
              onClick={handleFindMyPhotos}
              disabled={!selfieDataUrl || !selectedEvent || searching}
              style={{
                width: '100%', padding: '12px', borderRadius: '12px', border: 'none', cursor: (!selfieDataUrl || !selectedEvent || searching) ? 'not-allowed' : 'pointer',
                background: (!selfieDataUrl || !selectedEvent) ? 'rgba(255,255,255,0.07)' : 'linear-gradient(135deg, #7c3aed, #a855f7)',
                color: (!selfieDataUrl || !selectedEvent) ? 'rgba(255,255,255,0.3)' : 'white',
                fontSize: '14px', fontWeight: 700, transition: 'all 0.2s',
                boxShadow: (!selfieDataUrl || !selectedEvent) ? 'none' : '0 4px 16px rgba(168,85,247,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}>
              {searching
                ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⌛</span> Scanning photos...</>
                : <><span>✨</span> Find My Photos</>
              }
            </button>

            {!selectedEvent && (
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: '8px' }}>
                Select a {eventType} first
              </p>
            )}

            {aiMatchIds.size > 0 && (
              <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '10px', background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.25)', textAlign: 'center' }}>
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#c084fc' }}>✨ Found {aiMatchIds.size} match{aiMatchIds.size !== 1 ? 'es' : ''}!</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Highlighted in the gallery</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <Lightbox
          photos={lightboxPhotos}
          index={lightboxIdx}
          onClose={closeLightbox}
          onPrev={prevPhoto}
          onNext={nextPhoto}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes card-shine {
          from { left: -65%; }
          to   { left: 120%; }
        }
      `}</style>
    </AppLayout>
  )
}
