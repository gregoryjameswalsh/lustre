import Link from 'next/link'
import type { ClientLifetimeValue, ChurnRisk } from '@/lib/queries/analytics'

const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })

const RISK_CONFIG: Record<ChurnRisk, { label: string; classes: string } | null> = {
  none:      null,
  at_risk:   { label: 'At risk',  classes: 'bg-amber-50 text-amber-600' },
  high_risk: { label: 'Dormant',  classes: 'bg-red-50 text-red-500' },
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ').filter(Boolean)
  if (parts.length === 0) return '?'
  return parts.length === 1
    ? parts[0][0].toUpperCase()
    : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

interface Props {
  clients: ClientLifetimeValue[]
}

export default function ClientLifetimeTable({ clients }: Props) {
  if (clients.length === 0) {
    return (
      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-medium tracking-tight text-zinc-900">Client Lifetime Value</h2>
        </div>
        <div className="px-6 py-10 text-center">
          <p className="text-xs text-zinc-300 tracking-wide">No active clients yet</p>
        </div>
      </div>
    )
  }

  const maxRevenue = Math.max(...clients.map(c => c.totalRevenue), 1)

  const atRiskCount  = clients.filter(c => c.churnRisk === 'at_risk').length
  const highRiskCount = clients.filter(c => c.churnRisk === 'high_risk').length
  const riskTotal = atRiskCount + highRiskCount

  return (
    <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium tracking-tight text-zinc-900">Client Lifetime Value</h2>
          <p className="text-xs text-zinc-400 mt-0.5">All active clients · all time</p>
        </div>
        {riskTotal > 0 && (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 flex-shrink-0">
            {riskTotal} {riskTotal === 1 ? 'client' : 'clients'} need attention
          </span>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-100">
              <th className="text-left px-6 py-3 font-medium tracking-[0.15em] uppercase text-zinc-400 w-8">#</th>
              <th className="text-left px-6 py-3 font-medium tracking-[0.15em] uppercase text-zinc-400">Client</th>
              <th className="text-right px-6 py-3 font-medium tracking-[0.15em] uppercase text-zinc-400">Revenue</th>
              <th className="text-right px-6 py-3 font-medium tracking-[0.15em] uppercase text-zinc-400">Jobs</th>
              <th className="text-right px-6 py-3 font-medium tracking-[0.15em] uppercase text-zinc-400">Avg Value</th>
              <th className="text-right px-6 py-3 font-medium tracking-[0.15em] uppercase text-zinc-400">First Job</th>
              <th className="text-right px-6 py-3 font-medium tracking-[0.15em] uppercase text-zinc-400">Last Job</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {clients.map((c, i) => {
              const risk = RISK_CONFIG[c.churnRisk]
              const barWidth = maxRevenue > 0 ? (c.totalRevenue / maxRevenue) * 100 : 0

              return (
                <tr key={c.clientId} className="group hover:bg-zinc-50 transition-colors">
                  <td className="px-6 py-3.5 text-zinc-300 font-medium">{i + 1}</td>
                  <td className="px-6 py-3.5">
                    <Link
                      href={`/dashboard/clients/${c.clientId}`}
                      className="flex items-center gap-3"
                    >
                      <div className="w-7 h-7 rounded-full bg-[#C8F5D7] flex items-center justify-center text-[10px] font-medium text-[#1A3329] flex-shrink-0">
                        {getInitials(c.name)}
                      </div>
                      <div>
                        <span className="font-medium text-zinc-900 group-hover:text-[#3D7A5F] transition-colors">
                          {c.name}
                        </span>
                        {c.email && (
                          <p className="text-zinc-400 mt-0.5 truncate max-w-[160px]">{c.email}</p>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <span className="font-medium text-zinc-900">{c.totalRevenue > 0 ? gbp.format(c.totalRevenue) : '—'}</span>
                    {c.totalRevenue > 0 && (
                      <div className="mt-1.5 h-1 bg-zinc-100 rounded-full w-20 ml-auto overflow-hidden">
                        <div className="h-full bg-[#3D7A5F] rounded-full" style={{ width: `${barWidth}%` }} />
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-right text-zinc-700">{c.jobCount || '—'}</td>
                  <td className="px-6 py-3.5 text-right text-zinc-700">
                    {c.avgJobValue > 0 ? gbp.format(c.avgJobValue) : '—'}
                  </td>
                  <td className="px-6 py-3.5 text-right text-zinc-400">{formatDate(c.firstJobDate)}</td>
                  <td className="px-6 py-3.5 text-right text-zinc-400">{formatDate(c.lastJobDate)}</td>
                  <td className="px-6 py-3.5 text-right">
                    {risk && (
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${risk.classes}`}>
                        {risk.label}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile list */}
      <div className="md:hidden divide-y divide-zinc-50">
        {clients.map((c, i) => {
          const risk = RISK_CONFIG[c.churnRisk]
          return (
            <Link
              key={c.clientId}
              href={`/dashboard/clients/${c.clientId}`}
              className="flex items-center gap-3 px-4 py-4 hover:bg-zinc-50 transition-colors"
            >
              <span className="text-xs text-zinc-300 w-4 flex-shrink-0">{i + 1}</span>
              <div className="w-8 h-8 rounded-full bg-[#C8F5D7] flex items-center justify-center text-[10px] font-medium text-[#1A3329] flex-shrink-0">
                {getInitials(c.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 truncate">{c.name}</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {c.jobCount} {c.jobCount === 1 ? 'job' : 'jobs'}
                  {c.lastJobDate && ` · last ${formatDate(c.lastJobDate)}`}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-medium text-zinc-900">{c.totalRevenue > 0 ? gbp.format(c.totalRevenue) : '—'}</p>
                {risk && (
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${risk.classes}`}>
                    {risk.label}
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
