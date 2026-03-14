'use client'

// src/app/dashboard/clients/[id]/_components/PortalStatusCard.tsx
// =============================================================================
// LUSTRE — Client Portal Status Card (Operator Dashboard)
// Shows the client's portal status and lets an admin invite / revoke access.
// =============================================================================

import { useState, useTransition }    from 'react'
import { inviteClientToPortal,
         resendPortalInvitation,
         revokePortalAccess,
         reinstatePortalAccess }       from '@/lib/actions/client-portal'
import type { PortalStatus }           from '@/lib/types'

interface Props {
  clientId:     string
  clientEmail:  string | null
  portalStatus: PortalStatus
  isAdmin:      boolean
  portalSlug:   string | null
  portalEnabled: boolean
}

const statusLabel: Record<PortalStatus, string> = {
  not_invited: 'Not invited',
  invited:     'Invited',
  active:      'Active',
  suspended:   'Suspended',
}

const statusColour: Record<PortalStatus, string> = {
  not_invited: 'bg-zinc-100 text-zinc-400',
  invited:     'bg-amber-50 text-amber-600',
  active:      'bg-emerald-50 text-emerald-600',
  suspended:   'bg-red-50 text-red-400',
}

export default function PortalStatusCard({
  clientId,
  clientEmail,
  portalStatus: initialStatus,
  isAdmin,
  portalSlug,
  portalEnabled,
}: Props) {
  const [status,  setStatus]  = useState<PortalStatus>(initialStatus)
  const [error,   setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [,        startTransition] = useTransition()

  function clearMessages() { setError(null); setSuccess(null) }

  function handleInvite() {
    clearMessages()
    startTransition(async () => {
      const result = await inviteClientToPortal(clientId)
      if (result.error) {
        setError(result.error)
      } else {
        setStatus('invited')
        setSuccess('Invitation sent successfully.')
      }
    })
  }

  function handleResend() {
    clearMessages()
    startTransition(async () => {
      const result = await resendPortalInvitation(clientId)
      if (result.error) {
        setError(result.error)
      } else {
        setStatus('invited')
        setSuccess('Invitation resent successfully.')
      }
    })
  }

  function handleRevoke() {
    if (!confirm('Suspend this client\'s portal access? They will not be able to log in until reinstated.')) return
    clearMessages()
    startTransition(async () => {
      const result = await revokePortalAccess(clientId)
      if (result.error) {
        setError(result.error)
      } else {
        setStatus('suspended')
        setSuccess('Portal access suspended.')
      }
    })
  }

  function handleReinstate() {
    clearMessages()
    startTransition(async () => {
      const result = await reinstatePortalAccess(clientId)
      if (result.error) {
        setError(result.error)
      } else {
        setStatus('not_invited')
        setSuccess('Portal access reinstated.')
      }
    })
  }

  const noEmail        = !clientEmail
  const notOnPlan      = !portalEnabled && !portalSlug   // portal not set up yet
  const portalUrl      = portalSlug
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/portal/${portalSlug}`
    : null

  return (
    <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
        <h2 className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-500">Client Portal</h2>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColour[status]}`}>
          {statusLabel[status]}
        </span>
      </div>

      <div className="px-5 py-4 space-y-3">

        {/* Info / error / success messages */}
        {error && (
          <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2.5">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2.5">
            <p className="text-xs text-emerald-700">{success}</p>
          </div>
        )}

        {/* Not on the right plan */}
        {notOnPlan && (
          <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5">
            <p className="text-xs text-amber-700">
              The Client Portal requires a Professional plan or above.{' '}
              <a href="/dashboard/settings/billing" className="underline">Upgrade →</a>
            </p>
          </div>
        )}

        {/* Portal URL (for reference) */}
        {portalUrl && (
          <div>
            <span className="text-xs text-zinc-400 block mb-0.5">Portal URL</span>
            <a
              href={portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#3D7A5F] hover:underline break-all"
            >
              {portalUrl}
            </a>
          </div>
        )}

        {/* No email warning */}
        {noEmail && (
          <p className="text-xs text-zinc-400">
            Add an email address to this client before inviting them.
          </p>
        )}

        {/* Actions — admin only */}
        {isAdmin && !notOnPlan && (
          <div className="flex flex-wrap gap-2 pt-1">
            {status === 'not_invited' && (
              <button
                onClick={handleInvite}
                disabled={noEmail}
                className="text-xs font-medium tracking-[0.12em] uppercase border border-zinc-200 text-zinc-600 px-4 py-2 rounded-lg hover:border-zinc-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Invite to portal
              </button>
            )}
            {status === 'invited' && (
              <button
                onClick={handleResend}
                className="text-xs font-medium tracking-[0.12em] uppercase border border-zinc-200 text-zinc-600 px-4 py-2 rounded-lg hover:border-zinc-400 transition-colors"
              >
                Resend invitation
              </button>
            )}
            {(status === 'active' || status === 'invited') && (
              <button
                onClick={handleRevoke}
                className="text-xs font-medium text-red-400 hover:text-red-600 transition-colors"
              >
                Suspend access
              </button>
            )}
            {status === 'suspended' && (
              <button
                onClick={handleReinstate}
                className="text-xs font-medium tracking-[0.12em] uppercase border border-zinc-200 text-zinc-600 px-4 py-2 rounded-lg hover:border-zinc-400 transition-colors"
              >
                Reinstate access
              </button>
            )}
          </div>
        )}

        {/* Setup nudge */}
        {!notOnPlan && !portalSlug && isAdmin && (
          <p className="text-xs text-zinc-400">
            <a href="/dashboard/settings/client-portal" className="underline hover:text-zinc-700">
              Configure your Client Portal
            </a>{' '}
            before inviting clients.
          </p>
        )}
      </div>
    </div>
  )
}
