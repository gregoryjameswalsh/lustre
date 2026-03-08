'use client'

// src/app/dashboard/settings/job-types/page.tsx
// =============================================================================
// LUSTRE — Job Types Settings Page
// Admins can create, edit, deactivate/reactivate, and delete job types.
// =============================================================================

import { useState, useEffect, useActionState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  createJobTypeAction,
  updateJobTypeAction,
  deactivateJobTypeAction,
  reactivateJobTypeAction,
  deleteJobTypeAction,
} from '@/lib/actions/job-types'
import Link from 'next/link'

type JobType = {
  id: string
  name: string
  description: string | null
  is_active: boolean
  sort_order: number
}

function CreateForm({ onSuccess }: { onSuccess: () => void }) {
  const [state, formAction, pending] = useActionState(
    async (prev: { error?: string; success?: boolean }, formData: FormData) => {
      const result = await createJobTypeAction(prev, formData)
      if (result.success) onSuccess()
      return result
    },
    {}
  )

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium tracking-wider uppercase text-zinc-500 mb-1.5">
            Name <span className="text-red-400">*</span>
          </label>
          <input
            name="name"
            type="text"
            required
            maxLength={100}
            placeholder="e.g. Deep Clean"
            className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-zinc-400 bg-zinc-50"
          />
        </div>
        <div>
          <label className="block text-xs font-medium tracking-wider uppercase text-zinc-500 mb-1.5">
            Description
          </label>
          <input
            name="description"
            type="text"
            maxLength={500}
            placeholder="Optional description"
            className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-zinc-400 bg-zinc-50"
          />
        </div>
      </div>
      {state.error && (
        <p className="text-xs text-red-500">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="text-xs font-medium tracking-[0.15em] uppercase bg-[#1A3329] text-white px-5 py-2.5 rounded-lg hover:bg-[#3D7A5F] transition-colors disabled:opacity-50"
      >
        {pending ? 'Adding…' : '+ Add Job Type'}
      </button>
    </form>
  )
}

function EditForm({
  jobType,
  onSuccess,
  onCancel,
}: {
  jobType: JobType
  onSuccess: () => void
  onCancel: () => void
}) {
  const [state, formAction, pending] = useActionState(
    async (prev: { error?: string; success?: boolean }, formData: FormData) => {
      const result = await updateJobTypeAction(prev, formData)
      if (result.success) onSuccess()
      return result
    },
    {}
  )

  return (
    <form action={formAction} className="flex items-start gap-2 flex-1">
      <input type="hidden" name="id" value={jobType.id} />
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          name="name"
          type="text"
          required
          maxLength={100}
          defaultValue={jobType.name}
          className="border border-zinc-300 rounded-md px-3 py-1.5 text-sm text-zinc-900 focus:outline-none focus:border-zinc-500 bg-white"
        />
        <input
          name="description"
          type="text"
          maxLength={500}
          defaultValue={jobType.description ?? ''}
          placeholder="Description (optional)"
          className="border border-zinc-300 rounded-md px-3 py-1.5 text-sm text-zinc-900 focus:outline-none focus:border-zinc-500 bg-white"
        />
      </div>
      {state.error && <p className="text-xs text-red-500 self-center">{state.error}</p>}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          type="submit"
          disabled={pending}
          className="text-xs font-medium tracking-wide text-[#3D7A5F] hover:underline disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} className="text-xs text-zinc-400 hover:text-zinc-600">
          Cancel
        </button>
      </div>
    </form>
  )
}

export default function JobTypesPage() {
  const [jobTypes, setJobTypes] = useState<JobType[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  async function loadJobTypes() {
    const supabase = createClient()
    const { data } = await supabase
      .from('job_types')
      .select('id, name, description, is_active, sort_order')
      .order('sort_order', { ascending: true })
    setJobTypes(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        setIsAdmin(profile?.role === 'admin')
      }
      loadJobTypes()
    }
    init()
  }, [])

  async function handleDeactivate(id: string) {
    setActionError(null)
    const result = await deactivateJobTypeAction(id)
    if (result.error) { setActionError(result.error); return }
    loadJobTypes()
  }

  async function handleReactivate(id: string) {
    setActionError(null)
    const result = await reactivateJobTypeAction(id)
    if (result.error) { setActionError(result.error); return }
    loadJobTypes()
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    setActionError(null)
    const result = await deleteJobTypeAction(id)
    if (result.error) { setActionError(result.error); return }
    loadJobTypes()
  }

  const activeCount = jobTypes.filter(jt => jt.is_active).length

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-8 sm:px-6 md:pt-16 text-sm text-zinc-300">Loading…</div>
    )
  }

  return (
    <main className="max-w-2xl mx-auto px-4 pt-8 pb-4 sm:px-6 md:pt-16 md:pb-16">

        <div className="mb-8">
          <Link href="/dashboard/settings" className="text-xs text-zinc-400 hover:text-zinc-900 transition-colors tracking-wide">
            ← Settings
          </Link>
          <h1 className="text-2xl font-light tracking-tight text-zinc-900 sm:text-3xl mt-4">Job Types</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Define the types of jobs your business offers. These appear when scheduling jobs.
          </p>
        </div>

        {actionError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError}
          </div>
        )}

        {/* Existing job types */}
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden mb-6">
          <div className="border-b border-zinc-100 px-5 py-4">
            <h2 className="text-sm font-medium text-zinc-900">
              Your job types
              <span className="ml-2 text-zinc-400 font-normal">{activeCount} active</span>
            </h2>
          </div>
          {jobTypes.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-zinc-300">No job types yet.</div>
          ) : (
            <div className="divide-y divide-zinc-50">
              {jobTypes.map(jt => (
                <div key={jt.id} className={`px-5 py-4 flex items-start gap-3 ${!jt.is_active ? 'opacity-50' : ''}`}>
                  {editingId === jt.id ? (
                    <EditForm
                      jobType={jt}
                      onSuccess={() => { setEditingId(null); loadJobTypes() }}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-zinc-900">{jt.name}</span>
                          {!jt.is_active && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-400 font-medium">
                              Inactive
                            </span>
                          )}
                        </div>
                        {jt.description && (
                          <p className="text-xs text-zinc-400 mt-0.5">{jt.description}</p>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <button
                            onClick={() => setEditingId(jt.id)}
                            className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
                          >
                            Edit
                          </button>
                          {jt.is_active ? (
                            <button
                              onClick={() => handleDeactivate(jt.id)}
                              disabled={activeCount <= 1}
                              title={activeCount <= 1 ? 'Must keep at least one active job type' : undefined}
                              className="text-xs text-zinc-400 hover:text-amber-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReactivate(jt.id)}
                              className="text-xs text-[#3D7A5F] hover:underline transition-colors"
                            >
                              Reactivate
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(jt.id, jt.name)}
                            className="text-xs text-zinc-300 hover:text-red-400 transition-colors"
                            title="Delete (only if no jobs use this type)"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add new job type */}
        {isAdmin && (
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="border-b border-zinc-100 px-5 py-4">
              <h2 className="text-sm font-medium text-zinc-900">Add a job type</h2>
            </div>
            <div className="p-5">
              <CreateForm onSuccess={loadJobTypes} />
            </div>
          </div>
        )}

    </main>
  )
}
