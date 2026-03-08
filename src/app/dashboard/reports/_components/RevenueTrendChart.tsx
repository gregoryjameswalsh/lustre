'use client'

import { useState } from 'react'
import type { TrendPoint, RevenueBasis } from '@/lib/queries/analytics'

const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })

interface Props {
  data: TrendPoint[]
  basis: RevenueBasis
  groupBy?: 'day' | 'week'
  days: number
}

function formatDateLabel(iso: string, groupBy: 'day' | 'week'): string {
  const d = new Date(iso + 'T00:00:00')
  if (groupBy === 'week') {
    return `w/c ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
  }
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function RevenueTrendChart({ data, basis, groupBy = 'day', days }: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const hasRevenue = data.some(d => d.revenue > 0)

  if (!hasRevenue) {
    return (
      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-medium tracking-tight text-zinc-900">
            Revenue — Last {days} Days
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <p className="text-xs text-zinc-300 tracking-wide text-center">
            {basis === 'earned'
              ? 'Complete your first job to start tracking revenue'
              : 'Accept your first quote to start tracking committed revenue'}
          </p>
        </div>
      </div>
    )
  }

  const maxRevenue = Math.max(...data.map(d => d.revenue), 1)
  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0)
  const CHART_H = 120
  const yMid = maxRevenue / 2

  function formatShort(v: number) {
    if (v >= 1000) return `£${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`
    return `£${Math.round(v)}`
  }

  // Show date labels at sensible intervals
  const labelIndices = new Set<number>()
  labelIndices.add(0)
  const step = groupBy === 'week' ? 4 : 7
  for (let i = step; i < data.length; i += step) labelIndices.add(i)
  labelIndices.add(data.length - 1)

  const hovered = hoveredIndex !== null ? data[hoveredIndex] : null

  return (
    <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium tracking-tight text-zinc-900">
            Revenue — Last {days} Days
          </h2>
          {hovered ? (
            <p className="text-xs text-zinc-400 mt-0.5">
              {formatDateLabel(hovered.date, groupBy)}{' '}
              <span className="text-zinc-900 font-medium">{gbp.format(hovered.revenue)}</span>
            </p>
          ) : (
            <p className="text-xs text-zinc-400 mt-0.5">
              Total: <span className="text-zinc-900 font-medium">{gbp.format(totalRevenue)}</span>
              {groupBy === 'week' && <span className="ml-1 text-zinc-300">· weekly</span>}
            </p>
          )}
        </div>
      </div>

      <div className="px-6 pt-4 pb-2">
        <div className="flex gap-3">
          {/* Y-axis labels */}
          <div
            className="flex flex-col justify-between text-right flex-shrink-0"
            style={{ height: CHART_H }}
          >
            <span className="text-[10px] text-zinc-300 leading-none">{formatShort(maxRevenue)}</span>
            <span className="text-[10px] text-zinc-300 leading-none">{formatShort(yMid)}</span>
            <span className="text-[10px] text-zinc-300 leading-none">£0</span>
          </div>

          {/* Bars */}
          <div className="flex-1 relative">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              <div className="border-t border-zinc-100 w-full" />
              <div className="border-t border-zinc-100 w-full" />
              <div className="border-t border-zinc-100 w-full" />
            </div>

            <div className="relative flex items-end gap-px" style={{ height: CHART_H }}>
              {data.map((d, i) => {
                const heightPct = maxRevenue > 0 ? (d.revenue / maxRevenue) * 100 : 0
                const isHovered = hoveredIndex === i
                const hasValue = d.revenue > 0

                return (
                  <div
                    key={d.date}
                    className="flex-1 flex items-end cursor-crosshair"
                    style={{ height: '100%' }}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    <div
                      className="w-full rounded-t-sm transition-colors duration-75"
                      style={{
                        height: hasValue ? `${Math.max(heightPct, 1)}%` : '2px',
                        backgroundColor: isHovered
                          ? '#1A3329'
                          : hasValue
                          ? '#3D7A5F'
                          : '#F4F4F5',
                      }}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* X-axis labels */}
        <div className="flex mt-1 pl-10">
          {data.map((d, i) => (
            <div key={d.date} className="flex-1 relative">
              {labelIndices.has(i) && (
                <span
                  className="absolute text-[9px] text-zinc-300 whitespace-nowrap"
                  style={{ transform: 'translateX(-50%)', left: '50%' }}
                >
                  {formatDateLabel(d.date, groupBy)}
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="h-4" />
      </div>
    </div>
  )
}
