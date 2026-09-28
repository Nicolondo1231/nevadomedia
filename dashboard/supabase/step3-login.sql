-- ============================================================
-- STEP 3 of 3 — automatic profiles (optional)
-- Select all of this file, paste into the Supabase SQL Editor,
-- click Run, and wait for "Success".
-- If this one errors, ignore it — the dashboard still works.
-- ============================================================

-- PART 2 — run this ONLY if Part 1 above succeeded.
--
-- This makes new sign-ups get a profile row automatically. Supabase sometimes
-- refuses to let the SQL editor add a trigger to auth.users. If this part
-- errors, everything else is still fine and you can ignore it — just run the
-- snippet under "If Part 2 failed" below after creating your users.
-- ============================================================================

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- If Part 2 failed, create your users in Authentication -> Users first, then
-- run this to give them their roles:
--
--   insert into public.profiles (id, email, full_name, role)
--   select id, email, split_part(email, '@', 1),
--          case when lower(email) = 'sebastian@nevadomedia.info'
--               then 'admin'::user_role else 'operator'::user_role end
--   from auth.users
--   on conflict (id) do update set role = excluded.role;
