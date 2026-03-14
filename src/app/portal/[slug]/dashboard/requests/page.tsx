// src/app/portal/[slug]/dashboard/requests/page.tsx
// =============================================================================
// LUSTRE — Portal: Client's Booking Requests List
// =============================================================================

import { getPortalClientContext } from '@/lib/actions/_portal_auth'
import Link                       from 'next/link'
import type { PortalBookingRequest, BookingRequestStatus } from '@/lib/types'

const STATUS_CONFIG: Record<BookingRequestStatus, { label: string; className: string }> = {
  pending:                     { label: 'Awaiting response', className: 'bg-amber-50 text-amber-700 border border-amber-200' },
  approved:                    { label: 'Confirmed',         className: 'bg-green-50 text-green-700 border border-green-200' },
  declined:                    { label: 'Declined',          className: 'bg-red-50 text-red-700 border border-red-200' },
  alternative_proposed:        { label: 'Alternative offered', className: 'bg-blue-50 text-blue-700 border border-blue-200' },
  client_accepted_alternative: { label: 'Alternative accepted', className: 'bg-green-50 text-green-700 border border-green-200' },
  client_declined_alternative: { label: 'Alternative declined', className: 'bg-zinc-100 text-zinc-600' },
  cancelled:                   { label: 'Cancelled',         className: 'bg-zinc-100 text-zinc-500' },
}

export default async function PortalRequestsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug }     = await params
  const { supabase, context } = await getPortalClientContext(slug)

  const { data: requestsRaw } = await supabase.rpc('portal_get_booking_requests', {
    p_org_slug: slug,
  })

  const requests = (Array.isArray(requestsRaw) ? requestsRaw : []) as PortalBookingRequest[]

  const base = `/portal/${slug}/dashboard`

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-light tracking-tight text-zinc-900">Booking requests</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Your submitted service requests</p>
        </div>
        <Link
          href={`${base}/requests/new`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-zinc-700 transition-colors"
        >
          + New request
        </Link>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-zinc-400">No booking requests yet</p>
          <p className="text-xs text-zinc-300 mt-1 mb-5">
            Request a new appointment with {context.org_name}.
          </p>
          <Link
            href={`${base}/requests/new`}
            className="inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-700 transition-colors"
          >
            Make a request
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => {
            const cfg    = STATUS_CONFIG[req.status]
            const dateStr = req.requested_date
              ? new Date(req.requested_date).toLocaleDateString('en-GB', {
                  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                })
              : null
            const hasAction = req.status === 'alternative_proposed'
            return (
              <Link
                key={req.id}
                href={`${base}/requests/${req.id}`}
                className="block rounded-xl border border-zinc-200 bg-white p-4 hover:border-zinc-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-zinc-900">
                        {req.job_type_name ?? 'Service request'}
                      </p>
                      {hasAction && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                          Action required
                        </span>
                      )}
                    </div>
                    {req.property_address && (
                      <p className="text-xs text-zinc-500 mt-0.5 truncate">
                        {[req.property_address, req.property_town].filter(Boolean).join(', ')}
                      </p>
                    )}
                    {dateStr && (
                      <p className="text-xs text-zinc-400 mt-0.5">Requested: {dateStr}</p>
                    )}
                  </div>
                  <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.className}`}>
                    {cfg.label}
                  </span>
                </div>
                {req.notes && (
                  <p className="mt-2 text-xs text-zinc-500 line-clamp-2 italic">"{req.notes}"</p>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
