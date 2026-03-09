'use client'

// src/app/dashboard/clients/[id]/properties/[propertyId]/_components/PropertyPhotosSection.tsx
// =============================================================================
// LUSTRE — Property Photos Section
//
// Renders a photo gallery for a property with two upload paths:
//   - "Take Photo"    → opens rear camera directly (mobile)
//   - "Upload Photo"  → opens file picker / photo library
//
// All files are compressed client-side via browser-image-compression before
// upload (target: 1 MiB / 2048px). The Supabase Storage bucket enforces a
// 5 MiB hard limit as a server-side backstop.
//
// Signed URLs are generated client-side on mount (1 hour TTL).
// =============================================================================

import { useState, useEffect, useRef } from 'react'
import imageCompression                 from 'browser-image-compression'
import { createClient }                 from '@/lib/supabase/client'
import { savePropertyPhotoMetadataAction, deletePropertyPhotoAction, setMainPropertyPhotoAction, updatePropertyPhotoCaptionAction } from '@/lib/actions/property-photos'
import PhotoLightbox                    from '@/components/dashboard/PhotoLightbox'
import type { LightboxPhoto }           from '@/components/dashboard/PhotoLightbox'
import type { PropertyPhoto }           from '@/lib/types'

const BUCKET          = 'property-photos'
const MAX_RAW_BYTES   = 20 * 1024 * 1024  // 20 MiB — reject before even trying to compress
const MAX_POST_BYTES  = 2  * 1024 * 1024  // 2 MiB  — reject if compression still too large
const ALLOWED_TYPES   = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const SIGNED_URL_TTL  = 3600              // 1 hour

type PhotoEntry = PropertyPhoto & { signedUrl?: string }

export default function PropertyPhotosSection({
  propertyId,
  orgId,
  initialPhotos,
}: {
  propertyId:    string
  orgId:         string
  initialPhotos: PropertyPhoto[]
}) {
  const [photos, setPhotos]           = useState<PhotoEntry[]>(
    initialPhotos.map(p => ({ ...p, signedUrl: undefined }))
  )
  const [uploading, setUploading]     = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex]     = useState<number | null>(null)
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null)
  const [settingMain, setSettingMain]         = useState(false)

  const cameraInputRef  = useRef<HTMLInputElement | null>(null)
  const libraryInputRef = useRef<HTMLInputElement | null>(null)

  // ---------------------------------------------------------------------------
  // Generate signed URLs on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (initialPhotos.length === 0) return

    async function loadSignedUrls() {
      const supabase = createClient()
      const updated  = await Promise.all(
        initialPhotos.map(async (p) => {
          const { data } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(p.storage_path, SIGNED_URL_TTL)
          return { ...p, signedUrl: data?.signedUrl ?? '' }
        })
      )
      setPhotos(updated)
    }

    loadSignedUrls()
  }, [])

  // ---------------------------------------------------------------------------
  // Compress + upload
  // ---------------------------------------------------------------------------
  async function handleFile(file: File) {
    setUploadError(null)

    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError('Unsupported file type. Use JPEG, PNG, WebP, or HEIC.')
      return
    }
    if (file.size > MAX_RAW_BYTES) {
      setUploadError('File is too large to process (max 20 MB).')
      return
    }

    setUploading(true)

    // Compress client-side
    let compressed: File
    try {
      compressed = await imageCompression(file, {
        maxSizeMB:        1,
        maxWidthOrHeight: 2048,
        useWebWorker:     true,
        initialQuality:   0.85,
      })
    } catch {
      setUploadError('Could not process image. Please try another file.')
      setUploading(false)
      return
    }

    if (compressed.size > MAX_POST_BYTES) {
      setUploadError('Image could not be compressed enough. Try a smaller photo.')
      setUploading(false)
      return
    }

    // Upload to Supabase Storage
    const supabase   = createClient()
    const uniqueName = `${crypto.randomUUID()}-${file.name}`
    const path       = `${orgId}/properties/${propertyId}/${uniqueName}`

    const { data: storageData, error: storageError } = await supabase.storage
      .from(BUCKET)
      .upload(path, compressed, { contentType: compressed.type, upsert: false })

    if (storageError) {
      setUploadError('Upload failed. Please try again.')
      setUploading(false)
      return
    }

    // Record metadata in DB
    const result = await savePropertyPhotoMetadataAction(
      propertyId,
      storageData.path,
      file.name,
      compressed.size,
      compressed.type,
      null,
    )

    if (result.error) {
      setUploadError(result.error)
      setUploading(false)
      return
    }

    // Generate a signed URL for the new photo and add it to local state
    const { data: urlData } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storageData.path, SIGNED_URL_TTL)

    const newPhoto: PhotoEntry = {
      id:              result.id!,
      organisation_id: orgId,
      property_id:     propertyId,
      storage_path:    storageData.path,
      file_name:       file.name,
      file_size_bytes: compressed.size,
      mime_type:       compressed.type,
      caption:         null,
      display_order:   photos.length,
      is_main:         false,
      uploaded_by:     null,
      uploaded_at:     new Date().toISOString(),
      signedUrl:       urlData?.signedUrl ?? '',
    }

    setPhotos(prev => [...prev, newPhoto])
    setUploading(false)

    // Reset both inputs so the same file can be picked again if needed
    if (cameraInputRef.current)  cameraInputRef.current.value  = ''
    if (libraryInputRef.current) libraryInputRef.current.value = ''
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------
  async function handleDelete(photoId: string) {
    setDeletingPhotoId(photoId)
    const result = await deletePropertyPhotoAction(photoId)
    setDeletingPhotoId(null)

    if (result.error) return

    const updated = photos.filter(p => p.id !== photoId)
    setPhotos(updated)

    if (updated.length === 0) {
      setLightboxIndex(null)
    } else {
      setLightboxIndex(prev => (prev !== null ? Math.min(prev, updated.length - 1) : null))
    }
  }

  // ---------------------------------------------------------------------------
  // Caption
  // ---------------------------------------------------------------------------
  async function handleCaptionSave(photoId: string, caption: string) {
    await updatePropertyPhotoCaptionAction(photoId, caption)
    setPhotos(prev => prev.map(p =>
      p.id === photoId ? { ...p, caption: caption.trim() || null } : p
    ))
  }

  // ---------------------------------------------------------------------------
  // Set as Main
  // ---------------------------------------------------------------------------
  async function handleSetMain(photoId: string, makeMain: boolean) {
    setSettingMain(true)
    const result = await setMainPropertyPhotoAction(photoId, propertyId, makeMain)
    setSettingMain(false)

    if (result.error) return

    setPhotos(prev => prev.map(p => ({
      ...p,
      is_main: makeMain ? p.id === photoId : (p.id === photoId ? false : p.is_main),
    })))
  }

  // ---------------------------------------------------------------------------
  // Lightbox photo list
  // ---------------------------------------------------------------------------
  const lightboxPhotos: LightboxPhoto[] = photos.map(p => ({
    id:        p.id,
    signedUrl: p.signedUrl ?? '',
    fileName:  p.file_name,
    caption:   p.caption,
  }))

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <>
      {lightboxIndex !== null && lightboxPhotos.length > 0 && (
        <PhotoLightbox
          photos={lightboxPhotos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
          onDelete={handleDelete}
          canDelete={true}
          deleting={!!deletingPhotoId}
          onSetMain={handleSetMain}
          isMainPhoto={id => photos.find(p => p.id === id)?.is_main ?? false}
          settingMain={settingMain}
          onCaptionSave={handleCaptionSave}
        />
      )}

      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-500">Photos</h2>
          <div className="flex items-center gap-2">
            {/* Take Photo — opens rear camera on mobile, falls back to file picker on desktop */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 border border-zinc-200 px-3 py-1.5 rounded-md hover:border-zinc-400 transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
              Take Photo
            </button>

            {/* Upload from Library / Files */}
            <button
              type="button"
              onClick={() => libraryInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 border border-zinc-200 px-3 py-1.5 rounded-md hover:border-zinc-400 transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Upload Photo
            </button>
          </div>
        </div>

        {/* Hidden inputs */}
        {/* Camera: capture="environment" routes straight to rear camera on mobile */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
        {/* Library: no capture attribute — shows OS sheet (photo library + browse) */}
        <input
          ref={libraryInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="sr-only"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />

        {/* Body */}
        <div className="px-5 py-4">

          {/* Upload states */}
          {uploading && (
            <div className="mb-4">
              <div className="h-1 bg-zinc-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#1A3329] rounded-full animate-pulse w-2/3" />
              </div>
              <p className="text-xs text-zinc-400 mt-1.5">Compressing and uploading…</p>
            </div>
          )}

          {uploadError && (
            <p className="text-xs text-red-500 mb-4">{uploadError}</p>
          )}

          {/* Photo grid */}
          {photos.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-x-2 gap-y-3">
              {photos.map((photo, idx) => (
                <div key={photo.id} className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => setLightboxIndex(idx)}
                  className={`relative aspect-square w-full rounded-md overflow-hidden border transition-colors bg-zinc-50 ${
                    photo.is_main
                      ? 'border-amber-400 ring-1 ring-amber-400'
                      : 'border-zinc-200 hover:border-zinc-400'
                  }`}
                  title={photo.caption ?? photo.file_name}
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
                  {/* Star badge on main photo */}
                  {photo.is_main && (
                    <span className="absolute top-1 left-1 bg-amber-400 rounded-full p-0.5" title="Main photo">
                      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                      </svg>
                    </span>
                  )}
                </button>
                {photo.caption && (
                  <p className="text-xs text-zinc-400 truncate text-center leading-tight">{photo.caption}</p>
                )}
                </div>
              ))}
            </div>
          ) : (
            !uploading && (
              <p className="text-sm text-zinc-400 text-center py-6">
                No photos yet. Use the buttons above to add some.
              </p>
            )
          )}
        </div>
      </div>
    </>
  )
}
