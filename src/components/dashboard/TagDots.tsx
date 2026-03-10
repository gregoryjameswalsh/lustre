// src/components/dashboard/TagDots.tsx
// =============================================================================
// LUSTRE — TagDots
// Compact tag indicator for the Kanban card.
// Shows up to 5 filled dots (using tag colour) with a "+N" overflow label.
// Hovering a dot shows the tag name via the native title attribute.
// =============================================================================

import { DEFAULT_TAG_COLOUR } from '@/lib/types'

interface TagLike {
  id:     string
  name:   string
  colour: string | null
}

interface Props {
  tags: TagLike[]
}

const MAX_DOTS = 5

export default function TagDots({ tags }: Props) {
  if (!tags || tags.length === 0) return null

  const visible  = tags.slice(0, MAX_DOTS)
  const overflow = tags.length - visible.length

  return (
    <div className="flex items-center gap-1">
      {visible.map(tag => (
        <span
          key={tag.id}
          title={tag.name}
          className="block w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: tag.colour ?? DEFAULT_TAG_COLOUR }}
        />
      ))}
      {overflow > 0 && (
        <span className="text-[9px] text-zinc-400 leading-none">+{overflow}</span>
      )}
    </div>
  )
}
