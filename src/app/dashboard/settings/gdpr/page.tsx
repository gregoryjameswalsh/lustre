// src/app/dashboard/settings/gdpr/page.tsx
// =============================================================================
// LUSTRE — GDPR Requests admin view (Settings › Data & Privacy)
// =============================================================================

import { createClient }  from '@/lib/supabase/server'
import { redirect }      from 'next/navigation'
import Link              from 'next/link'
import type { GdprRequestWithClient } from '@/lib/types'

async function getData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisation_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  if (profile.role !== 'admin') redirect('/dashboard/settings')

  const { data: requests } = await supabase
    .from('gdpr_requests')
    .select('*, clients(first_name, last_name)')
    .eq('organisation_id', profile.organisation_id)
    .order('requested_at', { ascending: false })

  return { requests: (requests ?? []) as GdprRequestWithClient[] }
}

const TYPE_LABELS: Record<string, string> = {
  dsar:          'Data export (DSAR)',
  erasure:       'Erasure',
  rectification: 'Rectification',
}

const STATUS_STYLES: Record<string, string> = {
  pending:     'bg-amber-50 text-amber-700',
  in_progress: 'bg-blue-50 text-blue-700',
  completed:   'bg-emerald-50 text-emerald-700',
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export default async function GdprPage() {
  const { requests } = await getData()

  return (
    <div className="min-h-screen bg-[#f9f8f5]">
      <main className="mx-auto max-w-2xl px-4 pt-8 pb-4 sm:px-6 md:pt-24 md:pb-16">

        <div className="mb-8">
          <Link
            href="/dashboard/settings"
            className="mb-4 inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3.5">
              <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
            </svg>
            Settings
          </Link>
          <h1 className="text-2xl font-light tracking-tight text-zinc-900 sm:text-3xl">Data &amp; Privacy</h1>
          <p className="mt-1 text-sm text-zinc-400">
            GDPR requests — data exports, erasures, and rectifications.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white">
          {requests.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-zinc-400">No GDPR requests yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {requests.map(req => {
                const clientName = req.clients
                  ? `${req.clients.first_name} ${req.clients.last_name}`
                  : 'Unknown client'

                return (
                  <li key={req.id} className="flex items-start justify-between gap-4 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-zinc-900">{clientName}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${STATUS_STYLES[req.status] ?? 'bg-zinc-100 text-zinc-500'}`}>
                          {req.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-400">
                        {TYPE_LABELS[req.request_type] ?? req.request_type}
                        {' · '}
                        Requested {formatDate(req.requested_at)}
                        {req.completed_at && ` · Completed ${formatDate(req.completed_at)}`}
                      </p>
                      {req.notes && (
                        <p className="mt-1 text-xs text-zinc-500">{req.notes}</p>
                      )}
                    </div>
                    {req.export_url && (
                      <a
                        href={req.export_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 text-xs text-[#4a5c4e] hover:underline"
                      >
                        Download ↓
                      </a>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <p className="mt-4 text-xs text-zinc-400">
          Export links expire after 7 days. Trigger a new export from the client's profile to refresh.
        </p>

      </main>
    </div>
  )
}
