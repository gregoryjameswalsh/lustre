// src/app/dashboard/reports/_components/InvoiceKpiCards.tsx

import type { InvoiceKpis } from '@/lib/queries/analytics'
import Link from 'next/link'

const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })

function KpiCard({
  label,
  value,
  sub,
  subColour = 'neutral',
  href,
}: {
  label:       string
  value:       string
  sub?:        string
  subColour?:  'green' | 'red' | 'neutral'
  href?:       string
}) {
  const subClass =
    subColour === 'green'   ? 'text-emerald-600' :
    subColour === 'red'     ? 'text-red-500'     : 'text-zinc-400'

  const inner = (
    <div className="bg-white border border-zinc-200 rounded-lg px-5 py-5 h-full">
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

  if (href) {
    return (
      <Link href={href} className="block hover:opacity-80 transition-opacity">
        {inner}
      </Link>
    )
  }
  return inner
}

interface Props {
  kpis: InvoiceKpis
}

export default function InvoiceKpiCards({ kpis }: Props) {
  const now       = new Date()
  const monthName = now.toLocaleDateString('en-GB', { month: 'long' })

  const paidRateStr = kpis.paidRateMtd !== null
    ? `${Math.round(kpis.paidRateMtd * 100)}% collected vs invoiced`
    : 'No invoices this month'

  const paidRateColour =
    kpis.paidRateMtd === null       ? 'neutral' :
    kpis.paidRateMtd >= 0.8         ? 'green'   :
    kpis.paidRateMtd >= 0.4         ? 'neutral' : 'red'

  const mtdChange =
    kpis.invoicedLastMonth > 0
      ? ((kpis.invoicedMtd - kpis.invoicedLastMonth) / kpis.invoicedLastMonth) * 100
      : null

  const mtdSub = mtdChange !== null
    ? `${mtdChange >= 0 ? '+' : ''}${mtdChange.toFixed(1)}% vs last month`
    : 'No invoices last month'

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
      <KpiCard
        label={`Invoiced — ${monthName}`}
        value={gbp.format(kpis.invoicedMtd)}
        sub={mtdSub}
        subColour={mtdChange === null ? 'neutral' : mtdChange >= 0 ? 'green' : 'red'}
      />
      <KpiCard
        label={`Collected — ${monthName}`}
        value={gbp.format(kpis.collectedMtd)}
        sub={paidRateStr}
        subColour={paidRateColour}
      />
      <KpiCard
        label="Outstanding"
        value={gbp.format(kpis.outstanding)}
        sub="Across sent &amp; viewed invoices"
        subColour={kpis.outstanding > 0 ? 'neutral' : 'green'}
        href="/dashboard/invoices?status=sent"
      />
      <KpiCard
        label="Overdue"
        value={gbp.format(kpis.overdueAmount)}
        sub={kpis.overdueAmount > 0 ? 'Requires attention' : 'All invoices current'}
        subColour={kpis.overdueAmount > 0 ? 'red' : 'green'}
        href="/dashboard/invoices?status=overdue"
      />
      <KpiCard
        label="Avg Days to Payment"
        value={kpis.avgDaysToPayment !== null ? `${kpis.avgDaysToPayment}d` : '—'}
        sub={kpis.avgDaysToPayment !== null ? 'From issue date to paid' : 'No paid invoices yet'}
        subColour={
          kpis.avgDaysToPayment === null  ? 'neutral' :
          kpis.avgDaysToPayment <= 14     ? 'green'   :
          kpis.avgDaysToPayment <= 30     ? 'neutral' : 'red'
        }
      />
      <KpiCard
        label="Last Month Invoiced"
        value={gbp.format(kpis.invoicedLastMonth)}
        sub={new Date(now.getFullYear(), now.getMonth() - 1, 1)
          .toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
        subColour="neutral"
      />
    </div>
  )
}
