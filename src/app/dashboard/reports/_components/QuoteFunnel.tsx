'use client'

import type { QuoteFunnelStage } from '@/lib/queries/analytics'

const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })

interface Props {
  stages: QuoteFunnelStage[]
  days: number
}

function pct(a: number, b: number): string {
  if (b === 0) return '—'
  return `${Math.round((a / b) * 100)}%`
}

export default function QuoteFunnel({ stages, days }: Props) {
  const byStatus = Object.fromEntries(stages.map(s => [s.status, s]))

  const sent     = byStatus['sent']     ?? { count: 0, totalValue: 0 }
  const viewed   = byStatus['viewed']   ?? { count: 0, totalValue: 0 }
  const accepted = byStatus['accepted'] ?? { count: 0, totalValue: 0 }
  const declined = byStatus['declined'] ?? { count: 0, totalValue: 0 }
  const expired  = byStatus['expired']  ?? { count: 0, totalValue: 0 }
  const draft    = byStatus['draft']    ?? { count: 0, totalValue: 0 }

  const totalSent = sent.count + viewed.count + accepted.count + declined.count + expired.count
  const hasData = totalSent > 0

  if (!hasData) {
    return (
      <div className="bg-white border border-zinc-200 rounded-lg">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-medium tracking-tight text-zinc-900">Quote Funnel</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Last {days} days</p>
        </div>
        <div className="px-6 py-12 text-center">
          <p className="text-xs text-zinc-300 tracking-wide">No quotes sent in this period</p>
        </div>
      </div>
    )
  }

  // Main flow stages: Sent → Viewed → Accepted
  const mainFlow = [
    { label: 'Sent',     data: sent,     fromTotal: totalSent },
    { label: 'Viewed',   data: viewed,   fromTotal: sent.count },
    { label: 'Accepted', data: accepted, fromTotal: viewed.count },
  ]

  return (
    <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-100 flex items-start justify-between">
        <div>
          <h2 className="text-sm font-medium tracking-tight text-zinc-900">Quote Funnel</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Last {days} days · {totalSent} quotes sent</p>
        </div>
        {draft.count > 0 && (
          <span className="text-xs text-zinc-400 bg-zinc-50 px-2.5 py-1 rounded-full">
            {draft.count} in draft
          </span>
        )}
      </div>

      <div className="p-6">
        {/* Main conversion flow */}
        <div className="flex items-stretch gap-0">
          {mainFlow.map((stage, i) => {
            const isLast = i === mainFlow.length - 1
            const conversionFromPrev = i === 0
              ? pct(stage.data.count, stage.fromTotal)
              : pct(stage.data.count, stage.fromTotal)

            return (
              <div key={stage.label} className="flex items-stretch flex-1">
                {/* Stage card */}
                <div
                  className={`flex-1 rounded-lg p-4 ${
                    isLast
                      ? 'bg-[#1A3329] text-white'
                      : 'bg-zinc-50 text-zinc-900'
                  }`}
                >
                  <p className={`text-[10px] font-semibold tracking-[0.2em] uppercase mb-2 ${
                    isLast ? 'text-[#C8F5D7]' : 'text-zinc-400'
                  }`}>
                    {stage.label}
                  </p>
                  <p className={`text-2xl font-light tracking-tight mb-1 ${
                    isLast ? 'text-white' : 'text-zinc-900'
                  }`}>
                    {stage.data.count}
                  </p>
                  <p className={`text-xs ${isLast ? 'text-[#C8F5D7]' : 'text-zinc-400'}`}>
                    {stage.data.totalValue > 0 ? gbp.format(stage.data.totalValue) : '—'}
                  </p>
                </div>

                {/* Arrow + conversion rate */}
                {!isLast && (
                  <div className="flex flex-col items-center justify-center px-2 flex-shrink-0">
                    <span className="text-[10px] text-zinc-400 font-medium mb-1">
                      {conversionFromPrev}
                    </span>
                    <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
                      <path d="M0 5H13M10 1L14 5L10 9" stroke="#D4D4D8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Leak / exit outcomes */}
        <div className="mt-4 flex gap-3">
          <div className="flex-1 border border-zinc-100 rounded-lg p-3 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-red-300 flex-shrink-0" />
            <div>
              <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-zinc-400">Declined</p>
              <p className="text-sm font-medium text-zinc-900 mt-0.5">
                {declined.count}
                <span className="text-xs font-normal text-zinc-400 ml-1.5">
                  {pct(declined.count, totalSent)} of sent
                </span>
              </p>
            </div>
          </div>
          <div className="flex-1 border border-zinc-100 rounded-lg p-3 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-amber-300 flex-shrink-0" />
            <div>
              <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-zinc-400">Expired</p>
              <p className="text-sm font-medium text-zinc-900 mt-0.5">
                {expired.count}
                <span className="text-xs font-normal text-zinc-400 ml-1.5">
                  {pct(expired.count, totalSent)} of sent
                </span>
              </p>
            </div>
          </div>
          <div className="flex-1 border border-zinc-100 rounded-lg p-3 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#3D7A5F] flex-shrink-0" />
            <div>
              <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-zinc-400">Win Rate</p>
              <p className="text-sm font-medium text-zinc-900 mt-0.5">
                {pct(accepted.count, accepted.count + declined.count)}
                <span className="text-xs font-normal text-zinc-400 ml-1.5">
                  decided quotes
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
