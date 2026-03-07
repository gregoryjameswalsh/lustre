'use client'

// src/app/dashboard/pipeline/_components/KanbanBoard.tsx
// Drag-and-drop Kanban board. Tracks clients (leads) through pipeline stages.

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { moveClientStageAction, winClientAction, loseClientAction } from '@/lib/actions/pipeline'
import type { PipelineStage, ClientInPipeline } from '@/lib/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysInStage(enteredAt: string | null): number {
  if (!enteredAt) return 0
  return Math.floor((Date.now() - new Date(enteredAt).getTime()) / 86400000)
}

function formatValue(value: number | null): string | null {
  if (value == null) return null
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(value) + '/mo'
}

// ---------------------------------------------------------------------------
// Lost reason modal
// ---------------------------------------------------------------------------

function LostReasonModal({
  clientName,
  onConfirm,
  onCancel,
  isPending,
}: {
  clientName: string
  onConfirm:  (reason: string | null) => void
  onCancel:   () => void
  isPending:  boolean
}) {
  const [reason, setReason] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-sm font-medium text-zinc-900 mb-1">Mark as lost</h2>
        <p className="text-xs text-zinc-400 mb-4">
          {clientName} will be marked inactive and removed from the pipeline.
        </p>
        <label className="block text-xs text-zinc-500 mb-1.5">
          Reason <span className="text-zinc-300">(optional)</span>
        </label>
        <textarea
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 resize-none"
          rows={3}
          placeholder="e.g. chose a competitor, budget constraints…"
          value={reason}
          onChange={e => setReason(e.target.value)}
        />
        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="text-xs font-medium text-zinc-400 hover:text-zinc-900 transition-colors px-3 py-1.5"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason.trim() || null)}
            disabled={isPending}
            className="rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            {isPending ? 'Saving…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Client card
// ---------------------------------------------------------------------------

function ClientCard({
  client,
  isDragging = false,
  onWin,
  onLose,
}: {
  client:     ClientInPipeline
  isDragging?: boolean
  onWin:      (clientId: string) => void
  onLose:     (client: ClientInPipeline) => void
}) {
  const days = daysInStage(client.pipeline_entered_at)
  const value = formatValue(client.estimated_monthly_value)
  const assigned = client.pipeline_assigned_profile?.full_name

  return (
    <div
      className={`rounded-lg border bg-white p-3 shadow-sm transition-shadow ${
        isDragging
          ? 'rotate-1 shadow-lg border-zinc-300 opacity-90'
          : 'border-zinc-200 hover:shadow-md'
      }`}
    >
      <Link
        href={`/dashboard/clients/${client.id}`}
        className="block"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-sm font-medium text-zinc-900 leading-snug">
          {client.first_name} {client.last_name}
        </p>
        {(client.email || client.phone) && (
          <p className="mt-0.5 text-xs text-zinc-400 truncate">
            {client.email ?? client.phone}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          {value && (
            <span className="text-xs font-medium text-zinc-700">{value}</span>
          )}
          <span className="text-[10px] text-zinc-400">
            {days === 0 ? 'Today' : `${days}d in stage`}
          </span>
        </div>
        {assigned && (
          <p className="mt-1 text-[10px] text-zinc-400">
            {assigned}
          </p>
        )}
      </Link>

      {/* Win / Lose actions */}
      {!isDragging && (
        <div className="mt-2.5 flex items-center gap-2 border-t border-zinc-50 pt-2.5">
          <button
            onClick={e => { e.stopPropagation(); onWin(client.id) }}
            title="Mark as won"
            className="flex-1 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            Won ✓
          </button>
          <button
            onClick={e => { e.stopPropagation(); onLose(client) }}
            title="Mark as lost"
            className="flex-1 rounded-md bg-zinc-50 px-2 py-1 text-[10px] font-medium text-zinc-500 hover:bg-zinc-100 transition-colors"
          >
            Lost ✗
          </button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Draggable client card wrapper
// ---------------------------------------------------------------------------

function DraggableClientCard({
  client,
  isActive,
  onWin,
  onLose,
}: {
  client:   ClientInPipeline
  isActive: boolean
  onWin:    (clientId: string) => void
  onLose:   (client: ClientInPipeline) => void
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: client.id })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`touch-none ${isActive ? 'opacity-0' : ''}`}
    >
      <ClientCard client={client} onWin={onWin} onLose={onLose} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stage column (droppable)
// ---------------------------------------------------------------------------

function StageColumn({
  stage,
  clients,
  activeClientId,
  onWin,
  onLose,
}: {
  stage:         PipelineStage
  clients:       ClientInPipeline[]
  activeClientId: string | null
  onWin:         (clientId: string) => void
  onLose:        (client: ClientInPipeline) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })

  const totalValue = clients.reduce((sum, c) => sum + (c.estimated_monthly_value ?? 0), 0)

  return (
    <div className="flex w-64 flex-shrink-0 flex-col">
      {/* Column header */}
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          {stage.colour && (
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: stage.colour }}
            />
          )}
          <span className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-600">
            {stage.name}
          </span>
          <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500">
            {clients.length}
          </span>
        </div>
        {totalValue > 0 && (
          <span className="text-[10px] font-medium text-zinc-400">
            {new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(totalValue)}/mo
          </span>
        )}
      </div>

      {/* Droppable area */}
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-xl p-2 transition-colors ${
          isOver ? 'bg-zinc-100' : 'bg-zinc-50'
        }`}
        style={{ minHeight: '120px' }}
      >
        <div className="space-y-2">
          {clients.map(client => (
            <DraggableClientCard
              key={client.id}
              client={client}
              isActive={client.id === activeClientId}
              onWin={onWin}
              onLose={onLose}
            />
          ))}
        </div>

        {clients.length === 0 && (
          <p className="mt-4 text-center text-xs text-zinc-300">No leads</p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main board
// ---------------------------------------------------------------------------

export default function KanbanBoard({
  stages,
  initialClientsByStage,
}: {
  stages:                 PipelineStage[]
  initialClientsByStage:  Record<string, ClientInPipeline[]>
}) {
  const [activeClient, setActiveClient]   = useState<ClientInPipeline | null>(null)
  const [clientsByStage, setClientsByStage] = useState(initialClientsByStage)
  const [lostTarget, setLostTarget]       = useState<ClientInPipeline | null>(null)
  const [, startTransition]               = useTransition()
  const [isPending, setIsPending]         = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  function findClient(id: string): ClientInPipeline | null {
    for (const clients of Object.values(clientsByStage)) {
      const found = clients.find(c => c.id === id)
      if (found) return found
    }
    return null
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveClient(findClient(String(event.active.id)))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveClient(null)

    if (!over || active.id === over.id) return

    const clientId   = String(active.id)
    const newStageId = String(over.id)

    // Optimistic update
    setClientsByStage(prev => {
      const next: Record<string, ClientInPipeline[]> = {}
      for (const [sid, clients] of Object.entries(prev)) {
        next[sid] = clients.filter(c => c.id !== clientId)
      }
      const moved = findClient(clientId)
      if (moved) {
        next[newStageId] = [...(next[newStageId] ?? []), { ...moved, pipeline_stage_id: newStageId }]
      }
      return next
    })

    startTransition(async () => {
      await moveClientStageAction(clientId, newStageId)
    })
  }

  function handleWin(clientId: string) {
    // Optimistic: remove from board immediately
    setClientsByStage(prev => {
      const next: Record<string, ClientInPipeline[]> = {}
      for (const [sid, clients] of Object.entries(prev)) {
        next[sid] = clients.filter(c => c.id !== clientId)
      }
      return next
    })
    startTransition(async () => {
      await winClientAction(clientId)
    })
  }

  function handleLoseConfirm(reason: string | null) {
    if (!lostTarget) return
    const clientId = lostTarget.id
    setIsPending(true)

    // Optimistic: remove from board
    setClientsByStage(prev => {
      const next: Record<string, ClientInPipeline[]> = {}
      for (const [sid, clients] of Object.entries(prev)) {
        next[sid] = clients.filter(c => c.id !== clientId)
      }
      return next
    })
    setLostTarget(null)

    startTransition(async () => {
      await loseClientAction(clientId, reason)
      setIsPending(false)
    })
  }

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map(stage => (
            <StageColumn
              key={stage.id}
              stage={stage}
              clients={clientsByStage[stage.id] ?? []}
              activeClientId={activeClient?.id ?? null}
              onWin={handleWin}
              onLose={setLostTarget}
            />
          ))}
        </div>

        <DragOverlay>
          {activeClient && (
            <ClientCard
              client={activeClient}
              isDragging
              onWin={() => {}}
              onLose={() => {}}
            />
          )}
        </DragOverlay>
      </DndContext>

      {lostTarget && (
        <LostReasonModal
          clientName={`${lostTarget.first_name} ${lostTarget.last_name}`}
          onConfirm={handleLoseConfirm}
          onCancel={() => setLostTarget(null)}
          isPending={isPending}
        />
      )}
    </>
  )
}
