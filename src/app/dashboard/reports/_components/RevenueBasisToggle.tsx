'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import type { RevenueBasis } from '@/lib/queries/analytics'

interface Props {
  basis: RevenueBasis
}

export default function RevenueBasisToggle({ basis }: Props) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function hrefFor(b: RevenueBasis) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('basis', b)
    return `${pathname}?${params.toString()}`
  }

  return (
    <div className="inline-flex items-center bg-zinc-100 rounded-lg p-0.5 gap-0.5">
      <Link
        href={hrefFor('earned')}
        replace
        className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors tracking-wide ${
          basis === 'earned'
            ? 'bg-white text-zinc-900 shadow-sm'
            : 'text-zinc-400 hover:text-zinc-700'
        }`}
      >
        Earned
      </Link>
      <Link
        href={hrefFor('committed')}
        replace
        className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors tracking-wide ${
          basis === 'committed'
            ? 'bg-white text-zinc-900 shadow-sm'
            : 'text-zinc-400 hover:text-zinc-700'
        }`}
      >
        Committed
      </Link>
    </div>
  )
}
