-- ============================================================
-- STEP 2 of 3 — your clients and expenses
-- Select all of this file, paste into the Supabase SQL Editor,
-- click Run, and wait for "Success".
-- Run this only after Step 1 says Success.
-- ============================================================

-- Clients
-- ---------------------------------------------------------------------------
insert into public.clients
  (name, service, retainer, payment_status, contract_start, renewal_date, location, active, notes)
values
  ('Julian | Premier Marble Kitchens', 'Ads',            1000.00, 'pending', date '2026-09-26', date '2026-10-26', 'Connecticut', true,  null),
  ('Julio | Jay Pro Finish',           'Ads (paused)',      0.00, 'paid',    null,              null,              'New Jersey',  true,  'Favor — long term play. Ads currently paused.'),
  ('Cleber + Laura | FD Construction', 'Organic only',   1500.00, 'pending', null,              null,              null,          true,  'Starting soon.'),
  ('Karol',                            'Organic content',2000.00, 'pending', null,              null,              null,          true,  'Decision pending.'),
  ('NevadoMedia',                      'Own campaigns',     0.00, 'paid',    null,              null,              'Union, NJ',   true,  'Own agency. October launch.'),
  ('Andrew | Best Pro Service',        'Ads',               0.00, 'pending', null,              null,              null,          false, 'Has a live Meta ad account and Metricool brand but is not on the active client list — confirm status.')
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- Ad + social accounts. provider distinguishes Meta from Metricool.
-- ---------------------------------------------------------------------------
insert into public.ad_accounts (client_id, provider, account_id, label, active)
select c.id, 'meta', v.account_id, v.label, v.active
from (values
  ('Andrew | Best Pro Service',        'act_919241897734064',  'Andrew | Best Pro Service',        true),
  ('Julio | Jay Pro Finish',           'act_1759311301271024', 'Julio | Jay Pro Finish',           true),
  ('NevadoMedia',                      'act_443475824888837',  'NevadoMedia Nicogrowth',           true)
) as v(client_name, account_id, label, active)
join public.clients c on c.name = v.client_name
on conflict (provider, account_id) do nothing;

-- Julian's Meta account id is still outstanding. Row is created inactive so the
-- client↔account mapping exists; fill account_id in and set active once known.
insert into public.ad_accounts (client_id, provider, account_id, label, active)
select c.id, 'meta', 'act_PENDING_JULIAN', 'Julian | Premier Marble Kitchens', false
from public.clients c where c.name = 'Julian | Premier Marble Kitchens'
on conflict (provider, account_id) do nothing;

insert into public.ad_accounts (client_id, provider, account_id, label, active)
select c.id, 'metricool', v.brand_id, v.label, true
from (values
  ('NevadoMedia',               '6877144', 'SebasGrowth'),
  ('Julio | Jay Pro Finish',    '6200713', 'Julio Jay Pro Finish'),
  ('Andrew | Best Pro Service', '6213915', 'Andrew Best Pro Service')
) as v(client_name, brand_id, label)
join public.clients c on c.name = v.client_name
on conflict (provider, account_id) do nothing;

-- ---------------------------------------------------------------------------
-- Monthly expenses — 2,500 per month total
-- ---------------------------------------------------------------------------
insert into public.expenses (month, category, amount)
values
  (date_trunc('month', current_date)::date, 'Mentor',        1500.00),
  (date_trunc('month', current_date)::date, 'Subscriptions',  500.00),
  (date_trunc('month', current_date)::date, 'Phones',         250.00),
  (date_trunc('month', current_date)::date, 'Editor',         250.00)
on conflict (month, category) do nothing;

-- ---------------------------------------------------------------------------
-- Onboarding checklist template, applied to every active client
-- ---------------------------------------------------------------------------
insert into public.onboarding_checklist (client_id, item, owner, sort_order)
select c.id, v.item, v.owner, v.sort_order
from public.clients c
cross join (values
  ('Contract signed',                       'NevadoMedia', 1),
  ('Deposit / first payment collected',     'NevadoMedia', 2),
  ('Ad account access granted',             'Client',      3),
  ('Facebook page + Instagram access',      'Client',      4),
  ('Pixel / conversions API configured',    'NevadoMedia', 5),
  ('Service areas + zip codes confirmed',   'Client',      6),
  ('First shoot scheduled',                 'NevadoMedia', 7),
  ('First shoot completed',                 'NevadoMedia', 8),
  ('Creatives edited and approved',         'Client',      9),
  ('Campaign launched',                     'NevadoMedia', 10),
  ('Lead routing + notifications tested',   'NevadoMedia', 11),
  ('Response-time expectations reviewed',   'Client',      12)
) as v(item, owner, sort_order)
where c.active
  and not exists (
    select 1 from public.onboarding_checklist o
    where o.client_id = c.id and o.item = v.item
  );


-- ============================================================================
-- Done. You should see "Success. No rows returned".
--
-- Check it with:
--   select name, service, retainer from public.clients order by name;
--   -- expect 6 rows
--
-- To start completely over (DESTROYS ALL DATA in this project):
--   drop schema public cascade;
--   create schema public;
--   grant usage on schema public to anon, authenticated, service_role;
--   alter default privileges in schema public
--     grant all on tables to anon, authenticated, service_role;
--   -- then paste this file again
-- ============================================================================


-- ============================================================================
