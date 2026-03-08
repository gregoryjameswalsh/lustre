import { Suspense } from 'react'
import {
  getRevenueKpis, getRevenueTrend, getTopClients,
  getQuoteFunnel, getPipelineHealth, getRevenueByServiceType,
} from '@/lib/queries/analytics'
import type { RevenueBasis, ClientRevenueSummary, TrendPoint } from '@/lib/queries/analytics'
import { planAtLeast } from '@/lib/utils/plan'
import RevenueKpiCards from './_components/RevenueKpiCards'
import RevenueBasisToggle from './_components/RevenueBasisToggle'
import RevenueTrendChart from './_components/RevenueTrendChart'
import TopClientsTable from './_components/TopClientsTable'
import RevenueByServiceType from './_components/RevenueByServiceType'
import ReportsTabs from './_components/ReportsTabs'
import DateRangeSelector from './_components/DateRangeSelector'
import QuoteFunnel from './_components/QuoteFunnel'
import PipelineMetricCards from './_components/PipelineMetricCards'
import UpgradeGate from './_components/UpgradeGate'
import LockedPipelinePreview from './_components/LockedPipelinePreview'
import LockedClientsPreview from './_components/LockedClientsPreview'
import CsvExportButton from './_components/CsvExportButton'

export const metadata = { title: 'Reports — Lustre' }

type Tab = 'overview' | 'pipeline' | 'clients'

interface PageProps {
  searchParams: Promise<{ basis?: string; tab?: string; days?: string }>
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const params = await searchParams

  const basis: RevenueBasis = params.basis === 'committed' ? 'committed' : 'earned'
  const tab: Tab = params.tab === 'pipeline' ? 'pipeline'
    : params.tab === 'clients' ? 'clients'
    : 'overview'

  // Fetch KPIs first so we know the plan for gating decisions
  const kpis = await getRevenueKpis(basis)
  const { plan } = kpis

  // Cap days to plan entitlement
  const requestedDays = Number(params.days) || 30
  const isPro = planAtLeast(plan, 'professional')
  const effectiveDays = isPro ? Math.min(requestedDays, 90) : 30

  const groupBy = effectiveDays > 31 ? 'week' : 'day'

  const basisSubtitle = basis === 'earned' ? 'Based on completed jobs' : 'Based on accepted quotes'

  // ── Shared header ─────────────────────────────────────────────────────────

  const header = (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
      <div>
        <p className="text-xs font-medium tracking-[0.3em] uppercase text-[#3D7A5F] mb-2">
          Analytics
        </p>
        <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-zinc-900">
          Reports
        </h1>
        <p className="text-xs text-zinc-400 mt-1">{basisSubtitle}</p>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <Suspense fallback={<div className="h-8 w-36 bg-zinc-100 rounded-lg animate-pulse" />}>
          <DateRangeSelector activeDays={effectiveDays} plan={plan} />
        </Suspense>
        <Suspense fallback={<div className="h-8 w-40 bg-zinc-100 rounded-lg animate-pulse" />}>
          <RevenueBasisToggle basis={basis} />
        </Suspense>
      </div>
    </div>
  )

  // ── Tab navigation ────────────────────────────────────────────────────────

  const tabNav = (
    <Suspense fallback={<div className="h-10 bg-zinc-50 rounded animate-pulse" />}>
      <ReportsTabs activeTab={tab} plan={plan} />
    </Suspense>
  )

  // ── Overview tab ──────────────────────────────────────────────────────────

  if (tab === 'overview') {
    const [trend, topClients, serviceTypes] = await Promise.all([
      getRevenueTrend(basis, effectiveDays, groupBy),
      getTopClients(basis, 5),
      planAtLeast(plan, 'professional') ? getRevenueByServiceType(basis, effectiveDays) : Promise.resolve([]),
    ])

    // CSV data for top clients
    const clientsCsvData = topClients.map((c: ClientRevenueSummary) => ({
      'Client': c.name,
      'Total Revenue': c.totalRevenue,
      'Jobs / Quotes': c.count,
      'Last Activity': c.lastActivityDate ? c.lastActivityDate.slice(0, 10) : '',
    }))

    const trendCsvData = (trend as TrendPoint[]).map(t => ({
      'Date': t.date,
      'Revenue': t.revenue,
    }))

    return (
      <div className="min-h-screen bg-[#F9FAFB]">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-4 md:pt-24 md:pb-16 space-y-6">
          {header}
          {tabNav}
          <RevenueKpiCards kpis={kpis} basis={basis} />

          {/* Trend chart with optional CSV export */}
          <div className="space-y-2">
            {isPro && (
              <div className="flex justify-end">
                <CsvExportButton data={trendCsvData} filename={`revenue-trend-${effectiveDays}d`} label="Export" />
              </div>
            )}
            <RevenueTrendChart data={trend} basis={basis} groupBy={groupBy} days={effectiveDays} />
          </div>

          {/* Top clients with optional CSV export */}
          <div className="space-y-2">
            {isPro && (
              <div className="flex justify-end">
                <CsvExportButton data={clientsCsvData} filename="top-clients" label="Export" />
              </div>
            )}
            <TopClientsTable clients={topClients} basis={basis} />
          </div>

          {/* Revenue by service type — Professional+ */}
          <UpgradeGate
            plan={plan}
            required="professional"
            feature="Revenue by Service Type"
            description="See which services drive the most revenue, how many jobs each type generates, and your average value per service."
          >
            <RevenueByServiceType data={serviceTypes} basis={basis} days={effectiveDays} />
          </UpgradeGate>

        </main>
      </div>
    )
  }

  // ── Pipeline tab ──────────────────────────────────────────────────────────

  if (tab === 'pipeline') {
    const canViewPipeline = planAtLeast(plan, 'professional')

    const [funnel, health] = canViewPipeline
      ? await Promise.all([
          getQuoteFunnel(effectiveDays),
          getPipelineHealth(effectiveDays),
        ])
      : [[], { totalPipelineValue: 0, avgDaysToClose: null, quotesAtRisk: 0, winRate: null }]

    // CSV data for funnel
    const funnelCsvData = funnel.map(s => ({
      'Stage': s.status,
      'Count': s.count,
      'Total Value': s.totalValue,
    }))

    return (
      <div className="min-h-screen bg-[#F9FAFB]">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-4 md:pt-24 md:pb-16 space-y-6">
          {header}
          {tabNav}

          <UpgradeGate
            plan={plan}
            required="professional"
            feature="Quote Pipeline Analytics"
            description="See your full quote funnel — conversion rates, pipeline value, average time to close, and which quotes are expiring soon."
          >
            <LockedPipelinePreview />
          </UpgradeGate>

          {canViewPipeline && (
            <>
              <PipelineMetricCards health={health} />

              <div className="space-y-2">
                <div className="flex justify-end">
                  <CsvExportButton data={funnelCsvData} filename={`quote-funnel-${effectiveDays}d`} label="Export funnel" />
                </div>
                <QuoteFunnel stages={funnel} days={effectiveDays} />
              </div>
            </>
          )}
        </main>
      </div>
    )
  }

  // ── Clients & Team tab (Phase 3 — still locked) ───────────────────────────

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-4 md:pt-24 md:pb-16 space-y-6">
        {header}
        {tabNav}

        <UpgradeGate
          plan={plan}
          required="business"
          feature="Client & Team Performance"
          description="Identify your most valuable clients, spot at-risk accounts before they churn, and see revenue attributed to each team member."
        >
          <LockedClientsPreview />
        </UpgradeGate>
      </main>
    </div>
  )
}
