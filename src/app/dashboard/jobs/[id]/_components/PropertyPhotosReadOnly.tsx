'use client'

// src/app/dashboard/jobs/[id]/_components/PropertyPhotosReadOnly.tsx
// =============================================================================
// LUSTRE — Read-only property photo strip for the job detail page.
//
// Cleaners can browse photos (alarm panel, access point, specialist floors, etc.)
// directly from the job page. No upload or delete — reference only.
// Captions are shown in the lightbox and below thumbnails.
// =============================================================================

import { useState, useEffect }    from 'react'
import { createClient }           from '@/lib/supabase/client'
import PhotoLightbox              from '@/components/dashboard/PhotoLightbox'
import type { LightboxPhoto }     from '@/components/dashboard/PhotoLightbox'

const BUCKET         = 'property-photos'
const SIGNED_URL_TTL = 3600

type Photo = {
  id:          string
  storage_path: string
  file_name:   string
  caption:     string | null
  is_main:     boolean
  display_order: number
  uploaded_at: string
  signedUrl?:  string
}

export default function PropertyPhotosReadOnly({
  propertyId,
}: {
  propertyId: string
}) {
  const [photos, setPhotos]               = useState<Photo[]>([])
  const [loading, setLoading]             = useState(true)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const { data } = await supabase
        .from('property_photos')
        .select('id, storage_path, file_name, caption, is_main, display_order, uploaded_at')
        .eq('property_id', propertyId)
        .order('display_order', { ascending: true })
        .order('uploaded_at',   { ascending: true })

      if (!data || data.length === 0) {
        setLoading(false)
        return
      }

      const { data: signedUrls } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(data.map(p => p.storage_path), SIGNED_URL_TTL)

      const urlMap = Object.fromEntries(
        (signedUrls ?? []).map(u => [u.path, u.signedUrl])
      )

      setPhotos(data.map(p => ({ ...p, signedUrl: urlMap[p.storage_path] ?? '' })))
      setLoading(false)
    }
    load()
  }, [propertyId])

  if (loading || photos.length === 0) return null

  const lightboxPhotos: LightboxPhoto[] = photos.map(p => ({
    id:        p.id,
    signedUrl: p.signedUrl ?? '',
    fileName:  p.file_name,
    caption:   p.caption,
  }))

  return (
    <>
      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={lightboxPhotos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
          onDelete={() => {}}
          canDelete={false}
          deleting={false}
        />
      )}

      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h2 className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-500">
            Property Photos
            <span className="ml-2 text-zinc-300 font-normal normal-case tracking-normal">
              {photos.length}
            </span>
          </h2>
        </div>
        <div className="px-5 py-4">
          <div className="grid grid-cols-3 gap-x-2 gap-y-3">
            {photos.map((photo, idx) => (
              <div key={photo.id} className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => setLightboxIndex(idx)}
                  className={`relative aspect-square w-full rounded-md overflow-hidden border bg-zinc-50 hover:border-zinc-400 transition-colors ${
                    photo.is_main ? 'border-amber-400 ring-1 ring-amber-400' : 'border-zinc-200'
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
                    <span className="absolute top-1 left-1 bg-amber-400 rounded-full p-0.5">
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
        </div>
      </div>
    </>
  )
}
