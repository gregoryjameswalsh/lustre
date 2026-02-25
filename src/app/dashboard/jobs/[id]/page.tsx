'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import Nav from '@/components/dashboard/Nav'

const serviceLabels: Record<string, string> = {
  regular: 'Regular Clean',
  deep_clean: 'Deep Clean',
  move_in: 'Move In',
  move_out: 'Move Out',
  post_event: 'Post Event',
  other: 'Other',
}

const statusFlow = ['scheduled', 'in_progress', 'completed', 'cancelled']

const statusColour: Record<string, string> = {
  scheduled:   'bg-blue-50 text-blue-600 border-blue-200',
  in_progress: 'bg-amber-50 text-amber-600 border-amber-200',
  completed:   'bg-emerald-50 text-emerald-600 border-emerald-200',
  cancelled:   'bg-zinc-100 text-zinc-400 border-zinc-200',
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
}

function formatTime(time: string) {
  const [h, m] = time.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'pm' : 'am'
  return `${hour % 12 || 12}:${m}${ampm}`
}

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.id as string
  const supabase = createClient()

  const [job, setJob] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    async function loadJob() {
      const { data } = await supabase
        .from('jobs')
        .select(`
          *,
          clients (id, first_name, last_name, email, phone),
          properties (id, address_line1, address_line2, town, postcode, access_instructions, alarm_instructions, parking_instructions, pets, specialist_surfaces, key_held)
        `)
        .eq('id', jobId)
        .single()
      setJob(data)
      setLoading(false)
    }
    loadJob()
  }, [jobId])

  async function updateStatus(newStatus: string) {
    setUpdating(true)
    await supabase.from('jobs').update({ status: newStatus }).eq('id', jobId)
    setJob((prev: any) => ({ ...prev, status: newStatus }))
    setUpdating(false)
  }

  async function deleteJob() {
    if (!confirm('Delete this job? This cannot be undone.')) return
    await supabase.from('jobs').delete().eq('id', jobId)
    router.push('/dashboard/jobs')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f9f8f5]">
        <Nav />
        <div className="max-w-7xl mx-auto px-6 pt-24">
          <div className="text-sm text-zinc-300">Loading…</div>
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-[#f9f8f5]">
        <Nav />
        <div className="max-w-7xl mx-auto px-6 pt-24">
          <div className="text-sm text-zinc-400">Job not found.</div>
        </div>
      </div>
    )
  }

  const nextStatus = statusFlow[statusFlow.indexOf(job.status) + 1]

  const nextStatusLabel: Record<string, string> = {
    in_progress: 'Mark In Progress',
    completed: 'Mark Completed',
    cancelled: 'Cancel Job',
  }

  const nextStatusColour: Record<string, string> = {
    in_progress: 'bg-amber-500 hover:bg-amber-600 text-white',
    completed: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    cancelled: 'bg-red-50 hover:bg-red-100 text-red-500 border border-red-200',
  }

  return (
    <div className="min-h-screen bg-[#f9f8f5]">
      <Nav />

      <main className="max-w-7xl mx-auto px-6 pt-24 pb-16">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <a href="/dashboard/jobs" className="text-xs text-zinc-400 hover:text-zinc-900 transition-colors tracking-wide">
              ← Jobs
            </a>
            <div className="flex items-center gap-4 mt-3">
              <h1 className="text-3xl font-light tracking-tight text-zinc-900">
                {serviceLabels[job.service_type] ?? 'Job'}
              </h1>
              <span className={`text-xs px-3 py-1.5 rounded-full font-medium tracking-wide border ${statusColour[job.status]}`}>
                {job.status.replace('_', ' ')}
              </span>
            </div>
            {job.scheduled_date && (
              <p className="text-zinc-400 mt-1 text-sm">
                {formatDate(job.scheduled_date)}
                {job.scheduled_time && ` at ${formatTime(job.scheduled_time)}`}
              </p>
            )}
          </div>

          {/* Status actions */}
          <div className="flex items-center gap-3">
            {nextStatus && nextStatus !== 'cancelled' && (
              <button
                onClick={() => updateStatus(nextStatus)}
                disabled={updating}
                className={`text-xs font-medium tracking-[0.15em] uppercase px-5 py-2.5 rounded-full transition-colors disabled:opacity-50 ${nextStatusColour[nextStatus]}`}
              >
                {nextStatusLabel[nextStatus]}
              </button>
            )}
            {job.status !== 'cancelled' && job.status !== 'completed' && (
              <button
                onClick={() => updateStatus('cancelled')}
                disabled={updating}
                className="text-xs font-medium tracking-[0.15em] uppercase px-5 py-2.5 rounded-full bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            )}
            <button
              onClick={deleteJob}
              className="text-xs text-zinc-300 hover:text-red-400 transition-colors tracking-wide"
            >
              Delete
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">

          {/* Left — job details */}
          <div className="space-y-6">

            <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-100">
                <h2 className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-500">Job Details</h2>
              </div>
              <div className="px-5 py-2 divide-y divide-zinc-50">
                {[
                  { label: 'Service', value: serviceLabels[job.service_type] },
                  { label: 'Date', value: job.scheduled_date ? formatDate(job.scheduled_date) : null },
                  { label: 'Time', value: job.scheduled_time ? formatTime(job.scheduled_time) : null },
                  { label: 'Duration', value: job.duration_hours ? `${job.duration_hours} hrs` : null },
                  { label: 'Price', value: job.price ? `£${Number(job.price).toFixed(2)}` : null },
                ].map(({ label, value }) => value ? (
                  <div key={label} className="py-3 flex justify-between">
                    <span className="text-xs text-zinc-400">{label}</span>
                    <span className="text-sm text-zinc-900">{value}</span>
                  </div>
                ) : null)}
              </div>
            </div>

            {/* Client */}
            <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
                <h2 className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-500">Client</h2>
                <a href={`/dashboard/clients/${job.clients?.id}`} className="text-xs text-[#4a5c4e] hover:underline">
                  View →
                </a>
              </div>
              <div className="px-5 py-4 space-y-2">
                <p className="text-sm font-medium text-zinc-900">
                  {job.clients?.first_name} {job.clients?.last_name}
                </p>
                {job.clients?.email && <p className="text-xs text-zinc-400">{job.clients.email}</p>}
                {job.clients?.phone && <p className="text-xs text-zinc-400">{job.clients.phone}</p>}
              </div>
            </div>

          </div>

          {/* Middle — property + access */}
          <div className="space-y-6">

            <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-100">
                <h2 className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-500">Property</h2>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div>
                  <p className="text-sm font-medium text-zinc-900">{job.properties?.address_line1}</p>
                  {job.properties?.town && (
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {job.properties.town}{job.properties.postcode && `, ${job.properties.postcode}`}
                    </p>
                  )}
                </div>
                {job.properties?.specialist_surfaces && (
                  <div>
                    <span className="text-xs text-zinc-400 block mb-0.5">Specialist Surfaces</span>
                    <span className="text-sm text-zinc-700">{job.properties.specialist_surfaces}</span>
                  </div>
                )}
                {job.properties?.pets && (
                  <div>
                    <span className="text-xs text-zinc-400 block mb-0.5">Pets</span>
                    <span className="text-sm text-zinc-700">{job.properties.pets}</span>
                  </div>
                )}
                {job.properties?.key_held && (
                  <span className="text-xs bg-[#f0f4f1] text-[#4a5c4e] px-2.5 py-1 rounded-full inline-block">
                    Key held
                  </span>
                )}
              </div>
            </div>

            {/* Access instructions — critical for cleaners */}
            {(job.properties?.access_instructions || job.properties?.alarm_instructions || job.properties?.parking_instructions) && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-amber-200">
                  <h2 className="text-xs font-medium tracking-[0.2em] uppercase text-amber-700">Access Instructions</h2>
                </div>
                <div className="px-5 py-4 space-y-3">
                  {job.properties?.access_instructions && (
                    <div>
                      <span className="text-xs font-medium text-amber-700 block mb-0.5">Entry</span>
                      <p className="text-sm text-amber-900">{job.properties.access_instructions}</p>
                    </div>
                  )}
                  {job.properties?.alarm_instructions && (
                    <div>
                      <span className="text-xs font-medium text-amber-700 block mb-0.5">Alarm</span>
                      <p className="text-sm text-amber-900">{job.properties.alarm_instructions}</p>
                    </div>
                  )}
                  {job.properties?.parking_instructions && (
                    <div>
                      <span className="text-xs font-medium text-amber-700 block mb-0.5">Parking</span>
                      <p className="text-sm text-amber-900">{job.properties.parking_instructions}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Right — notes */}
          <div className="space-y-6">

            {job.notes && (
              <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-zinc-100">
                  <h2 className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-500">Notes for Cleaner</h2>
                </div>
                <div className="px-5 py-4">
                  <p className="text-sm text-zinc-600 leading-relaxed">{job.notes}</p>
                </div>
              </div>
            )}

            {job.internal_notes && (
              <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-zinc-100">
                  <h2 className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-500">Internal Notes</h2>
                </div>
                <div className="px-5 py-4">
                  <p className="text-sm text-zinc-600 leading-relaxed">{job.internal_notes}</p>
                </div>
              </div>
            )}

            {!job.notes && !job.internal_notes && (
              <div className="bg-white border border-zinc-200 rounded-lg px-5 py-8 text-center">
                <p className="text-xs text-zinc-300">No notes on this job</p>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  )
}