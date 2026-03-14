// src/app/portal/[slug]/dashboard/requests/[id]/page.tsx
// =============================================================================
// LUSTRE — Portal: Booking Request Detail
// Shows status, operator response, and allows client to respond to alternatives.
// =============================================================================

import { notFound }               from 'next/navigation'
import { getPortalClientContext } from '@/lib/actions/_portal_auth'
import Link                       from 'next/link'
import type { PortalBookingRequestDetail, BookingRequestStatus } from '@/lib/types'
import RequestActions             from './_components/RequestActions'

const STATUS_LABEL: Record<BookingRequestStatus, string> = {
  pending:                     'Awaiting response',
  approved:                    'Confirmed',
  declined:                    'Declined',
  alternative_proposed:        'Alternative date offered',
  client_accepted_alternative: 'Alternative accepted — awaiting confirmation',
  client_declined_alternative: 'Awaiting updated offer',
  cancelled:                   'Cancelled',
}

const STATUS_CLASS: Record<BookingRequestStatus, string> = {
  pending:                     'bg-amber-50 text-amber-700 border border-amber-200',
  approved:                    'bg-green-50 text-green-700 border border-green-200',
  declined:                    'bg-red-50 text-red-700 border border-red-200',
  alternative_proposed:        'bg-blue-50 text-blue-700 border border-blue-200',
  client_accepted_alternative: 'bg-green-50 text-green-700 border border-green-200',
  client_declined_alternative: 'bg-zinc-100 text-zinc-600',
  cancelled:                   'bg-zinc-100 text-zinc-500',
}

const TIME_LABEL: Record<string, string> = {
  morning:   'Morning (before noon)',
  afternoon: 'Afternoon (noon – 5 pm)',
  evening:   'Evening (after 5 pm)',
  flexible:  'Flexible',
}

function formatDate(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default async function PortalRequestDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>
}) {
  const { slug, id } = await params
  const { supabase, context } = await getPortalClientContext(slug)

  const { data: raw } = await supabase.rpc('portal_get_booking_request_detail', {
    p_org_slug:   slug,
    p_request_id: id,
  })

  if (!raw || (raw as { error?: string }).error) notFound()

  const req = raw as PortalBookingRequestDetail

  const canCancel   = ['pending', 'alternative_proposed'].includes(req.status)
  const hasAlternative = req.status === 'alternative_proposed'

  const base = `/portal/${slug}/dashboard`

  return (
    <div className="max-w-xl">
      {/* Back */}
      <Link
        href={`${base}/requests`}
        className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 transition-colors mb-5"
      >
        ← All requests
      </Link>

      {/* Status */}
      <div className="flex items-center gap-3 mb-5">
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_CLASS[req.status]}`}>
          {STATUS_LABEL[req.status]}
        </span>
      </div>

      {/* Request details card */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4 mb-4">
        <h2 className="text-base font-medium text-zinc-900">
          {req.job_type_name ?? 'Service request'}
        </h2>

        <dl className="space-y-2">
          {req.requested_date && (
            <div className="flex gap-3">
              <dt className="w-28 shrink-0 text-xs text-zinc-400">Requested date</dt>
              <dd className="text-xs text-zinc-700">{formatDate(req.requested_date)}</dd>
            </div>
          )}
          {req.preferred_time && (
            <div className="flex gap-3">
              <dt className="w-28 shrink-0 text-xs text-zinc-400">Preferred time</dt>
              <dd className="text-xs text-zinc-700">{TIME_LABEL[req.preferred_time] ?? req.preferred_time}</dd>
            </div>
          )}
          {req.property_address && (
            <div className="flex gap-3">
              <dt className="w-28 shrink-0 text-xs text-zinc-400">Property</dt>
              <dd className="text-xs text-zinc-700">
                {[req.property_address, req.property_address2, req.property_town, req.property_postcode]
                  .filter(Boolean).join(', ')}
              </dd>
            </div>
          )}
          {req.notes && (
            <div className="flex gap-3">
              <dt className="w-28 shrink-0 text-xs text-zinc-400 pt-0.5">Your notes</dt>
              <dd className="text-xs text-zinc-700 leading-relaxed">{req.notes}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Alternative offer card */}
      {(req.proposed_date || req.operator_notes) && (
        <div className={`rounded-xl border p-5 mb-4 ${
          hasAlternative ? 'border-blue-200 bg-blue-50' : 'border-zinc-200 bg-zinc-50'
        }`}>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">
            {hasAlternative ? 'Alternative offered by ' : 'Note from '}{context.org_name}
          </p>
          {req.proposed_date && (
            <p className="text-sm font-medium text-zinc-900 mb-1">
              {formatDate(req.proposed_date)}
              {req.proposed_time && ` — ${TIME_LABEL[req.proposed_time] ?? req.proposed_time}`}
            </p>
          )}
          {req.operator_notes && (
            <p className="text-sm text-zinc-600 leading-relaxed">{req.operator_notes}</p>
          )}
        </div>
      )}

      {/* Client actions */}
      {(hasAlternative || canCancel) && (
        <RequestActions
          slug={slug}
          requestId={req.id}
          canCancel={canCancel}
          hasAlternative={hasAlternative}
        />
      )}
    </div>
  )
}
