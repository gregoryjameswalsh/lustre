'use client'

// src/app/dashboard/clients/[id]/_components/PipelineCard.tsx
// Shows the pipeline status for a lead client — stage, value, assigned user,
// days in stage, pipeline notes, and Win / Lose actions.

import { useState, useTransition } from 'react'
import { winClientAction, loseClientAction, updateClientPipelineAction } from '@/lib/actions/pipeline'
import type { ClientInPipeline, PipelineStage } from '@/lib/types'

function daysInStage(enteredAt: string | null): number {
  if (!enteredAt) return 0
  return Math.floor((Date.now() - new Date(enteredAt).getTime()) / 86400000)
}

function LostReasonModal({
  clientName,
  onConfirm,
  onCancel,
  isPending,
}: {
  clientName: string
  onConfirm:  (reason: string | null) => void
  onCancel:   () => void
  isPending:  boolean
}) {
  const [reason, setReason] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-sm font-medium text-zinc-900 mb-1">Mark as lost</h2>
        <p className="text-xs text-zinc-400 mb-4">
          {clientName} will be marked inactive and removed from the pipeline.
        </p>
        <label className="block text-xs text-zinc-500 mb-1.5">
          Reason <span className="text-zinc-300">(optional)</span>
        </label>
        <textarea
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 resize-none"
          rows={3}
          placeholder="e.g. chose a competitor, budget constraints…"
          value={reason}
          onChange={e => setReason(e.target.value)}
        />
        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="text-xs font-medium text-zinc-400 hover:text-zinc-900 transition-colors px-3 py-1.5"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason.trim() || null)}
            disabled={isPending}
            className="rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            {isPending ? 'Saving…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PipelineCard({
  client,
  allStages,
}: {
  client:    ClientInPipeline & {
    pipeline_stages?:            { name: string; colour: string | null } | null
    pipeline_assigned_profile?:  { full_name: string | null } | null
  }
  allStages: PipelineStage[]
}) {
  const [showLostModal, setShowLostModal] = useState(false)
  const [notes, setNotes]                = useState(client.pipeline_notes ?? '')
  const [editingNotes, setEditingNotes]  = useState(false)
  const [, startTransition]              = useTransition()
  const [isPending, setIsPending]        = useState(false)

  const stageName  = client.pipeline_stages?.name ?? 'Unknown stage'
  const stageColour = client.pipeline_stages?.colour
  const assigned   = client.pipeline_assigned_profile?.full_name
  const days       = daysInStage(client.pipeline_entered_at)

  function handleWin() {
    setIsPending(true)
    startTransition(async () => {
      await winClientAction(client.id)
      setIsPending(false)
    })
  }

  function handleLoseConfirm(reason: string | null) {
    setIsPending(true)
    setShowLostModal(false)
    startTransition(async () => {
      await loseClientAction(client.id, reason)
      setIsPending(false)
    })
  }

  function handleSaveNotes() {
    startTransition(async () => {
      await updateClientPipelineAction(client.id, { pipeline_notes: notes || null })
      setEditingNotes(false)
    })
  }

  // Only render if the client is a lead with a pipeline stage
  if (client.status !== 'lead' || !client.pipeline_stage_id) return null

  return (
    <>
      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-500">Pipeline</h2>
          <a
            href="/dashboard/pipeline"
            className="text-[10px] text-zinc-400 hover:text-zinc-900 transition-colors"
          >
            View board →
          </a>
        </div>

        <div className="px-5 py-4 space-y-3">
          {/* Stage */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">Stage</span>
            <div className="flex items-center gap-1.5">
              {stageColour && (
                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: stageColour }} />
              )}
              <span className="text-sm font-medium text-zinc-900">{stageName}</span>
            </div>
          </div>

          {/* Days in stage */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">In stage</span>
            <span className="text-sm text-zinc-900">
              {days === 0 ? 'Today' : `${days} day${days !== 1 ? 's' : ''}`}
            </span>
          </div>

          {/* Estimated value */}
          {client.estimated_monthly_value != null && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Est. monthly value</span>
              <span className="text-sm font-medium text-zinc-900">
                {new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(client.estimated_monthly_value)}/mo
              </span>
            </div>
          )}

          {/* Assigned to */}
          {assigned && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Assigned to</span>
              <span className="text-sm text-zinc-900">{assigned}</span>
            </div>
          )}

          {/* Pipeline notes */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-zinc-400">Notes</span>
              {!editingNotes && (
                <button
                  onClick={() => setEditingNotes(true)}
                  className="text-[10px] text-zinc-400 hover:text-zinc-900 transition-colors"
                >
                  Edit
                </button>
              )}
            </div>
            {editingNotes ? (
              <div>
                <textarea
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 resize-none"
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Sales context, objections, next steps…"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleSaveNotes}
                    className="text-xs font-medium text-zinc-900 hover:text-[#4a5c4e] transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => { setNotes(client.pipeline_notes ?? ''); setEditingNotes(false) }}
                    className="text-xs text-zinc-400 hover:text-zinc-900 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-600 leading-relaxed">
                {notes || <span className="text-zinc-300">No pipeline notes</span>}
              </p>
            )}
          </div>
        </div>

        {/* Win / Lose actions */}
        <div className="px-5 py-3 border-t border-zinc-100 flex gap-3">
          <button
            onClick={handleWin}
            disabled={isPending}
            className="flex-1 rounded-full bg-emerald-600 px-4 py-2 text-xs font-medium tracking-[0.1em] uppercase text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            Mark as won
          </button>
          <button
            onClick={() => setShowLostModal(true)}
            disabled={isPending}
            className="flex-1 rounded-full border border-zinc-200 px-4 py-2 text-xs font-medium tracking-[0.1em] uppercase text-zinc-600 hover:border-zinc-400 transition-colors disabled:opacity-50"
          >
            Mark as lost
          </button>
        </div>
      </div>

      {showLostModal && (
        <LostReasonModal
          clientName={`${client.first_name} ${client.last_name}`}
          onConfirm={handleLoseConfirm}
          onCancel={() => setShowLostModal(false)}
          isPending={isPending}
        />
      )}
    </>
  )
}
