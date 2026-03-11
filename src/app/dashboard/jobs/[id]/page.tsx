'use client'

import { useEffect, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { deleteJobAction } from '@/lib/actions/jobs'
import { startJobAction, applyChecklistAction, type TemplateChoice } from '@/lib/actions/checklist-completion'
import ChecklistSection          from './_components/ChecklistSection'
import PropertyPhotosReadOnly    from './_components/PropertyPhotosReadOnly'
import TagPicker                 from '@/components/dashboard/TagPicker'
import type { JobChecklistWithItems, Tag } from '@/lib/types'

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

type JobDetail = {
  id: string
  status: string
  job_type_id: string | null
  scheduled_date: string | null
  scheduled_time: string | null
  duration_hours: number | null
  price: number | null
  notes: string | null
  internal_notes: string | null
  created_at: string
  clients?: { id: string; first_name: string; last_name: string; email: string | null; phone: string | null } | null
  properties?: { id: string; address_line1: string; address_line2: string | null; town: string | null; postcode: string | null; access_instructions: string | null; alarm_instructions: string | null; parking_instructions: string | null; pets: string | null; specialist_surfaces: string | null; key_held: boolean | null } | null
  job_types?: { name: string } | null
}

export default function JobDetailPage() {
  const params = useParams()
  const jobId = params.id as string

  const [job, setJob]                         = useState<JobDetail | null>(null)
  const [loading, setLoading]                 = useState(true)
  const [updating, setUpdating]               = useState(false)
  const [isAdmin, setIsAdmin]                 = useState(false)
  const [canEditTags, setCanEditTags]         = useState(false)
  const [orgId, setOrgId]                     = useState<string>('')
  const [allTags, setAllTags]                 = useState<Tag[]>([])
  const [jobTags, setJobTags]                 = useState<Tag[]>([])

  // Checklist
  const [checklist, setChecklist]             = useState<JobChecklistWithItems | null>(null)
  const [checklistLoaded, setChecklistLoaded] = useState(false)

  // Pending checklist preview (for scheduled jobs)
  const [pendingTemplate, setPendingTemplate] = useState<{
    name: string
    items: { id: string; title: string; guidance: string | null; sort_order: number }[]
  } | null>(null)
  const [multiplePendingTemplates, setMultiplePendingTemplates] = useState(false)

  // Template selection modal (when multiple templates match a job type)
  const [templateChoices, setTemplateChoices] = useState<TemplateChoice[]>([])
  const [showTemplateModal, setShowTemplateModal] = useState(false)

  // Manual checklist apply (in_progress job with no checklist)
  const [availableTemplates, setAvailableTemplates] = useState<TemplateChoice[]>([])
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)

  // Incomplete items warning before marking completed
  const [showIncompleteWarning, setShowIncompleteWarning] = useState(false)
  const [proceedComplete, setProceedComplete] = useState(false)

  const [, startTransition] = useTransition()

  useEffect(() => {
    async function loadJob() {
      const supabase = createClient()
      const [{ data }, { data: { user } }] = await Promise.all([
        supabase
          .from('jobs')
          .select(`
            *,
            clients (id, first_name, last_name, email, phone),
            properties (id, address_line1, address_line2, town, postcode, access_instructions, alarm_instructions, parking_instructions, pets, specialist_surfaces, key_held),
            job_types (name)
          `)
          .eq('id', jobId)
          .single(),
        supabase.auth.getUser(),
      ])
      setJob(data)
      let currentOrgId: string | null = null
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, organisation_id, custom_role_id')
          .eq('id', user.id)
          .single()
        setIsAdmin(profile?.role === 'admin')
        if (profile?.organisation_id) {
          setOrgId(profile.organisation_id)
          currentOrgId = profile.organisation_id

          // Determine jobs:write permission
          let hasJobsWrite = profile?.role === 'admin'
          if (!hasJobsWrite && profile?.custom_role_id) {
            const { data: perm } = await supabase
              .from('role_permissions')
              .select('permission')
              .eq('role_id', profile.custom_role_id)
              .eq('permission', 'jobs:write')
              .maybeSingle()
            hasJobsWrite = !!perm
          }
          setCanEditTags(hasJobsWrite)

          // Fetch tags for this job
          const [{ data: tagData }, { data: entityTagData }] = await Promise.all([
            supabase
              .from('tags')
              .select('id, name, colour, organisation_id, created_at')
              .eq('organisation_id', profile.organisation_id)
              .order('name', { ascending: true }),
            supabase
              .from('entity_tags')
              .select('tag_id, tags(id, name, colour, organisation_id, created_at)')
              .eq('entity_id', jobId)
              .eq('entity_type', 'job'),
          ])
          setAllTags(tagData ?? [])
          setJobTags(
            (entityTagData ?? [])
              .map(r => r.tags as unknown as Tag | null)
              .filter((t): t is Tag => t !== null)
          )
        }
      }
      setLoading(false)

      // Checklist only exists for non-scheduled jobs
      if (data && data.status !== 'scheduled') {
        await loadChecklist()
      } else {
        setChecklistLoaded(true)

        // For scheduled jobs, look up which template will be applied on start
        if (data && data.job_type_id && currentOrgId) {
          const { data: junction } = await supabase
            .from('checklist_template_job_types')
            .select('checklist_template_id')
            .eq('job_type_id', data.job_type_id)
            .eq('organisation_id', currentOrgId)

          const linkedIds = (junction ?? []).map((j: { checklist_template_id: string }) => j.checklist_template_id)

          if (linkedIds.length > 0) {
            const { data: activeTemplates } = await supabase
              .from('checklist_templates')
              .select('id, name, checklist_template_items(id, title, guidance, sort_order)')
              .in('id', linkedIds)
              .eq('is_active', true)
              .eq('organisation_id', currentOrgId)
              .order('sort_order', { referencedTable: 'checklist_template_items', ascending: true })

            if (activeTemplates?.length === 1) {
              setPendingTemplate({
                name: activeTemplates[0].name,
                items: (activeTemplates[0].checklist_template_items as { id: string; title: string; guidance: string | null; sort_order: number }[]) ?? [],
              })
            } else if ((activeTemplates?.length ?? 0) > 1) {
              setMultiplePendingTemplates(true)
            }
          }
        }
      }
    }
    loadJob()
  }, [jobId])

  async function loadChecklist() {
    const supabase = createClient()
    const { data } = await supabase
      .from('job_checklists')
      .select(`
        id, organisation_id, job_id, template_id, template_name, created_at,
        job_checklist_items (
          id, organisation_id, job_checklist_id, template_item_id,
          title, guidance, sort_order,
          is_completed, completed_by, completed_at, created_at,
          completed_by_profile:profiles!completed_by (full_name),
          photos:job_checklist_photos (
            id, organisation_id, job_checklist_item_id,
            storage_path, file_name, file_size_bytes, mime_type,
            uploaded_by, uploaded_at
          )
        )
      `)
      .eq('job_id', jobId)
      .order('sort_order', { referencedTable: 'job_checklist_items', ascending: true })
      .maybeSingle()

    if (data) {
      setChecklist({
        ...data,
        items: data.job_checklist_items ?? [],
      } as unknown as JobChecklistWithItems)
    }
    setChecklistLoaded(true)
  }

  // Direct status update (for completed, cancelled — no checklist logic needed)
  async function updateStatus(newStatus: string) {
    const supabase = createClient()
    setUpdating(true)
    await supabase.from('jobs').update({ status: newStatus }).eq('id', jobId)
    setJob(prev => prev ? { ...prev, status: newStatus } : prev)
    setUpdating(false)
  }

  // Open manual apply modal for in_progress jobs with no checklist
  async function handleOpenApplyModal() {
    const supabase = createClient()
    const { data } = await supabase
      .from('checklist_templates')
      .select('id, name')
      .eq('organisation_id', orgId)
      .eq('is_active', true)
      .order('name', { ascending: true })
    setAvailableTemplates(data ?? [])
    setApplyError(null)
    setShowApplyModal(true)
  }

  async function handleApplyChecklist(templateId: string) {
    setUpdating(true)
    setShowApplyModal(false)
    const result = await applyChecklistAction(jobId, templateId)
    if (!result.ok) {
      setApplyError(result.error)
    } else {
      await loadChecklist()
    }
    setUpdating(false)
  }

  // "Mark In Progress" — may instantiate a checklist
  async function handleStartJob(templateId?: string) {
    setUpdating(true)
    setShowTemplateModal(false)

    const result = await startJobAction(jobId, templateId === '__none__' ? undefined : templateId)

    if (!result.ok && 'needsTemplateChoice' in result && result.needsTemplateChoice) {
      setTemplateChoices(result.templates)
      setShowTemplateModal(true)
      setUpdating(false)
      return
    }

    if (!result.ok) {
      setUpdating(false)
      return
    }

    setJob(prev => prev ? { ...prev, status: 'in_progress' } : prev)
    setChecklistLoaded(false)
    await loadChecklist()
    setUpdating(false)
  }

  // "Mark Completed" — warn about incomplete checklist items
  async function handleCompleteJob(force = false) {
    if (!force && checklist) {
      const incompleteCount = checklist.items.filter(i => !i.is_completed).length
      if (incompleteCount > 0) {
        setShowIncompleteWarning(true)
        return
      }
    }
    setShowIncompleteWarning(false)
    setProceedComplete(false)
    await updateStatus('completed')
  }

  async function deleteJob() {
    if (!confirm('Delete this job? This cannot be undone.')) return
    await deleteJobAction(jobId)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB]">
        <div className="max-w-7xl mx-auto px-4 pt-8 sm:px-6 md:pt-24">
          <div className="text-sm text-zinc-300">Loading…</div>
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-[#F9FAFB]">
        <div className="max-w-7xl mx-auto px-4 pt-8 sm:px-6 md:pt-24">
          <div className="text-sm text-zinc-400">Job not found.</div>
        </div>
      </div>
    )
  }

  const nextStatus = statusFlow[statusFlow.indexOf(job.status) + 1]

  const nextStatusLabel: Record<string, string> = {
    in_progress: 'Mark In Progress',
    completed:   'Mark Completed',
    cancelled:   'Cancel Job',
  }

  const nextStatusColour: Record<string, string> = {
    in_progress: 'bg-amber-500 hover:bg-amber-600 text-white',
    completed:   'bg-emerald-600 hover:bg-emerald-700 text-white',
    cancelled:   'bg-red-50 hover:bg-red-100 text-red-500 border border-red-200',
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">

      {/* Template selection modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h2 className="text-sm font-medium text-zinc-900 mb-1">Select a checklist</h2>
            <p className="text-xs text-zinc-400 mb-4">
              Multiple checklists match this job type. Choose one to apply.
            </p>
            <div className="space-y-2 mb-4">
              {templateChoices.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleStartJob(t.id)}
                  disabled={updating}
                  className="w-full text-left text-sm text-zinc-900 border border-zinc-200 rounded-lg px-4 py-3 hover:bg-zinc-50 hover:border-zinc-400 transition-colors disabled:opacity-50"
                >
                  {t.name}
                </button>
              ))}
            </div>
            <button
              onClick={() => handleStartJob('__none__')}
              disabled={updating}
              className="w-full text-xs text-zinc-400 hover:text-zinc-600 transition-colors py-1"
            >
              Start without a checklist
            </button>
            <button
              onClick={() => setShowTemplateModal(false)}
              className="w-full mt-1 text-xs text-zinc-300 hover:text-zinc-500 transition-colors py-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Manual checklist apply modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h2 className="text-sm font-medium text-zinc-900 mb-1">Apply a checklist</h2>
            <p className="text-xs text-zinc-400 mb-4">
              Choose a checklist template to attach to this job.
            </p>
            {availableTemplates.length === 0 ? (
              <p className="text-xs text-zinc-400 mb-4">No active templates found. Create one in Settings → Checklists.</p>
            ) : (
              <div className="space-y-2 mb-4">
                {availableTemplates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleApplyChecklist(t.id)}
                    disabled={updating}
                    className="w-full text-left text-sm text-zinc-900 border border-zinc-200 rounded-lg px-4 py-3 hover:bg-zinc-50 hover:border-zinc-400 transition-colors disabled:opacity-50"
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowApplyModal(false)}
              className="w-full text-xs text-zinc-300 hover:text-zinc-500 transition-colors py-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Incomplete checklist warning */}
      {showIncompleteWarning && checklist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h2 className="text-sm font-medium text-zinc-900 mb-1">Checklist not complete</h2>
            <p className="text-xs text-zinc-500 mb-4">
              {checklist.items.filter(i => !i.is_completed).length}{' '}
              item{checklist.items.filter(i => !i.is_completed).length !== 1 ? 's' : ''}{' '}
              haven&apos;t been checked off. You can complete the job anyway or go back to review.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleCompleteJob(true)}
                className="flex-1 text-xs font-medium tracking-[0.12em] uppercase bg-emerald-600 text-white px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Complete anyway
              </button>
              <button
                onClick={() => setShowIncompleteWarning(false)}
                className="flex-1 text-xs font-medium tracking-[0.12em] uppercase border border-zinc-200 text-zinc-600 px-4 py-2.5 rounded-lg hover:border-zinc-400 transition-colors"
              >
                Review checklist
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 pt-8 pb-4 sm:px-6 md:pt-24 md:pb-16">

        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6 md:mb-8">
          <div>
            <Link href="/dashboard/jobs" className="text-xs text-zinc-400 hover:text-zinc-900 transition-colors tracking-wide">
              ← Jobs
            </Link>
            <div className="flex items-center gap-3 mt-3">
              <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-zinc-900">
                {job.job_types?.name ?? 'Job'}
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
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <a
              href={`/dashboard/jobs/${jobId}/edit`}
              className="text-xs font-medium tracking-[0.15em] uppercase border border-zinc-200 text-zinc-600 px-5 py-2.5 rounded-lg hover:border-zinc-400 transition-colors"
            >
              Edit
            </a>
            {nextStatus && nextStatus !== 'cancelled' && (
              <button
                onClick={() => {
                  if (nextStatus === 'in_progress') {
                    handleStartJob()
                  } else if (nextStatus === 'completed') {
                    handleCompleteJob()
                  } else {
                    updateStatus(nextStatus)
                  }
                }}
                disabled={updating}
                className={`text-xs font-medium tracking-[0.15em] uppercase px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50 ${nextStatusColour[nextStatus]}`}
              >
                {updating && nextStatus === 'in_progress' ? 'Starting…' : nextStatusLabel[nextStatus]}
              </button>
            )}
            {job.status !== 'cancelled' && job.status !== 'completed' && (
              <button
                onClick={() => updateStatus('cancelled')}
                disabled={updating}
                className="text-xs font-medium tracking-[0.15em] uppercase px-5 py-2.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            )}
            <span
              title={!isAdmin ? 'Only admins can delete jobs' : undefined}
              className={!isAdmin ? 'cursor-not-allowed' : ''}
            >
              <button
                onClick={deleteJob}
                disabled={!isAdmin}
                className={`text-xs tracking-wide transition-colors ${isAdmin ? 'text-zinc-300 hover:text-red-400' : 'text-zinc-200 pointer-events-none'}`}
              >
                Delete
              </button>
            </span>
          </div>
        </div>

        {/* Checklist section — shown below header when a checklist exists */}
        {checklistLoaded && checklist && orgId && (
          <ChecklistSection checklist={checklist} jobStatus={job.status} orgId={orgId} />
        )}

        {/* No checklist — in_progress job where none was auto-applied */}
        {checklistLoaded && !checklist && job.status === 'in_progress' && (
          <div className="bg-white border border-zinc-200 rounded-lg px-5 py-6 mb-6 md:mb-8 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-zinc-900">No checklist attached</p>
              <p className="text-xs text-zinc-400 mt-0.5">
                No checklist template was applied when this job started. You can attach one now.
              </p>
              {applyError && <p className="text-xs text-red-500 mt-1">{applyError}</p>}
            </div>
            <button
              onClick={handleOpenApplyModal}
              disabled={updating}
              className="flex-shrink-0 text-xs font-medium tracking-[0.12em] uppercase border border-zinc-200 text-zinc-600 px-4 py-2 rounded-lg hover:border-zinc-400 transition-colors disabled:opacity-50"
            >
              Apply checklist
            </button>
          </div>
        )}

        {/* Pending checklist preview — shown while job is still scheduled */}
        {job.status === 'scheduled' && pendingTemplate && (
          <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden mb-6 md:mb-8 opacity-60">
            <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <h2 className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-500">Checklist</h2>
                <p className="text-xs text-zinc-400 mt-0.5">{pendingTemplate.name}</p>
              </div>
              <span className="text-xs font-medium px-3 py-1 rounded-full bg-blue-50 text-blue-500">
                Starts when in progress
              </span>
            </div>
            <div className="divide-y divide-zinc-50">
              {pendingTemplate.items.map(item => (
                <div key={item.id} className="px-5 py-4 flex items-start gap-4">
                  <div className="flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 border-zinc-200" />
                  <div>
                    <p className="text-sm font-medium text-zinc-400">{item.title}</p>
                    {item.guidance && (
                      <p className="text-xs text-zinc-300 mt-0.5">{item.guidance}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-zinc-50 bg-zinc-50/50">
              <p className="text-xs text-zinc-400">
                Mark this job as <span className="font-medium">In Progress</span> to begin completing the checklist.
              </p>
            </div>
          </div>
        )}

        {job.status === 'scheduled' && multiplePendingTemplates && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-5 py-4 mb-6 md:mb-8">
            <p className="text-xs text-blue-600">
              Multiple checklist templates match this job type. You&apos;ll be asked to choose one when you mark the job as in progress.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">

          {/* Left — job details */}
          <div className="space-y-6">

            <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-100">
                <h2 className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-500">Job Details</h2>
              </div>
              <div className="px-5 py-2 divide-y divide-zinc-50">
                {[
                  { label: 'Job Type', value: job.job_types?.name ?? null },
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

            {/* Tags */}
            <div className="bg-white border border-zinc-200 rounded-lg">
              <div className="px-5 py-4 border-b border-zinc-100">
                <h2 className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-500">Tags</h2>
              </div>
              <div className="px-5 py-4">
                <TagPicker
                  entityId={jobId}
                  entityType="job"
                  allTags={allTags}
                  appliedTags={jobTags}
                  canEdit={canEditTags}
                />
              </div>
            </div>

            {/* Client */}
            <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
                <h2 className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-500">Client</h2>
                <a href={`/dashboard/clients/${job.clients?.id}`} className="text-xs text-[#3D7A5F] hover:underline">
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
                  <span className="text-xs bg-[#C8F5D7] text-[#3D7A5F] px-2.5 py-1 rounded-full inline-block">
                    Key held
                  </span>
                )}
              </div>
            </div>

            {/* Access instructions */}
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

            {/* Property photos */}
            {job.properties?.id && (
              <PropertyPhotosReadOnly propertyId={job.properties.id} />
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
