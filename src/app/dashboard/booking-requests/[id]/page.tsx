// src/app/dashboard/booking-requests/[id]/page.tsx
// =============================================================================
// LUSTRE — Operator: Booking Request Detail + Actions
// =============================================================================

import { notFound }                from 'next/navigation'
import { getOrgAndUser }           from '@/lib/actions/_auth'
import Link                        from 'next/link'
import type { BookingRequestStatus } from '@/lib/types'
import BookingRequestActionForm    from './_components/BookingRequestActionForm'

const STATUS_LABEL: Record<BookingRequestStatus, string> = {
  pending:                     'Pending — awaiting your response',
  approved:                    'Approved',
  declined:                    'Declined',
  alternative_proposed:        'Alternative proposed — awaiting client',
  client_accepted_alternative: 'Client accepted alternative — confirm to proceed',
  client_declined_alternative: 'Client declined alternative — propose again or decline',
  cancelled:                   'Cancelled by client',
}

const STATUS_CLASS: Record<BookingRequestStatus, string> = {
  pending:                     'bg-amber-50 text-amber-700 border border-amber-200',
  approved:                    'bg-green-50 text-green-700 border border-green-200',
  declined:                    'bg-red-50 text-red-700 border border-red-200',
  alternative_proposed:        'bg-blue-50 text-blue-700 border border-blue-200',
  client_accepted_alternative: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  client_declined_alternative: 'bg-orange-50 text-orange-700 border border-orange-200',
  cancelled:                   'bg-zinc-100 text-zinc-500 border border-zinc-200',
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

// Statuses where the operator can still act
const ACTIONABLE: BookingRequestStatus[] = [
  'pending',
  'client_accepted_alternative',
  'client_declined_alternative',
]

export default async function BookingRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id }      = await params
  const { supabase, orgId } = await getOrgAndUser()

  const { data: req, error } = await supabase
    .from('booking_requests')
    .select(`
      id, status, requested_date, preferred_time, notes, operator_notes,
      proposed_date, proposed_time, actioned_at, created_at, updated_at,
      clients (
        id, first_name, last_name, email
      ),
      job_types ( name ),
      properties ( address_line1, address_line2, town, postcode )
    `)
    .eq('id', id)
    .eq('organisation_id', orgId)
    .single()

  if (error || !req) notFound()

  const status      = req.status as BookingRequestStatus
  const isActionable = ACTIONABLE.includes(status)
  const client      = req.clients as { id: string; first_name: string; last_name: string; email: string | null } | null
  const jobType     = req.job_types as { name: string } | null
  const property    = req.properties as { address_line1: string; address_line2: string | null; town: string | null; postcode: string | null } | null

  // Fetch portal slug for building the response email's portal URL
  const { data: portalSettings } = await supabase
    .from('client_portal_settings')
    .select('portal_slug')
    .eq('organisation_id', orgId)
    .maybeSingle()

  const portalSlug = (portalSettings as { portal_slug: string | null } | null)?.portal_slug ?? ''
  const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? ''

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-3xl">
      {/* Back */}
      <Link
        href="/dashboard/booking-requests"
        className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 transition-colors mb-5"
      >
        ← All requests
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-zinc-900">
            {jobType?.name ?? 'Booking request'}
          </h1>
          {client && (
            <Link
              href={`/dashboard/clients/${client.id}`}
              className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors mt-0.5 inline-block"
            >
              {client.first_name} {client.last_name}
              {client.email && ` · ${client.email}`}
            </Link>
          )}
        </div>
        <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_CLASS[status]}`}>
          {STATUS_LABEL[status]}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Left: request info */}
        <div className="lg:col-span-3 space-y-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-3">Request details</h2>
            <dl className="space-y-2.5">
              {req.requested_date && (
                <div className="flex gap-3">
                  <dt className="w-32 shrink-0 text-xs text-zinc-400">Preferred date</dt>
                  <dd className="text-sm text-zinc-800">{formatDate(req.requested_date)}</dd>
                </div>
              )}
              {req.preferred_time && (
                <div className="flex gap-3">
                  <dt className="w-32 shrink-0 text-xs text-zinc-400">Preferred time</dt>
                  <dd className="text-sm text-zinc-800">{TIME_LABEL[req.preferred_time] ?? req.preferred_time}</dd>
                </div>
              )}
              {property && (
                <div className="flex gap-3">
                  <dt className="w-32 shrink-0 text-xs text-zinc-400">Property</dt>
                  <dd className="text-sm text-zinc-800">
                    {[property.address_line1, property.address_line2, property.town, property.postcode]
                      .filter(Boolean).join(', ')}
                  </dd>
                </div>
              )}
              {req.notes && (
                <div className="flex gap-3">
                  <dt className="w-32 shrink-0 text-xs text-zinc-400 pt-0.5">Client notes</dt>
                  <dd className="text-sm text-zinc-800 leading-relaxed">{req.notes}</dd>
                </div>
              )}
              <div className="flex gap-3">
                <dt className="w-32 shrink-0 text-xs text-zinc-400">Submitted</dt>
                <dd className="text-xs text-zinc-500">
                  {new Date(req.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'long', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </dd>
              </div>
            </dl>
          </div>

          {/* Existing operator response (for reference when re-actioning) */}
          {(req.proposed_date || req.operator_notes) && (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5">
              <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-3">Your previous response</h2>
              <dl className="space-y-2.5">
                {req.proposed_date && (
                  <div className="flex gap-3">
                    <dt className="w-32 shrink-0 text-xs text-zinc-400">Alternative offered</dt>
                    <dd className="text-sm text-zinc-800">
                      {formatDate(req.proposed_date)}
                      {req.proposed_time && ` — ${TIME_LABEL[req.proposed_time] ?? req.proposed_time}`}
                    </dd>
                  </div>
                )}
                {req.operator_notes && (
                  <div className="flex gap-3">
                    <dt className="w-32 shrink-0 text-xs text-zinc-400 pt-0.5">Your notes</dt>
                    <dd className="text-sm text-zinc-800">{req.operator_notes}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>

        {/* Right: action form */}
        <div className="lg:col-span-2">
          {isActionable ? (
            <BookingRequestActionForm
              requestId={id}
              status={status}
              portalSlug={portalSlug}
              appUrl={appUrl}
            />
          ) : (
            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">Actions</p>
              <p className="text-sm text-zinc-400">
                {status === 'cancelled'
                  ? 'This request was cancelled by the client.'
                  : 'No further action required.'}
              </p>
              {status === 'approved' && client && (
                <Link
                  href={`/dashboard/jobs/new?client_id=${client.id}`}
                  className="mt-4 inline-flex items-center text-xs font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
                >
                  Create job for this client →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
