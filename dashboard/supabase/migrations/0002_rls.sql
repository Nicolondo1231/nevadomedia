-- NevadoMedia BI Dashboard — Row Level Security
-- Run after 0001_schema.sql.
--
-- Model:
--   admin    (Sebastian) — everything.
--   operator (Nico)      — operations only. No retainer amounts, no expenses,
--                          no Stripe, no weekly revenue.
--   anon                 — nothing, except inserting its own funnel events.
--   service_role         — bypasses RLS entirely; used only by the VPS worker.

-- ---------------------------------------------------------------------------
-- Role helpers. SECURITY DEFINER so that reading profiles inside a profiles
-- policy does not recurse.
-- ---------------------------------------------------------------------------
create or replace function public.current_app_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select coalesce(public.current_app_role() = 'admin', false) $$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select public.current_app_role() is not null $$;

grant execute on function public.current_app_role, public.is_admin, public.is_staff
  to authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere. Default-deny: a table with RLS on and no matching
-- policy returns zero rows.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','clients','onboarding_checklist','content_pipeline','weekly_metrics',
    'expenses','sales_pipeline','team_assignments','lead_response_log',
    'client_communication_log','funnel_events','ad_accounts','meta_insights_daily',
    'metricool_daily','metricool_posts','fathom_calls','stripe_payments',
    'calendar_events','notion_client_status','sync_runs','quick_actions'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy "read own profile" on public.profiles
  for select to authenticated using (id = auth.uid());

create policy "admin reads all profiles" on public.profiles
  for select to authenticated using (public.is_admin());

create policy "admin writes profiles" on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Admin-only tables (money)
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['clients','expenses','weekly_metrics','stripe_payments'] loop
    execute format(
      'create policy "admin only" on public.%I
         for all to authenticated
         using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- Operators reach clients through this column-filtered view instead. The view
-- runs with the owner's rights, so it is not blocked by the policy above, and
-- because it is a simple view it is auto-updatable — an operator can edit the
-- operational columns and cannot see or touch the financial ones.
create view public.clients_ops
with (security_barrier) as
select
  id, name, service, contract_start, renewal_date, last_touchpoint,
  next_action, next_action_due, goals, goal_progress, at_risk, notes,
  ball_side, location, active, created_at, updated_at
from public.clients;

-- Supabase's default privileges grant ALL on every new object in `public` to
-- anon and authenticated, so the grant below must be preceded by a revoke —
-- otherwise an operator could INSERT and DELETE client rows through the view.
revoke all on public.clients_ops from anon, authenticated;
grant select, update on public.clients_ops to authenticated;

-- ---------------------------------------------------------------------------
-- Operational tables — both roles read and write
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'onboarding_checklist','content_pipeline','sales_pipeline','team_assignments',
    'lead_response_log','client_communication_log','quick_actions'
  ] loop
    execute format(
      'create policy "staff read"  on public.%I for select to authenticated
         using (public.is_staff())', t);
    execute format(
      'create policy "staff write" on public.%I for all to authenticated
         using (public.is_staff()) with check (public.is_staff())', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Synced tables — staff read, worker writes with service_role
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'ad_accounts','meta_insights_daily','metricool_daily','metricool_posts',
    'fathom_calls','calendar_events','notion_client_status','sync_runs'
  ] loop
    execute format(
      'create policy "staff read" on public.%I for select to authenticated
         using (public.is_staff())', t);
  end loop;
end $$;

-- Two exceptions where a human edits synced data by hand.
create policy "admin edits ad accounts" on public.ad_accounts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Correcting a Fathom auto-classification must stick across re-syncs.
create policy "staff reclassifies calls" on public.fathom_calls
  for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- funnel_events — the public landing page writes here anonymously
-- ---------------------------------------------------------------------------
create policy "staff read funnel" on public.funnel_events
  for select to authenticated using (public.is_staff());

-- Anonymous visitors may only append, never read back.
create policy "visitor appends funnel event" on public.funnel_events
  for insert to anon with check (
    session_id is not null and length(session_id) between 8 and 64
  );

-- ---------------------------------------------------------------------------
-- sync_freshness view inherits sync_runs' policy through the base table.
-- ---------------------------------------------------------------------------
alter view public.sync_freshness set (security_invoker = true);
revoke all on public.sync_freshness from anon, authenticated;
grant select on public.sync_freshness to authenticated;
