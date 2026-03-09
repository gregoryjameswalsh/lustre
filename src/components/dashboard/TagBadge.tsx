// src/components/dashboard/TagBadge.tsx
// =============================================================================
// LUSTRE — TagBadge
// Renders a single tag as a small coloured pill. All palette colours are
// light pastels so text is always the fixed dark neutral #1A1A1A.
// =============================================================================

import { DEFAULT_TAG_COLOUR } from '@/lib/types'

interface Props {
  name:    string
  colour?: string | null
}

export default function TagBadge({ name, colour }: Props) {
  const bg = colour ?? DEFAULT_TAG_COLOUR

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium tracking-wide leading-none"
      style={{ backgroundColor: bg, color: '#1A1A1A' }}
    >
      {name}
    </span>
  )
}
