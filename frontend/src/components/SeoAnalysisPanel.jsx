import { useState, useEffect, useMemo } from 'react'
import { analyzeSeo } from '../lib/seoAnalysis'

// Yoast/RankMath-style "SEO" tab: Google snippet preview, focus keyword
// input, live traffic-light SEO + readability scores, and the checklist
// that explains each score. All analysis runs client-side (see
// frontend/src/lib/seoAnalysis.js) — no network round-trip while typing.
//
// This is intentionally presentational + self-contained rather than wired
// into the editor's own `inv` state object: SEO settings live in a separate
// SeoMetaOverride row (see app/routers/invitations.py's / birthday.py's
// seo-settings endpoints), not on the CoupleWebsite/BirthdayPage row itself,
// so it fetches and saves independently via the `load`/`save` props.
//
// Props:
//   slug            - the page's slug (for the snippet preview URL)
//   pathPrefix       - "/invite" or "/birthday"
//   siteUrl          - e.g. "https://planazo.in"
//   fallbackTitle    - auto-generated title shown when no override is set
//   fallbackDescription - auto-generated description shown when no override is set
//   content          - plain-text blob (bio/story/etc.) to run keyword + readability checks against
//   load()           - async () => { title, meta_description, focus_keyword }
//   save(body)       - async (body) => void — body is { title, meta_description, focus_keyword }

const RATING_COLOR = {
  good: { text: '#5eead4', bg: 'rgba(20,184,166,0.14)', border: 'rgba(20,184,166,0.30)', dot: '#2dd4bf' },
  ok:   { text: '#fcd34d', bg: 'rgba(245,158,11,0.14)', border: 'rgba(245,158,11,0.30)', dot: '#fbbf24' },
  bad:  { text: '#fda4af', bg: 'rgba(244,63,94,0.14)',  border: 'rgba(244,63,94,0.30)',  dot: '#fb7185' },
}

function ScoreDial({ label, score, rating }) {
  const c = RATING_COLOR[rating]
  const circumference = 2 * Math.PI * 26
  const offset = circumference * (1 - score / 100)
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-[64px] h-[64px]">
        <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
          <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
          <circle cx="32" cy="32" r="26" fill="none" stroke={c.dot} strokeWidth="6"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.4s ease' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-[15px] font-bold text-white">
          {score}
        </div>
      </div>
      <span className="text-white/45 text-[11px] font-semibold tracking-wide">{label}</span>
    </div>
  )
}

function CheckRow({ check }) {
  const c = RATING_COLOR[check.status]
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <span className="mt-1.5 w-[7px] h-[7px] rounded-full shrink-0" style={{ background: c.dot }} />
      <p className="text-[12.5px] text-white/60 leading-snug">{check.message}</p>
    </div>
  )
}

export default function SeoAnalysisPanel({
  slug, pathPrefix, siteUrl = 'https://planazo.in',
  fallbackTitle = '', fallbackDescription = '', content = '',
  load, save,
}) {
  const [title, setTitle] = useState('')
  const [metaDescription, setMetaDescription] = useState('')
  const [focusKeyword, setFocusKeyword] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    load()
      .then(s => {
        if (cancelled) return
        setTitle(s?.title || '')
        setMetaDescription(s?.meta_description || '')
        setFocusKeyword(s?.focus_keyword || '')
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  const effectiveTitle = title || fallbackTitle
  const effectiveDescription = metaDescription || fallbackDescription

  const analysis = useMemo(() => analyzeSeo({
    title: effectiveTitle,
    metaDescription: effectiveDescription,
    slug,
    content,
    focusKeyword,
  }), [effectiveTitle, effectiveDescription, slug, content, focusKeyword])

  const seoChecks = analysis.checks.filter(c => c.category === 'seo')
  const readabilityChecks = analysis.checks.filter(c => c.category === 'readability')

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await save({ title: title || null, meta_description: metaDescription || null, focus_keyword: focusKeyword || null })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-white/30 text-[13px] py-8 text-center">Loading SEO settings…</div>
  }

  return (
    <div className="space-y-5">

      {/* ── Google snippet preview ──────────────────────────────────── */}
      <div className="field-group">
        <label className="field-label">Search Result Preview</label>
        <div className="rounded-xl p-4" style={{ background: '#fff' }}>
          <p className="text-[13px] leading-tight" style={{ color: '#202124' }}>
            {siteUrl.replace(/^https?:\/\//, '')} › {pathPrefix.replace(/^\//, '')} › {slug}
          </p>
          <p className="text-[18px] leading-snug mt-0.5 truncate" style={{ color: '#1a0dab' }}>
            {effectiveTitle || 'Untitled page'}
          </p>
          <p className="text-[13.5px] leading-snug mt-0.5 line-clamp-2" style={{ color: '#4d5156' }}>
            {effectiveDescription || 'No description set yet.'}
          </p>
        </div>
      </div>

      {/* ── Editable fields ──────────────────────────────────────────── */}
      <div className="field-group">
        <label className="field-label">SEO Title <span className="text-white/25 font-normal normal-case">(leave blank to use the auto-generated one)</span></label>
        <input className="glass-input" placeholder={fallbackTitle} value={title} onChange={e => setTitle(e.target.value)} maxLength={70} />
      </div>
      <div className="field-group">
        <label className="field-label">Meta Description <span className="text-white/25 font-normal normal-case">(leave blank to use the auto-generated one)</span></label>
        <textarea className="glass-input" rows={3} placeholder={fallbackDescription} value={metaDescription} onChange={e => setMetaDescription(e.target.value)} maxLength={160} />
      </div>
      <div className="field-group">
        <label className="field-label">Focus Keyword</label>
        <input className="glass-input" placeholder="e.g. Priya Arjun wedding" value={focusKeyword} onChange={e => setFocusKeyword(e.target.value)} />
      </div>

      {/* ── Scores ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-8 py-2">
        <ScoreDial label="SEO" score={analysis.seoScore} rating={analysis.seoRating} />
        <ScoreDial label="Readability" score={analysis.readabilityScore} rating={analysis.readabilityRating} />
      </div>

      {/* ── Checklists ────────────────────────────────────────────────── */}
      <div className="field-group">
        <label className="field-label">SEO Analysis</label>
        <div className="rounded-xl px-3.5 py-1" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {seoChecks.map(c => <CheckRow key={c.id} check={c} />)}
        </div>
      </div>
      <div className="field-group">
        <label className="field-label">Readability</label>
        <div className="rounded-xl px-3.5 py-1" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {readabilityChecks.map(c => <CheckRow key={c.id} check={c} />)}
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full py-2.5 rounded-xl text-[13.5px] font-semibold text-white transition-all duration-200 hover:-translate-y-px active:translate-y-0 flex items-center justify-center gap-2 disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow: '0 4px 16px rgba(124,58,237,0.28)' }}>
        {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save SEO Settings'}
      </button>
    </div>
  )
}
