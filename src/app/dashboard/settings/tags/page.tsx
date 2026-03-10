'use client'

// src/app/dashboard/settings/tags/page.tsx
// =============================================================================
// LUSTRE — Tags Settings Page
// Admins create, edit, and delete org-wide tags. Colour is chosen from the
// curated palette. Delete confirmation shows the usage count.
// =============================================================================

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  createTagAction,
  updateTagAction,
  deleteTagAction,
} from '@/lib/actions/tags'
import { CURATED_TAG_COLOURS, DEFAULT_TAG_COLOUR } from '@/lib/types'
import type { TagWithUsage } from '@/lib/types'

// ---------------------------------------------------------------------------
// Colour swatch picker
// ---------------------------------------------------------------------------

function ColourPicker({
  value,
  onChange,
}: {
  value:    string | null
  onChange: (hex: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {CURATED_TAG_COLOURS.map(({ name, hex }) => (
        <button
          key={hex}
          type="button"
          title={name}
          onClick={() => onChange(hex)}
          className={`w-6 h-6 rounded-full border-2 transition-all ${
            (value ?? DEFAULT_TAG_COLOUR) === hex
              ? 'border-zinc-700 scale-110'
              : 'border-transparent hover:border-zinc-300'
          }`}
          style={{ backgroundColor: hex }}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Create form
// ---------------------------------------------------------------------------

function CreateForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName]       = useState('')
  const [colour, setColour]   = useState<string>(DEFAULT_TAG_COLOUR)
  const [error, setError]     = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required.'); return }
    setPending(true)
    setError(null)
    const result = await createTagAction(name.trim(), colour)
    setPending(false)
    if (result.error) { setError(result.error); return }
    setName('')
    setColour(DEFAULT_TAG_COLOUR)
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium tracking-wider uppercase text-zinc-500 mb-1.5">
          Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={50}
          placeholder="e.g. VIP"
          className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-zinc-400 bg-zinc-50"
        />
      </div>
      <div>
        <label className="block text-xs font-medium tracking-wider uppercase text-zinc-500 mb-2">
          Colour
        </label>
        <ColourPicker value={colour} onChange={setColour} />
        <div className="mt-2 flex items-center gap-2">
          <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium"
            style={{ backgroundColor: colour, color: '#1A1A1A' }}
          >
            {name || 'Preview'}
          </span>
        </div>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="text-xs font-medium tracking-[0.15em] uppercase bg-[#1A3329] text-white px-5 py-2.5 rounded-lg hover:bg-[#3D7A5F] transition-colors disabled:opacity-50"
      >
        {pending ? 'Adding…' : '+ Add Tag'}
      </button>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Edit inline form
// ---------------------------------------------------------------------------

function EditForm({
  tag,
  onSuccess,
  onCancel,
}: {
  tag:       TagWithUsage
  onSuccess: () => void
  onCancel:  () => void
}) {
  const [name, setName]       = useState(tag.name)
  const [colour, setColour]   = useState<string>(tag.colour ?? DEFAULT_TAG_COLOUR)
  const [error, setError]     = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required.'); return }
    setPending(true)
    setError(null)
    const result = await updateTagAction(tag.id, name.trim(), colour)
    setPending(false)
    if (result.error) { setError(result.error); return }
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="flex-1 space-y-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={50}
          className="flex-1 border border-zinc-300 rounded-md px-3 py-1.5 text-sm text-zinc-900 focus:outline-none focus:border-zinc-500 bg-white"
        />
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
      <ColourPicker value={colour} onChange={setColour} />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </form>
  )
}

// ---------------------------------------------------------------------------
// Delete confirmation modal
// ---------------------------------------------------------------------------

function DeleteModal({
  tag,
  onConfirm,
  onCancel,
  pending,
}: {
  tag:       TagWithUsage
  onConfirm: () => void
  onCancel:  () => void
  pending:   boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-sm font-medium text-zinc-900 mb-2">Delete tag</h2>
        <p className="text-xs text-zinc-500 mb-1">
          <strong className="text-zinc-900">{tag.name}</strong> is applied to{' '}
          <strong className="text-zinc-900">{tag.usage_count}</strong>{' '}
          {tag.usage_count === 1 ? 'record' : 'records'}.
        </p>
        <p className="text-xs text-zinc-400 mb-5">
          Deleting will remove this tag from all of them. This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={pending}
            className="text-xs font-medium text-zinc-400 hover:text-zinc-900 transition-colors px-3 py-1.5"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={pending}
            className="rounded-lg bg-red-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {pending ? 'Deleting…' : 'Delete tag'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function TagsSettingsPage() {
  const [tags, setTags]           = useState<TagWithUsage[]>([])
  const [loading, setLoading]     = useState(true)
  const [isAdmin, setIsAdmin]     = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingTag, setDeletingTag] = useState<TagWithUsage | null>(null)
  const [deletePending, setDeletePending] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  async function loadTags() {
    const supabase = createClient()
    const { data } = await supabase
      .from('tags')
      .select('*, entity_tags(id)')
      .order('name', { ascending: true })

    setTags(
      (data ?? []).map(t => ({
        ...t,
        usage_count: Array.isArray(t.entity_tags) ? t.entity_tags.length : 0,
      }))
    )
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
      await loadTags()
      setLoading(false)
    }
    init()
  }, [])

  async function handleDelete() {
    if (!deletingTag) return
    setDeletePending(true)
    setActionError(null)
    const result = await deleteTagAction(deletingTag.id)
    setDeletePending(false)
    if (result.error) { setActionError(result.error); setDeletingTag(null); return }
    setDeletingTag(null)
    await loadTags()
  }

  if (loading) {
    return (
      <div className="px-4 pt-8 sm:px-6 md:px-10 md:pt-12 text-sm text-zinc-300">Loading…</div>
    )
  }

  return (
    <main className="max-w-3xl px-4 pt-8 pb-8 sm:px-6 md:px-10 md:pt-12 md:pb-12">

      <div className="mb-8">
        <Link href="/dashboard/settings" className="text-xs text-zinc-400 hover:text-zinc-900 transition-colors tracking-wide">
          ← Settings
        </Link>
        <h1 className="text-2xl font-light tracking-tight text-zinc-900 sm:text-3xl mt-4">Tags</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Create tags to segment and filter clients and jobs.
        </p>
      </div>

      {actionError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {/* Tag list */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden mb-6">
        <div className="border-b border-zinc-100 px-5 py-4">
          <h2 className="text-sm font-medium text-zinc-900">
            Your tags
            <span className="ml-2 text-zinc-400 font-normal">{tags.length}</span>
          </h2>
        </div>

        {tags.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-zinc-300">No tags yet.</div>
        ) : (
          <div className="divide-y divide-zinc-50">
            {tags.map(tag => (
              <div key={tag.id} className="px-5 py-4 flex items-start gap-3">
                {editingId === tag.id ? (
                  <EditForm
                    tag={tag}
                    onSuccess={() => { setEditingId(null); loadTags() }}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <>
                    <div className="flex-1 flex items-center gap-3 min-w-0">
                      <span
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tag.colour ?? DEFAULT_TAG_COLOUR }}
                      />
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium"
                        style={{ backgroundColor: tag.colour ?? DEFAULT_TAG_COLOUR, color: '#1A1A1A' }}
                      >
                        {tag.name}
                      </span>
                      <span className="text-xs text-zinc-300">
                        {tag.usage_count} {tag.usage_count === 1 ? 'use' : 'uses'}
                      </span>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <button
                          onClick={() => setEditingId(tag.id)}
                          className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => { setActionError(null); setDeletingTag(tag) }}
                          className="text-xs text-zinc-300 hover:text-red-400 transition-colors"
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

      {/* Add new tag */}
      {isAdmin && (
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <div className="border-b border-zinc-100 px-5 py-4">
            <h2 className="text-sm font-medium text-zinc-900">Add a tag</h2>
          </div>
          <div className="p-5">
            <CreateForm onSuccess={loadTags} />
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deletingTag && (
        <DeleteModal
          tag={deletingTag}
          onConfirm={handleDelete}
          onCancel={() => setDeletingTag(null)}
          pending={deletePending}
        />
      )}

    </main>
  )
}
