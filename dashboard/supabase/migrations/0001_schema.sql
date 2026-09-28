-- NevadoMedia BI Dashboard — schema
-- Phase 1. Run against a fresh Supabase project, in order, before 0002_rls.sql.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type user_role          as enum ('admin', 'operator');
create type payment_status     as enum ('paid', 'pending', 'overdue');
create type ball_side          as enum ('nevadomedia', 'client', 'waiting');
create type content_stage      as enum ('scripted', 'shot', 'edited', 'approved', 'scheduled', 'posted');
create type sales_stage        as enum ('lead', 'setting_call', 'sales_call', 'proposal', 'closed', 'lost');
create type lead_status        as enum ('new', 'qualified', 'disqualified', 'booked', 'closed', 'lost');
create type call_class         as enum ('sales', 'client', 'internal');
create type sync_status        as enum ('running', 'success', 'error');
create type funnel_stage       as enum ('visitor', 'form_started', 'form_completed', 'call_booked', 'call_showed', 'closed');
create type assignment_status  as enum ('pending', 'in_progress', 'delivered', 'overdue');

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles — one row per auth user, carries the role that RLS keys off
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  full_name   text,
  role        user_role not null default 'operator',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- New signups become operators unless the email is on the admin allowlist.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    case when lower(new.email) in ('sebastian@nevadomedia.info')
         then 'admin'::user_role
         else 'operator'::user_role
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------
create table public.clients (
  id              uuid primary key default gen_random_uuid(),
  -- unique so the seed and the Stripe/GHL matchers can upsert on name
  name            text not null unique,
  service         text,
  retainer        numeric(10,2) not null default 0,       -- money: admin only
  payment_status  payment_status not null default 'pending',
  payment_status_override boolean not null default false, -- true = manual wins over Stripe
  contract_start  date,
  renewal_date    date,
  last_touchpoint date,
  next_action     text,
  next_action_due date,
  goals           text,
  goal_progress   smallint not null default 0 check (goal_progress between 0 and 100),
  at_risk         boolean not null default false,
  notes           text,
  ball_side       ball_side not null default 'nevadomedia',
  location        text,
  active          boolean not null default true,
  stripe_customer_id text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on public.clients (active, at_risk);

-- days_until_renewal is derived, never stored.
create or replace function public.days_until_renewal(c public.clients)
returns integer
language sql
stable
as $$ select (c.renewal_date - current_date)::int $$;

-- ---------------------------------------------------------------------------
-- onboarding_checklist
-- ---------------------------------------------------------------------------
create table public.onboarding_checklist (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.clients(id) on delete cascade,
  item       text not null,
  owner      text,
  completed  boolean not null default false,
  due_date   date,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.onboarding_checklist (client_id, completed);

-- ---------------------------------------------------------------------------
-- content_pipeline
-- ---------------------------------------------------------------------------
create table public.content_pipeline (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  title       text not null,
  format      text,
  stage       content_stage not null default 'scripted',
  assigned_to text,
  due_date    date,
  sort_order  integer not null default 0,   -- position inside its kanban column
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on public.content_pipeline (stage, sort_order);
create index on public.content_pipeline (client_id);

-- ---------------------------------------------------------------------------
-- weekly_metrics
-- ---------------------------------------------------------------------------
create table public.weekly_metrics (
  id                uuid primary key default gen_random_uuid(),
  week_date         date not null unique,          -- Monday of the week
  calls_booked      integer not null default 0,
  show_rate         numeric(5,2),                  -- percent
  close_rate        numeric(5,2),
  revenue           numeric(10,2) not null default 0,
  churn_rate        numeric(5,2),
  outstanding_tasks integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- expenses
-- ---------------------------------------------------------------------------
create table public.expenses (
  id         uuid primary key default gen_random_uuid(),
  month      date not null,                        -- first of the month
  category   text not null,
  amount     numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (month, category)
);

-- ---------------------------------------------------------------------------
-- sales_pipeline
-- ---------------------------------------------------------------------------
create table public.sales_pipeline (
  id              uuid primary key default gen_random_uuid(),
  prospect_name   text not null,
  trade           text,
  location        text,
  monthly_revenue numeric(12,2),
  stage           sales_stage not null default 'lead',
  next_step       text,
  next_step_due   date,
  probability     smallint check (probability between 0 and 100),
  notes           text,
  sort_order      integer not null default 0,
  ghl_opportunity_id text unique,                  -- set by the GHL sync (phase 5)
  ghl_contact_id  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on public.sales_pipeline (stage, sort_order);

-- ---------------------------------------------------------------------------
-- team_assignments
-- ---------------------------------------------------------------------------
create table public.team_assignments (
  id             uuid primary key default gen_random_uuid(),
  assignee       text not null,                    -- 'Editor', 'Caleb', ...
  task           text not null,
  client_id      uuid references public.clients(id) on delete set null,
  sent_date      date,
  due_date       date,
  delivered_date date,
  status         assignment_status not null default 'pending',
  payment_amount numeric(10,2),
  payment_status payment_status,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index on public.team_assignments (assignee, status);

-- ---------------------------------------------------------------------------
-- lead_response_log
-- ---------------------------------------------------------------------------
create table public.lead_response_log (
  id                   uuid primary key default gen_random_uuid(),
  lead_name            text not null,
  lead_source          text,
  client_id            uuid references public.clients(id) on delete set null,
  received_at          timestamptz not null,
  first_contacted_at   timestamptz,
  -- generated: minutes between receipt and first contact. Null until contacted.
  response_time_minutes integer generated always as (
    case when first_contacted_at is null then null
         else floor(extract(epoch from (first_contacted_at - received_at)) / 60)::int
    end
  ) stored,
  status               lead_status not null default 'new',
  ghl_contact_id       text unique,
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index on public.lead_response_log (received_at desc);

-- ---------------------------------------------------------------------------
-- client_communication_log
-- ---------------------------------------------------------------------------
create table public.client_communication_log (
  id                  uuid primary key default gen_random_uuid(),
  client_id           uuid not null references public.clients(id) on delete cascade,
  date                date not null default current_date,
  summary             text not null,
  next_followup_date  date,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index on public.client_communication_log (client_id, date desc);

-- ---------------------------------------------------------------------------
-- funnel_events
-- ---------------------------------------------------------------------------
create table public.funnel_events (
  id         uuid primary key default gen_random_uuid(),
  session_id text not null,
  stage      funnel_stage not null,
  field_name text,                                  -- last field touched, for drop-off
  drop_off   boolean not null default false,
  metadata   jsonb not null default '{}'::jsonb,
  timestamp  timestamptz not null default now()
);
create index on public.funnel_events (session_id);
create index on public.funnel_events (stage, timestamp desc);

-- ---------------------------------------------------------------------------
-- ad_accounts — maps a provider account id to a client
-- ---------------------------------------------------------------------------
create table public.ad_accounts (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid references public.clients(id) on delete set null,
  provider   text not null default 'meta',
  account_id text not null,                         -- 'act_919241897734064'
  label      text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, account_id)
);

-- ---------------------------------------------------------------------------
-- meta_insights_daily — one row per ad per day (phase 4)
-- ---------------------------------------------------------------------------
create table public.meta_insights_daily (
  id            uuid primary key default gen_random_uuid(),
  account_id    text not null,
  date          date not null,
  campaign_id   text,
  campaign_name text,
  adset_id      text,
  adset_name    text,
  ad_id         text,
  ad_name       text,
  spend         numeric(12,2) not null default 0,
  impressions   bigint not null default 0,
  reach         bigint not null default 0,
  frequency     numeric(8,4),
  clicks        bigint not null default 0,
  ctr           numeric(8,4),
  cpm           numeric(10,4),
  leads         integer not null default 0,
  cpl           numeric(10,2),
  cost_per_action_type      jsonb not null default '{}'::jsonb,
  quality_ranking           text,
  engagement_rate_ranking   text,
  synced_at     timestamptz not null default now(),
  unique (account_id, date, ad_id)
);
create index on public.meta_insights_daily (account_id, date desc);

-- ---------------------------------------------------------------------------
-- Metricool (phase 6)
-- ---------------------------------------------------------------------------
create table public.metricool_daily (
  id              uuid primary key default gen_random_uuid(),
  brand_id        text not null,
  date            date not null,
  views           bigint not null default 0,
  reach           bigint not null default 0,
  engagement_rate numeric(8,4),
  saves           integer not null default 0,
  shares          integer not null default 0,
  followers       integer,
  synced_at       timestamptz not null default now(),
  unique (brand_id, date)
);

create table public.metricool_posts (
  id           uuid primary key default gen_random_uuid(),
  brand_id     text not null,
  post_id      text not null,
  published_at timestamptz,
  permalink    text,
  caption      text,
  views        bigint not null default 0,
  reach        bigint not null default 0,
  engagement   numeric(12,2) not null default 0,
  saves        integer not null default 0,
  shares       integer not null default 0,
  synced_at    timestamptz not null default now(),
  unique (brand_id, post_id)
);
create index on public.metricool_posts (brand_id, published_at desc);

-- ---------------------------------------------------------------------------
-- fathom_calls (phase 8)
-- ---------------------------------------------------------------------------
create table public.fathom_calls (
  id             uuid primary key default gen_random_uuid(),
  recording_id   text not null unique,
  title          text,
  started_at     timestamptz,
  duration_min   integer,
  classification call_class,
  classification_locked boolean not null default false,  -- true once a human corrects it
  summary        text,
  action_items   jsonb not null default '[]'::jsonb,
  url            text,
  client_id      uuid references public.clients(id) on delete set null,
  synced_at      timestamptz not null default now()
);
create index on public.fathom_calls (started_at desc);

-- ---------------------------------------------------------------------------
-- stripe_payments (phase 7)
-- ---------------------------------------------------------------------------
create table public.stripe_payments (
  id                 uuid primary key default gen_random_uuid(),
  client_id          uuid references public.clients(id) on delete set null,
  stripe_customer_id text,
  invoice_id         text unique,
  amount             numeric(10,2) not null default 0,
  currency           text not null default 'usd',
  status             text not null,
  paid_at            timestamptz,
  due_at             timestamptz,
  synced_at          timestamptz not null default now()
);
create index on public.stripe_payments (client_id, paid_at desc);

-- ---------------------------------------------------------------------------
-- calendar_events (phase 9)
-- ---------------------------------------------------------------------------
create table public.calendar_events (
  id          uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  title       text,
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  attendees   jsonb not null default '[]'::jsonb,
  link        text,
  synced_at   timestamptz not null default now()
);
create index on public.calendar_events (starts_at);

-- ---------------------------------------------------------------------------
-- notion_client_status (phase 10)
-- ---------------------------------------------------------------------------
create table public.notion_client_status (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid references public.clients(id) on delete set null,
  page_id        text not null unique,
  title          text,
  status         text,
  excerpt        text,
  last_edited_at timestamptz,
  synced_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- sync_runs — drives every "last updated" label and the 24h stale badge
-- ---------------------------------------------------------------------------
create table public.sync_runs (
  id           uuid primary key default gen_random_uuid(),
  source       text not null,                     -- 'meta' | 'ghl' | 'metricool' | ...
  account_ref  text,                              -- account/brand id, null = whole source
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  status       sync_status not null default 'running',
  rows_written integer not null default 0,
  error        text,
  triggered_by text not null default 'cron'       -- 'cron' | 'manual'
);
create index on public.sync_runs (source, started_at desc);

-- Latest successful run per source, for the freshness indicator.
create view public.sync_freshness as
select distinct on (source)
  source,
  finished_at as last_success_at,
  rows_written,
  triggered_by,
  (now() - finished_at) > interval '24 hours' as is_stale
from public.sync_runs
where status = 'success' and finished_at is not null
order by source, finished_at desc;

-- ---------------------------------------------------------------------------
-- quick_actions — audit trail for mark-done / add-note / flag-at-risk
-- ---------------------------------------------------------------------------
create table public.quick_actions (
  id           uuid primary key default gen_random_uuid(),
  actor        uuid references public.profiles(id) on delete set null,
  kind         text not null,
  target_table text,
  target_id    uuid,
  payload      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index on public.quick_actions (created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'clients', 'onboarding_checklist', 'content_pipeline',
    'weekly_metrics', 'expenses', 'sales_pipeline', 'team_assignments',
    'lead_response_log', 'client_communication_log', 'ad_accounts'
  ] loop
    execute format(
      'create trigger touch_%1$s before update on public.%1$s
         for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;
