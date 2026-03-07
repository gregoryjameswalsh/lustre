'use client'

// src/app/dashboard/settings/checklists/[id]/_components/EditChecklistTemplateClient.tsx
// =============================================================================
// LUSTRE — Edit Checklist Template — Client Form
// =============================================================================

import { useState, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  updateChecklistTemplateAction,
  saveChecklistTemplateItemsAction,
} from '@/lib/actions/checklists'
import type { ChecklistTemplateWithRelations, JobType } from '@/lib/types'

type Item = { id: string; title: string; guidance: string; isNew?: boolean }

function genId() {
  return Math.random().toString(36).slice(2)
}

export default function EditChecklistTemplateClient({
  template,
  jobTypes,
}: {
  template: ChecklistTemplateWithRelations
  jobTypes: JobType[]
}) {
  const router = useRouter()

  const initialSelectedJobTypes = template.checklist_template_job_types.map(
    jt => jt.job_type_id
  )
  const initialItems: Item[] = template.checklist_template_items.map(item => ({
    id: item.id,
    title: item.title,
    guidance: item.guidance ?? '',
  }))

  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>(initialSelectedJobTypes)
  const [items, setItems] = useState<Item[]>(
    initialItems.length > 0 ? initialItems : [{ id: genId(), title: '', guidance: '', isNew: true }]
  )
  const [savingItems, setSavingItems] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [savedSuccess, setSavedSuccess] = useState(false)

  const [state, formAction, pending] = useActionState(
    async (prev: { error?: string; success?: boolean }, formData: FormData) => {
      setGlobalError(null)
      setSavedSuccess(false)

      // Inject selected job types
      selectedJobTypes.forEach(id => formData.append('job_type_ids', id))
      const result = await updateChecklistTemplateAction(prev, formData)

      if (result.success) {
        // Save items
        const validItems = items.filter(i => i.title.trim())
        setSavingItems(true)
        const itemsResult = await saveChecklistTemplateItemsAction(
          template.id,
          validItems.map((item, idx) => ({
            title: item.title,
            guidance: item.guidance || null,
            sort_order: idx,
          }))
        )
        setSavingItems(false)

        if (itemsResult.error) {
          setGlobalError(itemsResult.error)
          return result
        }

        setSavedSuccess(true)
        router.refresh()
      }

      return result
    },
    {}
  )

  function toggleJobType(id: string) {
    setSelectedJobTypes(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function addItem() {
    setItems(prev => [...prev, { id: genId(), title: '', guidance: '', isNew: true }])
  }

  function removeItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  function updateItem(id: string, field: 'title' | 'guidance', value: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
  }

  function moveItem(idx: number, direction: 'up' | 'down') {
    const next = [...items]
    const target = direction === 'up' ? idx - 1 : idx + 1
    if (target < 0 || target >= next.length) return
    ;[next[idx], next[target]] = [next[target], next[idx]]
    setItems(next)
  }

  const isBusy = pending || savingItems

  return (
    <>
      <div className="mb-8">
        <Link href="/dashboard/settings/checklists" className="text-xs text-zinc-400 hover:text-zinc-900 transition-colors tracking-wide">
          ← Checklists
        </Link>
        <div className="flex items-center gap-3 mt-4">
          <h1 className="text-2xl font-light tracking-tight text-zinc-900 sm:text-3xl">{template.name}</h1>
          {!template.is_active && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-400 font-medium">Inactive</span>
          )}
        </div>
        <p className="mt-1 text-xs text-zinc-400">
          Changes do not affect jobs already in progress or completed.
        </p>
      </div>

      {globalError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {globalError}
        </div>
      )}

      {savedSuccess && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Template saved successfully.
        </div>
      )}

      <form action={formAction} className="space-y-6">
        <input type="hidden" name="id" value={template.id} />

        {/* Template details */}
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <div className="border-b border-zinc-100 px-5 py-4">
            <h2 className="text-sm font-medium text-zinc-900">Template details</h2>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium tracking-wider uppercase text-zinc-500 mb-1.5">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                name="name"
                type="text"
                required
                maxLength={200}
                defaultValue={template.name}
                className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-zinc-400 bg-zinc-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium tracking-wider uppercase text-zinc-500 mb-1.5">
                Description
              </label>
              <textarea
                name="description"
                maxLength={1000}
                rows={2}
                defaultValue={template.description ?? ''}
                placeholder="Optional — describe when to use this checklist"
                className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-zinc-400 bg-zinc-50 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Job types */}
        {jobTypes.length > 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="border-b border-zinc-100 px-5 py-4">
              <h2 className="text-sm font-medium text-zinc-900">Job types</h2>
              <p className="mt-0.5 text-xs text-zinc-400">This checklist will auto-apply to selected job types when a job starts.</p>
            </div>
            <div className="p-5">
              <div className="flex flex-wrap gap-2">
                {jobTypes.map(jt => (
                  <button
                    key={jt.id}
                    type="button"
                    onClick={() => toggleJobType(jt.id)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                      selectedJobTypes.includes(jt.id)
                        ? 'bg-[#4a5c4e] text-white border-[#4a5c4e]'
                        : 'border-zinc-200 text-zinc-500 hover:border-zinc-400 hover:text-zinc-700'
                    }`}
                  >
                    {jt.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Checklist items */}
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <div className="border-b border-zinc-100 px-5 py-4">
            <h2 className="text-sm font-medium text-zinc-900">Checklist items</h2>
            <p className="mt-0.5 text-xs text-zinc-400">Use the arrows to reorder items. Guidance notes are shown as hints to team members.</p>
          </div>
          <div className="divide-y divide-zinc-50">
            {items.map((item, idx) => (
              <div key={item.id} className="p-5 space-y-2">
                <div className="flex items-start gap-3">
                  {/* Reorder arrows */}
                  <div className="flex flex-col gap-0.5 flex-shrink-0 mt-1.5">
                    <button
                      type="button"
                      onClick={() => moveItem(idx, 'up')}
                      disabled={idx === 0}
                      className="text-zinc-300 hover:text-zinc-500 transition-colors disabled:opacity-20"
                      title="Move up"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(idx, 'down')}
                      disabled={idx === items.length - 1}
                      className="text-zinc-300 hover:text-zinc-500 transition-colors disabled:opacity-20"
                      title="Move down"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  <span className="text-xs text-zinc-300 font-medium mt-2 w-4 flex-shrink-0 text-right">{idx + 1}</span>
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={item.title}
                      onChange={e => updateItem(item.id, 'title', e.target.value)}
                      placeholder="Task title (required)"
                      maxLength={500}
                      className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-zinc-400 bg-zinc-50"
                    />
                    <textarea
                      value={item.guidance}
                      onChange={e => updateItem(item.id, 'guidance', e.target.value)}
                      placeholder="Guidance note (optional) — shown as hint text to team members"
                      maxLength={2000}
                      rows={2}
                      className="w-full border border-zinc-200 rounded-md px-3 py-2 text-xs text-zinc-500 focus:outline-none focus:border-zinc-400 bg-zinc-50 resize-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length === 1}
                    className="text-zinc-300 hover:text-red-400 transition-colors mt-2 flex-shrink-0 disabled:opacity-0"
                    title="Remove item"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-4 border-t border-zinc-50">
            <button
              type="button"
              onClick={addItem}
              className="text-xs font-medium tracking-[0.12em] uppercase border border-zinc-200 text-zinc-500 px-4 py-2 rounded-full hover:border-zinc-400 hover:text-zinc-700 transition-colors"
            >
              + Add Item
            </button>
          </div>
        </div>

        {state.error && (
          <p className="text-sm text-red-500">{state.error}</p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isBusy}
            className="text-xs font-medium tracking-[0.15em] uppercase bg-zinc-900 text-[#f9f8f5] px-6 py-3 rounded-full hover:bg-[#4a5c4e] transition-colors disabled:opacity-50"
          >
            {isBusy ? 'Saving…' : 'Save Changes'}
          </button>
          <Link
            href="/dashboard/settings/checklists"
            className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </>
  )
}
