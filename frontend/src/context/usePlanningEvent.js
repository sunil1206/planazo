import { useContext } from 'react'
import { PlanningEventContext } from './planningEventContextObject'

export function usePlanningEvent() {
  const ctx = useContext(PlanningEventContext)
  if (!ctx) throw new Error('usePlanningEvent must be used within a PlanningEventProvider')
  return ctx
}
