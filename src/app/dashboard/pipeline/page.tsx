// src/app/dashboard/pipeline/page.tsx
// =============================================================================
// LUSTRE — Pipeline Kanban (client-centric model)
// =============================================================================

import { createClient }  from '@/lib/supabase/server'
import { redirect }      from 'next/navigation'
import Link              from 'next/link'
import { getActiveStages, getClientsByStage } from '@/lib/queries/pipeline'
import KanbanBoard       from './_components/KanbanBoard'

async function checkAccess() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user
}

export default async function PipelinePage() {
  await checkAccess()

  const [stages, clientsByStage] = await Promise.all([
    getActiveStages(),
    getClientsByStage(),
  ])

  const allClients = Object.values(clientsByStage).flat()
  const totalLeads = allClients.length
  const totalValue = allClients.reduce((sum, c) => sum + (c.estimated_monthly_value ?? 0), 0)

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <main className="px-4 pt-8 pb-8 sm:px-6 md:pt-24">

        {/* Header */}
        <div className="mb-6 flex items-start justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-light tracking-tight text-zinc-900 sm:text-3xl">Pipeline</h1>
            <p className="mt-1 text-sm text-zinc-400">
              {totalLeads} active lead{totalLeads !== 1 ? 's' : ''}
              {totalValue > 0 && (
                <span>
                  {' · '}
                  {new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(totalValue)}/mo estimated
                </span>
              )}
            </p>
          </div>
          <Link
            href={`/dashboard/clients/new?status=lead&from=pipeline${stages[0]?.id ? `&stage_id=${stages[0].id}` : ''}`}
            className="mt-1 rounded-lg bg-[#1A3329] px-4 py-2 text-xs font-medium tracking-[0.15em] uppercase text-white hover:bg-zinc-700 transition-colors"
          >
            Add lead
          </Link>
        </div>

        {/* Board */}
        <div className="max-w-7xl mx-auto">
          {stages.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center">
              <p className="text-sm text-zinc-400">No pipeline stages configured.</p>
            </div>
          ) : (
            <KanbanBoard stages={stages} initialClientsByStage={clientsByStage} />
          )}
        </div>

      </main>
    </div>
  )
}
