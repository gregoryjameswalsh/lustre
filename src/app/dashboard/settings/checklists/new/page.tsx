'use client'

// src/app/dashboard/settings/checklists/new/page.tsx
// =============================================================================
// LUSTRE — Create Checklist Template Page
// =============================================================================

import { useState, useEffect, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { createChecklistTemplateAction } from '@/lib/actions/checklists'
import { saveChecklistTemplateItemsAction } from '@/lib/actions/checklists'

type JobType = { id: string; name: string }
type Item = { id: string; title: string; guidance: string }

function genId() {
  return Math.random().toString(36).slice(2)
}

export default function NewChecklistTemplatePage() {
  const router = useRouter()
  const [jobTypes, setJobTypes] = useState<JobType[]>([])
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([])
  const [items, setItems] = useState<Item[]>([{ id: genId(), title: '', guidance: '' }])
  const [savingItems, setSavingItems] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('job_types')
        .select('id, name')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
      setJobTypes(data ?? [])
    }
    load()
  }, [])

  const [state, formAction, pending] = useActionState(
    async (prev: { error?: string; success?: boolean; id?: string }, formData: FormData) => {
      // Inject selected job types as multiple form values
      selectedJobTypes.forEach(id => formData.append('job_type_ids', id))
      const result = await createChecklistTemplateAction(prev, formData)

      if (result.success && result.id) {
        // Save items against the new template
        const validItems = items.filter(i => i.title.trim())
        if (validItems.length > 0) {
          setSavingItems(true)
          const itemsResult = await saveChecklistTemplateItemsAction(
            result.id,
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
        }
        router.push(`/dashboard/settings/checklists/${result.id}`)
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
    setItems(prev => [...prev, { id: genId(), title: '', guidance: '' }])
  }

  function removeItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  function updateItem(id: string, field: 'title' | 'guidance', value: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
  }

  const isBusy = pending || savingItems

  return (
    <main className="max-w-3xl mx-auto px-4 pt-8 pb-4 sm:px-6 md:pt-16 md:pb-16">

        <div className="mb-8">
          <Link href="/dashboard/settings/checklists" className="text-xs text-zinc-400 hover:text-zinc-900 transition-colors tracking-wide">
            ← Checklists
          </Link>
          <h1 className="text-2xl font-light tracking-tight text-zinc-900 sm:text-3xl mt-4">New Template</h1>
          <p className="mt-1 text-sm text-zinc-400">Define a reusable checklist for one or more job types.</p>
        </div>

        {globalError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {globalError}
          </div>
        )}

        <form action={formAction} className="space-y-6">

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
                  placeholder="e.g. Regular Clean Checklist"
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
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                        selectedJobTypes.includes(jt.id)
                          ? 'bg-[#1A3329] text-white border-[#1A3329]'
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
              <p className="mt-0.5 text-xs text-zinc-400">Add the tasks team members must complete. Guidance notes are shown as hints.</p>
            </div>
            <div className="divide-y divide-zinc-50">
              {items.map((item, idx) => (
                <div key={item.id} className="p-5 space-y-2">
                  <div className="flex items-start gap-3">
                    <span className="text-xs text-zinc-300 font-medium mt-2.5 w-5 flex-shrink-0 text-right">{idx + 1}</span>
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
                className="text-xs font-medium tracking-[0.12em] uppercase border border-zinc-200 text-zinc-500 px-4 py-2 rounded-lg hover:border-zinc-400 hover:text-zinc-700 transition-colors"
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
              className="text-xs font-medium tracking-[0.15em] uppercase bg-[#1A3329] text-white px-6 py-3 rounded-lg hover:bg-[#3D7A5F] transition-colors disabled:opacity-50"
            >
              {isBusy ? 'Saving…' : 'Save Template'}
            </button>
            <Link
              href="/dashboard/settings/checklists"
              className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              Cancel
            </Link>
          </div>

        </form>
    </main>
  )
}
