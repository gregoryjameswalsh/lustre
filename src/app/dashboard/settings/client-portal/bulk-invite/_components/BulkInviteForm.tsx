'use client'

// src/app/dashboard/settings/client-portal/bulk-invite/_components/BulkInviteForm.tsx
// =============================================================================
// LUSTRE — Bulk Invite Client Selection Form
// =============================================================================

import { useState, useTransition } from 'react'
import { bulkInviteClientsToPortal } from '@/lib/actions/client-portal'

interface Client {
  id:           string
  first_name:   string
  last_name:    string
  email:        string | null
  portal_status: string
}

interface Props {
  clients: Client[]
}

const STATUS_LABEL: Record<string, string> = {
  not_invited: 'Not invited',
  invited:     'Invite pending',
}

export default function BulkInviteForm({ clients }: Props) {
  const [selected, setSelected]         = useState<Set<string>>(new Set())
  const [result, setResult]             = useState<{ sent: number; failed: number; errors: string[] } | null>(null)
  const [isPending, startTransition]    = useTransition()

  function toggleAll() {
    if (selected.size === clients.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(clients.map(c => c.id)))
    }
  }

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSubmit() {
    if (!selected.size) return
    if (!confirm(`Send portal invitations to ${selected.size} client${selected.size > 1 ? 's' : ''}?`)) return
    setResult(null)
    startTransition(async () => {
      const res = await bulkInviteClientsToPortal(Array.from(selected))
      setResult(res)
      if (res.success) setSelected(new Set())
    })
  }

  const allSelected = selected.size === clients.length && clients.length > 0

  return (
    <div className="space-y-4">
      {result && (
        <div className={`rounded-xl border p-4 ${result.sent > 0 ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
          <p className={`text-sm font-medium ${result.sent > 0 ? 'text-green-800' : 'text-amber-800'}`}>
            {result.sent > 0 ? `${result.sent} invitation${result.sent > 1 ? 's' : ''} sent.` : 'No invitations sent.'}
            {result.failed > 0 && ` ${result.failed} failed.`}
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-2 space-y-1">
              {result.errors.map((e, i) => (
                <li key={i} className="text-xs text-amber-700">• {e}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        {/* Select all header */}
        <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
            />
            <span className="text-xs font-medium text-zinc-600 uppercase tracking-wide">
              {allSelected ? 'Deselect all' : 'Select all'} ({clients.length})
            </span>
          </label>
          <span className="text-xs text-zinc-400">
            {selected.size} selected
          </span>
        </div>

        {/* Client list */}
        <div className="divide-y divide-zinc-100">
          {clients.map(client => (
            <label
              key={client.id}
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-zinc-50 transition-colors"
            >
              <input
                type="checkbox"
                checked={selected.has(client.id)}
                onChange={() => toggle(client.id)}
                className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900">
                  {client.first_name} {client.last_name}
                </p>
                <p className="text-xs text-zinc-400 truncate">{client.email}</p>
              </div>
              <span className="text-[10px] text-zinc-400 shrink-0">
                {STATUS_LABEL[client.portal_status] ?? client.portal_status}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={isPending || selected.size === 0}
          className="inline-flex items-center rounded-full bg-[#1A3329] px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {isPending
            ? 'Sending…'
            : `Invite ${selected.size > 0 ? selected.size : ''} client${selected.size !== 1 ? 's' : ''}`}
        </button>
        {selected.size > 0 && !isPending && (
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            Clear selection
          </button>
        )}
      </div>
    </div>
  )
}
