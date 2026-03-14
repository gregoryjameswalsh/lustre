'use client'

// src/app/dashboard/jobs/[id]/_components/ClientInstructionPanel.tsx
// =============================================================================
// LUSTRE — Client Instruction Panel (Operator Dashboard)
// Displays the client-submitted special instruction on the job detail page.
// Lets the operator acknowledge (mark as seen) the instruction.
// =============================================================================

import { useState, useTransition } from 'react'
import { acknowledgeClientInstruction } from '@/lib/actions/client-portal'

interface Props {
  jobId:        string
  instruction:  string
  submittedAt:  string | null
  alreadySeen:  boolean
}

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins} min ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export default function ClientInstructionPanel({ jobId, instruction, submittedAt, alreadySeen }: Props) {
  const [seen,  setSeen]  = useState(alreadySeen)
  const [error, setError] = useState<string | null>(null)
  const [,      startTransition] = useTransition()

  function handleAcknowledge() {
    startTransition(async () => {
      const result = await acknowledgeClientInstruction(jobId)
      if (result.error) {
        setError(result.error)
      } else {
        setSeen(true)
      }
    })
  }

  return (
    <div className={`rounded-lg border overflow-hidden ${seen ? 'border-zinc-200 bg-white' : 'border-blue-200 bg-blue-50'}`}>
      <div className={`px-5 py-4 border-b flex items-center justify-between gap-3 ${seen ? 'border-zinc-100' : 'border-blue-200'}`}>
        <div className="flex items-center gap-2">
          <svg className={`w-4 h-4 flex-shrink-0 ${seen ? 'text-zinc-400' : 'text-blue-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <h2 className={`text-xs font-medium tracking-[0.2em] uppercase ${seen ? 'text-zinc-500' : 'text-blue-700'}`}>
            Client instruction
          </h2>
          {!seen && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500 text-white font-semibold">New</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {submittedAt && (
            <span className="text-xs text-zinc-400">{formatRelative(submittedAt)}</span>
          )}
          {!seen && (
            <button
              onClick={handleAcknowledge}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              Mark seen
            </button>
          )}
        </div>
      </div>

      <div className="px-5 py-4">
        <p className={`text-sm leading-relaxed italic ${seen ? 'text-zinc-600' : 'text-blue-900'}`}>
          &ldquo;{instruction}&rdquo;
        </p>
        {error && (
          <p className="text-xs text-red-500 mt-2">{error}</p>
        )}
      </div>
    </div>
  )
}
