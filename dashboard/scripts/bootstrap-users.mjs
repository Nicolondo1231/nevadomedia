#!/usr/bin/env node
/**
 * Creates the two dashboard accounts and pins their roles.
 *
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   node scripts/bootstrap-users.mjs
 *
 * Idempotent: re-running leaves existing users alone and only corrects roles.
 * The service role key bypasses RLS, so run this from your machine or the VPS —
 * never from the browser, and never commit it.
 */
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const ACCOUNTS = [
  { email: 'sebastian@nevadomedia.info', full_name: 'Sebastian', role: 'admin' },
  { email: 'nicolas@nevadomedia.info', full_name: 'Nico', role: 'admin' },
]

/** Returns the existing auth user for an email, or null. */
async function findUser(email) {
  // listUsers is paginated; the project has a handful of users, so one page is
  // plenty, but page through anyway so this stays correct as the team grows.
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (hit) return hit
    if (data.users.length < 200) return null
  }
  return null
}

for (const { email, full_name, role } of ACCOUNTS) {
  let user = await findUser(email)

  if (user) {
    console.log(`= ${email} already exists (${user.id})`)
  } else {
    // A random password nobody needs to know: first sign-in is by magic link,
    // and the password can be set later from the Supabase dashboard.
    const password = randomBytes(24).toString('base64url')
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    })
    if (error) {
      console.error(`x ${email}: ${error.message}`)
      continue
    }
    user = data.user
    console.log(`+ ${email} created (${user.id})`)
    console.log(`  temporary password: ${password}`)
  }

  // The handle_new_user trigger sets the role on insert; this corrects it if
  // the account predates the trigger or the allowlist changed.
  const { error: roleErr } = await admin
    .from('profiles')
    .upsert({ id: user.id, email, full_name, role }, { onConflict: 'id' })
  if (roleErr) console.error(`x ${email} role: ${roleErr.message}`)
  else console.log(`  role -> ${role}`)
}

console.log('\nDone. Sign in at the dashboard with a magic link.')
