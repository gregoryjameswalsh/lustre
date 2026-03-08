'use client'

// src/app/dashboard/clients/[id]/_components/DataPrivacySection.tsx
// Data & Privacy panel — consent toggles, DSAR export, erasure request.

import { useState }        from 'react'
import { setConsent, exportClientData, eraseClientData } from '@/lib/actions/gdpr'
import type { ConsentRecord, ConsentType } from '@/lib/types'

const CONSENT_LABELS: Record<ConsentType, string> = {
  marketing_email: 'Marketing emails',
  sms:             'SMS messages',
  data_processing: 'Data processing',
}

function formatTs(ts: string | null) {
  if (!ts) return null
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ---------------------------------------------------------------------------
// Consent toggle row
// ---------------------------------------------------------------------------

function ConsentRow({
  clientId,
  record,
  type,
}: {
  clientId: string
  record:   ConsentRecord | undefined
  type:     ConsentType
}) {
  const [granted,  setGranted]  = useState(record?.granted ?? false)
  const [pending,  setPending]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const ts = granted ? record?.granted_at ?? null : record?.withdrawn_at ?? null

  async function toggle() {
    setPending(true)
    setError(null)
    const next   = !granted
    const result = await setConsent(clientId, type, next)
    setPending(false)
    if (result.error) { setError(result.error) } else { setGranted(next) }
  }

  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm text-zinc-800">{CONSENT_LABELS[type]}</p>
        {ts && (
          <p className="text-xs text-zinc-400 mt-0.5">
            {granted ? 'Granted' : 'Withdrawn'} {formatTs(ts)}
          </p>
        )}
        {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
      </div>
      <button
        onClick={toggle}
        disabled={pending}
        aria-checked={granted}
        role="switch"
        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50 ${
          granted ? 'bg-[#1A3329]' : 'bg-zinc-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            granted ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Export button
// ---------------------------------------------------------------------------

function ExportButton({ clientId }: { clientId: string }) {
  const [pending, setPending] = useState(false)
  const [url,     setUrl]     = useState<string | null>(null)
  const [error,   setError]   = useState<string | null>(null)

  async function handleExport() {
    setPending(true)
    setError(null)
    setUrl(null)
    const result = await exportClientData(clientId)
    setPending(false)
    if (result.error) { setError(result.error) } else { setUrl(result.url ?? null) }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleExport}
        disabled={pending}
        className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 transition-colors disabled:opacity-50"
      >
        {pending ? 'Preparing export…' : 'Export data (DSAR)'}
      </button>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-xs text-[#3D7A5F] hover:underline"
        >
          Download export ↓ (link valid 7 days)
        </a>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Erase button + confirmation
// ---------------------------------------------------------------------------

function EraseButton({ clientId }: { clientId: string }) {
  const [stage,   setStage]   = useState<'idle' | 'confirm' | 'pending' | 'done'>('idle')
  const [error,   setError]   = useState<string | null>(null)

  async function handleErase() {
    setStage('pending')
    setError(null)
    const result = await eraseClientData(clientId)
    if (result.error) {
      setError(result.error)
      setStage('confirm')
    } else {
      setStage('done')
    }
  }

  if (stage === 'done') {
    return (
      <p className="text-xs text-zinc-400">
        Data erased. PII has been anonymised and activities deleted.
      </p>
    )
  }

  if (stage === 'confirm' || stage === 'pending') {
    return (
      <div className="rounded-lg border border-red-100 bg-red-50 p-3 space-y-2">
        <p className="text-xs font-medium text-red-800">This cannot be undone.</p>
        <ul className="text-xs text-red-700 list-disc list-inside space-y-0.5">
          <li>Name, email, and phone will be replaced with "Redacted"</li>
          <li>All properties, activities, and follow-ups will be deleted</li>
          <li>Jobs and quotes are kept (anonymised reference only)</li>
        </ul>
        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleErase}
            disabled={stage === 'pending'}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {stage === 'pending' ? 'Erasing…' : 'Yes, erase data'}
          </button>
          <button
            onClick={() => { setStage('idle'); setError(null) }}
            disabled={stage === 'pending'}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setStage('confirm')}
      className="rounded-lg border border-red-200 px-4 py-2 text-xs font-medium text-red-600 hover:border-red-400 hover:bg-red-50 transition-colors"
    >
      Request erasure
    </button>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function DataPrivacySection({
  clientId,
  consents,
}: {
  clientId: string
  consents: ConsentRecord[]
}) {
  const byType = Object.fromEntries(consents.map(c => [c.consent_type, c])) as
    Partial<Record<ConsentType, ConsentRecord>>

  const consentTypes: ConsentType[] = ['marketing_email', 'sms', 'data_processing']

  return (
    <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100">
        <h2 className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-500">Data &amp; Privacy</h2>
      </div>

      {/* Consent toggles */}
      <div className="px-5 divide-y divide-zinc-50">
        {consentTypes.map(type => (
          <ConsentRow
            key={type}
            clientId={clientId}
            record={byType[type]}
            type={type}
          />
        ))}
      </div>

      {/* DSAR export */}
      <div className="px-5 py-4 border-t border-zinc-100 space-y-3">
        <ExportButton clientId={clientId} />
        <EraseButton  clientId={clientId} />
      </div>
    </div>
  )
}
