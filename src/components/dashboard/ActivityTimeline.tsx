'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Activity, FollowUp, ActivityType } from '@/lib/types'

const typeConfig: Record<ActivityType, { label: string; icon: string; colour: string }> = {
  note:             { label: 'Note',             icon: '📝', colour: 'bg-zinc-100 text-zinc-600' },
  call:             { label: 'Call',             icon: '📞', colour: 'bg-blue-50 text-blue-600' },
  email:            { label: 'Email',            icon: '✉️',  colour: 'bg-violet-50 text-violet-600' },
  quote_sent:       { label: 'Quote Sent',       icon: '📄', colour: 'bg-amber-50 text-amber-600' },
  quote_accepted:   { label: 'Quote Accepted',   icon: '✅', colour: 'bg-emerald-50 text-emerald-600' },
  quote_declined:   { label: 'Quote Declined',   icon: '❌', colour: 'bg-red-50 text-red-500' },
  job_scheduled:    { label: 'Job Scheduled',    icon: '📅', colour: 'bg-blue-50 text-blue-600' },
  job_completed:    { label: 'Job Completed',    icon: '✨', colour: 'bg-emerald-50 text-emerald-600' },
  job_cancelled:    { label: 'Job Cancelled',    icon: '🚫', colour: 'bg-zinc-100 text-zinc-400' },
  follow_up:        { label: 'Follow Up',        icon: '🔔', colour: 'bg-amber-50 text-amber-600' },
  review_requested: { label: 'Review Requested', icon: '⭐', colour: 'bg-amber-50 text-amber-600' },
  complaint:        { label: 'Complaint',        icon: '⚠️',  colour: 'bg-red-50 text-red-500' },
  other:            { label: 'Other',            icon: '💬', colour: 'bg-zinc-100 text-zinc-600' },
  quote_viewed:     { label: 'Quote Viewed',     icon: '👁️',  colour: 'bg-blue-50 text-blue-500' },
}

const priorityColour: Record<string, string> = {
  low:    'bg-zinc-100 text-zinc-400',
  normal: 'bg-blue-50 text-blue-500',
  high:   'bg-amber-50 text-amber-600',
  urgent: 'bg-red-50 text-red-500',
}

function formatDate(date: string) {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDueDate(date: string) {
  const d = new Date(date)
  const now = new Date()
  now.setHours(0,0,0,0)
  d.setHours(0,0,0,0)
  const diff = d.getTime() - now.getTime()
  const days = Math.floor(diff / 86400000)
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, colour: 'text-red-500' }
  if (days === 0) return { label: 'Due today', colour: 'text-amber-600' }
  if (days === 1) return { label: 'Due tomorrow', colour: 'text-amber-500' }
  return { label: `Due ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`, colour: 'text-zinc-400' }
}

interface Props {
  clientId: string
  initialActivities: Activity[]
  initialFollowUps: FollowUp[]
}

type LogType = 'note' | 'call' | 'email' | 'complaint' | 'other'

export default function ActivityTimeline({ clientId, initialActivities, initialFollowUps }: Props) {
  const [activities, setActivities] = useState<Activity[]>(initialActivities)
  const [followUps, setFollowUps] = useState<FollowUp[]>(initialFollowUps)
  const [showForm, setShowForm] = useState(false)
  const [showFollowUpForm, setShowFollowUpForm] = useState(false)
  const [logType, setLogType] = useState<LogType>('note')
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const supabase = createClient()

  async function handleLogActivity(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)

    const formData = new FormData(e.currentTarget)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('organisation_id')
      .eq('id', user.id)
      .single()

    const { data: activity } = await supabase.from('activities').insert({
      organisation_id: profile?.organisation_id,
      client_id: clientId,
      created_by: user.id,
      type: logType,
      title: formData.get('title') as string || null,
      body: formData.get('body') as string || null,
      pinned: formData.get('pinned') === 'on',
    }).select(`*, profiles(full_name, email)`).single()

    if (activity) {
      setActivities(prev => [activity, ...prev])

      if (formData.get('add_follow_up') === 'on') {
        const { data: fu } = await supabase.from('follow_ups').insert({
          organisation_id: profile?.organisation_id,
          client_id: clientId,
          activity_id: activity.id,
          created_by: user.id,
          title: formData.get('follow_up_title') as string,
          due_date: formData.get('follow_up_due') as string || null,
          priority: formData.get('follow_up_priority') as string || 'normal',
          status: 'open',
        }).select().single()
        if (fu) setFollowUps(prev => [...prev, fu])
      }
    }

    e.currentTarget.reset()
    setShowForm(false)
    setSaving(false)
  }

  async function handleAddFollowUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)

    const formData = new FormData(e.currentTarget)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('organisation_id')
      .eq('id', user.id)
      .single()

    const { data: fu } = await supabase.from('follow_ups').insert({
      organisation_id: profile?.organisation_id,
      client_id: clientId,
      created_by: user.id,
      title: formData.get('title') as string,
      notes: formData.get('notes') as string || null,
      due_date: formData.get('due_date') as string || null,
      priority: formData.get('priority') as string || 'normal',
      status: 'open',
    }).select().single()

    if (fu) setFollowUps(prev => [...prev, fu])

    e.currentTarget.reset()
    setShowFollowUpForm(false)
    setSaving(false)
  }

  async function completeFollowUp(id: string) {
    await supabase.from('follow_ups').update({ status: 'done' }).eq('id', id)
    setFollowUps(prev => prev.filter(f => f.id !== id))
  }

  async function dismissFollowUp(id: string) {
    await supabase.from('follow_ups').update({ status: 'dismissed' }).eq('id', id)
    setFollowUps(prev => prev.filter(f => f.id !== id))
  }

  async function deleteActivity(id: string) {
    if (!confirm('Delete this activity? This cannot be undone.')) return
    await supabase.from('activities').delete().eq('id', id)
    setActivities(prev => prev.filter(a => a.id !== id))
  }

  async function togglePin(activity: Activity) {
    await supabase.from('activities').update({ pinned: !activity.pinned }).eq('id', activity.id)
    setActivities(prev => prev.map(a => a.id === activity.id ? { ...a, pinned: !a.pinned } : a))
  }

  const inputClass = "w-full border border-zinc-200 rounded-md px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-zinc-400 bg-zinc-50 transition-colors"
  const labelClass = "block text-xs font-medium tracking-wider uppercase text-zinc-500 mb-1.5"

  const sorted = [...activities].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return (
    <div className="space-y-6">

      {/* Follow-ups */}
      {followUps.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-amber-200 flex items-center justify-between">
            <h3 className="text-xs font-medium tracking-[0.2em] uppercase text-amber-700">
              Open Follow-ups ({followUps.length})
            </h3>
          </div>
          <div className="divide-y divide-amber-100">
            {followUps.map(fu => {
              const due = fu.due_date ? formatDueDate(fu.due_date) : null
              return (
                <div key={fu.id} className="px-5 py-3.5 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 flex-shrink-0 ${priorityColour[fu.priority]}`}>
                      {fu.priority}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{fu.title}</p>
                      {fu.notes && <p className="text-xs text-zinc-500 mt-0.5">{fu.notes}</p>}
                      {due && <p className={`text-xs mt-0.5 font-medium ${due.colour}`}>{due.label}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => completeFollowUp(fu.id)}
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                    >
                      Done
                    </button>
                    <span className="text-zinc-200">|</span>
                    <button
                      onClick={() => dismissFollowUp(fu.id)}
                      className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => { setShowForm(!showForm); setShowFollowUpForm(false) }}
          className="text-xs font-medium tracking-[0.12em] uppercase bg-zinc-900 text-[#f9f8f5] px-4 py-2.5 rounded-full hover:bg-[#4a5c4e] transition-colors"
        >
          + Log Activity
        </button>
        <button
          onClick={() => { setShowFollowUpForm(!showFollowUpForm); setShowForm(false) }}
          className="text-xs font-medium tracking-[0.12em] uppercase border border-zinc-200 text-zinc-600 px-4 py-2.5 rounded-full hover:border-zinc-400 transition-colors"
        >
          + Follow-up
        </button>
      </div>

      {/* Log activity form */}
      {showForm && (
        <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h3 className="text-sm font-medium text-zinc-900">Log Activity</h3>
          </div>
          <form onSubmit={handleLogActivity} className="px-5 py-5 space-y-4">
            <div>
              <label className={labelClass}>Type</label>
              <div className="flex flex-wrap gap-2">
                {(['note', 'call', 'email', 'complaint', 'other'] as LogType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setLogType(t)}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium tracking-wide transition-colors border ${
                      logType === t
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400'
                    }`}
                  >
                    {typeConfig[t].icon} {typeConfig[t].label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelClass}>Title</label>
              <input name="title" className={inputClass} placeholder={
                logType === 'call' ? 'e.g. Called to discuss spring deep clean' :
                logType === 'email' ? 'e.g. Sent quote for monthly maintenance' :
                logType === 'complaint' ? 'e.g. Client unhappy with bathroom clean' :
                'e.g. Client mentioned they\'re renovating in April'
              } />
            </div>

            <div>
              <label className={labelClass}>Notes</label>
              <textarea
                name="body"
                rows={3}
                className={`${inputClass} resize-none`}
                placeholder="Full details…"
              />
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" name="pinned" id="pinned" className="accent-[#4a5c4e]" />
              <label htmlFor="pinned" className="text-xs text-zinc-500 cursor-pointer">
                Pin to top of timeline
              </label>
            </div>

            <div className="border-t border-zinc-100 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <input type="checkbox" name="add_follow_up" id="add_follow_up"
                  className="accent-[#4a5c4e]"
                  onChange={e => {
                    const el = document.getElementById('follow_up_fields')
                    if (el) el.style.display = e.target.checked ? 'block' : 'none'
                  }}
                />
                <label htmlFor="add_follow_up" className="text-xs text-zinc-500 cursor-pointer">
                  Add a follow-up task
                </label>
              </div>
              <div id="follow_up_fields" style={{ display: 'none' }} className="grid grid-cols-3 gap-3">
                <div className="col-span-3">
                  <label className={labelClass}>Follow-up Task</label>
                  <input name="follow_up_title" className={inputClass} placeholder="e.g. Call back to confirm booking" />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Due Date</label>
                  <input name="follow_up_due" type="date" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Priority</label>
                  <select name="follow_up_priority" className={inputClass}>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="text-xs font-medium tracking-[0.12em] uppercase bg-zinc-900 text-[#f9f8f5] px-5 py-2.5 rounded-full hover:bg-[#4a5c4e] transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add follow-up form */}
      {showFollowUpForm && (
        <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h3 className="text-sm font-medium text-zinc-900">Add Follow-up</h3>
          </div>
          <form onSubmit={handleAddFollowUp} className="px-5 py-5 space-y-4">
            <div>
              <label className={labelClass}>Task <span className="text-red-400">*</span></label>
              <input name="title" required className={inputClass} placeholder="e.g. Send quote for deep clean" />
            </div>
            <div>
              <label className={labelClass}>Notes</label>
              <textarea name="notes" rows={2} className={`${inputClass} resize-none`} placeholder="Any additional context…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Due Date</label>
                <input name="due_date" type="date" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Priority</label>
                <select name="priority" className={inputClass}>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="text-xs font-medium tracking-[0.12em] uppercase bg-zinc-900 text-[#f9f8f5] px-5 py-2.5 rounded-full hover:bg-[#4a5c4e] transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Add Follow-up'}
              </button>
              <button
                type="button"
                onClick={() => setShowFollowUpForm(false)}
                className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {sorted.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-lg px-6 py-10 text-center">
            <p className="text-xs text-zinc-300 tracking-wide">No activity yet</p>
            <p className="text-xs text-zinc-300 mt-1">Log a call, note, or email to get started</p>
          </div>
        ) : (
          <div className="space-y-1">
            {sorted.map((activity) => {

                    if (!typeConfig[activity.type]) {
  console.warn('Unknown activity type:', activity.type)
}

              const config = typeConfig[activity.type] ?? { label: 'Activity', icon: '💬', colour: 'bg-zinc-100 text-zinc-600' }
              const isExpanded = expandedId === activity.id
              const isJobEvent = ['job_scheduled', 'job_completed', 'job_cancelled'].includes(activity.type)

              return (
                <div
                  key={activity.id}
                  className={`relative bg-white border rounded-lg overflow-hidden transition-all ${
                    activity.pinned ? 'border-[#4a5c4e]' : 'border-zinc-200'
                  }`}
                >
                  {activity.pinned && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#4a5c4e]" />
                  )}
                  <div
                    className="px-5 py-4 flex items-start gap-4 cursor-pointer hover:bg-zinc-50 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : activity.id)}
                  >
                    {/* Icon */}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5 ${config.colour}`}>
                      {config.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.colour}`}>
                          {config.label}
                        </span>
                        {activity.pinned && (
                          <span className="text-xs text-[#4a5c4e] font-medium">📌 Pinned</span>
                        )}
                      </div>
                      {activity.title && (
                        <p className="text-sm font-medium text-zinc-900 mt-1">{activity.title}</p>
                      )}
                      {activity.body && !isExpanded && (
                        <p className="text-xs text-zinc-500 mt-0.5 truncate">{activity.body}</p>
                      )}
                      {isExpanded && activity.body && (
                        <p className="text-sm text-zinc-600 mt-2 leading-relaxed whitespace-pre-wrap">{activity.body}</p>
                      )}

                      {/* Job metadata */}
                      {isJobEvent && activity.metadata && (
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          {activity.metadata.service_type ? (
                            <span className="text-xs text-zinc-400 capitalize">
                              {String(activity.metadata.service_type).replace('_', ' ')}
                            </span>
                          ) : null}
                          {activity.metadata.property ? (
                            <span className="text-xs text-zinc-400">{String(activity.metadata.property)}</span>
                          ) : null}
                          {activity.metadata.scheduled_date ? (
                            <span className="text-xs text-zinc-400">
                              {new Date(String(activity.metadata.scheduled_date)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          ) : null}
                          {activity.metadata.price ? (
                            <span className="text-xs font-medium text-zinc-700">£{Number(activity.metadata.price).toFixed(2)}</span>
                          ) : null}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0 text-right">
                      <div>
                        <p className="text-xs text-zinc-400">{formatDate(activity.created_at)}</p>
                        {activity.profiles?.full_name && (
                          <p className="text-xs text-zinc-300 mt-0.5">{activity.profiles.full_name}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded actions */}
                  {isExpanded && !isJobEvent && (
                    <div className="px-5 pb-3 flex items-center gap-4 border-t border-zinc-50">
                      <button
                        onClick={() => togglePin(activity)}
                        className="text-xs text-zinc-400 hover:text-[#4a5c4e] transition-colors mt-2"
                      >
                        {activity.pinned ? 'Unpin' : 'Pin to top'}
                      </button>
                      <button
                        onClick={() => deleteActivity(activity.id)}
                        className="text-xs text-zinc-300 hover:text-red-400 transition-colors mt-2"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}