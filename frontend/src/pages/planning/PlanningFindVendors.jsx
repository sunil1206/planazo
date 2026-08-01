import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { planningApi } from '../../lib/planningApi'
import { getErrorMessage } from '../../lib/api'
import { usePlanningEvent } from '../../context/usePlanningEvent'
import { ACCENT, GRADIENT, Spinner, LoadError, EmptyState, PlanningModulePage } from './shared'

function FindVendorsContent({ onBook }) {
  const [results, setResults] = useState({ items: [], total: 0 })
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState('')
  const [filters, setFilters] = useState({ category: '', city: '', verified: false, featured: false })

  const load = useCallback(() => {
    setLoading(true); setLoadErr('')
    const params = {}
    if (filters.category.trim()) params.category = filters.category.trim()
    if (filters.city.trim()) params.city = filters.city.trim()
    if (filters.verified) params.verified = true
    if (filters.featured) params.featured = true
    planningApi.searchVendors(params).then(setResults)
      .catch(e => setLoadErr(getErrorMessage(e, 'Could not search vendors.')))
      .finally(() => setLoading(false))
  }, [filters])

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t) }, [load])

  return (
    <div className="space-y-4">
      <div className="glass-card p-4 flex flex-wrap gap-2 items-center">
        <input className="glass-input flex-1 min-w-[140px]" placeholder="Category (e.g. Catering)"
          value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))} />
        <input className="glass-input flex-1 min-w-[140px]" placeholder="City"
          value={filters.city} onChange={e => setFilters(f => ({ ...f, city: e.target.value }))} />
        <label className="flex items-center gap-1.5 text-white/60 text-[12.5px]">
          <input type="checkbox" checked={filters.verified} onChange={e => setFilters(f => ({ ...f, verified: e.target.checked }))} />
          Verified only
        </label>
        <label className="flex items-center gap-1.5 text-white/60 text-[12.5px]">
          <input type="checkbox" checked={filters.featured} onChange={e => setFilters(f => ({ ...f, featured: e.target.checked }))} />
          Featured
        </label>
      </div>

      {loading ? <Spinner /> : loadErr ? <LoadError message={loadErr} onRetry={load} /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {results.items.map(v => (
            <div key={v.id} className="glass-card p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl shrink-0 overflow-hidden" style={{ background: `${v.theme_color || ACCENT}22` }}>
                {v.thumbnail && <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-[13.5px] font-medium truncate">{v.title} {v.is_verified && '✓'}</p>
                <p className="text-white/30 text-[11px]">{v.category || '—'} · {v.city || '—'}</p>
              </div>
              <button onClick={() => onBook({ vendor_id: v.id, vendor_name: v.title, category: v.category })}
                className="px-3.5 py-1.5 rounded-full text-[12px] font-semibold text-white shrink-0"
                style={{ background: GRADIENT }}>
                Book
              </button>
            </div>
          ))}
          {results.items.length === 0 && (
            <div className="col-span-2">
              <EmptyState title="No vendors match those filters." hint="Try widening your search." />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function PlanningFindVendors() {
  const { hasSelection } = usePlanningEvent()
  const navigate = useNavigate()
  return (
    <PlanningModulePage title="Find Vendors">
      {hasSelection && (
        <FindVendorsContent onBook={(v) => navigate('/planning/vendors', { state: v })} />
      )}
    </PlanningModulePage>
  )
}
