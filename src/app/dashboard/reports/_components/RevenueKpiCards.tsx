import type { RevenueKpis, RevenueBasis } from '@/lib/queries/analytics'

const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })
const pct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`

interface Props {
  kpis: RevenueKpis
  basis: RevenueBasis
}

function KpiCard({
  label,
  value,
  sub,
  subColour,
}: {
  label: string
  value: string
  sub?: string
  subColour?: 'green' | 'red' | 'neutral'
}) {
  const subClass =
    subColour === 'green'
      ? 'text-emerald-600'
      : subColour === 'red'
      ? 'text-red-500'
      : 'text-zinc-400'

  return (
    <div className="bg-white border border-zinc-200 rounded-lg px-5 py-5">
      <span className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-400 block mb-2">
        {label}
      </span>
      <span className="text-2xl font-light tracking-tight text-zinc-900 block">
        {value}
      </span>
      {sub && (
        <span className={`text-xs mt-1 block font-medium ${subClass}`}>{sub}</span>
      )}
    </div>
  )
}

export default function RevenueKpiCards({ kpis, basis }: Props) {
  const now = new Date()
  const monthName = now.toLocaleDateString('en-GB', { month: 'long' })

  const changeColour =
    kpis.revenueChangePct === null
      ? 'neutral'
      : kpis.revenueChangePct >= 0
      ? 'green'
      : 'red'

  const changeSub =
    kpis.revenueChangePct === null
      ? 'No data last month'
      : `${pct(kpis.revenueChangePct)} vs last month`

  const conversionSub =
    kpis.quoteConversionRate === null
      ? 'No quotes sent yet'
      : `${Math.round(kpis.quoteConversionRate * 100)}% of quotes accepted (30d)`

  const basisLabel = basis === 'earned' ? 'completed jobs' : 'accepted quotes'
  const countLabel = basis === 'earned' ? 'Jobs Completed' : 'Quotes Accepted'

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
      <KpiCard
        label={`Revenue — ${monthName}`}
        value={gbp.format(kpis.revenueMtd)}
        sub={changeSub}
        subColour={changeColour}
      />
      <KpiCard
        label="Avg Value"
        value={kpis.avgValueMtd > 0 ? gbp.format(kpis.avgValueMtd) : '—'}
        sub={`Per ${basisLabel === 'completed jobs' ? 'job' : 'quote'} this month`}
        subColour="neutral"
      />
      <KpiCard
        label={countLabel}
        value={String(kpis.countMtd)}
        sub={`This month`}
        subColour="neutral"
      />
      <KpiCard
        label="Open Quote Value"
        value={gbp.format(kpis.outstandingQuoteValue)}
        sub="Sent or viewed, awaiting response"
        subColour="neutral"
      />
      <KpiCard
        label="Quote Conversion"
        value={
          kpis.quoteConversionRate !== null
            ? `${Math.round(kpis.quoteConversionRate * 100)}%`
            : '—'
        }
        sub={conversionSub}
        subColour={
          kpis.quoteConversionRate === null
            ? 'neutral'
            : kpis.quoteConversionRate >= 0.5
            ? 'green'
            : kpis.quoteConversionRate >= 0.25
            ? 'neutral'
            : 'red'
        }
      />
      <KpiCard
        label="Last Month Revenue"
        value={gbp.format(kpis.revenueLastMonth)}
        sub={
          now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
            .replace(monthName, '')
            .trim() ||
          new Date(now.getFullYear(), now.getMonth() - 1, 1)
            .toLocaleDateString('en-GB', { month: 'long' })
        }
        subColour="neutral"
      />
    </div>
  )
}
