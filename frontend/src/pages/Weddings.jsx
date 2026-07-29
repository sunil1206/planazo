import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import logo from '../assets/logo.png'
import { weddingApi } from '../lib/eventsApi'

// ── Theme config ──────────────────────────────────────────────────────────────
const THEMES = [
  { id: 'royal_mughal',       emoji: '👑', name: 'Royal Mughal',       desc: 'Burgundy & Gold, arch borders',
    bg: 'linear-gradient(135deg, #5c1b0a 0%, #7c2d12 50%, #92400e 100%)' },
  { id: 'kerala_traditional', emoji: '🌿', name: 'Kerala Traditional',  desc: 'Kasavu border, red & gold',
    bg: 'linear-gradient(135deg, #4a0d0d 0%, #991b1b 50%, #92400e 100%)' },
  { id: 'modern_minimal',     emoji: '✨', name: 'Modern Minimal',      desc: 'Clean & contemporary',
    bg: 'linear-gradient(135deg, #1f2937 0%, #374151 50%, #4b5563 100%)' },
  { id: 'floral_pastel',      emoji: '🌸', name: 'Floral Pastel',       desc: 'Pink, lavender, dreamy',
    bg: 'linear-gradient(135deg, #4a0525 0%, #be185d 50%, #9d174d 100%)' },
  { id: 'cinematic_dark',     emoji: '🎬', name: 'Cinematic Dark',      desc: 'Black & gold, movie-poster',
    bg: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)' },
]

const themeMap = Object.fromEntries(THEMES.map(t => [t.id, t]))

// ── Component ─────────────────────────────────────────────────────────────────
export default function Weddings() {
  const navigate = useNavigate()
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate]     = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [form, setForm] = useState({ coupleName: '', groomName: '', brideName: '', theme: 'cinematic_dark' })
  const [formErr, setFormErr] = useState('')

  useEffect(() => {
    weddingApi.list()
      .then(setInvitations)
      .catch(() => setInvitations([]))
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async () => {
    if (!form.coupleName.trim()) { setFormErr('Couple name is required'); return }
    setFormErr('')
    setShowCreate(false)
    try {
      const inv = await weddingApi.create({ couple: form.coupleName, brideName: form.brideName, groomName: form.groomName, theme: form.theme })
      setInvitations(prev => [...prev, inv])
      setForm({ coupleName: '', groomName: '', brideName: '', theme: 'cinematic_dark' })
      navigate(`/weddings/editor/${inv.slug}`)
    } catch (e) {
      setFormErr(e?.response?.data?.detail || 'Could not create invitation')
    }
  }

  const handleDelete = async (slug) => {
    try { await weddingApi.remove(slug) } catch { /* ignore */ }
    setInvitations(prev => prev.filter(i => i.slug !== slug))
    setConfirmDelete(null)
  }

  const handlePublish = async (slug) => {
    const updated = await weddingApi.publish(slug).catch(() => null)
    if (updated) setInvitations(prev => prev.map(i => i.slug === slug ? updated : i))
  }

  return (
    <div className="min-h-screen bg-[#060412] text-white">

      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="bg-orb orb-purple" style={{ opacity: 0.12 }} />
        <div className="bg-orb orb-blue"   style={{ opacity: 0.09 }} />
        <div className="grid-lines" />
      </div>

      {/* Header */}
      <header className="relative sticky top-0 z-20 border-b border-white/[0.06] bg-[#060412]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/home')}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-white/40 hover:text-white/80 hover:bg-white/[0.07] transition-all duration-200"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <img src={logo} alt="" className="w-6 h-6 opacity-70" />
              <span className="text-white/40 text-[13px]">/</span>
              <span className="text-white font-semibold text-[15px]">Wedding Invitations</span>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-semibold text-white transition-all duration-200 hover:-translate-y-px active:translate-y-0"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 4px 16px rgba(124,58,237,0.35)' }}
          >
            <span className="text-[16px] leading-none font-light">+</span>
            New Invitation
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="relative max-w-6xl mx-auto px-5 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-28">
            <div className="w-7 h-7 border border-purple-500/40 border-t-purple-500 rounded-full animate-spin" />
          </div>
        ) : invitations.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5 text-[32px]"
              style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.18)' }}>
              💍
            </div>
            <h2 className="text-white font-bold text-[22px] mb-2 tracking-tight">No invitations yet</h2>
            <p className="text-white/40 text-[14px] mb-8 max-w-xs leading-relaxed">
              Create your first digital wedding invitation and share it with your guests
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-full text-[14px] font-semibold text-white transition-all duration-200 hover:-translate-y-px"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 4px 24px rgba(124,58,237,0.38)' }}
            >
              <span className="text-[18px] leading-none font-light">+</span>
              Create First Invitation
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {invitations.map(inv => {
              const t = themeMap[inv.theme] || THEMES[4]
              const isLive = inv.is_published
              return (
                <div key={inv.slug} className="glass-card overflow-hidden group hover:border-white/20 transition-all duration-300 hover:-translate-y-1">
                  {/* Cover area */}
                  {(() => {
                    const photoFilters = {
                      royal_mughal:       'sepia(0.5) contrast(1.1) brightness(0.75)',
                      kerala_traditional: 'saturate(0.8) sepia(0.25) contrast(1.05) brightness(0.75)',
                      modern_minimal:     'grayscale(0.4) contrast(1.2) brightness(0.75)',
                      floral_pastel:      'saturate(1.1) hue-rotate(330deg) brightness(0.75)',
                      cinematic_dark:     'grayscale(0.6) contrast(1.3) brightness(0.65)',
                    }
                    const pf = photoFilters[inv.theme] || photoFilters.cinematic_dark
                    const coverPhoto = inv.thumbnail || null
                    return (
                      <div className="relative h-44 flex flex-col items-center justify-center gap-1 overflow-hidden" style={{ background: t.bg }}>
                        {/* Photo if available */}
                        {coverPhoto && (
                          <>
                            <img src={coverPhoto} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: pf }} />
                            {/* Cinematic overlay */}
                            <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, rgba(0,0,0,0.18) 0%, transparent 40%, rgba(0,0,0,0.72) 100%)` }} />
                            {/* Vignette */}
                            <div className="absolute inset-0" style={{ boxShadow: '0 0 60px rgba(0,0,0,0.7) inset' }} />
                          </>
                        )}
                        {/* Decorative circles (shown when no photo) */}
                        {!coverPhoto && (
                          <>
                            <div className="absolute w-48 h-48 rounded-full border border-white/[0.06] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-100 group-hover:scale-110 transition-transform duration-700" />
                            <div className="absolute w-32 h-32 rounded-full border border-white/[0.08] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                          </>
                        )}
                        <span className="text-4xl relative z-10">{t.emoji}</span>
                        <p className="text-white/70 text-[11px] tracking-[0.2em] uppercase relative z-10" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}>{t.name}</p>
                        {/* Status badge */}
                        <div className="absolute top-3 right-3 z-10">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider
                            ${isLive
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/18 text-amber-400 border border-amber-500/25'}`}>
                            {isLive ? '● LIVE' : '○ DRAFT'}
                          </span>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="text-white font-bold text-[15px] mb-1 truncate">{inv.couple}</h3>
                    <p className="text-white/35 text-[12px] mb-3">
                      {t.name}&nbsp;·&nbsp;{inv.views} {inv.views === 1 ? 'view' : 'views'}&nbsp;·&nbsp;
                      {new Date(inv.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => navigate(`/weddings/editor/${inv.slug}`)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-semibold text-white transition-all duration-200 hover:-translate-y-px"
                        style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={() => window.open(`/invite/${inv.slug}`, '_blank')}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-semibold text-white/60 hover:text-white bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] hover:border-white/[0.15] transition-all duration-200"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                        </svg>
                        Preview
                      </button>
                      {!isLive && (
                        <button
                          onClick={() => handlePublish(inv.slug)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all duration-200 hover:-translate-y-px"
                          style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12l5 5L20 7"/>
                          </svg>
                          Publish
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmDelete(inv.slug)}
                        className="ml-auto w-7 h-7 flex items-center justify-center rounded-full text-white/25 hover:text-rose-400 hover:bg-rose-500/[0.08] transition-all duration-200"
                      >
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

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ animation: 'modal-bg-in 0.2s ease both' }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
          <div className="relative glass-card w-full max-w-[360px] p-6 text-center"
            style={{ borderRadius: '36px', animation: 'modal-card-in 0.28s cubic-bezier(0.34,1.38,0.64,1) both' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.22)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </div>
            <h3 className="text-white font-bold text-[16px] mb-1">Delete Invitation?</h3>
            <p className="text-white/40 text-[13px] mb-6 leading-relaxed">
              This will permanently delete the invitation and all its photos. This cannot be undone.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-6 py-2.5 rounded-full text-[13px] font-semibold text-white/60 hover:text-white/90 bg-white/[0.055] hover:bg-white/[0.09] border border-white/[0.09] hover:border-white/[0.16] transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="px-6 py-2.5 rounded-full text-[13px] font-semibold text-white transition-all duration-200 hover:-translate-y-px"
                style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', boxShadow: '0 4px 16px rgba(220,38,38,0.35)' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ animation: 'modal-bg-in 0.22s ease both' }}>
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setShowCreate(false)} />

          <div className="relative glass-card w-full max-w-[460px] p-6"
            style={{ borderRadius: '36px', animation: 'modal-card-in 0.3s cubic-bezier(0.34,1.38,0.64,1) both' }}>

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg"
                  style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.22)' }}>
                  💍
                </div>
                <h2 className="text-white font-bold text-[17px]">New Invitation</h2>
              </div>
              <button
                onClick={() => setShowCreate(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-white/35 hover:text-white hover:bg-white/[0.08] transition-all duration-150"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Couple Name */}
              <div className="field-group">
                <label className="field-label">Couple Name <span className="text-rose-400 normal-case font-normal">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Priya & Arjun"
                  className="glass-input"
                  value={form.coupleName}
                  onChange={e => { setForm(f => ({ ...f, coupleName: e.target.value })); setFormErr('') }}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                />
                {formErr && <p className="text-rose-400 text-[11px] mt-1">{formErr}</p>}
              </div>

              {/* Groom / Bride */}
              <div className="grid grid-cols-2 gap-3">
                <div className="field-group">
                  <label className="field-label">Groom's Name</label>
                  <input type="text" placeholder="Arjun" className="glass-input"
                    value={form.groomName} onChange={e => setForm(f => ({ ...f, groomName: e.target.value }))} />
                </div>
                <div className="field-group">
                  <label className="field-label">Bride's Name</label>
                  <input type="text" placeholder="Priya" className="glass-input"
                    value={form.brideName} onChange={e => setForm(f => ({ ...f, brideName: e.target.value }))} />
                </div>
              </div>

              {/* Theme picker */}
              <div className="field-group">
                <label className="field-label">Choose a Theme <span className="text-rose-400 normal-case font-normal">*</span></label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {THEMES.map(theme => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, theme: theme.id }))}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-150 text-left
                        ${form.theme === theme.id
                          ? 'bg-purple-500/12 border-purple-500/45'
                          : 'bg-white/[0.03] border-white/[0.07] hover:bg-white/[0.055] hover:border-white/[0.12]'
                        }`}
                    >
                      <div className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-sm"
                        style={{ background: theme.bg }}>
                        {theme.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[12px] font-semibold truncate leading-tight ${form.theme === theme.id ? 'text-white' : 'text-white/70'}`}>
                          {theme.name}
                        </p>
                        <p className="text-[10px] text-white/28 truncate">{theme.desc}</p>
                      </div>
                      {form.theme === theme.id && (
                        <span className="text-purple-400 shrink-0">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6L9 17l-5-5"/>
                          </svg>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-center gap-2.5 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="px-7 py-2.5 rounded-full text-[13.5px] font-semibold text-white/60 hover:text-white/90
                  bg-white/[0.055] hover:bg-white/[0.09] border border-white/[0.09] hover:border-white/[0.16]
                  transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!form.coupleName.trim()}
                className="px-7 py-2.5 rounded-full text-[13.5px] font-semibold text-white transition-all duration-200 hover:-translate-y-px active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 4px 16px rgba(124,58,237,0.35)' }}
              >
                Create →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
