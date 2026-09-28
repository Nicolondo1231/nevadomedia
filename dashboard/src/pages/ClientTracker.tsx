import { useState } from 'react'
import { SectionHeader } from '../app/AppLayout'
import { Card, Badge, EmptyState } from '../components/primitives'
import { AutoText, AutoTextarea, AutoSelect, AutoNumber, AutoCheckbox } from '../components/AutoField'
import { Icon } from '../components/Icon'
import { useAuth } from '../auth/AuthProvider'
import { useRows, money, daysUntil, type Row } from '../lib/db'

interface ClientOps extends Row {
  name: string
  service: string | null
  contract_start: string | null
  renewal_date: string | null
  last_touchpoint: string | null
  next_action: string | null
  next_action_due: string | null
  goals: string | null
  goal_progress: number
  at_risk: boolean
  notes: string | null
  ball_side: 'nevadomedia' | 'client' | 'waiting'
  location: string | null
  active: boolean
  updated_at: string
}

interface ClientMoney extends Row {
  retainer: number
  payment_status: 'paid' | 'pending' | 'overdue'
  payment_status_override: boolean
}

const BALL = [
  { value: 'nevadomedia' as const, label: 'NevadoMedia' },
  { value: 'client' as const, label: 'Client' },
  { value: 'waiting' as const, label: 'Waiting' },
]

const PAYMENT = [
  { value: 'paid' as const, label: 'Paid' },
  { value: 'pending' as const, label: 'Pending' },
  { value: 'overdue' as const, label: 'Overdue' },
]

export function ClientTracker() {
  const { isAdmin } = useAuth()
  const clients = useRows<ClientOps>('clients_ops', { order: { column: 'name' } })
  // Financial columns live on the base table, which only an admin may read.
  // An operator skips the query outright rather than fetching a stub row.
  const finances = useRows<ClientMoney>('clients', {
    select: 'id, retainer, payment_status, payment_status_override',
    enabled: isAdmin,
  })
  const [showInactive, setShowInactive] = useState(false)

  const visible = clients.rows.filter((c) => showInactive || c.active)

  return (
    <>
      <SectionHeader
        title="Client Tracker"
        description="One card per client. Every field saves when you leave it."
        actions={
          <label className="flex items-center gap-2 text-xs text-dim cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="size-3.5 accent-[var(--color-accent)]"
            />
            Show inactive
          </label>
        }
      />

      {clients.error && (
        <Card className="p-4 mb-4 border-danger/40">
          <p className="text-danger text-sm">{clients.error}</p>
        </Card>
      )}

      {clients.loading ? (
        <p className="text-dim text-sm">Loading clients…</p>
      ) : visible.length === 0 ? (
        <EmptyState
          title="No clients yet"
          body="Run the seed migration, or connect Supabase if this deployment has no database behind it."
        />
      ) : (
        <div className="grid xl:grid-cols-2 gap-4">
          {visible.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              money={finances.rows.find((f) => f.id === client.id)}
              isAdmin={isAdmin}
              onOps={(patch) => clients.update(client.id, patch)}
              onMoney={(patch) => finances.update(client.id, patch)}
            />
          ))}
        </div>
      )}
    </>
  )
}

function ClientCard({
  client, money: fin, isAdmin, onOps, onMoney,
}: {
  client: ClientOps
  money: ClientMoney | undefined
  isAdmin: boolean
  onOps: (patch: Partial<ClientOps>) => Promise<void>
  onMoney: (patch: Partial<ClientMoney>) => Promise<void>
}) {
  const [tab, setTab] = useState<'overview' | 'onboarding' | 'comms'>('overview')
  const renewIn = daysUntil(client.renewal_date)
  const staleContact = daysUntil(client.last_touchpoint)
  const contactOverdue = staleContact != null && staleContact <= -2

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold truncate">{client.name}</h2>
          <p className="text-dim text-xs mt-0.5">
            {[client.service, client.location].filter(Boolean).join(' · ') || '—'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 justify-end">
          {client.at_risk && (
            <Badge tone="danger" icon="alert">At risk</Badge>
          )}
          {contactOverdue && (
            <Badge tone="danger" icon="alert">
              No contact {Math.abs(staleContact!)}d
            </Badge>
          )}
          {isAdmin && fin && (
            <Badge
              tone={
                fin.payment_status === 'paid' ? 'positive'
                  : fin.payment_status === 'overdue' ? 'danger' : 'warning'
              }
              icon={fin.payment_status === 'paid' ? 'check' : 'alert'}
            >
              {fin.payment_status}
            </Badge>
          )}
          {renewIn != null && (
            <Badge tone={renewIn <= 14 ? 'warning' : 'neutral'}>
              Renews in {renewIn}d
            </Badge>
          )}
        </div>
      </div>

      {isAdmin && fin && (
        <div className="tnum mt-3 text-lg font-semibold">
          {money(fin.retainer)}
          <span className="text-dim text-xs font-normal"> /mo</span>
        </div>
      )}

      <div className="flex gap-1 mt-4 border-b border-border">
        {(['overview', 'onboarding', 'comms'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-xs capitalize border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-accent text-content'
                : 'border-transparent text-dim hover:text-content'
            }`}
          >
            {t === 'comms' ? 'Communication' : t}
          </button>
        ))}
      </div>

      <div className="pt-4">
        {tab === 'overview' && (
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <AutoSelect
                label="Ball is with"
                value={client.ball_side}
                options={BALL}
                onCommit={(v) => onOps({ ball_side: v })}
              />
              {isAdmin && fin ? (
                <AutoSelect
                  label="Payment status (manual override)"
                  value={fin.payment_status}
                  options={PAYMENT}
                  onCommit={(v) =>
                    onMoney({ payment_status: v, payment_status_override: true })
                  }
                />
              ) : (
                <div />
              )}
              <AutoText
                label="Contract start"
                type="date"
                value={client.contract_start}
                onCommit={(v) => onOps({ contract_start: v || null })}
              />
              <AutoText
                label="Renewal date"
                type="date"
                value={client.renewal_date}
                onCommit={(v) => onOps({ renewal_date: v || null })}
              />
              <AutoText
                label="Last touchpoint"
                type="date"
                value={client.last_touchpoint}
                onCommit={(v) => onOps({ last_touchpoint: v || null })}
              />
              <AutoText
                label="Next action due"
                type="date"
                value={client.next_action_due}
                onCommit={(v) => onOps({ next_action_due: v || null })}
              />
            </div>

            <AutoText
              label="Next action"
              value={client.next_action}
              placeholder="What happens next?"
              onCommit={(v) => onOps({ next_action: v || null })}
            />

            <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
              <AutoText
                label="Goals"
                value={client.goals}
                placeholder="What are we aiming at?"
                onCommit={(v) => onOps({ goals: v || null })}
              />
              <AutoNumber
                label="Progress %"
                value={client.goal_progress}
                onCommit={(v) =>
                  onOps({ goal_progress: Math.max(0, Math.min(100, Math.round(v))) })
                }
              />
            </div>
            <ProgressBar value={client.goal_progress} />

            <AutoTextarea
              label="Notes"
              value={client.notes}
              placeholder="Anything worth remembering."
              onCommit={(v) => onOps({ notes: v || null })}
            />

            <div className="flex flex-wrap gap-4 pt-1">
              <AutoCheckbox
                label="Flag at risk"
                checked={client.at_risk}
                onCommit={(v) => onOps({ at_risk: v })}
              />
              <AutoCheckbox
                label="Active client"
                checked={client.active}
                onCommit={(v) => onOps({ active: v })}
              />
            </div>

            <div className="pt-2 flex flex-wrap gap-2">
              <Badge>Ad snapshot · phase 4</Badge>
              <Badge>Content snapshot · phase 6</Badge>
              <Badge>Bi-weekly report · phase 12</Badge>
            </div>
          </div>
        )}

        {tab === 'onboarding' && <OnboardingList clientId={client.id} />}
        {tab === 'comms' && <CommsLog clientId={client.id} />}
      </div>
    </Card>
  )
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div
      className="h-1.5 rounded-full bg-surface-2 overflow-hidden"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-300"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  )
}

interface ChecklistItem extends Row {
  item: string
  owner: string | null
  completed: boolean
  due_date: string | null
  sort_order: number
}

function OnboardingList({ clientId }: { clientId: string }) {
  const list = useRows<ChecklistItem>('onboarding_checklist', {
    eq: { client_id: clientId },
    order: { column: 'sort_order' },
  })
  const [newItem, setNewItem] = useState('')

  const done = list.rows.filter((r) => r.completed).length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-dim">
          {done} of {list.rows.length} complete
        </span>
      </div>

      <div className="space-y-2">
        {list.rows.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-2">
            <AutoCheckbox
              label={
                <>
                  {item.item}
                  {item.owner && <span className="text-dim text-xs ml-1.5">({item.owner})</span>}
                </>
              }
              checked={item.completed}
              strikeWhenChecked
              onCommit={(v) => list.update(item.id, { completed: v })}
            />
          </div>
        ))}
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (!newItem.trim()) return
          await list.insert({
            client_id: clientId,
            item: newItem.trim(),
            sort_order: list.rows.length + 1,
          } as Partial<ChecklistItem>)
          setNewItem('')
        }}
        className="flex gap-2 pt-1"
      >
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Add a checklist item"
          className="field flex-1 px-2.5 py-1.5 text-sm"
        />
        <button type="submit" className="btn-primary px-3 text-sm">Add</button>
      </form>
    </div>
  )
}

interface CommEntry extends Row {
  date: string
  summary: string
  next_followup_date: string | null
}

function CommsLog({ clientId }: { clientId: string }) {
  const log = useRows<CommEntry>('client_communication_log', {
    eq: { client_id: clientId },
    order: { column: 'date', ascending: false },
  })
  const [draft, setDraft] = useState('')

  return (
    <div className="space-y-3">
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (!draft.trim()) return
          await log.insert({ client_id: clientId, summary: draft.trim() } as Partial<CommEntry>)
          setDraft('')
        }}
        className="flex gap-2"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="What was discussed?"
          className="field flex-1 px-2.5 py-1.5 text-sm"
        />
        <button type="submit" className="btn-primary px-3 text-sm">Log</button>
      </form>

      {log.rows.length === 0 ? (
        <p className="text-dim text-sm">Nothing logged yet.</p>
      ) : (
        <div className="space-y-3">
          {log.rows.map((entry) => (
            <div key={entry.id} className="border-l-2 border-border pl-3">
              <div className="flex items-center gap-2 text-xs text-dim">
                <Icon name="calls" size={12} />
                {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })}
              </div>
              <AutoTextarea
                value={entry.summary}
                rows={2}
                onCommit={(v) => log.update(entry.id, { summary: v })}
              />
              <div className="mt-1.5">
                <AutoText
                  label="Next follow-up"
                  type="date"
                  value={entry.next_followup_date}
                  onCommit={(v) => log.update(entry.id, { next_followup_date: v || null })}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
