import type { TeamMemberPerformance } from '@/lib/queries/analytics'

const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })

function getInitials(name: string): string {
  const parts = name.trim().split(' ').filter(Boolean)
  if (parts.length === 0) return '?'
  return parts.length === 1
    ? parts[0][0].toUpperCase()
    : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

interface Props {
  members: TeamMemberPerformance[]
  days: number
}

export default function TeamPerformanceChart({ members, days }: Props) {
  if (members.length === 0) {
    return (
      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-medium tracking-tight text-zinc-900">Team Performance</h2>
        </div>
        <div className="px-6 py-10 text-center">
          <p className="text-xs text-zinc-300 tracking-wide">
            No completed jobs with an assigned team member in this period
          </p>
        </div>
      </div>
    )
  }

  const maxRevenue = Math.max(...members.map(m => m.totalRevenue), 1)
  const totalRevenue = members.reduce((s, m) => s + m.totalRevenue, 0)
  const totalJobs = members.reduce((s, m) => s + m.jobCount, 0)

  const periodLabel = days >= 365 ? '12 months'
    : days >= 180 ? '6 months'
    : days >= 90  ? '90 days'
    : '30 days'

  return (
    <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium tracking-tight text-zinc-900">Team Performance</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Last {periodLabel} · {totalJobs} jobs · {gbp.format(totalRevenue)} total
          </p>
        </div>
        <span className="text-[10px] text-zinc-300 tracking-wide uppercase font-medium">Admin only</span>
      </div>

      <div className="divide-y divide-zinc-50">
        {members.map((m, i) => {
          const barWidth = maxRevenue > 0 ? (m.totalRevenue / maxRevenue) * 100 : 0
          const share = totalRevenue > 0 ? Math.round((m.totalRevenue / totalRevenue) * 100) : 0

          return (
            <div key={m.profileId} className="px-6 py-4">
              <div className="flex items-center gap-3 mb-2">
                {/* Rank + avatar */}
                <span className="text-xs text-zinc-300 w-4 flex-shrink-0 font-medium">{i + 1}</span>
                <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center text-[10px] font-medium text-zinc-600 flex-shrink-0">
                  {getInitials(m.name)}
                </div>
                <span className="text-sm font-medium text-zinc-900 flex-1">{m.name}</span>
                <div className="text-right">
                  <span className="text-sm font-medium text-zinc-900">
                    {m.totalRevenue > 0 ? gbp.format(m.totalRevenue) : '—'}
                  </span>
                  <span className="text-xs text-zinc-400 ml-1.5">{share}%</span>
                </div>
              </div>
              {/* Revenue bar */}
              <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden ml-14 mb-1.5">
                <div
                  className="h-full bg-[#3D7A5F] rounded-full"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <p className="text-xs text-zinc-400 ml-14">
                {m.jobCount} {m.jobCount === 1 ? 'job' : 'jobs'} · avg {gbp.format(m.avgJobValue)}
              </p>
            </div>
          )
        })}
      </div>

      <div className="px-6 py-3 bg-zinc-50 border-t border-zinc-100 flex justify-between">
        <span className="text-xs text-zinc-400">Team total</span>
        <span className="text-xs font-medium text-zinc-900">{gbp.format(totalRevenue)}</span>
      </div>
    </div>
  )
}
