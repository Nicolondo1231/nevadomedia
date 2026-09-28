import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export interface NotificationCounts {
  atRisk: number
  overdue: number
  slowLeads: number
}

const ZERO: NotificationCounts = { atRisk: 0, overdue: 0, slowLeads: 0 }

/**
 * Sidebar badge counters. Every query is a head-only count, so this stays cheap
 * enough to poll. Anything the signed-in role cannot read comes back 0 rather
 * than erroring — RLS filters rows, it does not throw.
 */
export function useNotifications(pollMs = 120_000): NotificationCounts {
  const [counts, setCounts] = useState<NotificationCounts>(ZERO)

  useEffect(() => {
    if (!supabase) return
    let cancelled = false

    async function load() {
      const db = supabase!
      const today = new Date().toISOString().slice(0, 10)
      const cutoff = new Date(Date.now() - 15 * 60_000).toISOString()

      const [atRisk, overdue, contactedLate, stillWaiting] = await Promise.all([
        db.from('clients_ops').select('id', { count: 'exact', head: true })
          .eq('at_risk', true).eq('active', true),
        db.from('team_assignments').select('id', { count: 'exact', head: true })
          .lt('due_date', today).neq('status', 'delivered'),
        // Contacted, but took longer than the 15-minute target.
        db.from('lead_response_log').select('id', { count: 'exact', head: true })
          .gt('response_time_minutes', 15),
        // Never contacted and already past the target — the urgent case.
        db.from('lead_response_log').select('id', { count: 'exact', head: true })
          .is('first_contacted_at', null).lt('received_at', cutoff),
      ])

      if (cancelled) return
      setCounts({
        atRisk: atRisk.count ?? 0,
        overdue: overdue.count ?? 0,
        slowLeads: (contactedLate.count ?? 0) + (stillWaiting.count ?? 0),
      })
    }

    load()
    const timer = setInterval(load, pollMs)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [pollMs])

  return counts
}
