// src/app/dashboard/pipeline/[dealId]/page.tsx
// =============================================================================
// LUSTRE — Deal detail
// =============================================================================

import { createClient }       from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link                   from 'next/link'
import { getDeal, getStages } from '@/lib/queries/pipeline'
import { updateDealAction }   from '@/lib/actions/pipeline'
import DealEditForm           from './_components/DealEditForm'
import DeleteDealButton       from './_components/DeleteDealButton'

export default async function DealPage({ params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [deal, stages] = await Promise.all([
    getDeal(dealId),
    getStages(),
  ])

  if (!deal) notFound()

  const isWon  = deal.won_at != null
  const isLost = deal.lost_at != null

  async function handleUpdate(formData: FormData) {
    'use server'
    return updateDealAction(dealId, formData)
  }

  return (
    <div className="min-h-screen bg-[#f9f8f5]">
      <main className="mx-auto max-w-xl px-4 pt-8 pb-4 sm:px-6 md:pt-24 md:pb-16">

        <div className="mb-6 flex items-start justify-between">
          <div>
            <Link
              href="/dashboard/pipeline"
              className="mb-2 inline-flex items-center text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              ← Pipeline
            </Link>
            <h1 className="text-xl font-light tracking-tight text-zinc-900">{deal.title}</h1>
            {deal.clients && (
              <p className="mt-0.5 text-sm text-zinc-400">
                {deal.clients.first_name} {deal.clients.last_name}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            {isWon && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">Won</span>
            )}
            {isLost && (
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500">Lost</span>
            )}
          </div>
        </div>

        <DealEditForm deal={deal} stages={stages} action={handleUpdate} />

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-zinc-300">
            Created {new Date(deal.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <DeleteDealButton dealId={deal.id} />
        </div>

      </main>
    </div>
  )
}
