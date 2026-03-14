// src/app/dashboard/booking-requests/page.tsx
// =============================================================================
// LUSTRE — Operator: Booking Requests Inbox
// =============================================================================

import { createClient }     from '@/lib/supabase/server'
import { getOrgAndUser }    from '@/lib/actions/_auth'
import Link                 from 'next/link'
import type { BookingRequestWithRelations, BookingRequestStatus } from '@/lib/types'

const STATUS_CONFIG: Record<BookingRequestStatus, { label: string; className: string }> = {
  pending:                     { label: 'Pending',            className: 'bg-amber-50 text-amber-700 border border-amber-200' },
  approved:                    { label: 'Approved',           className: 'bg-green-50 text-green-700 border border-green-200' },
  declined:                    { label: 'Declined',           className: 'bg-red-50 text-red-700 border border-red-200' },
  alternative_proposed:        { label: 'Alt. proposed',      className: 'bg-blue-50 text-blue-700 border border-blue-200' },
  client_accepted_alternative: { label: 'Alt. accepted',      className: 'bg-green-50 text-green-700 border border-green-200' },
  client_declined_alternative: { label: 'Alt. declined',      className: 'bg-orange-50 text-orange-700 border border-orange-200' },
  cancelled:                   { label: 'Cancelled',          className: 'bg-zinc-100 text-zinc-500 border border-zinc-200' },
}

// Statuses that need operator action
const NEEDS_ACTION: BookingRequestStatus[] = ['pending', 'client_accepted_alternative', 'client_declined_alternative']

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function BookingRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status: statusFilter } = await searchParams
  const { supabase, orgId } = await getOrgAndUser()

  let query = supabase
    .from('booking_requests')
    .select(`
      id, status, requested_date, preferred_time, notes, created_at,
      clients ( first_name, last_name, email ),
      job_types ( name ),
      properties ( address_line1, town )
    `)
    .eq('organisation_id', orgId)
    .order('created_at', { ascending: false })

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter)
  }

  const { data: requests } = await query

  const rows = (requests ?? []) as BookingRequestWithRelations[]

  // Pending count for badge
  const { count: pendingCount } = await supabase
    .from('booking_requests')
    .select('id', { count: 'exact', head: true })
    .eq('organisation_id', orgId)
    .in('status', NEEDS_ACTION)

  const tabs: { key: string; label: string }[] = [
    { key: 'all',     label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'declined', label: 'Declined' },
  ]

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-5xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-zinc-900">Booking requests</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Review and respond to client booking requests</p>
        </div>
        {(pendingCount ?? 0) > 0 && (
          <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-700">
            {pendingCount} need{(pendingCount ?? 0) === 1 ? 's' : ''} attention
          </span>
        )}
      </div>

      {/* Tab filter */}
      <div className="flex gap-1 mb-5 border-b border-zinc-200 pb-px">
        {tabs.map(tab => {
          const active = (statusFilter ?? 'all') === tab.key
          return (
            <Link
              key={tab.key}
              href={tab.key === 'all' ? '/dashboard/booking-requests' : `/dashboard/booking-requests?status=${tab.key}`}
              className={`px-3 py-1.5 text-xs font-medium rounded-t transition-colors ${
                active
                  ? 'border-b-2 border-zinc-900 text-zinc-900 -mb-px'
                  : 'text-zinc-400 hover:text-zinc-700'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-zinc-400">
            {statusFilter && statusFilter !== 'all'
              ? `No ${statusFilter} requests`
              : 'No booking requests yet'}
          </p>
          <p className="text-xs text-zinc-300 mt-1">
            Requests appear here when portal clients submit them.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Client</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide hidden sm:table-cell">Service</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide hidden md:table-cell">Requested date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide hidden lg:table-cell">Received</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map(req => {
                const cfg         = STATUS_CONFIG[req.status]
                const client      = req.clients as { first_name: string; last_name: string } | null
                const jobType     = req.job_types as { name: string } | null
                const needsAction = NEEDS_ACTION.includes(req.status)
                return (
                  <tr key={req.id} className={`hover:bg-zinc-50 transition-colors ${needsAction ? 'bg-amber-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {needsAction && (
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                        )}
                        <span className="font-medium text-zinc-900">
                          {client ? `${client.first_name} ${client.last_name}` : '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 hidden sm:table-cell">
                      {jobType?.name ?? <span className="text-zinc-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 hidden md:table-cell">
                      {formatDate(req.requested_date)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.className}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs hidden lg:table-cell">
                      {formatDate(req.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/booking-requests/${req.id}`}
                        className="text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors whitespace-nowrap"
                      >
                        Review →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
