'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import type { Plan } from '@/lib/types'
import { planAtLeast } from '@/lib/utils/plan'

interface Props {
  plan: Plan
  required: Plan
  feature: string
  description: string
  children: ReactNode
}

const PLAN_LABELS: Record<Plan, string> = {
  free: 'Free',
  starter: 'Starter',
  professional: 'Professional',
  business: 'Business',
  enterprise: 'Enterprise',
}

export default function UpgradeGate({ plan, required, feature, description, children }: Props) {
  if (planAtLeast(plan, required)) {
    return <>{children}</>
  }

  return (
    <div className="relative rounded-lg overflow-hidden border border-zinc-200">
      {/* Blurred content beneath overlay */}
      <div className="pointer-events-none select-none blur-[3px] opacity-60" aria-hidden>
        {children}
      </div>

      {/* Frosted overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-[2px] px-6 py-8">
        <span className="text-[10px] font-semibold tracking-[0.25em] uppercase text-[#3D7A5F] mb-2">
          {PLAN_LABELS[required]} Feature
        </span>
        <h3 className="text-sm font-medium text-zinc-900 text-center mb-1">{feature}</h3>
        <p className="text-xs text-zinc-500 text-center max-w-xs mb-4">{description}</p>
        <Link
          href="/dashboard/settings/billing"
          className="text-xs font-medium tracking-[0.15em] uppercase bg-[#1A3329] text-white px-5 py-2.5 rounded-lg hover:bg-[#3D7A5F] transition-colors"
        >
          Upgrade to {PLAN_LABELS[required]}
        </Link>
      </div>
    </div>
  )
}
