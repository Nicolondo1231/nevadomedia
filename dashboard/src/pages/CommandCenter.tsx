import { useEffect, useState } from 'react'
import { SectionHeader } from '../app/AppLayout'
import { StatTile, Card, EmptyState, Badge } from '../components/primitives'
import { useAuth } from '../auth/AuthProvider'
import { supabase, isConfigured } from '../lib/supabase'

interface Snapshot {
  activeClients: number
  openActions: number
  leadsThisWeek: number
  loading: boolean
  /** False when Supabase is not wired up — the tiles must then say "unknown",
      never a confident zero. */
  connected: boolean
}

function useSnapshot(): Snapshot {
  const [snap, setSnap] = useState<Snapshot>({
    activeClients: 0,
    openActions: 0,
    leadsThisWeek: 0,
    loading: true,
    connected: isConfigured,
  })

  useEffect(() => {
    if (!supabase) {
      setSnap((s) => ({ ...s, loading: false }))
      return
    }
    let cancelled = false
    const db = supabase
    const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()

    Promise.all([
      db.from('clients_ops').select('id', { count: 'exact', head: true }).eq('active', true),
      db.from('onboarding_checklist').select('id', { count: 'exact', head: true }).eq('completed', false),
      db.from('lead_response_log').select('id', { count: 'exact', head: true }).gte('received_at', weekAgo),
    ]).then(([clients, actions, leads]) => {
      if (cancelled) return
      setSnap({
        activeClients: clients.count ?? 0,
        openActions: actions.count ?? 0,
        leadsThisWeek: leads.count ?? 0,
        loading: false,
        connected: true,
      })
    })
    return () => {
      cancelled = true
    }
  }, [])

  return snap
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function CommandCenter() {
  const { profile, session, isAdmin } = useAuth()
  const snap = useSnapshot()
  const name = profile?.full_name ?? session?.user?.email?.split('@')[0] ?? 'there'

  return (
    <>
      <SectionHeader
        title={`${greeting()}, ${name}.`}
        description={new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
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
          value={snap.connected ? snap.activeClients : '—'}
          loading={snap.loading}
          sublabel={snap.connected ? undefined : <Badge tone="warning" icon="alert">Not connected</Badge>}
        />
        <StatTile
          label="Open Action Items"
          value={snap.connected ? snap.openActions : '—'}
          loading={snap.loading}
          sublabel={
            snap.connected
              ? 'Onboarding items not yet done'
              : <Badge tone="warning" icon="alert">Not connected</Badge>
          }
        />
        <StatTile
          label="Leads This Week"
          value={snap.connected ? snap.leadsThisWeek : '—'}
          loading={snap.loading}
          sublabel={snap.connected ? undefined : <Badge tone="warning" icon="alert">Not connected</Badge>}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <Card className="p-5">
          <h2 className="font-medium mb-1">Today's schedule</h2>
          <p className="text-dim text-sm">Google Calendar events appear here.</p>
          <div className="mt-3">
            <Badge>Phase 9</Badge>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-medium mb-1">Lead response tracker</h2>
          <p className="text-dim text-sm">
            Logs when a lead arrived and when it was first contacted, and flags
            anything over 15 minutes.
          </p>
          <div className="mt-3">
            <Badge>Phase 3 · live from GHL in phase 5</Badge>
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <EmptyState
          title="Ball status and at-risk alerts"
          body="Per-client ball status (NevadoMedia / Client / Waiting), at-risk badges and the quick actions land with the Client Tracker."
          phase="Phase 3"
        />
      </div>
    </>
  )
}
