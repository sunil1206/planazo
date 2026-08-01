import { usePlanningEvent } from '../../context/usePlanningEvent'
import { PlanningModulePage } from './shared'

function OverviewTiles({ dashboard }) {
  const { stats } = dashboard
  const tiles = [
    { label: 'Tasks Done', value: `${stats.completed_tasks}/${stats.total_tasks}`, icon: '✅' },
    { label: 'Budget Spent', value: `₹${Number(stats.budget_used).toLocaleString('en-IN')}`, icon: '💰' },
    { label: 'Guests RSVP\'d', value: `${stats.accepted_guests + stats.declined_guests}/${stats.guest_count}`, icon: '👥' },
    { label: 'Vendors Confirmed', value: `${stats.confirmed_vendors}/${stats.vendor_count}`, icon: '🤝' },
  ]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {tiles.map(t => (
        <div key={t.label} className="glass-card p-4 text-center">
          <p className="text-xl mb-1">{t.icon}</p>
          <p className="text-white font-bold text-[15px] leading-none">{t.value}</p>
          <p className="text-white/35 text-[10px] mt-1.5">{t.label}</p>
        </div>
      ))}
    </div>
  )
}

export default function PlanningOverview() {
  const { dashboard } = usePlanningEvent()
  return (
    <PlanningModulePage title="Overview">
      {dashboard && <OverviewTiles dashboard={dashboard} />}
    </PlanningModulePage>
  )
}
