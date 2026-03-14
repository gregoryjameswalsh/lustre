// src/app/portal/[slug]/dashboard/_components/PortalJobCard.tsx
// =============================================================================
// LUSTRE — Portal Job Card
// Displays a single job in the upcoming or history list.
// =============================================================================

import Link          from 'next/link'
import type { PortalJob } from '@/lib/types'

interface Props {
  job:  PortalJob
  slug: string
}

const statusColour: Record<string, string> = {
  scheduled:   'bg-blue-50 text-blue-600',
  in_progress: 'bg-amber-50 text-amber-600',
  completed:   'bg-emerald-50 text-emerald-600',
  cancelled:   'bg-zinc-100 text-zinc-400',
}

const statusLabel: Record<string, string> = {
  scheduled:   'Scheduled',
  in_progress: 'In progress',
  completed:   'Completed',
  cancelled:   'Cancelled',
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatTime(timeStr: string) {
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h)
  return `${hour % 12 || 12}:${m}${hour >= 12 ? 'pm' : 'am'}`
}

export default function PortalJobCard({ job, slug }: Props) {
  const hasInstruction = !!job.client_instruction
  const isUpcoming     = job.status === 'scheduled' || job.status === 'in_progress'

  return (
    <Link
      href={`/portal/${slug}/dashboard/jobs/${job.id}`}
      className="block rounded-xl border border-zinc-200 bg-white p-5 hover:border-zinc-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">

          {/* Date + time */}
          <div className="flex items-center gap-2 mb-1.5">
            {job.scheduled_date && (
              <p className="text-sm font-medium text-zinc-900">
                {formatDate(job.scheduled_date)}
                {job.scheduled_time && (
                  <span className="text-zinc-400 font-normal">
                    {' '}at {formatTime(job.scheduled_time)}
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Service + property */}
          <p className="text-xs text-zinc-500">
            {job.job_type_name ?? 'Service'}
            {job.property_address && (
              <span className="text-zinc-300 mx-1.5">·</span>
            )}
            {job.property_address}
            {job.property_town && `, ${job.property_town}`}
          </p>

          {/* Assigned name */}
          {job.assigned_name && (
            <p className="text-xs text-zinc-400 mt-1">
              Your cleaner: <span className="text-zinc-600">{job.assigned_name}</span>
            </p>
          )}

          {/* Instruction indicator */}
          {hasInstruction && (
            <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Instruction added
            </div>
          )}

          {/* "Add instruction" nudge for upcoming jobs without one */}
          {isUpcoming && !hasInstruction && (
            <p className="mt-2 text-xs text-zinc-300">
              Tap to add a special instruction →
            </p>
          )}
        </div>

        {/* Status badge */}
        <span className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${statusColour[job.status]}`}>
          {statusLabel[job.status]}
        </span>
      </div>
    </Link>
  )
}
