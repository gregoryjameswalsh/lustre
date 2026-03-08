'use client'

// src/app/dashboard/jobs/[id]/_components/PhotoLightbox.tsx
// =============================================================================
// LUSTRE — Full-screen photo lightbox with navigation and delete.
// =============================================================================

import { useEffect } from 'react'

type LightboxPhoto = {
  id: string
  signedUrl: string
  fileName: string
}

export default function PhotoLightbox({
  photos,
  currentIndex,
  onClose,
  onNavigate,
  onDelete,
  canDelete,
  deleting,
}: {
  photos:       LightboxPhoto[]
  currentIndex: number
  onClose:      () => void
  onNavigate:   (index: number) => void
  onDelete:     (photoId: string) => void
  canDelete:    boolean
  deleting:     boolean
}) {
  const photo = photos[currentIndex]
  if (!photo) return null

  // Close on Escape, navigate with arrow keys
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape')      onClose()
      if (e.key === 'ArrowLeft'  && currentIndex > 0)                  onNavigate(currentIndex - 1)
      if (e.key === 'ArrowRight' && currentIndex < photos.length - 1)  onNavigate(currentIndex + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [currentIndex, photos.length])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex flex-col"
      onClick={onClose}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        onClick={e => e.stopPropagation()}
      >
        <span className="text-xs text-white/60 truncate max-w-[60%]">{photo.fileName}</span>
        <div className="flex items-center gap-4">
          {canDelete && (
            <button
              onClick={() => onDelete(photo.id)}
              disabled={deleting}
              className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          )}
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Image */}
      <div
        className="flex-1 flex items-center justify-center relative px-12 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Prev arrow */}
        {currentIndex > 0 && (
          <button
            onClick={() => onNavigate(currentIndex - 1)}
            className="absolute left-2 text-white/60 hover:text-white transition-colors p-2"
            aria-label="Previous photo"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.signedUrl}
          alt={photo.fileName}
          className="max-h-full max-w-full object-contain rounded"
          draggable={false}
        />

        {/* Next arrow */}
        {currentIndex < photos.length - 1 && (
          <button
            onClick={() => onNavigate(currentIndex + 1)}
            className="absolute right-2 text-white/60 hover:text-white transition-colors p-2"
            aria-label="Next photo"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Counter */}
      {photos.length > 1 && (
        <div className="text-center py-3 flex-shrink-0">
          <span className="text-xs text-white/40">
            {currentIndex + 1} / {photos.length}
          </span>
        </div>
      )}
    </div>
  )
}
