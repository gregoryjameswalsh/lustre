'use client'

// src/app/dashboard/pipeline/[dealId]/_components/DealEditForm.tsx

import { useActionState }  from 'react'
import Link                from 'next/link'
import type { PipelineStage, DealWithRelations } from '@/lib/types'

interface DealEditFormProps {
  deal:   DealWithRelations
  stages: PipelineStage[]
  action: (formData: FormData) => Promise<{ error?: string } | undefined>
}

export default function DealEditForm({ deal, stages, action }: DealEditFormProps) {
  const [state, formAction, pending] = useActionState<{ error?: string }, FormData>(
    async (_prev, formData) => (await action(formData)) ?? {},
    {}
  )

  return (
    <form action={formAction} className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-white divide-y divide-zinc-100">

        <div className="px-5 py-4">
          <label htmlFor="title" className="mb-1.5 block text-xs font-medium text-zinc-700">Deal name</label>
          <input
            id="title" name="title" type="text" required maxLength={200}
            defaultValue={deal.title}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#4a5c4e] focus:ring-1 focus:ring-[#4a5c4e]"
          />
        </div>

        <div className="px-5 py-4">
          <label htmlFor="stage_id" className="mb-1.5 block text-xs font-medium text-zinc-700">Stage</label>
          <select
            id="stage_id" name="stage_id" defaultValue={deal.stage_id}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#4a5c4e]"
          >
            {stages.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="px-5 py-4">
          <label htmlFor="value" className="mb-1.5 block text-xs font-medium text-zinc-700">Value (£)</label>
          <input
            id="value" name="value" type="number" min="0" step="0.01"
            defaultValue={deal.value ?? ''}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#4a5c4e] focus:ring-1 focus:ring-[#4a5c4e]"
          />
        </div>

        <div className="px-5 py-4">
          <label htmlFor="expected_close" className="mb-1.5 block text-xs font-medium text-zinc-700">Expected close</label>
          <input
            id="expected_close" name="expected_close" type="date"
            defaultValue={deal.expected_close ?? ''}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#4a5c4e]"
          />
        </div>

        <div className="px-5 py-4">
          <label htmlFor="notes" className="mb-1.5 block text-xs font-medium text-zinc-700">Notes</label>
          <textarea
            id="notes" name="notes" rows={4} maxLength={5000}
            defaultValue={deal.notes ?? ''}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#4a5c4e] resize-none"
          />
        </div>

      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-zinc-900 px-5 py-2.5 text-xs font-medium tracking-[0.15em] uppercase text-white hover:bg-zinc-700 disabled:opacity-50 transition-colors"
        >
          {pending ? 'Saving…' : 'Save changes'}
        </button>
        <Link
          href="/dashboard/pipeline"
          className="rounded-full border border-zinc-200 px-5 py-2.5 text-xs font-medium tracking-[0.15em] uppercase text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 transition-colors"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}
