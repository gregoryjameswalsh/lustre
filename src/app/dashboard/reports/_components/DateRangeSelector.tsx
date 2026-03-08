'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import type { Plan } from '@/lib/types'
import { planAtLeast } from '@/lib/utils/plan'

interface Option {
  days: number
  label: string
  required: Plan
}

const OPTIONS: Option[] = [
  { days: 30, label: '30 days', required: 'starter' },
  { days: 90, label: '90 days', required: 'professional' },
]

interface Props {
  activeDays: number
  plan: Plan
}

export default function DateRangeSelector({ activeDays, plan }: Props) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function hrefFor(days: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('days', String(days))
    return `${pathname}?${params.toString()}`
  }

  const available = OPTIONS.filter(o => planAtLeast(plan, o.required))
  const locked    = OPTIONS.filter(o => !planAtLeast(plan, o.required))

  // If only one option exists, no point rendering a toggle
  if (available.length <= 1 && locked.length === 0) return null

  return (
    <div className="inline-flex items-center bg-zinc-100 rounded-lg p-0.5 gap-0.5">
      {available.map(o => (
        <Link
          key={o.days}
          href={hrefFor(o.days)}
          replace
          className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors tracking-wide ${
            activeDays === o.days
              ? 'bg-white text-zinc-900 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-700'
          }`}
        >
          {o.label}
        </Link>
      ))}
      {locked.map(o => (
        <Link
          key={o.days}
          href="/dashboard/settings/billing"
          className="text-xs font-medium px-3 py-1.5 rounded-md text-zinc-300 cursor-pointer hover:text-zinc-400 transition-colors tracking-wide flex items-center gap-1"
          title={`Upgrade to Professional to unlock ${o.label} view`}
        >
          {o.label}
          <span className="text-[9px] font-semibold tracking-[0.1em] uppercase text-[#3D7A5F] bg-[#C8F5D7] px-1 py-0.5 rounded-full">
            Pro
          </span>
        </Link>
      ))}
    </div>
  )
}
