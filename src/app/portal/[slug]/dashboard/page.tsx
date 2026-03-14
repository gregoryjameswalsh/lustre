// src/app/portal/[slug]/dashboard/page.tsx
// =============================================================================
// LUSTRE — Portal Dashboard: Upcoming Jobs
// Shows the client's upcoming (scheduled / in_progress) appointments.
// =============================================================================

import { getPortalClientContext } from '@/lib/actions/_portal_auth'
import { createClient }           from '@/lib/supabase/server'
import Link                       from 'next/link'
import type { PortalJob }         from '@/lib/types'
import PortalJobCard              from './_components/PortalJobCard'

export default async function PortalDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug }     = await params
  const { supabase, context } = await getPortalClientContext(slug)

  const { data: jobsRaw } = await supabase.rpc('portal_get_upcoming_jobs', {
    p_org_slug: slug,
  })

  const jobs = (jobsRaw ?? []) as PortalJob[]

  return (
    <div>
      {/* Welcome message */}
      {context.welcome_message && (
        <div className="mb-6 rounded-lg border border-zinc-200 bg-white px-5 py-4">
          <p className="text-sm text-zinc-600 leading-relaxed">{context.welcome_message}</p>
        </div>
      )}

      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-light tracking-tight text-zinc-900">Upcoming visits</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Your scheduled appointments</p>
        </div>
        {jobs.length > 0 && (
          <span className="text-xs text-zinc-400">{jobs.length} upcoming</span>
        )}
      </div>

      {/* Jobs list */}
      {jobs.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-zinc-400">No upcoming visits scheduled</p>
          <p className="text-xs text-zinc-300 mt-1">
            Contact {context.org_name} to book your next appointment.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map(job => (
            <PortalJobCard key={job.id} job={job} slug={slug} />
          ))}
        </div>
      )}

      {/* History link */}
      <div className="mt-8 text-center">
        <Link
          href={`/portal/${slug}/dashboard/history`}
          className="text-xs font-medium uppercase tracking-widest text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          View past visits →
        </Link>
      </div>
    </div>
  )
}
