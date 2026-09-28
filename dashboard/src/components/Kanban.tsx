import { useState, type ReactNode } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor,
  useSensor, useSensors, closestCorners,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy, sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export interface KanbanCard {
  id: string
  stage: string
}

/**
 * Generic board. The caller owns the data and persists the move; this only
 * reports "card X landed in stage Y".
 *
 * Pointer dragging needs a small activation distance or a plain click on a card
 * registers as a drag and swallows the click.
 */
export function Kanban<T extends KanbanCard>({
  cards, stages, renderCard, onMove, emptyHint,
}: {
  cards: T[]
  stages: { id: string; label: string }[]
  renderCard: (card: T) => ReactNode
  onMove: (cardId: string, toStage: string) => Promise<void>
  emptyHint?: string
}) {
  const [dragging, setDragging] = useState<T | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function onDragStart(e: DragStartEvent) {
    setDragging(cards.find((c) => c.id === e.active.id) ?? null)
  }

  async function onDragEnd(e: DragEndEvent) {
    setDragging(null)
    const { active, over } = e
    if (!over) return

    // `over` is either a column (droppable id = stage) or another card.
    const overCard = cards.find((c) => c.id === over.id)
    const toStage = overCard ? overCard.stage : String(over.id)
    const card = cards.find((c) => c.id === active.id)
    if (!card || !stages.some((s) => s.id === toStage) || card.stage === toStage) return

    await onMove(card.id, toStage)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1">
        {stages.map((stage) => (
          <Column
            key={stage.id}
            id={stage.id}
            label={stage.label}
            cards={cards.filter((c) => c.stage === stage.id)}
            renderCard={renderCard}
            emptyHint={emptyHint}
          />
        ))}
      </div>

      <DragOverlay>
        {dragging && (
          <div className="opacity-90 rotate-2">{renderCard(dragging)}</div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

function Column<T extends KanbanCard>({
  id, label, cards, renderCard, emptyHint,
}: {
  id: string
  label: string
  cards: T[]
  renderCard: (card: T) => ReactNode
  emptyHint?: string
}) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div className="w-64 shrink-0">
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-xs font-medium uppercase tracking-wide text-dim">{label}</span>
        <span className="tnum text-xs text-dim">{cards.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`min-h-32 rounded-xl p-2 space-y-2 border transition-colors ${
          isOver ? 'border-accent bg-surface-2/60' : 'border-border bg-surface/40'
        }`}
      >
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <SortableCard key={card.id} id={card.id}>
              {renderCard(card)}
            </SortableCard>
          ))}
        </SortableContext>
        {cards.length === 0 && emptyHint && (
          <p className="text-dim text-xs text-center py-4">{emptyHint}</p>
        )}
      </div>
    </div>
  )
}

function SortableCard({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'opacity-40' : ''}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  )
}
