#!/usr/bin/env node
/**
 * Long-running service: the HTTP endpoint behind the dashboard's
 * "Refresh Data" button.
 *
 * Scheduling is deliberately NOT done here. The daily 07:00 Eastern refresh is
 * a systemd timer (see deploy/), which handles daylight-saving transitions
 * correctly; an in-process cron would have to re-implement that and would stop
 * running whenever this process restarts.
 */
import { readFileSync } from 'node:fs'
import { loadEnv, config } from './config.js'

try {
  loadEnv(readFileSync(new URL('../.env', import.meta.url), 'utf8'))
} catch {
  // systemd supplies the environment directly.
}

const { createWorkerServer } = await import('./server.js')
const cfg = config()

createWorkerServer().listen(cfg.port, '127.0.0.1', () => {
  console.log(`worker listening on 127.0.0.1:${cfg.port}`)
})
