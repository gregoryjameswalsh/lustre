'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import Nav from '@/components/dashboard/Nav'

export default function EditClientPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [client, setClient] = useState<any>(null)

  const supabase = createClient()

  useEffect(() => {
    async function loadClient() {
      const { data } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single()
      setClient(data)
      setFetching(false)
    }
    loadClient()
  }, [clientId])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)

    const { error } = await supabase.from('clients').update({
      first_name: formData.get('first_name') as string,
      last_name: formData.get('last_name') as string,
      email: formData.get('email') || null,
      phone: formData.get('phone') || null,
      secondary_phone: formData.get('secondary_phone') || null,
      notes: formData.get('notes') || null,
      status: formData.get('status') as string,
      source: formData.get('source') || null,
    }).eq('id', clientId)

    if (error) {
      setError("Something went wrong. Please try again.")
      setLoading(false)
    } else {
      router.push(`/dashboard/clients/${clientId}`)
      router.refresh()
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this client? This will also delete all their properties and jobs. This cannot be undone.')) return
    setDeleting(true)
    await supabase.from('clients').delete().eq('id', clientId)
    router.push('/dashboard/clients')
    router.refresh()
  }

  const inputClass = "w-full border border-zinc-200 rounded-md px-4 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-zinc-400 bg-zinc-50 transition-colors"
  const labelClass = "block text-xs font-medium tracking-wider uppercase text-zinc-500 mb-2"

  if (fetching) return (
    <div className="min-h-screen bg-[#f9f8f5]"><Nav />
      <div className="max-w-3xl mx-auto px-6 pt-24 text-sm text-zinc-300">Loading…</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f9f8f5]">
      <Nav />
      <main className="max-w-3xl mx-auto px-6 pt-24 pb-16">

        <div className="mb-8">
          <a href={`/dashboard/clients/${clientId}`} className="text-xs text-zinc-400 hover:text-zinc-900 transition-colors tracking-wide">
            ← Back to Client
          </a>
          <h1 className="text-3xl font-light tracking-tight text-zinc-900 mt-4">Edit Client</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100">
              <h2 className="text-sm font-medium text-zinc-900 tracking-tight">Personal Details</h2>
            </div>
            <div className="px-6 py-6 grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>First Name <span className="text-red-400">*</span></label>
                <input name="first_name" required defaultValue={client?.first_name} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Last Name <span className="text-red-400">*</span></label>
                <input name="last_name" required defaultValue={client?.last_name} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input name="email" type="email" defaultValue={client?.email ?? ''} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input name="phone" type="tel" defaultValue={client?.phone ?? ''} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Secondary Phone</label>
                <input name="secondary_phone" type="tel" defaultValue={client?.secondary_phone ?? ''} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>How did they find you?</label>
                <select name="source" defaultValue={client?.source ?? ''} className={inputClass}>
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

          <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100">
              <h2 className="text-sm font-medium text-zinc-900 tracking-tight">Status</h2>
            </div>
            <div className="px-6 py-6">
              <div className="flex gap-3">
                {['active', 'lead', 'inactive'].map((s) => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value={s}
                      defaultChecked={client?.status === s}
                      className="accent-[#4a5c4e]"
                    />
                    <span className="text-sm text-zinc-700 capitalize">{s}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100">
              <h2 className="text-sm font-medium text-zinc-900 tracking-tight">Notes</h2>
            </div>
            <div className="px-6 py-6">
              <textarea
                name="notes"
                rows={4}
                defaultValue={client?.notes ?? ''}
                className={`${inputClass} resize-none`}
                placeholder="Any important notes about this client…"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-500 tracking-wide">{error}</p>}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="text-xs font-medium tracking-[0.15em] uppercase bg-zinc-900 text-[#f9f8f5] px-6 py-3 rounded-full hover:bg-[#4a5c4e] transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving…' : 'Save Changes'}
              </button>
              <a
                href={`/dashboard/clients/${clientId}`}
                className="text-xs font-medium tracking-[0.15em] uppercase border border-zinc-200 text-zinc-500 px-6 py-3 rounded-full hover:border-zinc-400 transition-colors"
              >
                Cancel
              </a>
            </div>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs text-red-400 hover:text-red-600 transition-colors tracking-wide"
            >
              {deleting ? 'Deleting…' : 'Delete client'}
            </button>
          </div>

        </form>
      </main>
    </div>
  )
}