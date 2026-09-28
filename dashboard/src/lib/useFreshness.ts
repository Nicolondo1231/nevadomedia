import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export interface FreshnessRow {
  source: string
  last_success_at: string | null
  is_stale: boolean
}

/** Reads the sync_freshness view, which the VPS worker populates from phase 4 on. */
export function useFreshness(source: string): FreshnessRow | null {
  const [row, setRow] = useState<FreshnessRow | null>(null)

  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    supabase
      .from('sync_freshness')
      .select('source, last_success_at, is_stale')
      .eq('source', source)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setRow((data as FreshnessRow) ?? null)
      })
    return () => {
      cancelled = true
    }
  }, [source])

  return row
}
