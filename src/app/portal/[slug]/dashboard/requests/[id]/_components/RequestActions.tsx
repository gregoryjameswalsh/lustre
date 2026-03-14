'use client'

// src/app/portal/[slug]/dashboard/requests/[id]/_components/RequestActions.tsx
// =============================================================================
// LUSTRE — Booking Request Client Actions
// Accept/decline alternative, or cancel the whole request.
// Calls SECURITY DEFINER RPCs directly via the browser Supabase client.
// =============================================================================

import { useState }      from 'react'
import { useRouter }     from 'next/navigation'
import { createClient }  from '@/lib/supabase/client'

interface Props {
  slug:         string
  requestId:    string
  canCancel:    boolean
  hasAlternative: boolean
}

export default function RequestActions({ slug, requestId, canCancel, hasAlternative }: Props) {
  const router     = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function respond(accept: boolean) {
    setBusy(accept ? 'accept' : 'decline_alt')
    setError(null)
    const supabase = createClient()
    const { data, error: rpcError } = await supabase.rpc('portal_respond_to_alternative', {
      p_org_slug:   slug,
      p_request_id: requestId,
      p_accept:     accept,
    })
    setBusy(null)
    if (rpcError || (data as { error?: string })?.error) {
      setError((data as { error?: string })?.error ?? 'Something went wrong. Please try again.')
      return
    }
    router.refresh()
  }

  async function cancel() {
    if (!confirm('Are you sure you want to cancel this request?')) return
    setBusy('cancel')
    setError(null)
    const supabase = createClient()
    const { data, error: rpcError } = await supabase.rpc('portal_cancel_booking_request', {
      p_org_slug:   slug,
      p_request_id: requestId,
    })
    setBusy(null)
    if (rpcError || (data as { error?: string })?.error) {
      setError((data as { error?: string })?.error ?? 'Something went wrong. Please try again.')
      return
    }
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {hasAlternative && (
        <div className="flex gap-2">
          <button
            onClick={() => respond(true)}
            disabled={busy !== null}
            className="flex-1 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50 transition-colors"
          >
            {busy === 'accept' ? 'Accepting…' : 'Accept alternative'}
          </button>
          <button
            onClick={() => respond(false)}
            disabled={busy !== null}
            className="flex-1 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 transition-colors"
          >
            {busy === 'decline_alt' ? 'Declining…' : 'Decline alternative'}
          </button>
        </div>
      )}

      {canCancel && (
        <button
          onClick={cancel}
          disabled={busy !== null}
          className="w-full rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-600 hover:border-zinc-300 disabled:opacity-50 transition-colors"
        >
          {busy === 'cancel' ? 'Cancelling…' : 'Cancel this request'}
        </button>
      )}
    </div>
  )
}
