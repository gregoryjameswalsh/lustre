// src/components/ui/PaginationControls.tsx
// =============================================================================
// LUSTRE — Prev / Next Pagination Controls (server component)
// =============================================================================
// Used by Clients, Jobs, and Quotes list pages.
// Receives pre-computed hrefs; no client-side state needed.
// =============================================================================

import Link from 'next/link'

interface Props {
  prevHref: string | null   // null = no previous page
  nextHref: string | null   // null = no next page
}

export default function PaginationControls({ prevHref, nextHref }: Props) {
  if (!prevHref && !nextHref) return null

  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <div>
        {prevHref ? (
          <Link
            href={prevHref}
            className="inline-flex items-center gap-1.5 text-xs font-medium tracking-[0.12em] uppercase text-zinc-500 hover:text-zinc-900 transition-colors border border-zinc-200 px-4 py-2.5 rounded-lg hover:border-zinc-400"
          >
            ← Previous
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium tracking-[0.12em] uppercase text-zinc-300 border border-zinc-100 px-4 py-2.5 rounded-lg cursor-not-allowed">
            ← Previous
          </span>
        )}
      </div>

      <div>
        {nextHref ? (
          <Link
            href={nextHref}
            className="inline-flex items-center gap-1.5 text-xs font-medium tracking-[0.12em] uppercase text-zinc-500 hover:text-zinc-900 transition-colors border border-zinc-200 px-4 py-2.5 rounded-lg hover:border-zinc-400"
          >
            Next →
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium tracking-[0.12em] uppercase text-zinc-300 border border-zinc-100 px-4 py-2.5 rounded-lg cursor-not-allowed">
            Next →
          </span>
        )}
      </div>
    </div>
  )
}
