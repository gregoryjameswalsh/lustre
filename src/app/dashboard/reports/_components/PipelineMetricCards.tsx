import type { PipelineHealth } from '@/lib/queries/analytics'

const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })

interface Props {
  health: PipelineHealth
}

export default function PipelineMetricCards({ health }: Props) {
  const metrics = [
    {
      label: 'Open Pipeline',
      value: gbp.format(health.totalPipelineValue),
      sub: 'Sent + viewed quotes awaiting response',
      alert: false,
    },
    {
      label: 'Avg Days to Close',
      value: health.avgDaysToClose !== null ? `${health.avgDaysToClose}d` : '—',
      sub: health.avgDaysToClose !== null
        ? 'From sent to accepted (this period)'
        : 'No accepted quotes in this period',
      alert: false,
    },
    {
      label: 'Quotes at Risk',
      value: String(health.quotesAtRisk),
      sub: 'Expiring within 7 days, no response',
      alert: health.quotesAtRisk > 0,
    },
    {
      label: 'Win Rate',
      value: health.winRate !== null ? `${Math.round(health.winRate * 100)}%` : '—',
      sub: health.winRate !== null
        ? 'Accepted ÷ (accepted + declined)'
        : 'No decided quotes in this period',
      alert: false,
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {metrics.map(m => (
        <div
          key={m.label}
          className={`bg-white border rounded-lg px-5 py-5 ${
            m.alert ? 'border-amber-200 bg-amber-50/30' : 'border-zinc-200'
          }`}
        >
          <span className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-400 block mb-2">
            {m.label}
          </span>
          <span className={`text-2xl font-light tracking-tight block ${
            m.alert ? 'text-amber-600' : 'text-zinc-900'
          }`}>
            {m.value}
          </span>
          <span className="text-xs mt-1 block text-zinc-400">{m.sub}</span>
        </div>
      ))}
    </div>
  )
}
