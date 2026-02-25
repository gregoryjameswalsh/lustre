'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Nav from '@/components/dashboard/Nav'

export default function NewJobPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedClientId = searchParams.get('client_id') ?? ''
  const preselectedPropertyId = searchParams.get('property_id') ?? ''

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [clients, setClients] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [selectedClientId, setSelectedClientId] = useState(preselectedClientId)

  const supabase = createClient()

  // Load all clients on mount
  useEffect(() => {
    async function loadClients() {
      const { data } = await supabase
        .from('clients')
        .select('id, first_name, last_name')
        //.eq('status', 'active')
        .order('last_name')
      setClients(data ?? [])
    }
    loadClients()
  }, [])

  // Load properties when client changes
  useEffect(() => {
    async function loadProperties() {
      if (!selectedClientId) { setProperties([]); return }
      const { data } = await supabase
        .from('properties')
        .select('id, address_line1, town')
        .eq('client_id', selectedClientId)
      setProperties(data ?? [])
    }
    loadProperties()
  }, [selectedClientId])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organisation_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organisation_id) {
      setError('No organisation found.')
      setLoading(false)
      return
    }

    const clientId = formData.get('client_id') as string
    const propertyId = formData.get('property_id') as string

    if (!clientId || !propertyId) {
      setError('Please select a client and property.')
      setLoading(false)
      return
    }

    const { data: job, error: insertError } = await supabase.from('jobs').insert({
      organisation_id: profile.organisation_id,
      client_id: clientId,
      property_id: propertyId,
      service_type: formData.get('service_type') || null,
      status: 'scheduled',
      scheduled_date: formData.get('scheduled_date') || null,
      scheduled_time: formData.get('scheduled_time') || null,
      duration_hours: formData.get('duration_hours') ? Number(formData.get('duration_hours')) : null,
      price: formData.get('price') ? Number(formData.get('price')) : null,
      notes: formData.get('notes') || null,
      internal_notes: formData.get('internal_notes') || null,
    }).select().single()

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
    } else {
      router.push(`/dashboard/jobs/${job.id}`)
      router.refresh()
    }
  }

  const inputClass = "w-full border border-zinc-200 rounded-md px-4 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-zinc-400 bg-zinc-50 transition-colors"
  const labelClass = "block text-xs font-medium tracking-wider uppercase text-zinc-500 mb-2"

  return (
    <div className="min-h-screen bg-[#f9f8f5]">
      <Nav />

      <main className="max-w-3xl mx-auto px-6 pt-24 pb-16">

        <div className="mb-8">
          <a href="/dashboard/jobs" className="text-xs text-zinc-400 hover:text-zinc-900 transition-colors tracking-wide">
            ← Back to Jobs
          </a>
          <h1 className="text-3xl font-light tracking-tight text-zinc-900 mt-4">Schedule Job</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Client & property */}
          <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100">
              <h2 className="text-sm font-medium text-zinc-900 tracking-tight">Client & Property</h2>
            </div>
            <div className="px-6 py-6 grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  Client <span className="text-red-400">*</span>
                </label>
                <select
                  name="client_id"
                  required
                  value={selectedClientId}
                  onChange={e => setSelectedClientId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">— Select client —</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>
                  Property <span className="text-red-400">*</span>
                </label>
                <select
                  name="property_id"
                  required
                  defaultValue={preselectedPropertyId}
                  className={inputClass}
                  disabled={!selectedClientId}
                >
                  <option value="">— Select property —</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.address_line1}{p.town ? `, ${p.town}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Service details */}
          <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100">
              <h2 className="text-sm font-medium text-zinc-900 tracking-tight">Service Details</h2>
            </div>
            <div className="px-6 py-6 grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Service Type</label>
                <select name="service_type" className={inputClass}>
                  <option value="">— Select —</option>
                  <option value="regular">Regular Clean</option>
                  <option value="deep_clean">Deep Clean</option>
                  <option value="move_in">Move In</option>
                  <option value="move_out">Move Out</option>
                  <option value="post_event">Post Event</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Duration (hours)</label>
                <input
                  name="duration_hours"
                  type="number"
                  min="0.5"
                  max="24"
                  step="0.5"
                  className={inputClass}
                  placeholder="3"
                />
              </div>
              <div>
                <label className={labelClass}>Date</label>
                <input name="scheduled_date" type="date" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Time</label>
                <input name="scheduled_time" type="time" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Price (£)</label>
                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClass}
                  placeholder="120.00"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100">
              <h2 className="text-sm font-medium text-zinc-900 tracking-tight">Notes</h2>
            </div>
            <div className="px-6 py-6 space-y-4">
              <div>
                <label className={labelClass}>Client Notes</label>
                <textarea
                  name="notes"
                  rows={3}
                  className={`${inputClass} resize-none`}
                  placeholder="Notes visible to the cleaner…"
                />
              </div>
              <div>
                <label className={labelClass}>Internal Notes</label>
                <textarea
                  name="internal_notes"
                  rows={3}
                  className={`${inputClass} resize-none`}
                  placeholder="Internal notes, not shared with cleaner…"
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500 tracking-wide">{error}</p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="text-xs font-medium tracking-[0.15em] uppercase bg-zinc-900 text-[#f9f8f5] px-6 py-3 rounded-full hover:bg-[#4a5c4e] transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Schedule Job'}
            </button>
            <a
              href="/dashboard/jobs"
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