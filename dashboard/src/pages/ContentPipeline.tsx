import { useMemo, useState } from 'react'
import { SectionHeader } from '../app/AppLayout'
import { Card, Badge } from '../components/primitives'
import { Kanban } from '../components/Kanban'
import { useRows, type Row } from '../lib/db'

interface ContentCard extends Row {
  client_id: string
  title: string
  format: string | null
  stage: string
  assigned_to: string | null
  due_date: string | null
}

interface ClientLite extends Row {
  name: string
}

const STAGES = [
  { id: 'scripted', label: 'Scripted' },
  { id: 'shot', label: 'Shot' },
  { id: 'edited', label: 'Edited' },
  { id: 'approved', label: 'Approved' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'posted', label: 'Posted' },
]

/** Validated categorical slots, assigned per client in fixed order. */
const CLIENT_COLORS = [
  'var(--color-series-1)',
  'var(--color-series-2)',
  'var(--color-series-3)',
  'var(--color-series-4)',
]

export function ContentPipeline() {
  const cards = useRows<ContentCard>('content_pipeline', { order: { column: 'sort_order' } })
  const clients = useRows<ClientLite>('clients_ops', {
    select: 'id, name',
    order: { column: 'name' },
  })
  const [filterClient, setFilterClient] = useState('')
  const [adding, setAdding] = useState(false)

  // Colour follows the client, never its position in a filtered list — so
  // filtering never repaints the survivors. A fifth client onward is grey
  // rather than a generated hue.
  const colorFor = useMemo(() => {
    const map = new Map<string, string>()
    clients.rows.forEach((c, i) => {
      map.set(c.id, i < CLIENT_COLORS.length ? CLIENT_COLORS[i] : 'var(--color-dim)')
    })
    return map
  }, [clients.rows])

  const nameFor = useMemo(
    () => new Map(clients.rows.map((c) => [c.id, c.name])),
    [clients.rows],
  )

  const visible = filterClient
    ? cards.rows.filter((c) => c.client_id === filterClient)
    : cards.rows

  return (
    <>
      <SectionHeader
        title="Content Pipeline"
        description="Drag a card to move it between stages."
        actions={
          <div className="flex items-center gap-2">
            <select
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              className="field px-2.5 py-1.5 text-sm"
              aria-label="Filter by client"
            >
              <option value="">All clients</option>
              {clients.rows.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button onClick={() => setAdding(true)} className="btn-primary px-3 py-1.5 text-sm">
              Add card
            </button>
          </div>
        }
      />

      {adding && (
        <NewCardForm
          clients={clients.rows}
          onCancel={() => setAdding(false)}
          onCreate={async (values) => {
            await cards.insert(values as Partial<ContentCard>)
            setAdding(false)
          }}
        />
      )}

      {cards.loading ? (
        <p className="text-dim text-sm">Loading pipeline…</p>
      ) : (
        <Kanban
          cards={visible}
          stages={STAGES}
          emptyHint="Nothing here"
          onMove={(id, stage) => cards.update(id, { stage })}
          renderCard={(card) => (
            <div className="card p-3 cursor-grab active:cursor-grabbing">
              <div className="flex items-start gap-2">
                <span
                  className="mt-1 size-2 rounded-full shrink-0"
                  style={{ background: colorFor.get(card.client_id) ?? 'var(--color-dim)' }}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <div className="text-sm leading-snug">{card.title}</div>
                  {/* The client is named, not just coloured — identity is never
                      carried by colour alone. */}
                  <div className="text-dim text-xs mt-1 truncate">
                    {nameFor.get(card.client_id) ?? 'Unassigned'}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {card.format && <Badge>{card.format}</Badge>}
                {card.assigned_to && <Badge>{card.assigned_to}</Badge>}
                {card.due_date && (
                  <Badge tone={new Date(card.due_date) < new Date() ? 'danger' : 'neutral'}>
                    {new Date(card.due_date + 'T00:00:00').toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric',
                    })}
                  </Badge>
                )}
              </div>
            </div>
          )}
        />
      )}
    </>
  )
}

function NewCardForm({
  clients, onCreate, onCancel,
}: {
  clients: ClientLite[]
  onCreate: (values: Record<string, unknown>) => Promise<void>
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const [clientId, setClientId] = useState(clients[0]?.id ?? '')
  const [format, setFormat] = useState('')
  const [assignee, setAssignee] = useState('')
  const [due, setDue] = useState('')

  return (
    <Card className="p-4 mb-4">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!title.trim() || !clientId) return
          onCreate({
            title: title.trim(),
            client_id: clientId,
            format: format || null,
            assigned_to: assignee || null,
            due_date: due || null,
            stage: 'scripted',
          })
        }}
        className="grid sm:grid-cols-5 gap-2 items-end"
      >
        <label className="block sm:col-span-2">
          <span className="text-xs text-dim">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="field w-full mt-1 px-2.5 py-1.5 text-sm"
            placeholder="Before / after reel"
            autoFocus
          />
        </label>
        <label className="block">
          <span className="text-xs text-dim">Client</span>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="field w-full mt-1 px-2.5 py-1.5 text-sm"
          >
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-dim">Format</span>
          <input
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="field w-full mt-1 px-2.5 py-1.5 text-sm"
            placeholder="Reel"
          />
        </label>
        <label className="block">
          <span className="text-xs text-dim">Due</span>
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="field w-full mt-1 px-2.5 py-1.5 text-sm"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs text-dim">Assigned to</span>
          <input
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            className="field w-full mt-1 px-2.5 py-1.5 text-sm"
            placeholder="Editor"
          />
        </label>
        <div className="flex gap-2 sm:col-span-3">
          <button type="submit" className="btn-primary px-4 py-1.5 text-sm">Create</button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-1.5 text-sm text-dim hover:text-content"
          >
            Cancel
          </button>
        </div>
      </form>
    </Card>
  )
}
