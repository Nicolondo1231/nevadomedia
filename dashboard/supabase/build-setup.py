#!/usr/bin/env python3
"""
Builds setup.sql — a single-paste, SQL-editor-safe version of the migrations.

The Supabase SQL editor splits a script into statements client-side, and its
splitter mis-handles dollar-quoted blocks: `do $$ ... $$` bodies get cut in
half, and `format('... %1$s ...')` looks like a dollar-quote tag to it. psql
parses both correctly, which is why the migrations work there and not in the
editor.

So this generates an equivalent script with no `do` blocks, no loops and no
positional format args — just explicit statements. The migrations stay the
source of truth; this is derived from them.
"""
import re, pathlib

here = pathlib.Path(__file__).parent

TOUCH_TABLES = [
    'profiles', 'clients', 'onboarding_checklist', 'content_pipeline',
    'weekly_metrics', 'expenses', 'sales_pipeline', 'team_assignments',
    'lead_response_log', 'client_communication_log', 'ad_accounts',
]
RLS_TABLES = [
    'profiles','clients','onboarding_checklist','content_pipeline','weekly_metrics',
    'expenses','sales_pipeline','team_assignments','lead_response_log',
    'client_communication_log','funnel_events','ad_accounts','meta_insights_daily',
    'metricool_daily','metricool_posts','fathom_calls','stripe_payments',
    'calendar_events','notion_client_status','sync_runs','quick_actions',
]
ADMIN_ONLY = ['clients', 'expenses', 'weekly_metrics', 'stripe_payments']
STAFF_RW = [
    'onboarding_checklist','content_pipeline','sales_pipeline','team_assignments',
    'lead_response_log','client_communication_log','quick_actions',
]
SYNCED_READ = [
    'ad_accounts','meta_insights_daily','metricool_daily','metricool_posts',
    'fathom_calls','calendar_events','notion_client_status','sync_runs',
]

def drop_do_block(text, start_marker):
    """Removes the do $$ ... $$; block that begins at start_marker."""
    i = text.index(start_marker)
    end = text.index('end $$;', i) + len('end $$;')
    return text[:i] + text[end:], text[i:end]

def build():
    s1 = (here / 'migrations/0001_schema.sql').read_text()
    s2 = (here / 'migrations/0002_rls.sql').read_text()
    s3 = (here / 'migrations/0003_phase3.sql').read_text()
    seed = (here / 'seed.sql').read_text()

    # 1. Remove the trigger loop from 0001 and replace with explicit triggers.
    s1, _ = drop_do_block(s1, 'do $$\ndeclare t text;')
    s1 += '\n'.join(
        f'create trigger touch_{t} before update on public.{t}\n'
        f'  for each row execute function public.touch_updated_at();'
        for t in TOUCH_TABLES
    ) + '\n'

    # 2. Remove all four loops from 0002 and replace with explicit statements.
    for _ in range(4):
        s2, _ = drop_do_block(s2, 'do $$\ndeclare t text;')

    rls = '\n'.join(
        f'alter table public.{t} enable row level security;\n'
        f'alter table public.{t} force row level security;'
        for t in RLS_TABLES
    )
    admin = '\n'.join(
        f'create policy "admin only" on public.{t}\n'
        f'  for all to authenticated\n'
        f'  using (public.is_admin()) with check (public.is_admin());'
        for t in ADMIN_ONLY
    )
    staff = '\n'.join(
        f'create policy "staff read" on public.{t} for select to authenticated\n'
        f'  using (public.is_staff());\n'
        f'create policy "staff write" on public.{t} for all to authenticated\n'
        f'  using (public.is_staff()) with check (public.is_staff());'
        for t in STAFF_RW
    )
    synced = '\n'.join(
        f'create policy "staff read" on public.{t} for select to authenticated\n'
        f'  using (public.is_staff());'
        for t in SYNCED_READ
    )

    # The loops sat at known points; re-insert the expanded equivalents in the
    # same order the original ran them.
    s2 = s2.replace(
        '-- ---------------------------------------------------------------------------\n'
        '-- profiles\n',
        rls + '\n\n'
        '-- ---------------------------------------------------------------------------\n'
        '-- profiles\n', 1)
    s2 = s2.replace(
        '-- Operators reach clients through this column-filtered view instead.',
        admin + '\n\n-- Operators reach clients through this column-filtered view instead.', 1)
    s2 = s2.replace(
        '-- ---------------------------------------------------------------------------\n'
        '-- Synced tables',
        staff + '\n\n'
        '-- ---------------------------------------------------------------------------\n'
        '-- Synced tables', 1)
    s2 = s2.replace(
        '-- Two exceptions where a human edits synced data by hand.',
        synced + '\n\n-- Two exceptions where a human edits synced data by hand.', 1)

    # 3. Give every function body a distinctive tag so no splitter can pair the
    #    wrong delimiters.
    body = s1 + s2 + s3
    body = body.replace('as $$', 'as $fn$').replace('$$;', '$fn$;')

    assert 'do $$' not in body, 'a do-block survived'
    assert '%1$s' not in body, 'positional format arg survived'
    assert body.count('$fn$') % 2 == 0, 'unbalanced function quoting'

    header = """-- ============================================================================
-- NevadoMedia dashboard — complete database setup
--
-- Paste this WHOLE file into the Supabase SQL Editor and press Run. Once.
--
-- Generated by build-setup.py from the files in migrations/ and seed.sql.
-- Those remain the source of truth; this version has the loops expanded into
-- explicit statements because the SQL editor's statement splitter mishandles
-- dollar-quoted blocks. Do not edit this file by hand.
-- ============================================================================

"""
    footer = """

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
"""
    (here / 'setup.sql').write_text(header + body + '\n' + seed + footer)
    print('setup.sql written')

build()
