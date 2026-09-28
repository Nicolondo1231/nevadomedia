import { useState } from 'react'
import { SectionHeader } from '../app/AppLayout'
import { Card, Badge, EmptyState } from '../components/primitives'
import { Kanban } from '../components/Kanban'
import { AutoText, AutoNumber, AutoTextarea } from '../components/AutoField'
import { Freshness } from '../components/Freshness'
import { useFreshness } from '../lib/useFreshness'
import { useRows, money, type Row } from '../lib/db'

interface Prospect extends Row {
  prospect_name: string
  trade: string | null
  location: string | null
  monthly_revenue: number | null
  stage: string
  next_step: string | null
  next_step_due: string | null
  probability: number | null
  notes: string | null
}

const STAGES = [
  { id: 'lead', label: 'Lead' },
  { id: 'setting_call', label: 'Setting call' },
  { id: 'sales_call', label: 'Sales call' },
  { id: 'proposal', label: 'Proposal' },
  { id: 'closed', label: 'Closed' },
  { id: 'lost', label: 'Lost' },
]

export function CallsIntel() {
  const pipeline = useRows<Prospect>('sales_pipeline', { order: { column: 'sort_order' } })
  const fathom = useFreshness('fathom')
  const [open, setOpen] = useState<string | null>(null)

  const weighted = pipeline.rows
    .filter((p) => !['closed', 'lost'].includes(p.stage))
    .reduce(
      (s, p) => s + (Number(p.monthly_revenue ?? 0) * Number(p.probability ?? 0)) / 100,
      0,
    )

  return (
    <>
      <SectionHeader
        title="Calls & Intel"
        description="Sales 2026 pipeline, plus call summaries once Fathom is connected."
        meta={<Freshness lastUpdated={fathom?.last_success_at} source="fathom" />}
        actions={
          <button
            onClick={() =>
              pipeline.insert({
                prospect_name: 'New prospect', stage: 'lead',
              } as Partial<Prospect>)
            }
            className="btn-primary px-3 py-1.5 text-sm"
          >
            Add prospect
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
        <span className="text-dim">
          Weighted open pipeline:{' '}
          <span className="tnum text-content font-medium">{money(weighted)}</span>
        </span>
        <Badge>Auto-sync from GoHighLevel · phase 5</Badge>
      </div>

      {pipeline.loading ? (
        <p className="text-dim text-sm">Loading pipeline…</p>
      ) : (
        <Kanban
          cards={pipeline.rows}
          stages={STAGES}
          emptyHint="Nothing here"
          onMove={(id, stage) => pipeline.update(id, { stage })}
          renderCard={(p) => (
            <div
              className="card p-3 cursor-grab active:cursor-grabbing"
              onDoubleClick={() => setOpen(p.id)}
            >
              <div className="text-sm leading-snug">{p.prospect_name}</div>
              <div className="text-dim text-xs mt-1">
                {[p.trade, p.location].filter(Boolean).join(' · ') || '—'}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {p.monthly_revenue != null && <Badge>{money(p.monthly_revenue)}/mo</Badge>}
                {p.probability != null && <Badge>{p.probability}%</Badge>}
              </div>
            </div>
          )}
        />
      )}

      <p className="text-dim text-xs mt-2">
        Drag to change stage. Double-click a card to edit its details.
      </p>

      {open && (
        <ProspectEditor
          prospect={pipeline.rows.find((p) => p.id === open)!}
          onClose={() => setOpen(null)}
          onUpdate={(patch) => pipeline.update(open, patch)}
          onRemove={async () => {
            await pipeline.remove(open)
            setOpen(null)
          }}
        />
      )}

      <div className="mt-8">
        <EmptyState
          title="Call intelligence arrives in phase 8"
          body="Fathom recordings pulled and classified as sales, client or internal, each with its summary and action items."
          phase="Phase 8"
        />
      </div>
    </>
  )
}

function ProspectEditor({
  prospect, onClose, onUpdate, onRemove,
}: {
  prospect: Prospect
  onClose: () => void
  onUpdate: (patch: Partial<Prospect>) => Promise<void>
  onRemove: () => Promise<void>
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <Card className="relative w-full sm:max-w-lg max-h-[85dvh] overflow-y-auto p-5 rounded-b-none sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 mb-4">
          <h2 className="font-semibold">{prospect.prospect_name}</h2>
          <button onClick={onClose} className="text-dim hover:text-content text-sm">Close</button>
        </div>

        <div className="space-y-3">
          <AutoText
            label="Prospect name"
            value={prospect.prospect_name}
            onCommit={(v) => onUpdate({ prospect_name: v })}
          />
          <div className="grid sm:grid-cols-2 gap-3">
            <AutoText label="Trade" value={prospect.trade}
              onCommit={(v) => onUpdate({ trade: v || null })} />
            <AutoText label="Location" value={prospect.location}
              onCommit={(v) => onUpdate({ location: v || null })} />
            <AutoNumber label="Monthly revenue" prefix="$" value={prospect.monthly_revenue}
              onCommit={(v) => onUpdate({ monthly_revenue: v })} />
            <AutoNumber label="Probability %" value={prospect.probability}
              onCommit={(v) => onUpdate({ probability: Math.max(0, Math.min(100, Math.round(v))) })} />
            <AutoText label="Next step" value={prospect.next_step}
              onCommit={(v) => onUpdate({ next_step: v || null })} />
            <AutoText label="Next step due" type="date" value={prospect.next_step_due}
              onCommit={(v) => onUpdate({ next_step_due: v || null })} />
          </div>
          <AutoTextarea label="Notes" value={prospect.notes}
            onCommit={(v) => onUpdate({ notes: v || null })} />

          <button
            onClick={onRemove}
            className="text-xs text-danger hover:underline pt-2"
          >
            Remove prospect
          </button>
        </div>
      </Card>
    </div>
  )
}
