// src/app/dashboard/pipeline/page.tsx
// =============================================================================
// LUSTRE — Pipeline Kanban (default view)
// =============================================================================

import { createClient }  from '@/lib/supabase/server'
import { redirect }      from 'next/navigation'
import Link              from 'next/link'
import { getStages, getDealsByStage } from '@/lib/queries/pipeline'
import KanbanBoard       from './_components/KanbanBoard'

async function checkAccess() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user
}

export default async function PipelinePage() {
  await checkAccess()

  const [stages, dealsByStage] = await Promise.all([
    getStages(),
    getDealsByStage(),
  ])

  // Total open pipeline value
  const totalValue = Object.values(dealsByStage)
    .flat()
    .filter(d => !d.won_at && !d.lost_at && d.value != null)
    .reduce((sum, d) => sum + (d.value ?? 0), 0)

  const totalDeals = Object.values(dealsByStage).flat().filter(d => !d.lost_at).length

  return (
    <div className="min-h-screen bg-[#f9f8f5]">
      <main className="px-4 pt-8 pb-8 sm:px-6 md:pt-24">

        {/* Header */}
        <div className="mb-6 flex items-start justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-light tracking-tight text-zinc-900 sm:text-3xl">Pipeline</h1>
            <p className="mt-1 text-sm text-zinc-400">
              {totalDeals} active deal{totalDeals !== 1 ? 's' : ''}
              {totalValue > 0 && (
                <span>
                  {' · '}
                  {new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(totalValue)} open value
                </span>
              )}
            </p>
          </div>
          <Link
            href="/dashboard/pipeline/new"
            className="mt-1 rounded-full bg-zinc-900 px-4 py-2 text-xs font-medium tracking-[0.15em] uppercase text-white hover:bg-zinc-700 transition-colors"
          >
            New deal
          </Link>
        </div>

        {/* Board */}
        <div className="max-w-7xl mx-auto">
          {stages.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center">
              <p className="text-sm text-zinc-400">No pipeline stages configured.</p>
            </div>
          ) : (
            <KanbanBoard stages={stages} initialDealsByStage={dealsByStage} />
          )}
        </div>

      </main>
    </div>
  )
}
