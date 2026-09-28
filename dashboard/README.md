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
```

Only those two. The service role key must never appear in the frontend
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
./supabase/test/run-tests.sh
```

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
| Create / delete clients | yes | **no** |

Enforced in the database, not in the UI: `clients` is admin-only and operators
reach it through the column-filtered `clients_ops` view, which simply has no
financial columns to leak.
