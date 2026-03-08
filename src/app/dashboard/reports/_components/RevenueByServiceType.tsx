import type { ServiceTypeRevenue, RevenueBasis } from '@/lib/queries/analytics'

const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })

interface Props {
  data: ServiceTypeRevenue[]
  basis: RevenueBasis
  days: number
}

export default function RevenueByServiceType({ data, basis, days }: Props) {
  if (basis !== 'earned') {
    return (
      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-medium tracking-tight text-zinc-900">Revenue by Service Type</h2>
        </div>
        <div className="px-6 py-8 text-center">
          <p className="text-xs text-zinc-400">
            Service type breakdown is based on completed jobs.
          </p>
          <p className="text-xs text-zinc-300 mt-1">
            Switch to <span className="font-medium">Earned</span> basis to view this report.
          </p>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-medium tracking-tight text-zinc-900">Revenue by Service Type</h2>
        </div>
        <div className="px-6 py-8 text-center">
          <p className="text-xs text-zinc-300 tracking-wide">No completed jobs with revenue in this period</p>
        </div>
      </div>
    )
  }

  const totalRevenue = data.reduce((s, d) => s + d.totalRevenue, 0)

  return (
    <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
        <h2 className="text-sm font-medium tracking-tight text-zinc-900">Revenue by Service Type</h2>
        <span className="text-xs text-zinc-400">Last {days} days</span>
      </div>

      <div className="divide-y divide-zinc-50">
        {data.map(row => {
          const share = totalRevenue > 0 ? (row.totalRevenue / totalRevenue) * 100 : 0

          return (
            <div key={row.name} className="px-6 py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-900 font-medium">{row.name}</span>
                <div className="text-right">
                  <span className="text-sm font-medium text-zinc-900">{gbp.format(row.totalRevenue)}</span>
                  <span className="text-xs text-zinc-400 ml-2">{Math.round(share)}%</span>
                </div>
              </div>
              {/* Revenue bar */}
              <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden mb-1.5">
                <div
                  className="h-full bg-[#3D7A5F] rounded-full"
                  style={{ width: `${share}%` }}
                />
              </div>
              <p className="text-xs text-zinc-400">
                {row.count} {row.count === 1 ? 'job' : 'jobs'} · avg {gbp.format(row.avgValue)}
              </p>
            </div>
          )
        })}
      </div>

      <div className="px-6 py-3 bg-zinc-50 border-t border-zinc-100 flex justify-between">
        <span className="text-xs text-zinc-400">Total</span>
        <span className="text-xs font-medium text-zinc-900">{gbp.format(totalRevenue)}</span>
      </div>
    </div>
  )
}
