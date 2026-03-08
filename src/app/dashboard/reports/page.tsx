import { Suspense } from 'react'
import { getRevenueKpis, getRevenueTrend, getTopClients } from '@/lib/queries/analytics'
import type { RevenueBasis } from '@/lib/queries/analytics'
import RevenueKpiCards from './_components/RevenueKpiCards'
import RevenueBasisToggle from './_components/RevenueBasisToggle'
import RevenueTrendChart from './_components/RevenueTrendChart'
import TopClientsTable from './_components/TopClientsTable'
import UpgradeGate from './_components/UpgradeGate'
import LockedPipelinePreview from './_components/LockedPipelinePreview'
import LockedClientsPreview from './_components/LockedClientsPreview'

interface PageProps {
  searchParams: Promise<{ basis?: string }>
}

export const metadata = { title: 'Reports — Lustre' }

export default async function ReportsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const basis: RevenueBasis = params.basis === 'committed' ? 'committed' : 'earned'

  const [kpis, trend, topClients] = await Promise.all([
    getRevenueKpis(basis),
    getRevenueTrend(basis, 30),
    getTopClients(basis, 5),
  ])

  const basisSubtitle =
    basis === 'earned'
      ? 'Based on completed jobs'
      : 'Based on accepted quotes'

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-4 md:pt-24 md:pb-16 space-y-6">

        {/* Header */}
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
          <Suspense fallback={<div className="h-8 w-40 bg-zinc-100 rounded-lg animate-pulse" />}>
            <RevenueBasisToggle basis={basis} />
          </Suspense>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-6 border-b border-zinc-200 -mb-2">
          <button className="text-xs font-medium pb-3 border-b-2 border-zinc-900 text-zinc-900 tracking-wide">
            Overview
          </button>
          <span className="text-xs pb-3 text-zinc-300 tracking-wide cursor-default">
            Pipeline
            <span className="ml-1.5 text-[10px] font-medium text-zinc-300 tracking-[0.1em] uppercase">
              Pro
            </span>
          </span>
          <span className="text-xs pb-3 text-zinc-300 tracking-wide cursor-default">
            Clients &amp; Team
            <span className="ml-1.5 text-[10px] font-medium text-zinc-300 tracking-[0.1em] uppercase">
              Business
            </span>
          </span>
        </div>

        {/* KPI Cards */}
        <RevenueKpiCards kpis={kpis} basis={basis} />

        {/* Revenue Trend Chart */}
        <RevenueTrendChart data={trend} basis={basis} />

        {/* Top Clients */}
        <TopClientsTable clients={topClients} basis={basis} />

        {/* Quote Pipeline — Professional+ (locked for Starter and below) */}
        <UpgradeGate
          plan={kpis.plan}
          required="professional"
          feature="Quote Pipeline Analytics"
          description="See your full quote funnel — conversion rates, pipeline value, average time to close, and which quotes are at risk of expiring."
        >
          <LockedPipelinePreview />
        </UpgradeGate>

        {/* Clients & Team — Business+ (locked below Business) */}
        <UpgradeGate
          plan={kpis.plan}
          required="business"
          feature="Client &amp; Team Performance"
          description="Identify your most valuable clients, spot at-risk accounts before they churn, and see revenue attributed by team member."
        >
          <LockedClientsPreview />
        </UpgradeGate>

      </main>
    </div>
  )
}
