const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']

/** Reads .env into process.env without pulling in a dependency. */
export function loadEnv(text) {
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    if (!(key in process.env)) process.env[key] = value
  }
}

export function config() {
  const cfg = {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    metaToken: process.env.META_ACCESS_TOKEN,
    metaVersion: process.env.META_API_VERSION || 'v21.0',
    refreshToken: process.env.WORKER_REFRESH_TOKEN,
    allowedOrigin: process.env.ALLOWED_ORIGIN || '*',
    port: Number(process.env.PORT || 8787),
    cronTz: process.env.CRON_TZ || 'America/New_York',
    cronSchedule: process.env.CRON_SCHEDULE || '0 7 * * *',
  }
  const missing = required.filter((k) => !process.env[k])
  if (missing.length) throw new Error(`Missing required env: ${missing.join(', ')}`)
  return cfg
}
