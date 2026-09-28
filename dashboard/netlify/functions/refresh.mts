// @ts-expect-error — plain JS module, no types
import { syncMeta, admin } from '../lib/sync.mjs'

/**
 * On-demand refresh behind the dashboard's "Refresh Data" button.
 *
 * The caller sends their Supabase access token. A static site cannot hold a
 * shared secret — it ships to every visitor — so the function verifies the
 * token and requires a signed-in user instead.
 */
export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors() })
  }
  if (req.method !== 'POST') {
    return json({ error: 'method not allowed' }, 405)
  }

  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'unauthorized: no token' }, 401)

  try {
    const db = admin()
    const { data, error } = await db.auth.getUser(token)
    if (error || !data?.user) return json({ error: 'unauthorized: invalid session' }, 401)

    const days = Number(new URL(req.url).searchParams.get('days')) || 30
    const result = await syncMeta({ days, triggeredBy: 'manual' })
    return json(result, result.failures.length ? 207 : 200)
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
}

function cors() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-allow-methods': 'POST, OPTIONS',
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...cors() },
  })
}
