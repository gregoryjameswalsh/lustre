'use client'

// src/app/portal/[slug]/dashboard/requests/new/_components/NewRequestForm.tsx
// =============================================================================
// LUSTRE — New Booking Request Form (Client Component)
// =============================================================================

import { useActionState, useEffect } from 'react'
import { useRouter }                 from 'next/navigation'
import { submitBookingRequest }      from '@/lib/actions/_portal_booking_requests'
import type { PortalProperty }       from '@/lib/types'

interface Props {
  slug:       string
  properties: PortalProperty[]
  jobTypes:   { id: string; name: string }[]
  orgName:    string
}

const TIME_OPTIONS = [
  { value: 'flexible',  label: 'Flexible — any time' },
  { value: 'morning',   label: 'Morning (before noon)' },
  { value: 'afternoon', label: 'Afternoon (noon – 5 pm)' },
  { value: 'evening',   label: 'Evening (after 5 pm)' },
]

// Min date for date input — tomorrow
function minDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

export default function NewRequestForm({ slug, properties, jobTypes, orgName }: Props) {
  const router = useRouter()

  const boundAction = submitBookingRequest.bind(null, slug)
  const [state, action, isPending] = useActionState(boundAction, {})

  // Redirect to requests list on success
  useEffect(() => {
    if (state.success) {
      router.push(`/portal/${slug}/dashboard/requests`)
    }
  }, [state.success, router, slug])

  return (
    <form action={action} className="space-y-5">

      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {/* Property */}
      {properties.length > 0 && (
        <div>
          <label htmlFor="property_id" className="block text-xs font-medium text-zinc-700 mb-1.5">
            Property <span className="text-zinc-400 font-normal">(optional)</span>
          </label>
          <select
            id="property_id"
            name="property_id"
            defaultValue=""
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
          >
            <option value="">No specific property / not sure</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>
                {[p.address_line1, p.town].filter(Boolean).join(', ')}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Service type */}
      {jobTypes.length > 0 && (
        <div>
          <label htmlFor="job_type_id" className="block text-xs font-medium text-zinc-700 mb-1.5">
            Service type <span className="text-zinc-400 font-normal">(optional)</span>
          </label>
          <select
            id="job_type_id"
            name="job_type_id"
            defaultValue=""
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
          >
            <option value="">Not sure / discuss with {orgName}</option>
            {jobTypes.map(jt => (
              <option key={jt.id} value={jt.id}>{jt.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Requested date */}
      <div>
        <label htmlFor="requested_date" className="block text-xs font-medium text-zinc-700 mb-1.5">
          Preferred date <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          id="requested_date"
          name="requested_date"
          min={minDate()}
          required
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
        />
      </div>

      {/* Preferred time */}
      <div>
        <label htmlFor="preferred_time" className="block text-xs font-medium text-zinc-700 mb-1.5">
          Preferred time
        </label>
        <select
          id="preferred_time"
          name="preferred_time"
          defaultValue="flexible"
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
        >
          {TIME_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-xs font-medium text-zinc-700 mb-1.5">
          Additional notes <span className="text-zinc-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          maxLength={1000}
          placeholder={`Anything ${orgName} should know about this request…`}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Sending…' : 'Submit request'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
