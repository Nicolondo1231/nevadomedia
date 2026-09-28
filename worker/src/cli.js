#!/usr/bin/env node
/**
 * One-shot commands, invoked by the systemd timer and by hand.
 *
 *   node src/cli.js sync [--days 30]
 */
import { readFileSync } from 'node:fs'
import { loadEnv } from './config.js'

try {
  loadEnv(readFileSync(new URL('../.env', import.meta.url), 'utf8'))
} catch {
  // Fine: systemd supplies the environment directly via EnvironmentFile.
}

const [command] = process.argv.slice(2)
const daysArg = process.argv.indexOf('--days')
const days = daysArg === -1 ? 30 : Number(process.argv[daysArg + 1]) || 30

if (command === 'sync') {
  const { syncMeta } = await import('./sync-meta.js')
  const result = await syncMeta({ days, triggeredBy: 'cron' })
  console.log(
    `meta sync: ${result.rows} rows across ${result.accounts} account(s)` +
    (result.failures.length ? `, ${result.failures.length} failed` : ''),
  )
  // A partial failure is a failure as far as the timer is concerned, so
  // systemd records it and OnFailure can alert.
  process.exit(result.failures.length ? 1 : 0)
} else {
  console.error('usage: node src/cli.js sync [--days 30]')
  process.exit(2)
}
