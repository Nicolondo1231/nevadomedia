import { createClient } from '@supabase/supabase-js'
import { config } from './config.js'

let client

/** Service-role client. Bypasses RLS, so it exists only inside the worker. */
export function db() {
  if (!client) {
    const cfg = config()
    client = createClient(cfg.supabaseUrl, cfg.supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return client
}

/** Opens a sync_runs row; the returned finish() closes it either way. */
export async function startRun(source, { accountRef = null, triggeredBy = 'cron' } = {}) {
  const { data, error } = await db()
    .from('sync_runs')
    .insert({ source, account_ref: accountRef, status: 'running', triggered_by: triggeredBy })
    .select('id')
    .single()

  if (error) throw new Error(`Could not open sync run: ${error.message}`)
  const id = data.id

  return {
    id,
    async finish({ status, rows = 0, error: err = null }) {
      await db().from('sync_runs').update({
        status,
        rows_written: rows,
        error: err ? String(err).slice(0, 2000) : null,
        finished_at: new Date().toISOString(),
      }).eq('id', id)
    },
  }
}

/** Active accounts for a provider, from ad_accounts. */
export async function activeAccounts(provider) {
  const { data, error } = await db()
    .from('ad_accounts')
    .select('account_id, label, client_id')
    .eq('provider', provider)
    .eq('active', true)

  if (error) throw new Error(`Could not read ad_accounts: ${error.message}`)
  return data ?? []
}
