'use client'

import { useState } from 'react'
import type { MonthlyWinRate } from '@/lib/queries/analytics'

interface Props {
  data: MonthlyWinRate[]
}

function formatMonth(yyyyMm: string): string {
  const [year, month] = yyyyMm.split('-')
  return new Date(Number(year), Number(month) - 1, 1)
    .toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
}

export default function WinLossTrend({ data }: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const hasData = data.some(d => d.accepted > 0 || d.declined > 0)
  const CHART_H = 100

  if (!hasData) {
    return (
      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-medium tracking-tight text-zinc-900">Win Rate Trend</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Trailing 12 months</p>
        </div>
        <div className="px-6 py-10 text-center">
          <p className="text-xs text-zinc-300 tracking-wide">No decided quotes in the last 12 months</p>
        </div>
      </div>
    )
  }

  const hovered = hoveredIndex !== null ? data[hoveredIndex] : null

  // Overall win rate for the period
  const totalAccepted = data.reduce((s, d) => s + d.accepted, 0)
  const totalDeclined = data.reduce((s, d) => s + d.declined, 0)
  const overallRate = (totalAccepted + totalDeclined) > 0
    ? Math.round((totalAccepted / (totalAccepted + totalDeclined)) * 100)
    : null

  return (
    <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium tracking-tight text-zinc-900">Win Rate Trend</h2>
          {hovered ? (
            <p className="text-xs text-zinc-400 mt-0.5">
              {formatMonth(hovered.month)}{' '}
              {hovered.winRate !== null
                ? <span className="text-zinc-900 font-medium">{Math.round(hovered.winRate * 100)}%</span>
                : <span className="text-zinc-300">No data</span>
              }
              {hovered.winRate !== null && (
                <span className="ml-2 text-zinc-300">
                  {hovered.accepted}W / {hovered.declined}L
                </span>
              )}
            </p>
          ) : (
            <p className="text-xs text-zinc-400 mt-0.5">
              Trailing 12 months
              {overallRate !== null && (
                <span className="ml-2">
                  Overall: <span className="text-zinc-900 font-medium">{overallRate}%</span>
                  <span className="text-zinc-300 ml-1">({totalAccepted}W / {totalDeclined}L)</span>
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="px-6 pt-4 pb-2">
        <div className="flex gap-3">
          {/* Y-axis */}
          <div
            className="flex flex-col justify-between text-right flex-shrink-0"
            style={{ height: CHART_H }}
          >
            <span className="text-[10px] text-zinc-300 leading-none">100%</span>
            <span className="text-[10px] text-zinc-300 leading-none">50%</span>
            <span className="text-[10px] text-zinc-300 leading-none">0%</span>
          </div>

          {/* Bars */}
          <div className="flex-1 relative">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              <div className="border-t border-zinc-100 w-full" />
              <div className="border-t border-dashed border-zinc-100 w-full" />
              <div className="border-t border-zinc-100 w-full" />
            </div>

            <div className="relative flex items-end gap-1" style={{ height: CHART_H }}>
              {data.map((d, i) => {
                const isHovered = hoveredIndex === i
                const hasValue = d.winRate !== null
                const heightPct = hasValue ? d.winRate! * 100 : 0

                // Colour: >50% green, <50% red, null/zero neutral
                let barColor = '#D4D4D8'
                if (hasValue && d.winRate! >= 0.5) barColor = isHovered ? '#1A3329' : '#3D7A5F'
                else if (hasValue && d.winRate! < 0.5) barColor = isHovered ? '#991B1B' : '#FCA5A5'

                return (
                  <div
                    key={d.month}
                    className="flex-1 flex items-end cursor-crosshair"
                    style={{ height: '100%' }}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    <div
                      className="w-full rounded-t-sm transition-colors duration-75"
                      style={{
                        height: hasValue ? `${Math.max(heightPct, 2)}%` : '2px',
                        backgroundColor: barColor,
                      }}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* X-axis labels — every other month to avoid crowding */}
        <div className="flex mt-1 pl-10">
          {data.map((d, i) => (
            <div key={d.month} className="flex-1 relative">
              {i % 2 === 0 && (
                <span
                  className="absolute text-[9px] text-zinc-300 whitespace-nowrap"
                  style={{ transform: 'translateX(-50%)', left: '50%' }}
                >
                  {formatMonth(d.month)}
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="h-5" />
      </div>

      {/* Legend */}
      <div className="px-6 pb-4 flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#3D7A5F] inline-block" />
          ≥50% win rate
        </span>
        <span className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#FCA5A5] inline-block" />
          &lt;50% win rate
        </span>
        <span className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span className="w-2.5 h-2.5 rounded-sm bg-zinc-200 inline-block" />
          No data
        </span>
      </div>
    </div>
  )
}
