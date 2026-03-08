'use client'

// src/app/dashboard/settings/_components/AutoDismissAlert.tsx
// =============================================================================
// LUSTRE — Auto-dismissing alert banner
// Success alerts fade out after `durationMs`; error alerts stay permanently.
// =============================================================================

import { useEffect, useState } from 'react'

interface Props {
  type: 'success' | 'error'
  message: string
  durationMs?: number
}

export default function AutoDismissAlert({ type, message, durationMs = 3500 }: Props) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (type !== 'success') return
    const t = setTimeout(() => setVisible(false), durationMs)
    return () => clearTimeout(t)
  }, [type, durationMs])

  if (!visible) return null

  const styles =
    type === 'error'
      ? 'border-red-100 bg-red-50 text-red-600'
      : 'border-emerald-100 bg-emerald-50 text-emerald-700'

  return (
    <div className={`rounded-lg border px-4 py-3 transition-opacity ${styles}`}>
      <p className="text-sm">{message}</p>
    </div>
  )
}
