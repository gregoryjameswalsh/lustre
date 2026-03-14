'use client'

// src/app/dashboard/booking-requests/[id]/_components/BookingRequestActionForm.tsx
// =============================================================================
// LUSTRE — Operator Booking Request Action Form
// Approve / Decline / Propose alternative date
// =============================================================================

import { useState, useTransition } from 'react'
import { useRouter }               from 'next/navigation'
import {
  approveBookingRequest,
  declineBookingRequest,
  proposeAlternativeDate,
} from '@/lib/actions/booking-requests'
import type { BookingRequestStatus, PreferredTime } from '@/lib/types'

interface Props {
  requestId:  string
  status:     BookingRequestStatus
  portalSlug: string
  appUrl:     string
}

type Panel = 'choose' | 'approve' | 'decline' | 'alternative'

const TIME_OPTIONS: { value: PreferredTime; label: string }[] = [
  { value: 'flexible',  label: 'Flexible' },
  { value: 'morning',   label: 'Morning (before noon)' },
  { value: 'afternoon', label: 'Afternoon (noon – 5 pm)' },
  { value: 'evening',   label: 'Evening (after 5 pm)' },
]

// Min date for the date input
function minDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

export default function BookingRequestActionForm({ requestId, status, portalSlug, appUrl }: Props) {
  const router  = useRouter()
  const [panel, setPanel]   = useState<Panel>('choose')
  const [notes, setNotes]   = useState('')
  const [altDate, setAltDate] = useState('')
  const [altTime, setAltTime] = useState<PreferredTime>('flexible')
  const [error, setError]   = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // For accepted alternative, only approve or decline are sensible
  const showAlternative = ['pending', 'client_declined_alternative'].includes(status)

  function handleApprove() {
    setError(null)
    startTransition(async () => {
      const result = await approveBookingRequest(requestId, notes)
      if (result.error) { setError(result.error); return }
      router.refresh()
      setPanel('choose')
    })
  }

  function handleDecline() {
    setError(null)
    startTransition(async () => {
      const result = await declineBookingRequest(requestId, notes)
      if (result.error) { setError(result.error); return }
      router.refresh()
      setPanel('choose')
    })
  }

  function handleAlternative() {
    setError(null)
    if (!altDate) { setError('Please choose an alternative date.'); return }
    startTransition(async () => {
      const result = await proposeAlternativeDate(requestId, altDate, altTime, notes, portalSlug, appUrl)
      if (result.error) { setError(result.error); return }
      router.refresh()
      setPanel('choose')
    })
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-4">Respond</p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
          {error}
        </div>
      )}

      {panel === 'choose' && (
        <div className="space-y-2">
          <button
            onClick={() => setPanel('approve')}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors"
          >
            Approve
          </button>
          {showAlternative && (
            <button
              onClick={() => setPanel('alternative')}
              className="w-full rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              Propose alternative date
            </button>
          )}
          <button
            onClick={() => setPanel('decline')}
            className="w-full rounded-lg border border-red-100 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            Decline
          </button>
        </div>
      )}

      {panel === 'approve' && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-zinc-800">Approve request</p>
          <p className="text-xs text-zinc-500">
            The client will receive a confirmation email.
          </p>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Note to client (optional)</label>
            <textarea
              rows={3}
              maxLength={500}
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
              placeholder="Any details to share with the client…"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleApprove}
              disabled={isPending}
              className="flex-1 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Approving…' : 'Confirm approval'}
            </button>
            <button
              onClick={() => { setPanel('choose'); setNotes('') }}
              disabled={isPending}
              className="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm text-zinc-500 hover:bg-zinc-50 disabled:opacity-50 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {panel === 'decline' && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-zinc-800">Decline request</p>
          <p className="text-xs text-zinc-500">
            The client will be notified that you're unable to accommodate this request.
          </p>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Reason (optional)</label>
            <textarea
              rows={3}
              maxLength={500}
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
              placeholder="Let the client know why…"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDecline}
              disabled={isPending}
              className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Declining…' : 'Confirm decline'}
            </button>
            <button
              onClick={() => { setPanel('choose'); setNotes('') }}
              disabled={isPending}
              className="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm text-zinc-500 hover:bg-zinc-50 disabled:opacity-50 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {panel === 'alternative' && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-zinc-800">Propose alternative</p>
          <p className="text-xs text-zinc-500">
            The client will be asked to accept or decline your suggested date.
          </p>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Alternative date <span className="text-red-500">*</span></label>
            <input
              type="date"
              min={minDate()}
              value={altDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAltDate(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Preferred time</label>
            <select
              value={altTime}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAltTime(e.target.value as PreferredTime)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
            >
              {TIME_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Message to client (optional)</label>
            <textarea
              rows={3}
              maxLength={500}
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
              placeholder="Reason for the change, or anything else to share…"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAlternative}
              disabled={isPending}
              className="flex-1 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Sending…' : 'Send alternative'}
            </button>
            <button
              onClick={() => { setPanel('choose'); setNotes(''); setAltDate(''); setAltTime('flexible') }}
              disabled={isPending}
              className="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm text-zinc-500 hover:bg-zinc-50 disabled:opacity-50 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
