import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

export type Row = { id: string } & Record<string, unknown>

interface UseRowsOptions {
  /** Column list; defaults to everything the role may read. */
  select?: string
  order?: { column: string; ascending?: boolean }
  /** Simple equality filters. */
  eq?: Record<string, string | number | boolean>
  /**
   * Skip the query entirely when false. Used to keep admin-only tables out of
   * an operator's session rather than querying them and discarding the result.
   */
  enabled?: boolean
}

export interface TableState<T> {
  rows: T[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  /** Patch a row: writes through, and keeps the local copy in step. */
  update: (id: string, patch: Partial<T>) => Promise<void>
  insert: (values: Partial<T>) => Promise<T | null>
  remove: (id: string) => Promise<void>
  /** Most recent updated_at across the rows, for the section's freshness line. */
  lastUpdated: string | null
}

/**
 * Thin data layer over one table. Writes are optimistic — the field shows
 * "Saved" the moment the round trip returns, and rolls back on failure so the
 * screen never claims a save that did not happen.
 */
export function useRows<T extends Row>(
  table: string,
  opts: UseRowsOptions = {},
): TableState<T> {
  const [rows, setRows] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { select = '*', order, eq, enabled = true } = opts
  const eqKey = JSON.stringify(eq ?? {})

  const refresh = useCallback(async () => {
    if (!supabase || !enabled) {
      setLoading(false)
      return
    }
    setError(null)
    let q = supabase.from(table).select(select)
    for (const [col, val] of Object.entries(JSON.parse(eqKey) as Record<string, never>)) {
      q = q.eq(col, val)
    }
    if (order) q = q.order(order.column, { ascending: order.ascending ?? true })

    const { data, error } = await q
    if (error) setError(error.message)
    else setRows((data ?? []) as unknown as T[])
    setLoading(false)
  }, [table, select, order?.column, order?.ascending, eqKey, enabled])

  useEffect(() => {
    refresh()
  }, [refresh])

  const update = useCallback(
    async (id: string, patch: Partial<T>) => {
      if (!supabase) throw new Error('Not connected to Supabase.')
      const before = rows
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))
      // Casts: the client is untyped until Supabase codegen runs against the
      // live project, which needs the network this container does not have.
      const { error } = await supabase.from(table).update(patch as never).eq('id', id)
      if (error) {
        setRows(before) // roll back; the field surfaces the error itself
        throw new Error(error.message)
      }
    },
    [table, rows],
  )

  const insert = useCallback(
    async (values: Partial<T>) => {
      if (!supabase) throw new Error('Not connected to Supabase.')
      const { data, error } = await supabase.from(table).insert(values as never).select().single()
      if (error) throw new Error(error.message)
      const row = data as unknown as T
      setRows((rs) => [...rs, row])
      return row
    },
    [table],
  )

  const remove = useCallback(
    async (id: string) => {
      if (!supabase) throw new Error('Not connected to Supabase.')
      const before = rows
      setRows((rs) => rs.filter((r) => r.id !== id))
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) {
        setRows(before)
        throw new Error(error.message)
      }
    },
    [table, rows],
  )

  const lastUpdated = rows.reduce<string | null>((acc, r) => {
    const t = r.updated_at as string | undefined
    if (!t) return acc
    return !acc || t > acc ? t : acc
  }, null)

  return { rows, loading, error, refresh, update, insert, remove, lastUpdated }
}

/** Reads a single app_settings value. Admin-only by RLS. */
export function useSetting<T>(key: string, fallback: T): [T, (v: T) => Promise<void>] {
  const [value, setValue] = useState<T>(fallback)

  useEffect(() => {
    if (!supabase) return
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setValue((data as { value: T }).value)
      })
  }, [key])

  const save = useCallback(
    async (v: T) => {
      setValue(v)
      if (!supabase) return
      await supabase.from('app_settings').upsert({ key, value: v }, { onConflict: 'key' })
    },
    [key],
  )

  return [value, save]
}

export const money = (n: number | null | undefined) =>
  n == null ? '—' : `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`

export const pct = (n: number | null | undefined) =>
  n == null ? '—' : `${Number(n).toFixed(1)}%`

/** Days from today until a date; negative means it has passed. */
export function daysUntil(date: string | null | undefined): number | null {
  if (!date) return null
  const ms = new Date(date + 'T00:00:00').getTime() - new Date().setHours(0, 0, 0, 0)
  return Math.round(ms / 86_400_000)
}
