'use client'

// src/components/dashboard/TagPicker.tsx
// =============================================================================
// LUSTRE — TagPicker
// Inline combobox for adding/removing tags on an entity.
// Calls addTagToEntityAction / removeTagFromEntityAction on selection change.
// Shows read-only badges when canEdit=false.
// =============================================================================

import { useState, useTransition, useRef, useEffect } from 'react'
import TagBadge from './TagBadge'
import { addTagToEntityAction, removeTagFromEntityAction } from '@/lib/actions/tags'
import type { Tag, TagEntityType } from '@/lib/types'

const MAX_TAGS_PER_CLIENT = 10

interface Props {
  entityId:   string
  entityType: TagEntityType
  allTags:    Tag[]        // all org tags (for the dropdown)
  appliedTags: Tag[]       // tags currently on this entity
  canEdit:    boolean
}

export default function TagPicker({
  entityId,
  entityType,
  allTags,
  appliedTags: initialApplied,
  canEdit,
}: Props) {
  const [applied, setApplied]   = useState<Tag[]>(initialApplied)
  const [open, setOpen]         = useState(false)
  const [search, setSearch]     = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [, startTransition]     = useTransition()
  const containerRef            = useRef<HTMLDivElement>(null)

  const appliedIds = new Set(applied.map(t => t.id))
  const available  = allTags.filter(t => !appliedIds.has(t.id))
  const filtered   = search
    ? available.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
    : available

  const atClientLimit = entityType === 'client' && applied.length >= MAX_TAGS_PER_CLIENT

  // Close dropdown on outside click
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  function handleAdd(tag: Tag) {
    if (atClientLimit) return
    setApplied(prev => [...prev, tag])
    setOpen(false)
    setSearch('')
    setError(null)
    startTransition(async () => {
      const result = await addTagToEntityAction(tag.id, entityId, entityType)
      if (result.error) {
        setApplied(prev => prev.filter(t => t.id !== tag.id))
        setError(result.error)
      }
    })
  }

  function handleRemove(tagId: string) {
    const removed = applied.find(t => t.id === tagId)
    setApplied(prev => prev.filter(t => t.id !== tagId))
    setError(null)
    startTransition(async () => {
      const result = await removeTagFromEntityAction(tagId, entityId, entityType)
      if (result.error && removed) {
        setApplied(prev => [...prev, removed])
        setError(result.error)
      }
    })
  }

  if (!canEdit) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {applied.length === 0
          ? <span className="text-xs text-zinc-300">No tags</span>
          : applied.map(t => <TagBadge key={t.id} name={t.name} colour={t.colour} />)
        }
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Applied tags + remove buttons */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {applied.map(tag => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[11px] font-medium"
            style={{ backgroundColor: tag.colour ?? '#E2E8F0', color: '#1A1A1A' }}
          >
            {tag.name}
            <button
              onClick={() => handleRemove(tag.id)}
              className="flex-shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors"
              aria-label={`Remove ${tag.name}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {/* Add tag trigger */}
      {atClientLimit ? (
        <p className="text-xs text-zinc-400 italic">
          Maximum of {MAX_TAGS_PER_CLIENT} tags reached. Remove a tag to add another.
        </p>
      ) : (
        <button
          onClick={() => setOpen(v => !v)}
          className="text-xs text-[#3D7A5F] hover:underline tracking-wide"
        >
          + Add tag
        </button>
      )}

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 w-52 rounded-lg border border-zinc-200 bg-white shadow-lg overflow-hidden">
          <div className="p-2 border-b border-zinc-100">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tags…"
              className="w-full text-xs px-2 py-1.5 rounded border border-zinc-200 focus:outline-none focus:border-zinc-400 text-zinc-900 placeholder-zinc-300"
            />
          </div>

          {filtered.length === 0 ? (
            <p className="px-3 py-3 text-xs text-zinc-300 text-center">
              {available.length === 0 ? 'All tags applied' : 'No matching tags'}
            </p>
          ) : (
            <ul className="max-h-48 overflow-y-auto py-1">
              {filtered.map(tag => (
                <li key={tag.id}>
                  <button
                    onClick={() => handleAdd(tag)}
                    className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-zinc-50 transition-colors"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tag.colour ?? '#E2E8F0' }}
                    />
                    <span className="text-xs text-zinc-900 truncate">{tag.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {allTags.length === 0 && (
            <p className="px-3 py-2 border-t border-zinc-100 text-xs text-zinc-400">
              No tags yet.{' '}
              <a href="/dashboard/settings/tags" className="text-[#3D7A5F] hover:underline">
                Create one in Settings →
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
