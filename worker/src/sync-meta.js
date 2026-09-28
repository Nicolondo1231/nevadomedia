import { fetchInsights } from './meta.js'
import { db, startRun, activeAccounts } from './supabase.js'
import { config } from './config.js'

/**
 * Pulls daily ad-level insights for every active Meta account and upserts them.
 *
 * Each account gets its own sync_runs row, so one account failing (a revoked
 * permission, a disabled account) does not mark the others stale — the
 * dashboard's freshness badge stays truthful per account.
 */
export async function syncMeta({ days = 30, triggeredBy = 'cron' } = {}) {
  const cfg = config()
  if (!cfg.metaToken) throw new Error('META_ACCESS_TOKEN is not set')

  const accounts = await activeAccounts('meta')
  if (accounts.length === 0) {
    return { accounts: 0, rows: 0, failures: [] }
  }

  let total = 0
  const failures = []

  for (const account of accounts) {
    const run = await startRun('meta', {
      accountRef: account.account_id,
      triggeredBy,
    })
    try {
      const rows = await fetchInsights({
        accountId: account.account_id,
        token: cfg.metaToken,
        version: cfg.metaVersion,
        days,
      })

      if (rows.length) {
        // The unique key is (account_id, date, ad_id), so re-running a day
        // overwrites rather than duplicating. Meta restates recent days as
        // attribution settles, which is exactly why this is an upsert.
        const { error } = await db()
          .from('meta_insights_daily')
          .upsert(rows, { onConflict: 'account_id,date,ad_id' })
        if (error) throw new Error(error.message)
      }

      total += rows.length
      await run.finish({ status: 'success', rows: rows.length })
      console.log(`meta ${account.label}: ${rows.length} rows`)
    } catch (err) {
      failures.push({ account: account.account_id, label: account.label, error: String(err) })
      await run.finish({ status: 'error', error: err })
      console.error(`meta ${account.label}: ${err}`)
    }
  }

  return { accounts: accounts.length, rows: total, failures }
}
