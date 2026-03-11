'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import type { Plan } from '@/lib/types'
import { planAtLeast } from '@/lib/utils/plan'

type TabId = 'overview' | 'pipeline' | 'clients' | 'billing'

interface Tab {
  id: TabId
  label: string
  required: Plan
  badge?: string
}

const TABS: Tab[] = [
  { id: 'overview',  label: 'Overview',        required: 'starter' },
  { id: 'pipeline',  label: 'Pipeline',         required: 'professional', badge: 'Pro' },
  { id: 'clients',   label: 'Clients & Team',   required: 'business',     badge: 'Business' },
  { id: 'billing',   label: 'Invoices',         required: 'starter' },
]

interface Props {
  activeTab: TabId
  plan: Plan
}

export default function ReportsTabs({ activeTab, plan }: Props) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function hrefFor(tabId: TabId) {
    const params = new URLSearchParams(searchParams.toString())
    if (tabId === 'overview') {
      params.delete('tab')
    } else {
      params.set('tab', tabId)
    }
    return `${pathname}?${params.toString()}`
  }

  return (
    <div className="flex gap-1 border-b border-zinc-200">
      {TABS.map(tab => {
        const isActive = tab.id === activeTab
        const hasAccess = planAtLeast(plan, tab.required)

        return (
          <Link
            key={tab.id}
            href={hrefFor(tab.id)}
            replace
            className={`
              relative flex items-center gap-1.5 pb-3 pt-1 px-1 text-xs tracking-wide transition-colors
              ${isActive
                ? 'font-medium text-zinc-900 border-b-2 border-zinc-900 -mb-px'
                : hasAccess
                  ? 'text-zinc-400 hover:text-zinc-700'
                  : 'text-zinc-300 hover:text-zinc-400'
              }
            `}
          >
            {tab.label}
            {tab.badge && !hasAccess && (
              <span className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#3D7A5F] bg-[#C8F5D7] px-1.5 py-0.5 rounded-full">
                {tab.badge}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
