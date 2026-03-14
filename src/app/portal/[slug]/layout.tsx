// src/app/portal/[slug]/layout.tsx
// =============================================================================
// LUSTRE — Portal Layout
// Wraps all portal pages.  Branding is applied per-page (the layout itself
// is minimal so pages can control the full-screen experience).
// =============================================================================

import type { ReactNode } from 'react'

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f9f8f5]">
      {children}
    </div>
  )
}
