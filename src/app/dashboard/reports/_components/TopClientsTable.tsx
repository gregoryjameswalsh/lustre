import Link from 'next/link'
import type { ClientRevenueSummary, RevenueBasis } from '@/lib/queries/analytics'

const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })

interface Props {
  clients: ClientRevenueSummary[]
  basis: RevenueBasis
}

function formatRelativeDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const now = new Date()
  const days = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  if (days < 365) return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ').filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function TopClientsTable({ clients, basis }: Props) {
  const countLabel = basis === 'earned' ? 'Jobs' : 'Quotes'

  if (clients.length === 0) {
    return (
      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-medium tracking-tight text-zinc-900">Top Clients by Revenue</h2>
        </div>
        <div className="px-6 py-10 text-center">
          <p className="text-xs text-zinc-300 tracking-wide">
            {basis === 'earned'
              ? 'No completed jobs with a price recorded yet'
              : 'No accepted quotes recorded yet'}
          </p>
          <Link
            href={basis === 'earned' ? '/dashboard/jobs' : '/dashboard/quotes'}
            className="text-xs text-[#3D7A5F] mt-2 inline-block hover:underline"
          >
            {basis === 'earned' ? 'Go to Jobs →' : 'Go to Quotes →'}
          </Link>
        </div>
      </div>
    )
  }

  const maxRevenue = Math.max(...clients.map(c => c.totalRevenue), 1)

  return (
    <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
        <h2 className="text-sm font-medium tracking-tight text-zinc-900">Top Clients by Revenue</h2>
        <span className="text-xs text-zinc-400">All time</span>
      </div>

      <div className="divide-y divide-zinc-50">
        {clients.map((client, i) => {
          const barWidth = maxRevenue > 0 ? (client.totalRevenue / maxRevenue) * 100 : 0

          return (
            <Link
              key={client.clientId}
              href={`/dashboard/clients/${client.clientId}`}
              className="flex items-center gap-4 px-6 py-4 hover:bg-zinc-50 transition-colors group"
            >
              {/* Rank */}
              <span className="text-xs text-zinc-300 w-4 flex-shrink-0 font-medium">
                {i + 1}
              </span>

              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-[#C8F5D7] flex items-center justify-center text-xs font-medium text-[#1A3329] flex-shrink-0">
                {getInitials(client.name)}
              </div>

              {/* Name + bar */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-900 font-medium group-hover:text-[#3D7A5F] transition-colors truncate">
                  {client.name}
                </p>
                {/* Revenue bar */}
                <div className="mt-1.5 h-1 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#3D7A5F] rounded-full"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-medium text-zinc-900">
                  {gbp.format(client.totalRevenue)}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {client.count} {countLabel.toLowerCase()} · {formatRelativeDate(client.lastActivityDate)}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
