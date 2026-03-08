'use client'

// src/app/dashboard/settings/checklists/_components/ChecklistTemplateListClient.tsx
// =============================================================================
// LUSTRE — Checklist Template List (client component)
// =============================================================================

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  deactivateChecklistTemplateAction,
  reactivateChecklistTemplateAction,
  deleteChecklistTemplateAction,
  duplicateChecklistTemplateAction,
} from '@/lib/actions/checklists'
import type { ChecklistTemplate } from '@/lib/types'

type TemplateRow = ChecklistTemplate & {
  item_count: number
  job_types: { id: string; name: string }[]
}

export default function ChecklistTemplateListClient({
  templates: initialTemplates,
  isAdmin,
}: {
  templates: TemplateRow[]
  isAdmin: boolean
}) {
  const router = useRouter()
  const [templates, setTemplates] = useState<TemplateRow[]>(initialTemplates)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function reload() {
    router.refresh()
  }

  async function handleDeactivate(id: string) {
    setActionError(null)
    const result = await deactivateChecklistTemplateAction(id)
    if (result.error) { setActionError(result.error); return }
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, is_active: false } : t))
    reload()
  }

  async function handleReactivate(id: string) {
    setActionError(null)
    const result = await reactivateChecklistTemplateAction(id)
    if (result.error) { setActionError(result.error); return }
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, is_active: true } : t))
    reload()
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    setActionError(null)
    const result = await deleteChecklistTemplateAction(id)
    if (result.error) { setActionError(result.error); return }
    setTemplates(prev => prev.filter(t => t.id !== id))
    reload()
  }

  async function handleDuplicate(id: string) {
    setActionError(null)
    startTransition(async () => {
      const result = await duplicateChecklistTemplateAction(id)
      if (result.error) { setActionError(result.error); return }
      reload()
    })
  }

  if (templates.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center">
        <p className="text-sm text-zinc-300 tracking-wide mb-3">No checklist templates yet</p>
        {isAdmin && (
          <Link
            href="/dashboard/settings/checklists/new"
            className="text-xs font-medium tracking-[0.15em] uppercase bg-[#1A3329] text-white px-5 py-2.5 rounded-lg hover:bg-[#3D7A5F] transition-colors inline-block"
          >
            + New Template
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {templates.map(template => (
        <div
          key={template.id}
          className={`rounded-xl border border-zinc-200 bg-white overflow-hidden ${!template.is_active ? 'opacity-60' : ''}`}
        >
          <div className="px-5 py-4 flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-zinc-900">{template.name}</span>
                {!template.is_active && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-400 font-medium">
                    Inactive
                  </span>
                )}
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-50 text-zinc-500 border border-zinc-100">
                  {template.item_count} {template.item_count === 1 ? 'item' : 'items'}
                </span>
              </div>

              {template.description && (
                <p className="text-xs text-zinc-400 mt-1">{template.description}</p>
              )}

              {template.job_types.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {template.job_types.map(jt => (
                    <span
                      key={jt.id}
                      className="text-xs px-2 py-0.5 rounded-lg bg-[#1A3329]/10 text-[#3D7A5F] font-medium"
                    >
                      {jt.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {isAdmin && (
              <div className="flex items-center gap-3 flex-shrink-0">
                <Link
                  href={`/dashboard/settings/checklists/${template.id}`}
                  className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleDuplicate(template.id)}
                  disabled={isPending}
                  className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors disabled:opacity-50"
                >
                  Duplicate
                </button>
                {template.is_active ? (
                  <button
                    onClick={() => handleDeactivate(template.id)}
                    className="text-xs text-zinc-400 hover:text-amber-600 transition-colors"
                  >
                    Deactivate
                  </button>
                ) : (
                  <button
                    onClick={() => handleReactivate(template.id)}
                    className="text-xs text-[#3D7A5F] hover:underline transition-colors"
                  >
                    Reactivate
                  </button>
                )}
                <button
                  onClick={() => handleDelete(template.id, template.name)}
                  className="text-xs text-zinc-300 hover:text-red-400 transition-colors"
                  title="Delete (only if no jobs use this template)"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
