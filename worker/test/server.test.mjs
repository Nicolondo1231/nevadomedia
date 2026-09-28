import { test } from 'node:test'
import assert from 'node:assert/strict'

// Env the config loader requires, before importing anything that reads it.
process.env.SUPABASE_URL = 'https://example.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
process.env.WORKER_REFRESH_TOKEN = 'correct-horse-battery-staple'
process.env.ALLOWED_ORIGIN = 'https://dash.example'
process.env.PORT = '0'

const { createWorkerServer } = await import('../src/server.js')

/** Boots the server on an ephemeral port and returns a fetch helper. */
async function withServer(run) {
  const server = createWorkerServer()
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const { port } = server.address()
  try {
    await run((path, init) => fetch(`http://127.0.0.1:${port}${path}`, init))
  } finally {
    server.close()
  }
}

test('health is open and reports idle', async () => {
  await withServer(async (call) => {
    const res = await call('/health')
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { ok: true, busy: false })
  })
})

test('refresh without a token is rejected', async () => {
  await withServer(async (call) => {
    const res = await call('/refresh', { method: 'POST' })
    assert.equal(res.status, 401)
    assert.match((await res.json()).error, /missing token/)
  })
})

test('refresh with a wrong token is rejected, not run', async () => {
  await withServer(async (call) => {
    const res = await call('/refresh', {
      method: 'POST',
      headers: { authorization: 'Bearer wrong-token-of-the-same-length!!' },
    })
    assert.equal(res.status, 401)
  })
})

test('CORS is scoped to the configured origin, not a wildcard', async () => {
  await withServer(async (call) => {
    const res = await call('/health')
    assert.equal(res.headers.get('access-control-allow-origin'), 'https://dash.example')
  })
})

test('preflight is answered', async () => {
  await withServer(async (call) => {
    const res = await call('/refresh', { method: 'OPTIONS' })
    assert.equal(res.status, 204)
  })
})

test('unknown paths 404 rather than falling through', async () => {
  await withServer(async (call) => {
    assert.equal((await call('/')).status, 404)
    assert.equal((await call('/sync')).status, 404)
  })
})

test('GET /refresh is not accepted — a sync must not be triggerable by a link', async () => {
  await withServer(async (call) => {
    const res = await call('/refresh', {
      headers: { authorization: 'Bearer correct-horse-battery-staple' },
    })
    assert.equal(res.status, 404)
  })
})
