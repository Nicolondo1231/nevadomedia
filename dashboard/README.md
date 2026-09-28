# NevadoMedia — Command Center

Internal business intelligence dashboard. Dark mode only, mobile responsive.

- **Plan and phase order:** [`PLAN.md`](./PLAN.md)
- **Status:** phase 1 complete (schema, RLS, auth, deployable shell).
  Phases 2–14 not started.

## Architecture in one paragraph

Netlify serves static files only — no functions, no crons, so it never burns
hosting credits. A Node worker on the Hostinger VPS holds every third-party
secret, runs the 07:00 EST refresh, and serves the on-demand "Refresh Data"
endpoint; it writes into Supabase with the service role key. The browser talks
to Supabase directly with the anon key and Row Level Security decides what the
signed-in role may see. Meta is called directly at `graph.facebook.com`.

## Phase 1 setup

### 1. Create the Supabase project

Then run, in order, in the SQL editor:

```
supabase/migrations/0001_schema.sql
supabase/migrations/0002_rls.sql
supabase/seed.sql            # idempotent, safe to re-run
```

### 2. Create the accounts

```sh
SUPABASE_URL=https://<ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
node scripts/bootstrap-users.mjs
```

Creates `sebastian@nevadomedia.info` as **admin** and `nico@nevadomedia.info`
as **operator**, and prints a temporary password for each. Re-running is safe.

### 3. Point magic links at Resend

Supabase Auth sends magic links itself; Resend is wired in as its SMTP
provider rather than as a second auth path.

Supabase → Project Settings → Authentication → SMTP Settings:

| Field | Value |
|---|---|
| Host | `smtp.resend.com` |
| Port | `587` |
| Username | `resend` |
| Password | your `RESEND_API_KEY` |
| Sender email | a verified address on your Resend domain |

Then add the deployed site URL under Authentication → URL Configuration →
Redirect URLs, or magic links will bounce back to localhost.

### 4. Deploy to Netlify

Connect the repo and point Netlify at this directory — `netlify.toml` already
sets `base = "dashboard"`, `publish = "dashboard/dist"` and the SPA redirect.

Set two environment variables in Site configuration → Environment variables:

```
VITE_SUPABASE_URL       = https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY  = <anon key>
VITE_WORKER_URL         = https://<vps-host>/worker   # phase 4 onward
```

The service role key must never appear in the frontend
environment — it would ship inside the JavaScript bundle and hand any visitor
full database access.

## Local development

```sh
npm install
cp .env.example .env.local   # fill in the two VITE_ variables
npm run dev
```

## Tests

```sh
./supabase/test/run-tests.sh          # schema, RLS and role boundary
node supabase/test/check-columns.mjs  # UI columns exist in the schema
VITE_PREVIEW=1 npm run dev            # real screens against in-memory fixtures
```

`check-columns.mjs` compares every row interface the frontend declares against
`information_schema`, so a mistyped column is caught here rather than as a
runtime error after deploy. It needs the test cluster from `run-tests.sh` up.

`VITE_PREVIEW=1` aliases the Supabase client to an in-memory stand-in
(`supabase/test/preview-client.ts`) so the screens render with realistic rows
without a live project. The alias is off unless that variable is set, so the
fixtures never reach a production bundle.

### run-tests.sh

Starts a throwaway Postgres 16 on port 55432, applies a minimal Supabase
stand-in (`auth.users`, `auth.uid()`, the `anon`/`authenticated` roles and
Supabase's default grants), runs the migrations, runs the seed twice to prove
idempotency, then asserts the role boundary — that an operator cannot read
retainers, expenses, weekly revenue or Stripe rows, cannot create or delete
clients, and that an anonymous visitor can append a funnel event but read
nothing back. Requires the `postgresql-16` server binaries; needs no network.

## Roles

| | Admin (Sebastian) | Operator (Nico) |
|---|---|---|
| Clients — operational fields | yes | yes, via `clients_ops` |
| Retainers, payment status | yes | **no** |
| Expenses, weekly revenue, Stripe | yes | **no** |
| Content pipeline, onboarding, team, leads, comms | yes | yes |
| Ad + content performance | yes | read only |
| Funnel, Calls & Intel (sales pipeline) | yes | **no** |
| Create / delete clients | yes | **no** |

Sections an operator cannot open are hidden from the sidebar *and* guarded in
the router, so typing the URL does not reach them.

Enforced in the database, not in the UI: `clients` is admin-only and operators
reach it through the column-filtered `clients_ops` view, which simply has no
financial columns to leak.
