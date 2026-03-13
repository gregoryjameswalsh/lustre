'use client'

// src/app/onboarding/_steps/StepBranding.tsx
// =============================================================================
// LUSTRE — Onboarding Step 5: Branding
// Optional step — logo and primary brand colour.
// Completing or skipping this step marks onboarding as done.
// =============================================================================

import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const BUCKET         = 'operator-logos'
const MAX_FILE_BYTES = 2 * 1024 * 1024
const ALLOWED_TYPES  = ['image/jpeg', 'image/png', 'image/webp']
const DEFAULT_COLOR  = '#4a5c4e'

function normaliseHex(value: string): string {
  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    const [, r, g, b] = value.split('')
    return `#${r}${r}${g}${g}${b}${b}`
  }
  return value
}

interface StepBrandingProps {
  orgId: string
}

export default function StepBranding({ orgId }: StepBrandingProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const [logoUrl, setLogoUrl]     = useState<string | null>(null)
  const [color, setColor]         = useState(DEFAULT_COLOR)
  const [colorInput, setColorInput] = useState(DEFAULT_COLOR)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, startUpload]   = useTransition()
  const [isSaving, startSaving]      = useTransition()

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)

    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError('Please upload a PNG, JPG, or WebP file.')
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setUploadError('File is too large. Maximum 2 MB.')
      return
    }

    const ext  = file.name.split('.').pop() ?? 'png'
    const path = `${orgId}/logo-${Date.now()}.${ext}`

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
      setLogoUrl(publicUrl)
    })
    e.target.value = ''
  }

  function handleColorInputChange(value: string) {
    setColorInput(value)
    if (/^#[0-9a-fA-F]{6}$/.test(value)) setColor(value)
  }

  function handleColorPickerChange(value: string) {
    setColor(value)
    setColorInput(value)
  }

  async function completeOnboarding(saveChoices: boolean) {
    const supabase = createClient()
    const updates: Record<string, unknown> = {
      onboarding_step: 5,
      onboarding_completed_at: new Date().toISOString(),
    }

    if (saveChoices) {
      if (logoUrl)                     updates.logo_url    = logoUrl
      if (colorInput !== DEFAULT_COLOR) updates.brand_color = colorInput
    }

    await supabase.from('organisations').update(updates).eq('id', orgId)
    router.push('/dashboard')
  }

  function handleSave() {
    startSaving(() => completeOnboarding(true))
  }

  function handleSkip() {
    startSaving(() => completeOnboarding(false))
  }

  return (
    <div>
      <h1 className="mb-1 font-['Urbanist'] text-2xl font-light text-[#0c0c0b]">
        Add your branding
      </h1>
      <p className="mb-2 text-sm font-light text-zinc-500">
        Optional — your logo and brand colour appear on quotes, invoices, and emails.
      </p>
      <p className="mb-8 text-xs text-zinc-400">
        You can change these any time from Settings.
      </p>

      <div className="space-y-8">

        {/* Logo */}
        <div>
          <p className="mb-1 text-sm font-medium text-[#0c0c0b]">Logo</p>
          <p className="mb-3 text-xs text-zinc-400">PNG, JPG or WebP — max 2 MB. Recommended 400 × 120 px.</p>

          {uploadError && (
            <div className="mb-3 rounded-lg border border-red-100 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-600">{uploadError}</p>
            </div>
          )}

          {logoUrl ? (
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-40 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
                <Image src={logoUrl} alt="Logo preview" fill className="object-contain p-2" />
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] text-zinc-600 hover:border-zinc-400 disabled:opacity-50"
              >
                Replace
              </button>
            </div>
          ) : (
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
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_TYPES.join(',')}
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Brand colour */}
        <div>
          <p className="mb-1 text-sm font-medium text-[#0c0c0b]">Brand colour</p>
          <p className="mb-3 text-xs text-zinc-400">Used on quote and invoice buttons. Leave as default if unsure.</p>

          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-zinc-200 shadow-sm">
              <input
                type="color"
                value={normaliseHex(color)}
                onChange={e => handleColorPickerChange(e.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer border-0 bg-transparent p-0 opacity-0"
              />
              <div className="h-full w-full rounded-lg" style={{ backgroundColor: normaliseHex(color) }} />
            </div>
            <input
              type="text"
              value={colorInput}
              onChange={e => handleColorInputChange(e.target.value)}
              placeholder="#4a5c4e"
              maxLength={7}
              className="w-28 rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm text-[#0c0c0b] outline-none focus:border-[#1A3329] focus:ring-2 focus:ring-[#4a5c4e]/10"
            />
            <div
              className="h-9 rounded-full px-4 text-xs font-semibold uppercase tracking-wider text-white flex items-center"
              style={{ backgroundColor: normaliseHex(color) }}
            >
              Preview
            </div>
          </div>
        </div>

      </div>

      <div className="mt-10 space-y-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || isUploading}
          className="w-full rounded-full bg-[#4a5c4e] px-6 py-3 text-xs font-medium uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isSaving ? 'Saving…' : 'Save & go to dashboard'}
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={handleSkip}
            disabled={isSaving}
            className="text-xs text-zinc-300 hover:text-zinc-500 hover:underline disabled:opacity-50"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  )
}
