'use client'

import { useSearchParams } from 'next/navigation'
import { useActionState }  from 'react'
import Link                from 'next/link'
import { createClientAction } from '@/lib/actions/clients'

export default function NewClientPage() {
  const searchParams  = useSearchParams()
  const initialStatus = searchParams.get('status') === 'lead' ? 'lead' : 'active'
  const stageId       = searchParams.get('stage_id') ?? ''
  const returnPath    = searchParams.get('from') === 'pipeline'
    ? '/dashboard/pipeline'
    : '/dashboard/clients'

  const [error, formAction, pending] = useActionState(
    async (_prev: string, formData: FormData) => {
      try {
        await createClientAction(formData)
        return ''
      } catch (e: unknown) {
        if (e instanceof Error && e.message.startsWith('NEXT_REDIRECT')) throw e
        return 'Something went wrong. Please try again.'
      }
    },
    '',
  )

  return (
    <div className="min-h-screen bg-[#f9f8f5]">

      <main className="max-w-3xl mx-auto px-4 pt-8 pb-4 sm:px-6 md:pt-24 md:pb-16">

        <div className="mb-8">
          <Link href={returnPath} className="text-xs text-zinc-400 hover:text-zinc-900 transition-colors tracking-wide">
            ← {returnPath === '/dashboard/pipeline' ? 'Back to Pipeline' : 'Back to Clients'}
          </Link>
          <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-zinc-900 mt-4">New Client</h1>
        </div>

        <form action={formAction} className="space-y-6">

          {/* Hidden pipeline / navigation fields */}
          <input type="hidden" name="return_to" value={returnPath} />
          {initialStatus === 'lead' && stageId && (
            <input type="hidden" name="pipeline_stage_id" value={stageId} />
          )}

          {/* Personal details */}
          <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100">
              <h2 className="text-sm font-medium text-zinc-900 tracking-tight">Personal Details</h2>
            </div>
            <div className="px-6 py-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-zinc-500 mb-2">
                  First Name <span className="text-red-400">*</span>
                </label>
                <input
                  name="first_name"
                  required
                  className="w-full border border-zinc-200 rounded-md px-4 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-zinc-400 bg-zinc-50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-zinc-500 mb-2">
                  Last Name <span className="text-red-400">*</span>
                </label>
                <input
                  name="last_name"
                  required
                  className="w-full border border-zinc-200 rounded-md px-4 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-zinc-400 bg-zinc-50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-zinc-500 mb-2">Email</label>
                <input
                  name="email"
                  type="email"
                  className="w-full border border-zinc-200 rounded-md px-4 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-zinc-400 bg-zinc-50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-zinc-500 mb-2">Phone</label>
                <input
                  name="phone"
                  type="tel"
                  className="w-full border border-zinc-200 rounded-md px-4 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-zinc-400 bg-zinc-50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-zinc-500 mb-2">Secondary Phone</label>
                <input
                  name="secondary_phone"
                  type="tel"
                  className="w-full border border-zinc-200 rounded-md px-4 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-zinc-400 bg-zinc-50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-zinc-500 mb-2">How did they find you?</label>
                <select
                  name="source"
                  className="w-full border border-zinc-200 rounded-md px-4 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-zinc-400 bg-zinc-50 transition-colors"
                >
                  <option value="">— Select —</option>
                  <option value="referral">Referral</option>
                  <option value="google">Google</option>
                  <option value="instagram">Instagram</option>
                  <option value="website">Website</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100">
              <h2 className="text-sm font-medium text-zinc-900 tracking-tight">Status</h2>
            </div>
            <div className="px-6 py-6">
              <div className="flex gap-3">
                {(['active', 'lead', 'inactive'] as const).map((s) => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value={s}
                      defaultChecked={s === initialStatus}
                      className="accent-[#4a5c4e]"
                    />
                    <span className="text-sm text-zinc-700 capitalize">{s}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100">
              <h2 className="text-sm font-medium text-zinc-900 tracking-tight">Notes</h2>
            </div>
            <div className="px-6 py-6">
              <textarea
                name="notes"
                rows={4}
                placeholder="Any important notes about this client…"
                className="w-full border border-zinc-200 rounded-md px-4 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-zinc-400 bg-zinc-50 transition-colors resize-none"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500 tracking-wide">{error}</p>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="text-xs font-medium tracking-[0.15em] uppercase bg-zinc-900 text-[#f9f8f5] px-6 py-3 rounded-full hover:bg-[#4a5c4e] transition-colors disabled:opacity-50"
            >
              {pending ? 'Saving…' : 'Save Client'}
            </button>
            <Link
              href={returnPath}
              className="text-xs font-medium tracking-[0.15em] uppercase border border-zinc-200 text-zinc-500 px-6 py-3 rounded-full hover:border-zinc-400 transition-colors"
            >
              Cancel
            </Link>
          </div>

        </form>
      </main>
    </div>
  )
}
