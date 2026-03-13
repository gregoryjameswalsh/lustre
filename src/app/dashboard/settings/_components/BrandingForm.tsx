'use client'

// src/app/dashboard/settings/_components/BrandingForm.tsx
// =============================================================================
// LUSTRE — Operator Branding Form
//
// Allows admins to:
//   • Upload a logo (PNG / JPG / WebP / SVG, max 2 MiB)
//   • Choose a brand colour used on PDFs, emails, and public pages
//
// Logo upload pattern mirrors PropertyPhotos: the file is sent directly from
// the browser to the 'operator-logos' Supabase Storage bucket, then the
// resulting public URL is saved via saveLogoUrlAction().
// =============================================================================

import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { saveLogoUrlAction, deleteLogoAction, saveBrandColorAction } from '@/lib/actions/branding'
import AutoDismissAlert from './AutoDismissAlert'

const BUCKET          = 'operator-logos'
const MAX_FILE_BYTES  = 2 * 1024 * 1024         // 2 MiB
const ALLOWED_TYPES   = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
const DEFAULT_COLOR   = '#4a5c4e'

// Derive the storage path from the public URL returned by Supabase.
// Public URL format: .../storage/v1/object/public/{bucket}/{path}
function storagePathFromUrl(url: string, bucket: string): string {
  const marker = `/object/public/${bucket}/`
  const idx    = url.indexOf(marker)
  return idx >= 0 ? decodeURIComponent(url.slice(idx + marker.length)) : ''
}

// Expand 3-digit hex to 6-digit so the <input type="color"> always has a
// well-formed value.
function normaliseHex(value: string): string {
  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    const [, r, g, b] = value.split('')
    return `#${r}${r}${g}${g}${b}${b}`
  }
  return value
}

interface BrandingFormProps {
  orgId:       string
  logoUrl:     string | null
  brandColor:  string | null
  isAdmin:     boolean
}

export default function BrandingForm({ orgId, logoUrl, brandColor, isAdmin }: BrandingFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(logoUrl)
  const [color, setColor]                   = useState<string>(normaliseHex(brandColor ?? DEFAULT_COLOR))
  const [colorInput, setColorInput]         = useState<string>(brandColor ?? DEFAULT_COLOR)

  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [colorError, setColorError]   = useState<string | null>(null)
  const [colorSuccess, setColorSuccess] = useState(false)
  const [deleteError, setDeleteError]  = useState<string | null>(null)

  const [isUploading, startUpload]  = useTransition()
  const [isSavingColor, startColor] = useTransition()
  const [isDeleting, startDelete]   = useTransition()

  // ── Logo upload ────────────────────────────────────────────────────────────

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadError(null)
    setUploadSuccess(false)

    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError('Unsupported file type. Please upload a PNG, JPG, WebP, or SVG.')
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setUploadError('File is too large. Maximum size is 2 MB.')
      return
    }

    const ext      = file.name.split('.').pop() ?? 'png'
    const fileName = `logo-${Date.now()}.${ext}`
    const path     = `${orgId}/${fileName}`

    startUpload(async () => {
      const supabase = createClient()
      const { error: storageError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type })

      if (storageError) {
        setUploadError('Upload failed. Please try again.')
        return
      }

      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)

      const result = await saveLogoUrlAction(publicUrl)
      if (result.error) {
        setUploadError(result.error)
        return
      }

      setCurrentLogoUrl(publicUrl)
      setUploadSuccess(true)
    })

    // Reset the input so re-selecting the same file triggers onChange again
    e.target.value = ''
  }

  // ── Logo delete ────────────────────────────────────────────────────────────

  function handleDelete() {
    if (!currentLogoUrl) return
    const storagePath = storagePathFromUrl(currentLogoUrl, BUCKET)

    setDeleteError(null)

    startDelete(async () => {
      const result = await deleteLogoAction(storagePath)
      if (result.error) {
        setDeleteError(result.error)
        return
      }
      setCurrentLogoUrl(null)
    })
  }

  // ── Brand colour save ──────────────────────────────────────────────────────

  function handleColorInputChange(value: string) {
    setColorInput(value)
    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
      setColor(value)
    }
  }

  function handleColorPickerChange(value: string) {
    setColor(value)
    setColorInput(value)
  }

  function handleSaveColor() {
    setColorError(null)
    setColorSuccess(false)

    startColor(async () => {
      const result = await saveBrandColorAction(colorInput || null)
      if (result.error) {
        setColorError(result.error)
        return
      }
      setColorSuccess(true)
    })
  }

  function handleResetColor() {
    setColor(DEFAULT_COLOR)
    setColorInput(DEFAULT_COLOR)
    setColorError(null)
    setColorSuccess(false)

    startColor(async () => {
      const result = await saveBrandColorAction(null)
      if (result.error) setColorError(result.error)
      else setColorSuccess(true)
    })
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">

      {!isAdmin && (
        <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3">
          <p className="text-xs text-zinc-400">Only admins can change branding settings.</p>
        </div>
      )}

      {/* ── Logo ──────────────────────────────────────────────────────────── */}
      <div>
        <p className="mb-1 text-sm font-medium text-[#0c0c0b]">Logo</p>
        <p className="mb-4 text-xs text-zinc-400">
          Appears on quotes, invoices, and emails sent to clients.
          PNG, JPG, WebP, or SVG — max 2 MB.
        </p>

        {uploadError && <AutoDismissAlert type="error"   message={uploadError}            />}
        {uploadSuccess && <AutoDismissAlert type="success" message="Logo updated successfully." />}
        {deleteError && <AutoDismissAlert type="error"   message={deleteError}            />}

        {currentLogoUrl ? (
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-40 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
              <Image
                src={currentLogoUrl}
                alt="Organisation logo"
                fill
                className="object-contain p-2"
                unoptimized
              />
            </div>
            <div className="flex gap-2">
              {isAdmin && (
                <>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-800 disabled:opacity-50"
                  >
                    {isUploading ? 'Uploading…' : 'Replace'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="rounded-lg border border-red-100 px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] text-red-500 transition-colors hover:border-red-300 hover:text-red-700 disabled:opacity-50"
                  >
                    {isDeleting ? 'Removing…' : 'Remove'}
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          isAdmin && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-300 px-5 py-4 text-sm text-zinc-400 transition-colors hover:border-zinc-400 hover:text-zinc-600 disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-4 shrink-0">
                <path d="M7.25 10.25a.75.75 0 0 0 1.5 0V4.56l1.22 1.22a.75.75 0 1 0 1.06-1.06l-2.5-2.5a.75.75 0 0 0-1.06 0l-2.5 2.5a.75.75 0 0 0 1.06 1.06l1.22-1.22v5.69Z" />
                <path d="M3.5 9.75a.75.75 0 0 0-1.5 0v1.5A2.75 2.75 0 0 0 4.75 14h6.5A2.75 2.75 0 0 0 14 11.25v-1.5a.75.75 0 0 0-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5Z" />
              </svg>
              {isUploading ? 'Uploading…' : 'Upload logo'}
            </button>
          )
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* ── Brand colour ──────────────────────────────────────────────────── */}
      <div>
        <p className="mb-1 text-sm font-medium text-[#0c0c0b]">Brand colour</p>
        <p className="mb-4 text-xs text-zinc-400">
          Used for table headers, accent elements, and CTA buttons on client-facing documents.
        </p>

        {colorError   && <AutoDismissAlert type="error"   message={colorError}             />}
        {colorSuccess && <AutoDismissAlert type="success" message="Brand colour saved."    />}

        <div className="flex items-center gap-3">
          {/* Native colour picker */}
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-zinc-200 shadow-sm">
            <input
              type="color"
              value={color}
              disabled={!isAdmin}
              onChange={e => handleColorPickerChange(e.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer border-0 bg-transparent p-0 opacity-0 disabled:cursor-not-allowed"
            />
            <div className="h-full w-full rounded-lg" style={{ backgroundColor: color }} />
          </div>

          {/* Hex text input */}
          <input
            type="text"
            value={colorInput}
            disabled={!isAdmin}
            onChange={e => handleColorInputChange(e.target.value)}
            placeholder="#4a5c4e"
            maxLength={7}
            className="w-28 rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm text-[#0c0c0b] outline-none focus:border-[#1A3329] focus:ring-2 focus:ring-[#4a5c4e]/10 disabled:cursor-not-allowed disabled:opacity-50"
          />

          {isAdmin && (
            <>
              <button
                type="button"
                onClick={handleSaveColor}
                disabled={isSavingColor}
                className="rounded-lg bg-[#1A3329] px-5 py-2.5 text-xs font-medium uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isSavingColor ? 'Saving…' : 'Save'}
              </button>
              {brandColor && (
                <button
                  type="button"
                  onClick={handleResetColor}
                  disabled={isSavingColor}
                  className="rounded-lg border border-zinc-200 px-4 py-2.5 text-xs font-medium uppercase tracking-[0.12em] text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700 disabled:opacity-50"
                >
                  Reset
                </button>
              )}
            </>
          )}
        </div>

        {/* Live preview swatch */}
        <div className="mt-4 flex items-center gap-3">
          <div
            className="h-8 rounded-lg px-4 text-xs font-semibold uppercase tracking-wider text-white flex items-center"
            style={{ backgroundColor: color }}
          >
            Preview button
          </div>
          <span className="text-xs text-zinc-400">Example of how your brand colour appears on documents</span>
        </div>
      </div>

    </div>
  )
}
