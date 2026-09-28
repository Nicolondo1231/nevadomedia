import { useState } from 'react'
import { SectionHeader } from '../app/AppLayout'
import { Card, Badge } from '../components/primitives'
import { AutoText, AutoNumber, AutoSelect } from '../components/AutoField'
import { useRows, money, daysUntil, type Row } from '../lib/db'

interface Assignment extends Row {
  assignee: string
  task: string
  client_id: string | null
  sent_date: string | null
  due_date: string | null
  delivered_date: string | null
  status: 'pending' | 'in_progress' | 'delivered' | 'overdue'
  payment_amount: number | null
  payment_status: 'paid' | 'pending' | 'overdue' | null
  updated_at: string
}

interface ClientLite extends Row { name: string }

const STATUS = [
  { value: 'pending' as const, label: 'Pending' },
  { value: 'in_progress' as const, label: 'In progress' },
  { value: 'delivered' as const, label: 'Delivered' },
  { value: 'overdue' as const, label: 'Overdue' },
]

const PAYMENT = [
  { value: 'pending' as const, label: 'Pending' },
  { value: 'paid' as const, label: 'Paid' },
  { value: 'overdue' as const, label: 'Overdue' },
]

export function Team() {
  const items = useRows<Assignment>('team_assignments', {
    order: { column: 'due_date' },
  })
  const clients = useRows<ClientLite>('clients_ops', { select: 'id, name', order: { column: 'name' } })
  const [assignee, setAssignee] = useState('')

  const people = Array.from(new Set(items.rows.map((i) => i.assignee))).sort()
  const visible = assignee ? items.rows.filter((i) => i.assignee === assignee) : items.rows

  return (
    <>
      <SectionHeader
        title="Team"
        description="Assignments, deadlines, delivery and payment. Overdue work is flagged."
        actions={
          <div className="flex items-center gap-2">
            <select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="field px-2.5 py-1.5 text-sm"
              aria-label="Filter by assignee"
            >
              <option value="">Everyone</option>
              {people.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <button
              onClick={() =>
                items.insert({
                  assignee: 'Editor', task: 'New task', status: 'pending',
                } as Partial<Assignment>)
              }
              className="btn-primary px-3 py-1.5 text-sm"
            >
              Add assignment
            </button>
          </div>
        }
      />

      {items.loading ? (
        <p className="text-dim text-sm">Loading…</p>
      ) : visible.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-dim text-sm">No assignments yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((item) => {
            const late = daysUntil(item.due_date)
            const isOverdue =
              item.status !== 'delivered' && late != null && late < 0
            return (
              <Card key={item.id} className={`p-4 ${isOverdue ? 'border-danger/50' : ''}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge>{item.assignee}</Badge>
                    {isOverdue && (
                      <Badge tone="danger" icon="alert">
                        Overdue by {Math.abs(late!)}d
                      </Badge>
                    )}
                    {item.payment_status === 'paid' && (
                      <Badge tone="positive" icon="check">Paid</Badge>
                    )}
                  </div>
                  <button
                    onClick={() => items.remove(item.id)}
                    className="text-dim hover:text-danger text-xs shrink-0"
                    aria-label="Remove assignment"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <AutoText
                      label="Task"
                      value={item.task}
                      onCommit={(v) => items.update(item.id, { task: v })}
                    />
                  </div>
                  <AutoText
                    label="Assignee"
                    value={item.assignee}
                    onCommit={(v) => items.update(item.id, { assignee: v })}
                  />
                  <label className="block">
                    <span className="text-xs text-dim">Client</span>
                    <select
                      value={item.client_id ?? ''}
                      onChange={(e) =>
                        items.update(item.id, { client_id: e.target.value || null })
                      }
                      className="field w-full mt-1 px-2.5 py-1.5 text-sm"
                    >
                      <option value="">—</option>
                      {clients.rows.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </label>
                  <AutoText
                    label="Sent"
                    type="date"
                    value={item.sent_date}
                    onCommit={(v) => items.update(item.id, { sent_date: v || null })}
                  />
                  <AutoText
                    label="Due"
                    type="date"
                    value={item.due_date}
                    onCommit={(v) => items.update(item.id, { due_date: v || null })}
                  />
                  <AutoText
                    label="Delivered"
                    type="date"
                    value={item.delivered_date}
                    onCommit={(v) => items.update(item.id, { delivered_date: v || null })}
                  />
                  <AutoSelect
                    label="Status"
                    value={item.status}
                    options={STATUS}
                    onCommit={(v) => items.update(item.id, { status: v })}
                  />
                  <AutoNumber
                    label="Payment"
                    prefix="$"
                    value={item.payment_amount}
                    onCommit={(v) => items.update(item.id, { payment_amount: v })}
                  />
                  <AutoSelect
                    label="Payment status"
                    value={item.payment_status ?? 'pending'}
                    options={PAYMENT}
                    onCommit={(v) => items.update(item.id, { payment_status: v })}
                  />
                </div>
              </Card>
            )
          })}
          <p className="text-dim text-xs">
            Total outstanding:{' '}
            {money(
              visible
                .filter((i) => i.payment_status !== 'paid')
                .reduce((s, i) => s + Number(i.payment_amount ?? 0), 0),
            )}
          </p>
        </div>
      )}
    </>
  )
}
