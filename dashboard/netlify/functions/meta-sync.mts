import type { Config } from '@netlify/functions'
// @ts-expect-error — plain JS module, no types
import { syncMeta } from '../lib/sync.mjs'

/**
 * Daily Meta refresh.
 *
 * 11:00 UTC is 7am Eastern during daylight saving (Mar-Nov) and 6am in winter.
 * Netlify schedules are UTC only, so pick the half of the year that matters:
 * this runs before the workday either way.
 */
export default async () => {
  try {
    const result = await syncMeta({ days: 30, triggeredBy: 'cron' })
    console.log('meta sync', JSON.stringify(result))
    return new Response(JSON.stringify(result), {
      headers: { 'content-type': 'application/json' },
    })
  } catch (err) {
    console.error('meta sync failed', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { 'content-type': 'application/json' },
    })
  }
}

export const config: Config = { schedule: '0 11 * * *' }
