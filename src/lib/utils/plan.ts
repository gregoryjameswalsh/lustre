// Client-safe plan utilities — no server-only imports.
import type { Plan } from '@/lib/types'

export const PLAN_ORDER: Record<Plan, number> = {
  free: 0,
  starter: 1,
  professional: 2,
  business: 3,
  enterprise: 4,
}

export function planAtLeast(current: Plan, required: Plan): boolean {
  return PLAN_ORDER[current] >= PLAN_ORDER[required]
}
