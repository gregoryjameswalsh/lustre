// src/app/portal/[slug]/dashboard/jobs/[id]/page.tsx
// =============================================================================
// LUSTRE — Portal Job Detail
// Shows full job details and the special instruction form for upcoming jobs.
// =============================================================================

import { notFound }               from 'next/navigation'
import { getPortalClientContext } from '@/lib/actions/_portal_auth'
import { createClient }           from '@/lib/supabase/server'
import Link                       from 'next/link'
import type { PortalJob }         from '@/lib/types'
import InstructionForm            from './_components/InstructionForm'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatTime(timeStr: string) {
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h)
  return `${hour % 12 || 12}:${m}${hour >= 12 ? 'pm' : 'am'}`
}

const statusColour: Record<string, string> = {
  scheduled:   'bg-blue-50 text-blue-600 border-blue-100',
  in_progress: 'bg-amber-50 text-amber-600 border-amber-100',
  completed:   'bg-emerald-50 text-emerald-600 border-emerald-100',
  cancelled:   'bg-zinc-100 text-zinc-400 border-zinc-200',
}

const statusLabel: Record<string, string> = {
  scheduled:   'Scheduled',
  in_progress: 'In progress',
  completed:   'Completed',
  cancelled:   'Cancelled',
}

export default async function PortalJobDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>
}) {
  const { slug, id } = await params
  const { supabase, context } = await getPortalClientContext(slug)

  const { data: jobRaw } = await supabase.rpc('portal_get_job_detail', {
    p_job_id:   id,
    p_org_slug: slug,
  })

  if (!jobRaw) notFound()

  const job = jobRaw as PortalJob

  const isUpcoming    = job.status === 'scheduled' || job.status === 'in_progress'
  const cutoffAt      = job.instruction_cutoff_at ? new Date(job.instruction_cutoff_at) : null
  const cutoffPassed  = cutoffAt ? new Date() >= cutoffAt : false
  const canInstruct   = isUpcoming && !cutoffPassed

  return (
    <div>
      <Link
        href={`/portal/${slug}/dashboard`}
        className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors tracking-wide"
      >
        ← Upcoming visits
      </Link>

      {/* Header */}
      <div className="mt-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-light tracking-tight text-zinc-900">
            {job.job_type_name ?? 'Visit'}
          </h1>
          <span className={`text-xs px-3 py-1 rounded-full font-medium border ${statusColour[job.status]}`}>
            {statusLabel[job.status]}
          </span>
        </div>
        {job.scheduled_date && (
          <p className="text-zinc-400 mt-1 text-sm">
            {formatDate(job.scheduled_date)}
            {job.scheduled_time && ` at ${formatTime(job.scheduled_time)}`}
          </p>
        )}
      </div>

      <div className="space-y-4">

        {/* Job details card */}
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h2 className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-500">Visit details</h2>
          </div>
          <div className="px-5 py-2 divide-y divide-zinc-50">
            {job.duration_hours && (
              <div className="py-3 flex justify-between">
                <span className="text-xs text-zinc-400">Duration</span>
                <span className="text-sm text-zinc-900">{job.duration_hours} hrs</span>
              </div>
            )}
            {job.property_address && (
              <div className="py-3 flex justify-between">
                <span className="text-xs text-zinc-400">Address</span>
                <div className="text-right">
                  <p className="text-sm text-zinc-900">{job.property_address}</p>
                  {(job.property_town || job.property_postcode) && (
                    <p className="text-xs text-zinc-400">
                      {[job.property_town, job.property_postcode].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            )}
            {job.assigned_name && (
              <div className="py-3 flex justify-between">
                <span className="text-xs text-zinc-400">Your cleaner</span>
                <span className="text-sm text-zinc-900">{job.assigned_name}</span>
              </div>
            )}
            {context.show_job_pricing && job.price && (
              <div className="py-3 flex justify-between">
                <span className="text-xs text-zinc-400">Price</span>
                <span className="text-sm text-zinc-900">
                  {new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(job.price)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Completed notes (if operator has enabled sharing) */}
        {job.status === 'completed' && job.notes && (
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100">
              <h2 className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-500">Notes from your cleaner</h2>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-zinc-600 leading-relaxed">{job.notes}</p>
            </div>
          </div>
        )}

        {/* Special instructions section */}
        {isUpcoming && (
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100">
              <h2 className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-500">
                Special instruction
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Let your cleaner know anything specific for this visit
              </p>
            </div>
            <div className="px-5 py-5">
              {cutoffPassed ? (
                <div>
                  {job.client_instruction ? (
                    <div>
                      <p className="text-sm text-zinc-700 leading-relaxed italic">
                        &ldquo;{job.client_instruction}&rdquo;
                      </p>
                      <p className="text-xs text-zinc-300 mt-3">
                        Instructions for this visit are now locked in. Please contact {context.org_name} directly for urgent changes.
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-400">
                      The window for adding instructions to this visit has closed. Please contact {context.org_name} directly.
                    </p>
                  )}
                </div>
              ) : (
                <InstructionForm
                  jobId={id}
                  slug={slug}
                  currentInstruction={job.client_instruction}
                  cutoffAt={cutoffAt?.toISOString() ?? null}
                />
              )}
            </div>
          </div>
        )}

        {/* Cancelled state */}
        {job.status === 'cancelled' && (
          <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-4">
            <p className="text-sm text-zinc-400 text-center">This visit was cancelled.</p>
          </div>
        )}
      </div>
    </div>
  )
}
