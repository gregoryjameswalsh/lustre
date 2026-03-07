'use client'

// src/app/dashboard/pipeline/_components/KanbanBoard.tsx
// Drag-and-drop Kanban board. Calls moveDealAction on drop.

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core'
import { useState, useOptimistic, useTransition } from 'react'
import Link from 'next/link'
import { moveDealAction } from '@/lib/actions/pipeline'
import type { PipelineStage, DealWithRelations } from '@/lib/types'

// ---------------------------------------------------------------------------
// Deal card
// ---------------------------------------------------------------------------

function DealCard({
  deal,
  isDragging = false,
}: {
  deal: DealWithRelations
  isDragging?: boolean
}) {
  const client = deal.clients
  const stage  = deal.pipeline_stages

  return (
    <div
      className={`rounded-lg border bg-white p-3 shadow-sm transition-shadow ${
        isDragging
          ? 'rotate-1 shadow-lg border-zinc-300 opacity-90'
          : 'border-zinc-200 hover:shadow-md'
      }`}
    >
      <Link href={`/dashboard/pipeline/${deal.id}`} className="block">
        <p className="text-sm font-medium text-zinc-900 leading-snug line-clamp-2">{deal.title}</p>
        {client && (
          <p className="mt-1 text-xs text-zinc-400">
            {client.first_name} {client.last_name}
          </p>
        )}
        {deal.value != null && (
          <p className="mt-1.5 text-xs font-medium text-zinc-700">
            {new Intl.NumberFormat('en-GB', { style: 'currency', currency: deal.currency }).format(deal.value)}
          </p>
        )}
        {deal.expected_close && (
          <p className="mt-1 text-[10px] text-zinc-400">
            Close {new Date(deal.expected_close).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </p>
        )}
      </Link>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stage column (droppable)
// ---------------------------------------------------------------------------

function StageColumn({
  stage,
  deals,
  activeDealId,
}: {
  stage:       PipelineStage
  deals:       DealWithRelations[]
  activeDealId: string | null
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })

  const total = deals
    .filter(d => d.value != null)
    .reduce((sum, d) => sum + (d.value ?? 0), 0)

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
            {deals.length}
          </span>
        </div>
        {total > 0 && (
          <span className="text-[10px] font-medium text-zinc-400">
            {new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(total)}
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
          {deals.map(deal => (
            <DraggableDealCard
              key={deal.id}
              deal={deal}
              isActive={deal.id === activeDealId}
            />
          ))}
        </div>

        {deals.length === 0 && (
          <p className="mt-4 text-center text-xs text-zinc-300">No deals</p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Draggable deal card wrapper (uses pointer events, not drag API natively)
// ---------------------------------------------------------------------------

import { useDraggable } from '@dnd-kit/core'

function DraggableDealCard({
  deal,
  isActive,
}: {
  deal:     DealWithRelations
  isActive: boolean
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: deal.id })

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
      <DealCard deal={deal} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main board
// ---------------------------------------------------------------------------

export default function KanbanBoard({
  stages,
  initialDealsByStage,
}: {
  stages:              PipelineStage[]
  initialDealsByStage: Record<string, DealWithRelations[]>
}) {
  const [activeDeal, setActiveDeal]   = useState<DealWithRelations | null>(null)
  const [dealsByStage, setDealsByStage] = useState(initialDealsByStage)
  const [, startTransition]           = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  function findDeal(id: string): DealWithRelations | null {
    for (const deals of Object.values(dealsByStage)) {
      const found = deals.find(d => d.id === id)
      if (found) return found
    }
    return null
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveDeal(findDeal(String(event.active.id)))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveDeal(null)

    if (!over || active.id === over.id) return

    const dealId   = String(active.id)
    const newStageId = String(over.id)

    // Optimistic UI update
    setDealsByStage(prev => {
      const next: Record<string, DealWithRelations[]> = {}
      for (const [sid, deals] of Object.entries(prev)) {
        next[sid] = deals.filter(d => d.id !== dealId)
      }
      const movedDeal = findDeal(dealId)
      if (movedDeal) {
        next[newStageId] = [...(next[newStageId] ?? []), { ...movedDeal, stage_id: newStageId }]
      }
      return next
    })

    // Persist
    startTransition(async () => {
      await moveDealAction(dealId, newStageId)
    })
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map(stage => (
          <StageColumn
            key={stage.id}
            stage={stage}
            deals={dealsByStage[stage.id] ?? []}
            activeDealId={activeDeal?.id ?? null}
          />
        ))}
      </div>

      <DragOverlay>
        {activeDeal && <DealCard deal={activeDeal} isDragging />}
      </DragOverlay>
    </DndContext>
  )
}
