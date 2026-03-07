// src/app/dashboard/pipeline/new/page.tsx
// =============================================================================
// LUSTRE — Create new deal
// =============================================================================

import { createClient }   from '@/lib/supabase/server'
import { redirect }       from 'next/navigation'
import { getStages }      from '@/lib/queries/pipeline'
import { getClients }     from '@/lib/queries/clients'
import { createDealAction } from '@/lib/actions/pipeline'

export default async function NewDealPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [stages, clients] = await Promise.all([
    getStages(),
    getClients(),
  ])

  const firstStage = stages.find(s => !s.is_won && !s.is_lost)

  return (
    <div className="min-h-screen bg-[#f9f8f5]">
      <main className="mx-auto max-w-xl px-4 pt-8 pb-4 sm:px-6 md:pt-24 md:pb-16">

        <div className="mb-8">
          <h1 className="text-2xl font-light tracking-tight text-zinc-900 sm:text-3xl">New deal</h1>
        </div>

        <form action={createDealAction} className="space-y-4">

          <div className="rounded-xl border border-zinc-200 bg-white divide-y divide-zinc-100">

            {/* Title */}
            <div className="px-5 py-4">
              <label htmlFor="title" className="mb-1.5 block text-xs font-medium text-zinc-700">
                Deal name <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                maxLength={200}
                placeholder="e.g. Regular clean — 3-bed terrace"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-[#4a5c4e] focus:ring-1 focus:ring-[#4a5c4e]"
              />
            </div>

            {/* Client */}
            <div className="px-5 py-4">
              <label htmlFor="client_id" className="mb-1.5 block text-xs font-medium text-zinc-700">
                Client <span className="text-red-500">*</span>
              </label>
              <select
                id="client_id"
                name="client_id"
                required
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#4a5c4e]"
              >
                <option value="">Select a client…</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Stage */}
            <div className="px-5 py-4">
              <label htmlFor="stage_id" className="mb-1.5 block text-xs font-medium text-zinc-700">
                Stage
              </label>
              <select
                id="stage_id"
                name="stage_id"
                defaultValue={firstStage?.id ?? ''}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#4a5c4e]"
              >
                {stages.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Value */}
            <div className="px-5 py-4">
              <label htmlFor="value" className="mb-1.5 block text-xs font-medium text-zinc-700">
                Value (£)
              </label>
              <input
                id="value"
                name="value"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-[#4a5c4e] focus:ring-1 focus:ring-[#4a5c4e]"
              />
            </div>

            {/* Expected close */}
            <div className="px-5 py-4">
              <label htmlFor="expected_close" className="mb-1.5 block text-xs font-medium text-zinc-700">
                Expected close date
              </label>
              <input
                id="expected_close"
                name="expected_close"
                type="date"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#4a5c4e]"
              />
            </div>

            {/* Notes */}
            <div className="px-5 py-4">
              <label htmlFor="notes" className="mb-1.5 block text-xs font-medium text-zinc-700">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                maxLength={5000}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-[#4a5c4e] resize-none"
              />
            </div>

          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded-full bg-zinc-900 px-5 py-2.5 text-xs font-medium tracking-[0.15em] uppercase text-white hover:bg-zinc-700 transition-colors"
            >
              Create deal
            </button>
            <a
              href="/dashboard/pipeline"
              className="rounded-full border border-zinc-200 px-5 py-2.5 text-xs font-medium tracking-[0.15em] uppercase text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 transition-colors"
            >
              Cancel
            </a>
          </div>

        </form>
      </main>
    </div>
  )
}
