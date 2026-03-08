'use client'

// src/app/dashboard/settings/_components/EmailSettingsForm.tsx
// =============================================================================
// LUSTRE — Custom Email Sending Domain Form
//
// Three states based on the org's domain setup:
//   none     — no custom domain; show the "Set up" input
//   pending  — domain registered, DNS not yet verified; show DNS records
//   verified — domain active; show the from address with a remove option
// =============================================================================

import { useActionState, useState, useEffect, useTransition, useCallback } from 'react'
import { useFormStatus } from 'react-dom'
import {
  addCustomEmailDomain,
  verifyCustomEmailDomain,
  removeCustomEmailDomain,
  getEmailDomainDnsRecords,
  type ResendDnsRecord,
} from '@/lib/actions/emailSettings'

// -----------------------------------------------------------------------------
// Shared helpers
// -----------------------------------------------------------------------------

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-[#1A3329] px-5 py-2.5 text-xs font-medium uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pending ? pendingLabel : label}
    </button>
  )
}

function DestructiveButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg border border-red-200 px-5 py-2.5 text-xs font-medium uppercase tracking-widest text-red-600 transition-colors hover:border-red-400 hover:text-red-700 disabled:opacity-50"
    >
      {pending ? pendingLabel : label}
    </button>
  )
}

function Alert({ type, message }: { type: 'error' | 'success'; message: string }) {
  const styles = type === 'error'
    ? 'border-red-100 bg-red-50 text-red-600'
    : 'border-emerald-100 bg-emerald-50 text-emerald-700'
  return (
    <div className={`rounded-lg border px-4 py-3 ${styles}`}>
      <p className="text-sm">{message}</p>
    </div>
  )
}

// -----------------------------------------------------------------------------
// DNS records table — shown in the "pending" state
// -----------------------------------------------------------------------------

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard API unavailable — silently ignore
    }
  }, [text])

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy to clipboard"
      className="ml-1.5 shrink-0 rounded p-0.5 text-zinc-300 transition-colors hover:text-zinc-600"
    >
      {copied ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3.5 text-emerald-500">
          <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3.5">
          <path fillRule="evenodd" d="M10.986 3H12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h1.014A2.25 2.25 0 0 1 7.25 1h1.5a2.25 2.25 0 0 1 2.236 2ZM9.75 3.25a.75.75 0 0 0-.75-.75h-1.5a.75.75 0 0 0-.75.75v.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75v-.5Z" clipRule="evenodd" />
        </svg>
      )}
    </button>
  )
}

function DnsRecordsTable({ records }: { records: ResendDnsRecord[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-100">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-zinc-100 bg-zinc-50">
            <th className="px-3 py-2 text-left font-medium text-zinc-500">Type</th>
            <th className="px-3 py-2 text-left font-medium text-zinc-500">Name</th>
            <th className="px-3 py-2 text-left font-medium text-zinc-500">Value</th>
            <th className="px-3 py-2 text-left font-medium text-zinc-500">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-50">
          {records.map((r, i) => (
            <tr key={i} className="align-top">
              <td className="px-3 py-2 font-mono text-zinc-400">{r.type}</td>
              <td className="max-w-[120px] break-all px-3 py-2">
                <div className="flex items-start gap-1">
                  <span className="font-mono text-zinc-700">{r.name}</span>
                  <CopyButton text={r.name} />
                </div>
              </td>
              <td className="max-w-[200px] break-all px-3 py-2">
                <div className="flex items-start gap-1">
                  <span className="font-mono text-zinc-700">{r.value}</span>
                  <CopyButton text={r.value} />
                </div>
              </td>
              <td className="px-3 py-2">
                {r.status === 'verified' ? (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600">Verified</span>
                ) : (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600">Pending</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// -----------------------------------------------------------------------------
// State: no custom domain — entry form
// -----------------------------------------------------------------------------

function NoneState({ isAdmin }: { isAdmin: boolean }) {
  const [state, formAction] = useActionState(addCustomEmailDomain, {})

  return (
    <div className="space-y-4">
      {!isAdmin && (
        <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3">
          <p className="text-xs text-zinc-400">Only admins can configure email settings.</p>
        </div>
      )}

      <p className="text-sm text-zinc-500">
        Quotes are currently sent from <span className="font-mono text-zinc-700">hello@simplylustre.com</span>.
        Enter your own email address below to send from your own domain instead.
      </p>

      {state.error && <Alert type="error" message={state.error} />}

      {isAdmin && (
        <form action={formAction} className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-500">
              Send quotes from
            </label>
            <input
              name="from_email"
              type="email"
              placeholder="quotes@yourcompany.co.uk"
              maxLength={254}
              required
              className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-[#0c0c0b] placeholder-zinc-300 outline-none focus:border-[#1A3329] focus:ring-2 focus:ring-[#4a5c4e]/10"
            />
            <p className="mt-1 text-xs text-zinc-400">
              You&apos;ll need to add a few DNS records to verify ownership of this domain.
            </p>
          </div>
          <div className="flex justify-start pt-1 sm:justify-end">
            <SubmitButton label="Set up custom sending" pendingLabel="Setting up…" />
          </div>
        </form>
      )}
    </div>
  )
}

// -----------------------------------------------------------------------------
// State: domain pending DNS verification
// -----------------------------------------------------------------------------

function PendingState({
  domainName,
  isAdmin,
}: {
  domainName: string
  isAdmin: boolean
}) {
  const [verifyState, verifyAction] = useActionState(verifyCustomEmailDomain, {})
  const [removeState, removeAction] = useActionState(removeCustomEmailDomain, {})
  const [records, setRecords] = useState<ResendDnsRecord[] | null>(null)
  const [recordsError, setRecordsError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      const result = await getEmailDomainDnsRecords()
      if (result.error) setRecordsError(result.error)
      else setRecords(result.records ?? [])
    })
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-600">
          Pending verification
        </span>
        <span className="font-mono text-sm text-zinc-700">{domainName}</span>
      </div>

      <p className="text-sm text-zinc-500">
        Add the DNS records below to your domain provider, then click <strong>Verify</strong>.
        DNS changes can take up to 48 hours to propagate.
      </p>

      {recordsError && <Alert type="error" message={recordsError} />}
      {records === null && !recordsError && (
        <p className="text-xs text-zinc-400">Loading DNS records…</p>
      )}
      {records && records.length > 0 && <DnsRecordsTable records={records} />}

      {verifyState.error && <Alert type="error" message={verifyState.error} />}
      {removeState.error && <Alert type="error" message={removeState.error} />}

      {isAdmin && (
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {/* Verify form needs the desired from_email — store in a hidden input.
              We re-read the from_email that was entered during setup from the
              org's email_domain_name so we don't need to re-ask the user.
              If they want a different local-part they should remove and re-add. */}
          <form action={verifyAction}>
            <input type="hidden" name="from_email" value={`quotes@${domainName}`} />
            <SubmitButton label="Verify" pendingLabel="Verifying…" />
          </form>
          <form action={removeAction}>
            <DestructiveButton label="Cancel setup" pendingLabel="Cancelling…" />
          </form>
        </div>
      )}
    </div>
  )
}

// -----------------------------------------------------------------------------
// State: domain verified and active
// -----------------------------------------------------------------------------

function VerifiedState({
  customFromEmail,
  isAdmin,
}: {
  customFromEmail: string
  isAdmin: boolean
}) {
  const [state, formAction] = useActionState(removeCustomEmailDomain, {})

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-600">
          Active
        </span>
        <span className="font-mono text-sm text-zinc-700">{customFromEmail}</span>
      </div>

      <p className="text-sm text-zinc-500">
        Quotes are sent from your custom address. Clients will see your domain in their inbox.
      </p>

      {state.error && <Alert type="error" message={state.error} />}
      {state.success && <Alert type="success" message={state.success} />}

      {isAdmin && (
        <form action={formAction} className="flex justify-start pt-1 sm:justify-end">
          <DestructiveButton label="Remove custom domain" pendingLabel="Removing…" />
        </form>
      )}
    </div>
  )
}

// -----------------------------------------------------------------------------
// Main export
// -----------------------------------------------------------------------------

export interface EmailSettingsFormProps {
  domainStatus: string | null   // 'pending' | 'verified' | null
  domainName: string | null
  customFromEmail: string | null
  isAdmin: boolean
}

export default function EmailSettingsForm({
  domainStatus,
  domainName,
  customFromEmail,
  isAdmin,
}: EmailSettingsFormProps) {
  if (domainStatus === 'verified' && customFromEmail) {
    return <VerifiedState customFromEmail={customFromEmail} isAdmin={isAdmin} />
  }

  if (domainStatus === 'pending' && domainName) {
    return <PendingState domainName={domainName} isAdmin={isAdmin} />
  }

  return <NoneState isAdmin={isAdmin} />
}
