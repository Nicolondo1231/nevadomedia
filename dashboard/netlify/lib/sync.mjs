/**
 * Meta sync shared by the scheduled function and the on-demand refresh.
 * Writes with the Supabase service role key, which exists only in the Netlify
 * function environment and never in the browser bundle.
 */
import { createClient } from '@supabase/supabase-js'
import { fetchInsights } from './meta.mjs'

export function admin() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function syncMeta({ days = 30, triggeredBy = 'cron' } = {}) {
  const token = process.env.META_ACCESS_TOKEN
  if (!token) throw new Error('META_ACCESS_TOKEN is not set')
  const version = process.env.META_API_VERSION || 'v21.0'
  const db = admin()

  const { data: accounts, error } = await db
    .from('ad_accounts')
    .select('account_id, label')
    .eq('provider', 'meta')
    .eq('active', true)
  if (error) throw new Error(`Could not read ad_accounts: ${error.message}`)
  if (!accounts?.length) return { accounts: 0, rows: 0, failures: [] }

  let total = 0
  const failures = []

  for (const account of accounts) {
    // One sync_runs row per account, so one failing account does not mark the
    // others stale on the dashboard's freshness badge.
    const { data: run } = await db
      .from('sync_runs')
      .insert({
        source: 'meta', account_ref: account.account_id,
        status: 'running', triggered_by: triggeredBy,
      })
      .select('id')
      .single()

    try {
      const rows = await fetchInsights({
        accountId: account.account_id, token, version, days,
      })
      if (rows.length) {
        // Meta restates recent days as attribution settles, so upsert.
        const { error: wErr } = await db
          .from('meta_insights_daily')
          .upsert(rows, { onConflict: 'account_id,date,ad_id' })
        if (wErr) throw new Error(wErr.message)
      }
      total += rows.length
      if (run) {
        await db.from('sync_runs').update({
          status: 'success', rows_written: rows.length,
          finished_at: new Date().toISOString(),
        }).eq('id', run.id)
      }
    } catch (err) {
      failures.push({ account: account.account_id, label: account.label, error: String(err) })
      if (run) {
        await db.from('sync_runs').update({
          status: 'error', error: String(err).slice(0, 2000),
          finished_at: new Date().toISOString(),
        }).eq('id', run.id)
      }
    }
  }

  return { accounts: accounts.length, rows: total, failures }
}
