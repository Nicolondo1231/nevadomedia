# NevadoMedia BI Dashboard — Build Plan

Status: **awaiting approval of this plan.** No phase started.
Owner: Sebastian (admin) · Operator: Nico (operations only)
Branch: `claude/awesome-ramanujan-l0hfh3`

---

## 1. Architecture

```
                    ┌──────────────────────────────┐
   Browser (SPA) ──▶│ Netlify  —  static hosting   │   no functions, no crons
                    └──────────────────────────────┘
        │
        │ supabase-js (JWT, RLS enforced)
        ▼
   ┌─────────────────────────────────────────┐
   │ Supabase — Postgres + Auth + RLS        │◀──── writes
   └─────────────────────────────────────────┘        │
        ▲                                             │
        │ POST /refresh  (on-demand, authed)          │
        │                                   ┌─────────────────────────────┐
        └───────────────────────────────────│ Hostinger VPS — Node worker │
                                            │  • cron 07:00 EST daily     │
                                            │  • /refresh endpoint        │
                                            │  • holds every API secret   │
                                            └─────────────────────────────┘
                                                      │
              Meta Graph · GHL · Metricool · Fathom · Stripe · Google Cal · Notion
```

**Why this shape**

- Netlify serves static files only — crons and API calls never run there, so no
  hosting credits burn. This is your stated constraint and it also keeps the
  Netlify free tier comfortably sufficient.
- Every third-party secret lives on the VPS. Nothing sensitive ships to the
  browser. The browser only ever holds the Supabase **anon** key, which is safe
  by design because Row Level Security decides what each role can read.
- The VPS worker is the single integration surface: the daily cron and the
  manual "Refresh Data" button call the same sync functions, so there is one
  code path to debug.
- Meta is called directly against `graph.facebook.com` — no Zapier, no Sheets.

**Stack**

| Layer | Choice | Note |
|---|---|---|
| Frontend | Vite + React 19 + TypeScript | fast builds, static output |
| Styling | Tailwind CSS v4 | design tokens match the reference |
| Charts | Recharts | line/area charts, funnel, sparklines |
| Tables | TanStack Table | sorting, filtering, CSV export |
| Drag & drop | dnd-kit | Kanban + sales pipeline |
| Data layer | TanStack Query + supabase-js | caching, optimistic writes |
| Backend | Supabase (Postgres 15, Auth, RLS) | |
| Worker | Node 22 + node-cron, systemd unit | on Hostinger VPS |

**Design tokens** (from your reference screenshot)

```
--bg          #0D0F1A   page
--surface     #141829   cards
--surface-2   #1B2038   raised / hover
--border      #252B45
--text        #E8EAF2
--text-dim    #8A90A8
--accent      #7C5CFF   primary purple
--accent-2    #A78BFA   secondary
--positive    #22C55E
--warning     #F5B544   stale data, CTR < 3.5%
--danger      #EF4444   at-risk, CPL > $50, >15min response
```
Dark mode only. Left sidebar with icons + notification badges, card grid,
line charts with gradient fills, metric cards with big numerals — as in the
reference.

---

## 2. Data model (Supabase)

Your ten tables, plus the ones the integrations require. All tables get
`created_at`, `updated_at`, and RLS.

**Yours, as specified**
`clients` · `onboarding_checklist` · `content_pipeline` · `weekly_metrics` ·
`expenses` · `sales_pipeline` · `team_assignments` · `lead_response_log` ·
`client_communication_log` · `funnel_events`

**Added — required to make the integrations work**

| Table | Purpose |
|---|---|
| `profiles` | user_id, email, full_name, role (`admin` \| `operator`) — drives RLS |
| `ad_accounts` | client_id, provider, account_id, label — maps `act_…` to a client |
| `meta_insights_daily` | account_id, date, campaign/adset/ad ids + names, spend, impressions, reach, frequency, clicks, ctr, cpm, leads, cpl, cost_per_action_type (jsonb), quality_ranking, engagement_rate_ranking |
| `metricool_daily` | brand_id, date, views, reach, engagement_rate, saves, shares, followers |
| `metricool_posts` | brand_id, post_id, published_at, permalink, views, reach, engagement, saves, shares |
| `fathom_calls` | recording_id, title, started_at, duration, classification (`sales`\|`client`\|`internal`), summary, action_items (jsonb), url |
| `stripe_payments` | client_id, stripe_customer_id, invoice_id, amount, currency, status, paid_at, due_at |
| `calendar_events` | external_id, title, starts_at, ends_at, attendees (jsonb), link |
| `notion_client_status` | client_id, page_id, status, last_edited_at, excerpt |
| `sync_runs` | source, account_ref, started_at, finished_at, status, rows_written, error — **drives every "last updated" timestamp and the 24h staleness badge** |
| `quick_actions` | actor, kind, target_table, target_id, payload, created_at — audit for mark-done / flag-at-risk |

**Access rules**
- `admin` — full read/write on everything.
- `operator` (Nico) — read/write on operations: clients (non-financial columns),
  onboarding, content pipeline, team assignments, lead response log,
  communication log, calendar, calls. **No** read on `expenses`,
  `stripe_payments`, retainer amounts, or the Finances section. Enforced by RLS
  policies plus a column-filtered `clients_ops` view, not by hiding UI.

---

## 3. Phases

Each phase ends with: committed code, a short written summary from me, and a
pause for your confirmation before the next one starts.

| # | Phase | Deliverable | Gated on |
|---|---|---|---|
| 1 | Supabase + auth + schema + Netlify shell | SQL migrations for all tables, RLS policies, seeded admin + operator accounts, deployed shell, **live link** | Supabase + Netlify credentials, network access (see §4) |
| 2 | UI shell | Sidebar, routing for all 10 sections, design system, empty states, mobile responsive | — |
| 3 | Manual input sections | Client Tracker, Content Pipeline (Kanban, drag+drop), Weekly Metrics, Finances, Team, Sales Pipeline, Communication Log — auto-save on blur | phase 1 |
| 4 | Meta Marketing API | VPS worker + sync for 4 accounts, all metrics, 1D/7D/14D/30D toggle, CPL trend chart, CPL>$50 red, CTR<3.5% yellow, top ad per account, Refresh button, freshness badge | `META_ACCESS_TOKEN`, Julian's `act_` id, VPS access |
| 5 | GoHighLevel | "Sales 2026" pipeline sync, contacts/deals/stages/notes, lead response log auto-populate, status sync | `GHL_API_KEY` + location id |
| 6 | Metricool | 3 brands, top/bottom 5 posts, follower growth, engagement trend, 7D/30D | Metricool token + user id |
| 7 | Stripe | payments pulled, auto-matched to clients, paid/pending/overdue with manual override | `STRIPE_SECRET_KEY` |
| 8 | Fathom | recordings pulled, classified sales/client/internal, summary + action items | `FATHOM_API_KEY` |
| 9 | Google Calendar | today + next 7 days on Command Center | OAuth credential (see §4) |
| 10 | Notion | Operating System pages → client status | `NOTION_API_KEY` + page ids |
| 11 | Funnel tracking | tracking snippet on the VSL page, visitor→form start→field drop-off→complete→booked, visual funnel with % per stage | VSL page URL + ability to add a script tag |
| 12 | Bi-weekly report generator | per-client WhatsApp-ready summary, one-click copy | phases 4, 6 |
| 13 | VPS cron | systemd timer, daily 07:00 EST full refresh, failure alerting via Resend | `VPS_SSH_KEY`, host, user |
| 14 | Final QA | mobile pass, notification badges, global search, CSV export, freshness indicators across all sections | all above |

Phase 1 also seeds your five active clients:
Julian \| Premier Marble Kitchens \| $1,000/mo \| Ads \| started 2026-09-26 \| CT ·
Julio \| Jay Pro Finish \| $0 \| favor, long-term \| ads paused ·
Cleber + Laura \| FD Construction \| $1,500/mo \| organic \| starting soon ·
Karol \| organic content \| $2,000/mo \| decision pending ·
NevadoMedia \| own campaigns \| October launch
…and the expense rows: Mentor $1,500, Subscriptions $500, Phones $250,
Editor $250 (total $2,500/mo).

---

## 4. Blockers — what I need from you

**A. This cloud container cannot reach the internet beyond package registries.**
I verified it: `api.netlify.com`, `api.supabase.com`, `graph.facebook.com`,
`api.stripe.com`, `app.metricool.com`, `api.fathom.video` and
`services.leadconnectorhq.com` all return 403 from the environment's network
policy. So I can write and commit every line of code, but I **cannot deploy or
hand you a live link from here** until that changes. Fix: in the session title
bar, open the cloud environment menu → Edit → Network access, and either raise
the access level or add those hosts to the allowed domains. Access levels are
described at https://code.claude.com/docs/en/claude-code-on-the-web.

**B. Credentials.** Put these in the environment's secrets (not in chat, not in
a file): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`NETLIFY_AUTH_TOKEN`, `META_ACCESS_TOKEN`, `GHL_API_KEY`, `METRICOOL_API_KEY`,
`FATHOM_API_KEY`, `STRIPE_SECRET_KEY`, `RESEND_API_KEY`, `NOTION_API_KEY`,
`VPS_SSH_KEY`. A Supabase **service role** key is needed in addition to the anon
key — the worker writes with it.

**C. Missing facts.**
1. Julian \| Premier Marble Kitchens ad account id (`act_…`).
2. GHL **location id** — the API key alone doesn't identify the sub-account.
3. Metricool **user id** — their API needs `userId` + `userToken`, not just a key.
4. **Google Calendar cannot be read with an API key.** API keys only open public
   calendars. I need either a service account with domain-wide delegation, or an
   OAuth refresh token for sebastian@nevadomedia.info.
5. Notion page ids (or the parent page) for the Operating System, plus the
   integration must be shared to those pages.
6. VSL landing page URL, and confirmation I can add a tracking script to it.
7. Hostinger VPS host, SSH user, and whether Node 22 + systemd are available.
8. Stripe → client matching key: customer email, customer id, or metadata field?

**D. Two notes on your spec.**
- "Bypass permissions" is a setting on your side (`/permissions` in the CLI or
  the session's permission mode) — I can't grant it to myself. Set it if you
  want fewer prompts; I'll work either way.
- Magic-link login via Resend: Supabase Auth sends magic links itself. To route
  them through Resend I'll configure Resend as Supabase's custom SMTP provider
  rather than building a parallel auth path — same result, far less to maintain.

---

## 5. What I can start on immediately, unblocked

Phases 1–3 are mostly authorable without network: the SQL migrations, RLS
policies, seed data, the full UI shell against the design reference, and every
manual-input section. They get committed here and go live the moment A and B
land. Say the word and I start with phase 1's schema.
