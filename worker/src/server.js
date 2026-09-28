import { createServer } from 'node:http'
import { timingSafeEqual } from 'node:crypto'
import { config } from './config.js'
import { syncMeta } from './sync-meta.js'
import { db } from './supabase.js'

/** Constant-time compare, so the shared secret cannot be guessed by timing. */
function tokenMatches(given, expected) {
  if (!given || !expected) return false
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/**
 * Two ways in, and deliberately not one shared secret for both.
 *
 * The dashboard is a static site: anything it holds is readable by anyone who
 * opens the bundle, so it must NOT carry the worker secret. Instead it sends
 * the signed-in user's Supabase access token, which the worker verifies and
 * then checks is an admin. The shared secret stays for server-to-server calls
 * (a curl from the VPS, an uptime check) where nothing is shipped to a browser.
 */
async function authorize(authHeader, cfg) {
  const token = (authHeader ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return { ok: false, reason: 'missing token' }

  if (cfg.refreshToken && tokenMatches(token, cfg.refreshToken)) {
    return { ok: true, via: 'shared-secret' }
  }

  const { data, error } = await db().auth.getUser(token)
  if (error || !data?.user) return { ok: false, reason: 'invalid session' }

  const { data: profile } = await db()
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle()

  if (profile?.role !== 'admin') {
    return { ok: false, reason: 'admin role required' }
  }
  return { ok: true, via: 'supabase-jwt', user: data.user.email }
}

/**
 * Minimal HTTP surface for the dashboard's "Refresh Data" button.
 * Only one sync runs at a time — a second request while one is in flight is
 * told so rather than starting a duplicate pull against Meta's rate limits.
 */
export function createWorkerServer() {
  const cfg = config()
  let inFlight = null

  return createServer(async (req, res) => {
    const origin = cfg.allowedOrigin
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type')
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
    res.setHeader('Vary', 'Origin')

    if (req.method === 'OPTIONS') {
      res.writeHead(204).end()
      return
    }

    const url = new URL(req.url, `http://localhost:${cfg.port}`)

    if (url.pathname === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ ok: true, busy: Boolean(inFlight) }))
      return
    }

    if (url.pathname === '/refresh' && req.method === 'POST') {
      const auth = await authorize(req.headers.authorization, cfg)
      if (!auth.ok) {
        res.writeHead(401, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ error: `unauthorized: ${auth.reason}` }))
        return
      }
      console.log(`refresh requested via ${auth.via}${auth.user ? ` by ${auth.user}` : ''}`)

      if (inFlight) {
        res.writeHead(409, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ error: 'a sync is already running' }))
        return
      }

      const days = Number(url.searchParams.get('days')) || 30
      inFlight = syncMeta({ days, triggeredBy: 'manual' })
      try {
        const result = await inFlight
        res.writeHead(result.failures.length ? 207 : 200, {
          'content-type': 'application/json',
        })
        res.end(JSON.stringify(result))
      } catch (err) {
        res.writeHead(500, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ error: String(err) }))
      } finally {
        inFlight = null
      }
      return
    }

    res.writeHead(404, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: 'not found' }))
  })
}
