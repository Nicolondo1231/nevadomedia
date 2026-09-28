import { useState } from 'react'
import { SectionHeader } from '../app/AppLayout'
import { StatTile, Card, Badge } from '../components/primitives'
import { AutoSelect } from '../components/AutoField'
import { useAuth } from '../auth/AuthProvider'
import { isConfigured } from '../lib/supabase'
import { useRows, money, type Row } from '../lib/db'

interface ClientOps extends Row {
  name: string
  at_risk: boolean
  ball_side: 'nevadomedia' | 'client' | 'waiting'
  next_action: string | null
  active: boolean
}

interface ClientMoney extends Row { retainer: number; active: boolean }

interface Lead extends Row {
  lead_name: string
  lead_source: string | null
  received_at: string
  first_contacted_at: string | null
  response_time_minutes: number | null
}

interface ChecklistItem extends Row { completed: boolean }

const BALL = [
  { value: 'nevadomedia' as const, label: 'NevadoMedia' },
  { value: 'client' as const, label: 'Client' },
  { value: 'waiting' as const, label: 'Waiting' },
]

/** The response-time target. Anything past this is flagged red. */
const SLA_MINUTES = 15

function greeting(): string {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export function CommandCenter() {
  const { profile, session, isAdmin } = useAuth()
  const clients = useRows<ClientOps>('clients_ops', {
    select: 'id, name, at_risk, ball_side, next_action, active',
    order: { column: 'name' },
  })
  const finances = useRows<ClientMoney>('clients', {
    select: 'id, retainer, active',
    enabled: isAdmin,
  })
  const checklist = useRows<ChecklistItem>('onboarding_checklist', { select: 'id, completed' })
  const leads = useRows<Lead>('lead_response_log', {
    order: { column: 'received_at', ascending: false },
  })

  const name = profile?.full_name ?? session?.user?.email?.split('@')[0] ?? 'there'
  const active = clients.rows.filter((c) => c.active)
  const atRisk = active.filter((c) => c.at_risk)
  const openActions = checklist.rows.filter((c) => !c.completed).length

  const weekAgo = Date.now() - 7 * 86_400_000
  const leadsThisWeek = leads.rows.filter((l) => new Date(l.received_at).getTime() >= weekAgo)

  const contracted = isAdmin
    ? finances.rows.filter((f) => f.active).reduce((s, f) => s + Number(f.retainer ?? 0), 0)
    : 0

  return (
    <>
      <SectionHeader
        title={`${greeting()}, ${name}.`}
        description={new Date().toLocaleDateString('en-US', {
          weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
        })}
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {isAdmin && (
          <StatTile
            label="MRR Collected"
            value="—"
            sublabel={<Badge>Stripe · phase 7</Badge>}
          />
        )}
        <StatTile
          label="Active Clients"
          value={isConfigured ? active.length : '—'}
          loading={clients.loading}
          sublabel={
            !isConfigured
              ? <Badge tone="warning" icon="alert">Not connected</Badge>
              : isAdmin ? `${money(contracted)} contracted` : undefined
          }
        />
        <StatTile
          label="Open Action Items"
          value={isConfigured ? openActions : '—'}
          loading={checklist.loading}
          sublabel={
            !isConfigured
              ? <Badge tone="warning" icon="alert">Not connected</Badge>
              : 'Onboarding items not yet done'
          }
        />
        <StatTile
          label="Leads This Week"
          value={isConfigured ? leadsThisWeek.length : '—'}
          loading={leads.loading}
          sublabel={
            !isConfigured
              ? <Badge tone="warning" icon="alert">Not connected</Badge>
              : undefined
          }
        />
      </div>

      {atRisk.length > 0 && (
        <Card className="p-4 mt-4 border-danger/50">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge tone="danger" icon="alert">
              {atRisk.length} client{atRisk.length > 1 ? 's' : ''} at risk
            </Badge>
            <span className="text-sm text-dim">{atRisk.map((c) => c.name).join(' · ')}</span>
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <Card className="p-5">
          <h2 className="font-medium mb-1">Today's schedule</h2>
          <p className="text-dim text-sm">Google Calendar events appear here.</p>
          <div className="mt-3"><Badge>Phase 9</Badge></div>
        </Card>

        <Card className="p-5">
          <h2 className="font-medium mb-3">Ball status</h2>
          {clients.loading ? (
            <p className="text-dim text-sm">Loading…</p>
          ) : active.length === 0 ? (
            <p className="text-dim text-sm">No active clients.</p>
          ) : (
            <div className="space-y-2.5">
              {active.map((c) => (
                <div key={c.id} className="grid grid-cols-[1fr_auto] gap-3 items-center">
                  <div className="min-w-0">
                    <div className="text-sm truncate">{c.name}</div>
                    {c.next_action && (
                      <div className="text-dim text-xs truncate">{c.next_action}</div>
                    )}
                  </div>
                  <div className="w-36">
                    <AutoSelect
                      value={c.ball_side}
                      options={BALL}
                      onCommit={(v) => clients.update(c.id, { ball_side: v })}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <LeadResponseTracker leads={leads} />
    </>
  )
}

function LeadResponseTracker({
  leads,
}: {
  leads: ReturnType<typeof useRows<Lead>>
}) {
  const [name, setName] = useState('')
  const [source, setSource] = useState('')

  const recent = leads.rows.slice(0, 8)

  /** Minutes a still-uncontacted lead has been waiting. */
  function waitingMinutes(lead: Lead): number {
    return Math.floor((Date.now() - new Date(lead.received_at).getTime()) / 60_000)
  }

  return (
    <Card className="p-5 mt-4">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div>
          <h2 className="font-medium">Lead response tracker</h2>
          <p className="text-dim text-sm">
            Anything past {SLA_MINUTES} minutes without first contact is flagged.
          </p>
        </div>
        <Badge>Auto-populates from GHL · phase 5</Badge>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (!name.trim()) return
          await leads.insert({
            lead_name: name.trim(),
            lead_source: source.trim() || null,
            received_at: new Date().toISOString(),
          } as Partial<Lead>)
          setName('')
          setSource('')
        }}
        className="flex flex-wrap gap-2 mb-4"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Lead name"
          className="field flex-1 min-w-40 px-2.5 py-1.5 text-sm"
        />
        <input
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="Source"
          className="field w-32 px-2.5 py-1.5 text-sm"
        />
        <button type="submit" className="btn-primary px-3 py-1.5 text-sm">
          Log lead
        </button>
      </form>

      {recent.length === 0 ? (
        <p className="text-dim text-sm">No leads logged yet.</p>
      ) : (
        <div className="space-y-2">
          {recent.map((lead) => {
            const contacted = lead.first_contacted_at != null
            const minutes = contacted ? lead.response_time_minutes ?? 0 : waitingMinutes(lead)
            const breached = minutes > SLA_MINUTES
            return (
              <div
                key={lead.id}
                className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0"
              >
                <div className="min-w-0">
                  <div className="text-sm truncate">{lead.lead_name}</div>
                  <div className="text-dim text-xs">
                    {lead.lead_source ?? 'Unknown source'} ·{' '}
                    {new Date(lead.received_at).toLocaleString('en-US', {
                      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    tone={breached ? 'danger' : contacted ? 'positive' : 'neutral'}
                    icon={breached ? 'alert' : contacted ? 'check' : undefined}
                  >
                    {contacted ? `${minutes} min` : `waiting ${minutes} min`}
                  </Badge>
                  {!contacted && (
                    <button
                      onClick={() =>
                        leads.update(lead.id, {
                          first_contacted_at: new Date().toISOString(),
                        })
                      }
                      className="btn-primary px-2.5 py-1 text-xs"
                    >
                      Mark contacted
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
