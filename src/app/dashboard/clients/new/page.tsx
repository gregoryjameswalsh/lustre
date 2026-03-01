'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Nav from '@/components/dashboard/Nav'

export default function NewClientPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organisation_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organisation_id) {
      setError('No organisation found. Please contact support.')
      setLoading(false)
      return
    }

    const { error } = await supabase.from('clients').insert({
      organisation_id: profile.organisation_id,
      first_name: formData.get('first_name') as string,
      last_name: formData.get('last_name') as string,
      email: formData.get('email') || null,
      phone: formData.get('phone') || null,
      secondary_phone: formData.get('secondary_phone') || null,
      notes: formData.get('notes') || null,
      status: formData.get('status') as string ?? 'active',
      source: formData.get('source') || null,
    })

    if (error) {
      setError("Something went wrong. Please try again.")
      setLoading(false)
    } else {
      router.push('/dashboard/clients')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-[#f9f8f5]">

      {/* Nav */}
      <Nav />

      <main className="max-w-3xl mx-auto px-6 pt-24 pb-16">

        <div className="mb-8">
          <a href="/dashboard/clients" className="text-xs text-zinc-400 hover:text-zinc-900 transition-colors tracking-wide">
            ← Back to Clients
          </a>
          <h1 className="text-3xl font-light tracking-tight text-zinc-900 mt-4">New Client</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Personal details */}
          <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100">
              <h2 className="text-sm font-medium text-zinc-900 tracking-tight">Personal Details</h2>
            </div>
            <div className="px-6 py-6 grid grid-cols-2 gap-4">
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
                {['active', 'lead', 'inactive'].map((s) => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value={s}
                      defaultChecked={s === 'active'}
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
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="text-xs font-medium tracking-[0.15em] uppercase bg-zinc-900 text-[#f9f8f5] px-6 py-3 rounded-full hover:bg-[#4a5c4e] transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Save Client'}
            </button>
            <a
              href="/dashboard/clients"
              className="text-xs font-medium tracking-[0.15em] uppercase border border-zinc-200 text-zinc-500 px-6 py-3 rounded-full hover:border-zinc-400 transition-colors"
            >
              Cancel
            </a>
          </div>

        </form>
      </main>
    </div>
  )
}