'use client'

// src/app/dashboard/settings/_components/VatSettingsForm.tsx
// =============================================================================
// LUSTRE — VAT Settings Form
// =============================================================================

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { saveVatSettings } from '@/lib/actions/settings'
import AutoDismissAlert from './AutoDismissAlert'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-[#1A3329] px-5 py-2.5 text-xs font-medium uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pending ? 'Saving…' : 'Save'}
    </button>
  )
}

interface VatSettingsFormProps {
  vatRegistered: boolean
  vatRate: number
  vatNumber: string
  isAdmin: boolean
}

export default function VatSettingsForm({ vatRegistered, vatRate, vatNumber, isAdmin }: VatSettingsFormProps) {
  const [state, formAction] = useActionState(saveVatSettings, {})
  const [isRegistered, setIsRegistered] = useState(vatRegistered)

  return (
    <form action={formAction} className="space-y-4">

      {!isAdmin && (
        <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3">
          <p className="text-xs text-zinc-400">Only admins can change VAT settings.</p>
        </div>
      )}

      {state.error && <AutoDismissAlert type="error" message={state.error} />}
      {state.success && <AutoDismissAlert type="success" message="VAT settings saved." />}

      {/* VAT registered toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[#0c0c0b]">VAT registered</p>
          <p className="text-xs text-zinc-400">Enable to show VAT breakdowns on quotes</p>
        </div>
        <button
          type="button"
          onClick={() => isAdmin && setIsRegistered(!isRegistered)}
          disabled={!isAdmin}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isRegistered ? 'bg-[#1A3329]' : 'bg-zinc-200'
          } ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            isRegistered ? 'translate-x-6' : 'translate-x-1'
          }`} />
        </button>
        {/* Hidden field so form always submits the current value */}
        <input type="hidden" name="vat_registered" value={isRegistered ? 'true' : 'false'} />
      </div>

      {/* VAT details — only shown when registered */}
      {isRegistered && (
        <div className="space-y-3 rounded-lg border border-zinc-100 bg-zinc-50 p-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-500">VAT rate %</label>
            <input
              name="vat_rate"
              type="number"
              min="0"
              max="100"
              step="0.1"
              defaultValue={vatRate}
              disabled={!isAdmin}
              className="w-32 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-[#0c0c0b] outline-none focus:border-[#1A3329] focus:ring-2 focus:ring-[#4a5c4e]/10 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-500">VAT number</label>
            <input
              name="vat_number"
              type="text"
              defaultValue={vatNumber}
              placeholder="GB123456789"
              disabled={!isAdmin}
              className="w-full max-w-xs rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-[#0c0c0b] placeholder-zinc-300 outline-none focus:border-[#1A3329] focus:ring-2 focus:ring-[#4a5c4e]/10 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-zinc-400">Format: GB followed by 9 digits</p>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="flex justify-start pt-2 sm:justify-end">
          <SubmitButton />
        </div>
      )}
    </form>
  )
}