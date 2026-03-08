'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import { deleteJobAction } from '@/lib/actions/jobs'

type JobData = { id: string; client_id: string; property_id: string | null; job_type_id: string | null; status: string; scheduled_date: string | null; scheduled_time: string | null; duration_hours: number | null; price: number | null; notes: string | null; internal_notes: string | null }
type ClientOption = { id: string; first_name: string; last_name: string }
type PropertyOption = { id: string; address_line1: string; town: string }
type JobTypeOption = { id: string; name: string }

export default function EditJobPage() {
  const router = useRouter()
  const params = useParams()
  const jobId = params.id as string

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [job, setJob] = useState<JobData | null>(null)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [properties, setProperties] = useState<PropertyOption[]>([])
  const [jobTypes, setJobTypes] = useState<JobTypeOption[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [{ data: jobData }, { data: clientData }, { data: jobTypeData }, { data: { user } }] = await Promise.all([
        supabase.from('jobs').select('*, clients(id, first_name, last_name), properties(id, address_line1, town)').eq('id', jobId).single(),
        supabase.from('clients').select('id, first_name, last_name').neq('status', 'inactive').order('last_name'),
        supabase.from('job_types').select('id, name').eq('is_active', true).order('sort_order', { ascending: true }),
        supabase.auth.getUser(),
      ])
      setJob(jobData)
      setClients(clientData ?? [])
      setJobTypes(jobTypeData ?? [])
      setSelectedClientId(jobData?.client_id ?? '')
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        setIsAdmin(profile?.role === 'admin')
      }
      setFetching(false)
    }
    load()
  }, [jobId])

  useEffect(() => {
    async function loadProperties() {
      if (!selectedClientId) { setProperties([]); return }
      const supabase = createClient()
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
    const supabase = createClient()

    const { error } = await supabase.from('jobs').update({
      client_id: formData.get('client_id') as string,
      property_id: formData.get('property_id') as string,
      job_type_id: formData.get('job_type_id') as string || null,
      status: formData.get('status') as string,
      scheduled_date: formData.get('scheduled_date') || null,
      scheduled_time: formData.get('scheduled_time') || null,
      duration_hours: formData.get('duration_hours') ? Number(formData.get('duration_hours')) : null,
      price: formData.get('price') ? Number(formData.get('price')) : null,
      notes: formData.get('notes') || null,
      internal_notes: formData.get('internal_notes') || null,
    }).eq('id', jobId)

    if (error) {
      setError("Something went wrong. Please try again.")
      setLoading(false)
    } else {
      router.push(`/dashboard/jobs/${jobId}`)
      router.refresh()
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this job? This cannot be undone.')) return
    setDeleting(true)
    await deleteJobAction(jobId)
  }

  const inputClass = "w-full border border-zinc-200 rounded-md px-4 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-zinc-400 bg-zinc-50 transition-colors"
  const labelClass = "block text-xs font-medium tracking-wider uppercase text-zinc-500 mb-2"

  if (fetching) return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <div className="max-w-3xl mx-auto px-4 pt-8 sm:px-6 md:pt-24 text-sm text-zinc-300">Loading…</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <main className="max-w-3xl mx-auto px-4 pt-8 pb-4 sm:px-6 md:pt-24 md:pb-16">

        <div className="mb-8">
          <a href={`/dashboard/jobs/${jobId}`} className="text-xs text-zinc-400 hover:text-zinc-900 transition-colors tracking-wide">
            ← Back to Job
          </a>
          <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-zinc-900 mt-4">Edit Job</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Client & property */}
          <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100">
              <h2 className="text-sm font-medium text-zinc-900 tracking-tight">Client & Property</h2>
            </div>
            <div className="px-6 py-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Client <span className="text-red-400">*</span></label>
                <select
                  name="client_id"
                  required
                  value={selectedClientId}
                  onChange={e => setSelectedClientId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">— Select client —</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Property <span className="text-red-400">*</span></label>
                <select
                  name="property_id"
                  required
                  defaultValue={job?.property_id ?? ''}
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
            <div className="px-6 py-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Job Type</label>
                <select name="job_type_id" defaultValue={job?.job_type_id ?? ''} className={inputClass}>
                  <option value="">— Select —</option>
                  {jobTypes.map(jt => (
                    <option key={jt.id} value={jt.id}>{jt.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select name="status" defaultValue={job?.status ?? 'scheduled'} className={inputClass}>
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Date</label>
                <input name="scheduled_date" type="date" defaultValue={job?.scheduled_date ?? ''} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Time</label>
                <input name="scheduled_time" type="time" defaultValue={job?.scheduled_time ?? ''} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Duration (hours)</label>
                <input name="duration_hours" type="number" min="0.5" max="24" step="0.5" defaultValue={job?.duration_hours ?? ''} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Price (£)</label>
                <input name="price" type="number" min="0" step="0.01" defaultValue={job?.price ?? ''} className={inputClass} />
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
                <label className={labelClass}>Notes for Cleaner</label>
                <textarea name="notes" rows={3} defaultValue={job?.notes ?? ''} className={`${inputClass} resize-none`} />
              </div>
              <div>
                <label className={labelClass}>Internal Notes</label>
                <textarea name="internal_notes" rows={3} defaultValue={job?.internal_notes ?? ''} className={`${inputClass} resize-none`} />
              </div>
            </div>
          </div>

          {error && <p className="text-xs text-red-500 tracking-wide">{error}</p>}

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="text-xs font-medium tracking-[0.15em] uppercase bg-[#1A3329] text-white px-6 py-3 rounded-lg hover:bg-[#3D7A5F] transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving…' : 'Save Changes'}
              </button>
              <a
                href={`/dashboard/jobs/${jobId}`}
                className="text-xs font-medium tracking-[0.15em] uppercase border border-zinc-200 text-zinc-500 px-6 py-3 rounded-lg hover:border-zinc-400 transition-colors"
              >
                Cancel
              </a>
            </div>
            <span
              title={!isAdmin ? 'Only admins can delete jobs' : undefined}
              className={!isAdmin ? 'cursor-not-allowed' : ''}
            >
              <button
                type="button"
                onClick={handleDelete}
                disabled={!isAdmin || deleting}
                className={`text-xs tracking-wide transition-colors ${isAdmin ? 'text-red-400 hover:text-red-600' : 'text-zinc-300 pointer-events-none'}`}
              >
                {deleting ? 'Deleting…' : 'Delete job'}
              </button>
            </span>
          </div>

        </form>
      </main>
    </div>
  )
}