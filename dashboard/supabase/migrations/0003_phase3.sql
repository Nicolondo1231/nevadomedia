-- Phase 3 additions: things the manual-input sections need that phase 1 did not
-- anticipate. Run after 0002_rls.sql.

-- ---------------------------------------------------------------------------
-- When a client relationship ended. Churn is "lost this month vs signed this
-- month", and without this there is no way to date a loss — `active` alone
-- says the state, not when it changed.
-- ---------------------------------------------------------------------------
alter table public.clients add column if not exists ended_at date;

-- ---------------------------------------------------------------------------
-- app_settings — small admin-owned key/value store. Revenue per head needs a
-- team headcount, which belongs to nobody else's table.
-- ---------------------------------------------------------------------------
create table if not exists public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;
alter table public.app_settings force row level security;

create policy "admin manages settings" on public.app_settings
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create trigger touch_app_settings before update on public.app_settings
  for each row execute function public.touch_updated_at();

insert into public.app_settings (key, value) values
  ('team_size', '3'::jsonb)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Operators need to read the content pipeline's client colour coding, which
-- means reading client names — already available through clients_ops.
-- Nothing further required.
-- ---------------------------------------------------------------------------
