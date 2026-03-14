// src/app/portal/[slug]/dashboard/history/page.tsx
// =============================================================================
// LUSTRE — Portal Dashboard: Job History
// =============================================================================

import { getPortalClientContext } from '@/lib/actions/_portal_auth'
import { createClient }           from '@/lib/supabase/server'
import Link                       from 'next/link'
import type { PortalJob }         from '@/lib/types'
import PortalJobCard              from '../_components/PortalJobCard'

export default async function PortalHistoryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug }     = await params
  const { supabase } = await getPortalClientContext(slug)

  const { data: jobsRaw } = await supabase.rpc('portal_get_job_history', {
    p_org_slug: slug,
  })

  const jobs = (jobsRaw ?? []) as PortalJob[]

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-light tracking-tight text-zinc-900">Past visits</h1>
        <p className="text-xs text-zinc-400 mt-0.5">Your service history</p>
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-zinc-400">No past visits yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map(job => (
            <PortalJobCard key={job.id} job={job} slug={slug} />
          ))}
        </div>
      )}

      <div className="mt-8 text-center">
        <Link
          href={`/portal/${slug}/dashboard`}
          className="text-xs font-medium uppercase tracking-widest text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          ← Upcoming visits
        </Link>
      </div>
    </div>
  )
}
