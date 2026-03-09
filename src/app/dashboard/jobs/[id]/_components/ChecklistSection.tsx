'use client'

// src/app/dashboard/jobs/[id]/_components/ChecklistSection.tsx
// =============================================================================
// LUSTRE — Job Checklist Section
// Renders checklist items with check/uncheck, photo upload, and lightbox.
// Read-only when job is completed or cancelled.
// =============================================================================

import { useState, useEffect, useRef, useTransition } from 'react'
import { createClient }             from '@/lib/supabase/client'
import { toggleChecklistItemAction } from '@/lib/actions/checklist-completion'
import { savePhotoMetadataAction, deletePhotoAction } from '@/lib/actions/checklist-photos'
import PhotoLightbox                 from '@/components/dashboard/PhotoLightbox'
import type { JobChecklistWithItems, JobChecklistItem, JobChecklistPhoto } from '@/lib/types'

const BUCKET = 'checklist-photos'
const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MiB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const SIGNED_URL_TTL = 3600 // 1 hour

function formatCompletedAt(ts: string): string {
  const d   = new Date(ts)
  const now = new Date()
  const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (diffMins < 1)   return 'just now'
  if (diffMins < 60)  return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// ---------------------------------------------------------------------------
// Per-item photo state
// ---------------------------------------------------------------------------

type PhotoEntry = JobChecklistPhoto & { signedUrl?: string }
type PhotosMap  = Record<string, PhotoEntry[]> // itemId → photos

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ChecklistSection({
  checklist: initialChecklist,
  jobStatus,
  orgId,
}: {
  checklist: JobChecklistWithItems
  jobStatus: string
  orgId: string
}) {
  const [items, setItems]         = useState<JobChecklistItem[]>(initialChecklist.items)
  const [itemError, setItemError] = useState<string | null>(null)
  const [photosMap, setPhotosMap] = useState<PhotosMap>({})
  const [uploadProgress, setUploadProgress]   = useState<Record<string, number>>({})  // itemId → 0-100
  const [uploadError, setUploadError]         = useState<Record<string, string>>({})

  // Lightbox state
  const [lightboxItemId, setLightboxItemId]   = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex]     = useState(0)
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null)

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const [, startTransition] = useTransition()

  const isReadOnly = jobStatus === 'completed' || jobStatus === 'cancelled'
  const completedCount = items.filter(i => i.is_completed).length
  const totalCount     = items.length
  const allComplete    = completedCount === totalCount && totalCount > 0

  // -------------------------------------------------------------------------
  // Build photosMap from initial checklist items and generate signed URLs
  // -------------------------------------------------------------------------
  useEffect(() => {
    const initial: PhotosMap = {}
    initialChecklist.items.forEach(item => {
      if (item.photos && item.photos.length > 0) {
        initial[item.id] = item.photos.map(p => ({ ...p, signedUrl: undefined }))
      }
    })
    setPhotosMap(initial)

    // Generate signed URLs for all photos
    generateSignedUrls(initial)
  }, [])

  async function generateSignedUrls(map: PhotosMap) {
    const supabase = createClient()
    const updated  = { ...map }

    for (const [itemId, photos] of Object.entries(updated)) {
      const withUrls: PhotoEntry[] = await Promise.all(
        photos.map(async (p) => {
          if (p.signedUrl) return p
          const { data } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(p.storage_path, SIGNED_URL_TTL)
          return { ...p, signedUrl: data?.signedUrl ?? '' }
        })
      )
      updated[itemId] = withUrls
    }

    setPhotosMap(updated)
  }

  // -------------------------------------------------------------------------
  // Check / uncheck
  // -------------------------------------------------------------------------
  function handleToggle(itemId: string, currentlyCompleted: boolean) {
    if (isReadOnly) return
    const newCompleted = !currentlyCompleted

    setItems(prev =>
      prev.map(i => {
        if (i.id !== itemId) return i
        return {
          ...i,
          is_completed:         newCompleted,
          completed_by:         newCompleted ? 'optimistic' : null,
          completed_at:         newCompleted ? new Date().toISOString() : null,
          completed_by_profile: newCompleted ? { full_name: null } : null,
        }
      })
    )
    setItemError(null)

    startTransition(async () => {
      const result = await toggleChecklistItemAction(itemId, newCompleted)
      if (result.error) {
        setItems(prev =>
          prev.map(i => i.id === itemId ? { ...i, is_completed: currentlyCompleted } : i)
        )
        setItemError(result.error)
      }
    })
  }

  // -------------------------------------------------------------------------
  // Photo upload
  // -------------------------------------------------------------------------
  function handleFileChange(itemId: string, file: File) {
    // Validate
    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError(prev => ({ ...prev, [itemId]: 'Unsupported file type. Use JPEG, PNG, WebP, or HEIC.' }))
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setUploadError(prev => ({ ...prev, [itemId]: 'File too large. Maximum 10 MB.' }))
      return
    }

    setUploadError(prev => ({ ...prev, [itemId]: '' }))
    uploadPhoto(itemId, file)
  }

  async function uploadPhoto(itemId: string, file: File) {
    const supabase   = createClient()
    const uniqueName = `${crypto.randomUUID()}-${file.name}`
    const path       = `${orgId}/checklists/${itemId}/${uniqueName}`

    setUploadProgress(prev => ({ ...prev, [itemId]: 1 }))

    const { data: storageData, error: storageError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false })

    if (storageError) {
      setUploadError(prev => ({ ...prev, [itemId]: 'Upload failed. Please try again.' }))
      setUploadProgress(prev => ({ ...prev, [itemId]: 0 }))
      return
    }

    setUploadProgress(prev => ({ ...prev, [itemId]: 80 }))

    const result = await savePhotoMetadataAction(
      itemId,
      storageData.path,
      file.name,
      file.size,
      file.type
    )

    if (result.error) {
      setUploadError(prev => ({ ...prev, [itemId]: result.error! }))
      setUploadProgress(prev => ({ ...prev, [itemId]: 0 }))
      return
    }

    // Generate signed URL for the new photo
    const { data: urlData } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storageData.path, SIGNED_URL_TTL)

    const newPhoto: PhotoEntry = {
      id:                    result.id!,
      organisation_id:       orgId,
      job_checklist_item_id: itemId,
      storage_path:          storageData.path,
      file_name:             file.name,
      file_size_bytes:       file.size,
      mime_type:             file.type,
      uploaded_by:           null,
      uploaded_at:           new Date().toISOString(),
      signedUrl:             urlData?.signedUrl ?? '',
    }

    setPhotosMap(prev => ({
      ...prev,
      [itemId]: [...(prev[itemId] ?? []), newPhoto],
    }))
    setUploadProgress(prev => ({ ...prev, [itemId]: 0 }))

    // Reset the file input
    if (fileInputRefs.current[itemId]) {
      fileInputRefs.current[itemId]!.value = ''
    }
  }

  // -------------------------------------------------------------------------
  // Lightbox
  // -------------------------------------------------------------------------
  function openLightbox(itemId: string, photoIndex: number) {
    setLightboxItemId(itemId)
    setLightboxIndex(photoIndex)
  }

  async function handleDeletePhoto(photoId: string) {
    if (!lightboxItemId) return
    setDeletingPhotoId(photoId)

    const result = await deletePhotoAction(photoId)
    setDeletingPhotoId(null)

    if (result.error) return

    const updated = (photosMap[lightboxItemId] ?? []).filter(p => p.id !== photoId)
    setPhotosMap(prev => ({ ...prev, [lightboxItemId]: updated }))

    if (updated.length === 0) {
      setLightboxItemId(null)
    } else {
      setLightboxIndex(prev => Math.min(prev, updated.length - 1))
    }
  }

  const lightboxPhotos = lightboxItemId
    ? (photosMap[lightboxItemId] ?? []).map(p => ({
        id:        p.id,
        signedUrl: p.signedUrl ?? '',
        fileName:  p.file_name,
      }))
    : []

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <>
      {lightboxItemId && lightboxPhotos.length > 0 && (
        <PhotoLightbox
          photos={lightboxPhotos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxItemId(null)}
          onNavigate={setLightboxIndex}
          onDelete={handleDeletePhoto}
          canDelete={!isReadOnly}
          deleting={!!deletingPhotoId}
        />
      )}

      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden mb-6 md:mb-8">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-500">
              Checklist
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">{initialChecklist.template_name}</p>
          </div>
          <span
            className={`text-xs font-medium px-3 py-1 rounded-md ${
              allComplete
                ? 'bg-emerald-50 text-emerald-600'
                : isReadOnly
                ? 'bg-zinc-100 text-zinc-400'
                : 'bg-amber-50 text-amber-600'
            }`}
          >
            {completedCount} / {totalCount} complete
          </span>
        </div>

        {itemError && (
          <div className="px-5 py-2 border-b border-red-100 bg-red-50 text-xs text-red-600">
            {itemError}
          </div>
        )}

        {/* Items */}
        <div className="divide-y divide-zinc-50">
          {items.map(item => {
            const photos  = photosMap[item.id] ?? []
            const progPct = uploadProgress[item.id] ?? 0
            const upErr   = uploadError[item.id] ?? ''

            return (
              <div key={item.id} className="px-5 py-4">
                {/* Item row */}
                <div
                  className={`flex items-start gap-4 ${!isReadOnly ? 'cursor-pointer' : ''}`}
                  onClick={() => !isReadOnly && handleToggle(item.id, item.is_completed)}
                >
                  {/* Checkbox */}
                  <div className="flex-shrink-0 mt-0.5">
                    {isReadOnly ? (
                      item.is_completed ? (
                        <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-zinc-200" />
                      )
                    ) : (
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          item.is_completed
                            ? 'bg-[#1A3329] border-[#1A3329]'
                            : 'border-zinc-300 hover:border-zinc-400'
                        }`}
                      >
                        {item.is_completed && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                          </svg>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium leading-snug ${
                        item.is_completed ? 'text-zinc-400 line-through' : 'text-zinc-900'
                      }`}
                    >
                      {item.title}
                    </p>
                    {item.guidance && !item.is_completed && (
                      <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{item.guidance}</p>
                    )}
                    {item.is_completed && item.completed_at && (
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {item.completed_by_profile?.full_name
                          ? `${item.completed_by_profile.full_name} · `
                          : ''}
                        {formatCompletedAt(item.completed_at)}
                      </p>
                    )}
                  </div>

                  {/* Camera button (only when in_progress) */}
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                        fileInputRefs.current[item.id]?.click()
                      }}
                      title="Attach photo"
                      className="flex-shrink-0 text-zinc-300 hover:text-[#3D7A5F] transition-colors mt-0.5"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                      </svg>
                    </button>
                  )}

                  {/* Hidden file input */}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                    className="sr-only"
                    ref={el => { fileInputRefs.current[item.id] = el }}
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) handleFileChange(item.id, file)
                    }}
                  />
                </div>

                {/* Upload progress */}
                {progPct > 0 && (
                  <div className="mt-2 ml-9">
                    <div className="h-1 bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#1A3329] transition-all duration-300 rounded-full"
                        style={{ width: `${progPct}%` }}
                      />
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">Uploading…</p>
                  </div>
                )}

                {/* Upload error */}
                {upErr && (
                  <p className="text-xs text-red-500 mt-1 ml-9">{upErr}</p>
                )}

                {/* Photo thumbnails */}
                {photos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3 ml-9">
                    {photos.map((photo, idx) => (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() => openLightbox(item.id, idx)}
                        className="w-14 h-14 rounded-md overflow-hidden border border-zinc-200 hover:border-zinc-400 transition-colors flex-shrink-0 bg-zinc-50"
                        title={photo.file_name}
                      >
                        {photo.signedUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={photo.signedUrl}
                            alt={photo.file_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {isReadOnly && (
          <div className="px-5 py-3 border-t border-zinc-50 bg-zinc-50/50">
            <p className="text-xs text-zinc-400">
              Checklist is read-only — job is {jobStatus.replace('_', ' ')}.
            </p>
          </div>
        )}
      </div>
    </>
  )
}
