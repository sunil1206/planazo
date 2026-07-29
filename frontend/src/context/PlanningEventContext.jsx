import { useState, useEffect, useCallback, useMemo } from 'react'
import { planningApi } from '../lib/planningApi'
import { getErrorMessage } from '../lib/api'
import { PlanningEventContext } from './planningEventContextObject'

const STORAGE_KEY = 'planazo_planning_event'

function readStoredSelection() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return { eventType: null, eventId: null }
    const parsed = JSON.parse(raw)
    if (parsed?.eventType && parsed?.eventId) return parsed
  } catch { /* corrupt/blocked storage — fall back to no selection */ }
  return { eventType: null, eventId: null }
}

// Single source of truth for "which event is Planning Suite currently managing".
// Every tab (Checklist, Budget, Guest List, My Vendors, Find Vendors, and the
// persistent PlanningEventCard header) reads from here instead of re-deriving
// eventType/eventId from the URL themselves, so switching events refreshes
// everything at once with no prop drilling and no stale-tab bugs.
export function PlanningEventProvider({ children }) {
  const [selection, setSelection] = useState(readStoredSelection)
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const { eventType, eventId } = selection

  useEffect(() => {
    try {
      if (eventType && eventId) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ eventType, eventId }))
      } else {
        sessionStorage.removeItem(STORAGE_KEY)
      }
    } catch { /* storage may be unavailable (private mode) — selection just won't survive a hard refresh */ }
  }, [eventType, eventId])

  const selectEvent = useCallback((type, id) => {
    setDashboard(null)
    setError(null)
    setSelection({ eventType: type, eventId: id })
  }, [])

  const clearEvent = useCallback(() => {
    setDashboard(null)
    setError(null)
    setSelection({ eventType: null, eventId: null })
  }, [])

  // Bump to force every tab (and this dashboard) to reload — used after an
  // action in one tab that should be reflected in another (e.g. a new budget
  // item changing the Overview's stats).
  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])

  const loadDashboard = useCallback(async () => {
    if (!eventType || !eventId) return
    setLoading(true)
    setError(null)
    try {
      const data = await planningApi.dashboard(eventType, eventId)
      setDashboard(data)
    } catch (e) {
      setError(getErrorMessage(e, 'Could not load this event.'))
      setDashboard(null)
    } finally {
      setLoading(false)
    }
  }, [eventType, eventId])

  useEffect(() => {
    if (eventType && eventId) loadDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventType, eventId, refreshKey])

  const value = useMemo(() => ({
    eventType, eventId, dashboard, loading, error,
    hasSelection: Boolean(eventType && eventId),
    selectEvent, clearEvent, refresh, retry: loadDashboard,
  }), [eventType, eventId, dashboard, loading, error, selectEvent, clearEvent, refresh, loadDashboard])

  return (
    <PlanningEventContext.Provider value={value}>
      {children}
    </PlanningEventContext.Provider>
  )
}
