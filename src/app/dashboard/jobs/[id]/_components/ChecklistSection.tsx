'use client'

// src/app/dashboard/jobs/[id]/_components/ChecklistSection.tsx
// =============================================================================
// LUSTRE — Job Checklist Section
// Renders the checklist on the job detail page. Handles optimistic check/uncheck.
// Read-only when job is completed or cancelled.
// =============================================================================

import { useState, useTransition } from 'react'
import { toggleChecklistItemAction } from '@/lib/actions/checklist-completion'
import type { JobChecklistWithItems, JobChecklistItem } from '@/lib/types'

function formatCompletedAt(ts: string): string {
  const d = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1)   return 'just now'
  if (diffMins < 60)  return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function ChecklistSection({
  checklist: initialChecklist,
  jobStatus,
}: {
  checklist: JobChecklistWithItems
  jobStatus: string
}) {
  const [items, setItems] = useState<JobChecklistItem[]>(initialChecklist.items)
  const [itemError, setItemError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isReadOnly = jobStatus === 'completed' || jobStatus === 'cancelled'
  const completedCount = items.filter(i => i.is_completed).length
  const totalCount = items.length
  const allComplete = completedCount === totalCount && totalCount > 0

  function handleToggle(itemId: string, currentlyCompleted: boolean) {
    if (isReadOnly) return

    const newCompleted = !currentlyCompleted

    // Optimistic update
    setItems(prev =>
      prev.map(i => {
        if (i.id !== itemId) return i
        return {
          ...i,
          is_completed: newCompleted,
          completed_by: newCompleted ? 'optimistic' : null,
          completed_at: newCompleted ? new Date().toISOString() : null,
          completed_by_profile: newCompleted
            ? { full_name: null }
            : null,
        }
      })
    )
    setItemError(null)

    startTransition(async () => {
      const result = await toggleChecklistItemAction(itemId, newCompleted)
      if (result.error) {
        // Revert
        setItems(prev =>
          prev.map(i =>
            i.id === itemId ? { ...i, is_completed: currentlyCompleted } : i
          )
        )
        setItemError(result.error)
      }
    })
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden mb-6 md:mb-8">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-500">
            Checklist
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">{initialChecklist.template_name}</p>
        </div>
        {/* Progress pill */}
        <span
          className={`text-xs font-medium px-3 py-1 rounded-full ${
            allComplete
              ? 'bg-emerald-50 text-emerald-600'
              : isReadOnly
              ? 'bg-zinc-100 text-zinc-400'
              : 'bg-amber-50 text-amber-600'
          }`}
        >
          {completedCount} / {totalCount} complete
        </span>
      </div>

      {itemError && (
        <div className="px-5 py-2 border-b border-red-100 bg-red-50 text-xs text-red-600">
          {itemError}
        </div>
      )}

      {/* Items */}
      <div className="divide-y divide-zinc-50">
        {items.map(item => (
          <div
            key={item.id}
            className={`px-5 py-4 flex items-start gap-4 transition-colors ${
              isReadOnly ? '' : 'hover:bg-zinc-50/60 cursor-pointer'
            }`}
            onClick={() => !isReadOnly && handleToggle(item.id, item.is_completed)}
          >
            {/* Checkbox */}
            <div className="flex-shrink-0 mt-0.5">
              {isReadOnly ? (
                item.is_completed ? (
                  <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-zinc-200" />
                )
              ) : (
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    item.is_completed
                      ? 'bg-[#4a5c4e] border-[#4a5c4e]'
                      : 'border-zinc-300 hover:border-zinc-400'
                  } ${isPending ? 'opacity-60' : ''}`}
                >
                  {item.is_completed && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                    </svg>
                  )}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-medium leading-snug ${
                  item.is_completed ? 'text-zinc-400 line-through' : 'text-zinc-900'
                }`}
              >
                {item.title}
              </p>
              {item.guidance && !item.is_completed && (
                <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{item.guidance}</p>
              )}
              {item.is_completed && item.completed_at && (
                <p className="text-xs text-zinc-400 mt-0.5">
                  {item.completed_by_profile?.full_name
                    ? `${item.completed_by_profile.full_name} · `
                    : ''}
                  {formatCompletedAt(item.completed_at)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {isReadOnly && (
        <div className="px-5 py-3 border-t border-zinc-50 bg-zinc-50/50">
          <p className="text-xs text-zinc-400">
            Checklist is read-only — job is {jobStatus.replace('_', ' ')}.
          </p>
        </div>
      )}
    </div>
  )
}
