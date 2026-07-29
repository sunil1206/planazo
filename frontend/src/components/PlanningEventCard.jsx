import { usePlanningEvent } from '../context/usePlanningEvent'

const ACCENT = '#10b981'
const ACCENT2 = '#0ea5e9'
const GRADIENT = `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`

const STATUS_STYLE = {
  PLANNING:  { bg: 'rgba(168,85,247,0.15)', color: '#c4b5fd', border: 'rgba(168,85,247,0.3)' },
  UPCOMING:  { bg: 'rgba(56,189,248,0.15)', color: '#7dd3fc', border: 'rgba(56,189,248,0.3)' },
  ONGOING:   { bg: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: 'rgba(16,185,129,0.3)' },
  COMPLETED: { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', border: 'rgba(255,255,255,0.15)' },
  CANCELLED: { bg: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: 'rgba(239,68,68,0.3)' },
}

const EVENT_TYPE_META = {
  wedding:  { label: 'Wedding',  icon: '💍' },
  birthday: { label: 'Birthday', icon: '🎂' },
  custom:   { label: 'Event',    icon: '🧳' },
}

function fmtDate(d) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function SkeletonCard() {
  return (
    <div className="glass-card p-4 animate-pulse" aria-busy="true" aria-label="Loading event">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-white/[0.06] shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-40 rounded bg-white/[0.07]" />
          <div className="h-3 w-56 rounded bg-white/[0.05]" />
        </div>
      </div>
    </div>
  )
}

function ErrorCard({ message, onRetry }) {
  return (
    <div className="glass-card p-4 flex items-center gap-3" role="alert">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
        ⚠️
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-[13.5px] font-medium">Couldn't load this event</p>
        <p className="text-white/40 text-[11.5px] truncate">{message}</p>
      </div>
      <button onClick={onRetry}
        className="px-3.5 py-1.5 rounded-full text-[12px] font-semibold text-white shrink-0 transition-all duration-200 hover:-translate-y-px"
        style={{ background: GRADIENT }}>
        Retry
      </button>
    </div>
  )
}

/**
 * Persistent header shown at the top of every Planning Suite page (Overview,
 * Checklist, Budget, Guest List, My Vendors, Find Vendors) so the user never
 * loses track of which event they're managing. Reads entirely from
 * PlanningEventContext — no props needed at call sites.
 */
export default function PlanningEventCard() {
  const { eventType, dashboard, loading, error, clearEvent, retry } = usePlanningEvent()

  if (loading && !dashboard) return <SkeletonCard />
  if (error) return <ErrorCard message={error} onRetry={retry} />
  if (!dashboard) return null

  const { event, stats } = dashboard
  const st = STATUS_STYLE[event.status] || STATUS_STYLE.PLANNING
  const meta = EVENT_TYPE_META[eventType] || EVENT_TYPE_META.custom
  const dateLabel = fmtDate(event.event_date)

  return (
    <div className="glass-card p-4 sm:p-5">
      <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
        <div className="w-14 h-14 rounded-2xl shrink-0 overflow-hidden flex items-center justify-center text-2xl"
          style={{ background: `linear-gradient(135deg, ${ACCENT}33, ${ACCENT2}18)` }}>
          {event.cover_image ? <img src={event.cover_image} alt="" className="w-full h-full object-cover" /> : meta.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h2 className="text-white font-bold text-[16px] truncate">{event.title}</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider border shrink-0"
              style={{ background: st.bg, color: st.color, borderColor: st.border }}>
              {event.status}
            </span>
          </div>
          <p className="text-white/40 text-[12px] flex items-center gap-1.5 flex-wrap">
            <span>{meta.icon} {meta.label}</span>
            {dateLabel && <><span className="text-white/20">·</span><span>{dateLabel}</span></>}
            {event.location && <><span className="text-white/20">·</span><span>📍 {event.location}</span></>}
          </p>
        </div>

        <button onClick={clearEvent}
          className="px-3.5 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all duration-200 hover:-translate-y-px shrink-0"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.75)' }}
          aria-label="Switch to a different event">
          ⇄ Switch Event
        </button>
      </div>

      {stats && (
        <div className="mt-4 space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-white/35 text-[10.5px] font-semibold tracking-widest uppercase">Progress</p>
              <p className="text-white text-[11.5px] font-semibold">{stats.completion_percentage}%</p>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full rounded-full transition-all duration-300"
                style={{ width: `${stats.completion_percentage}%`, background: GRADIENT }} />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <p className="text-white text-[13px] font-bold leading-none">
                ₹{Number(stats.budget_remaining).toLocaleString('en-IN')}
              </p>
              <p className="text-white/35 text-[10px] mt-1">
                Budget left of ₹{Number(stats.budget_total).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <p className="text-white text-[13px] font-bold leading-none">
                {stats.accepted_guests}/{stats.guest_count}
              </p>
              <p className="text-white/35 text-[10px] mt-1">Guests confirmed</p>
            </div>
            <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <p className="text-white text-[13px] font-bold leading-none">
                {stats.confirmed_vendors}/{stats.vendor_count}
              </p>
              <p className="text-white/35 text-[10px] mt-1">Vendors confirmed</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
