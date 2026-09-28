#!/usr/bin/env bash
# Runs the migrations and RLS assertions against a throwaway local Postgres.
# Needs postgresql-16 server binaries. No network, no Supabase project.
#
#   ./supabase/test/run-tests.sh
#
# Exit code 0 means the schema applies cleanly, the seed is idempotent, and
# the operator role cannot reach any financial data.

set -euo pipefail
cd "$(dirname "$0")/../.."

PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}
PGDATA=${PGDATA:-/var/tmp/nevado-pgtest}
PORT=${PORT:-55432}
PSQL="psql -h /tmp -p $PORT -U postgres -q -v ON_ERROR_STOP=1"
OP=22222222-2222-2222-2222-222222222222
AD=11111111-1111-1111-1111-111111111111
FAILED=0

cleanup() { su postgres -c "$PGBIN/pg_ctl -D $PGDATA -m immediate stop" >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo "==> starting throwaway cluster on port $PORT"
cleanup
rm -rf "$PGDATA"; mkdir -p "$PGDATA"; chown postgres:postgres "$PGDATA"; chmod 700 "$PGDATA"
su postgres -c "$PGBIN/initdb -D $PGDATA -A trust -U postgres" >/dev/null
su postgres -c "$PGBIN/pg_ctl -D $PGDATA -o '-p $PORT -k /tmp' -l $PGDATA/log -w start" >/dev/null

echo "==> applying shim + migrations + seed (seed twice, to prove idempotency)"
$PSQL -f supabase/test/00_supabase_shim.sql        >/dev/null
$PSQL -f supabase/migrations/0001_schema.sql       >/dev/null
$PSQL -f supabase/migrations/0002_rls.sql          >/dev/null
$PSQL -f supabase/migrations/0003_phase3.sql       >/dev/null
$PSQL -f supabase/seed.sql                         >/dev/null
$PSQL -f supabase/seed.sql                         >/dev/null
$PSQL -c "insert into auth.users (id,email) values
  ('$AD','sebastian@nevadomedia.info'),('$OP','nico@nevadomedia.info');" >/dev/null

# assert <label> <expected-substring> <role> <uid> <sql>
assert() {
  local label=$1 want=$2 role=$3 uid=$4 sql=$5
  local got
  got=$(psql -h /tmp -p "$PORT" -U postgres 2>&1 <<SQL | grep -oE 'INSERT 0 [0-9]+|UPDATE [0-9]+|DELETE [0-9]+|ERROR:[^)]*|^ *[0-9.]+ *$' | head -1 | xargs
BEGIN;
SET LOCAL role $role;
$( [ -n "$uid" ] && echo "SET LOCAL request.jwt.claim.sub = '$uid';" )
$sql;
ROLLBACK;
SQL
)
  if [[ "$got" == *"$want"* ]]; then
    printf '  ok   %-44s %s\n' "$label" "$got"
  else
    printf '  FAIL %-44s got:%-22s want:%s\n' "$label" "$got" "$want"
    FAILED=1
  fi
}

echo "==> operator (Nico) must not reach money"
assert "clients direct blocked"     "0"        authenticated "$OP" "select count(*) from public.clients"
assert "clients_ops readable"       "6"        authenticated "$OP" "select count(*) from public.clients_ops"
assert "expenses blocked"           "0"        authenticated "$OP" "select count(*) from public.expenses"
assert "weekly_metrics blocked"     "0"        authenticated "$OP" "select count(*) from public.weekly_metrics"
assert "stripe_payments blocked"    "0"        authenticated "$OP" "select count(*) from public.stripe_payments"
assert "retainer update blocked"    "UPDATE 0" authenticated "$OP" "update public.clients set retainer=99 where name='Karol'"
assert "expense insert blocked"     "ERROR"    authenticated "$OP" "insert into public.expenses (month,category,amount) values (current_date,'x',1)"
assert "client insert blocked"      "ERROR"    authenticated "$OP" "insert into public.clients_ops (name) values ('nope')"
assert "client delete blocked"      "ERROR"    authenticated "$OP" "delete from public.clients_ops where name='Karol'"

assert "app_settings blocked"       "0"        authenticated "$OP" "select count(*) from public.app_settings"
assert "app_settings write blocked" "ERROR"    authenticated "$OP" "insert into public.app_settings (key,value) values ('x','1')"

echo "==> operator can do operations"
assert "notes update allowed"       "UPDATE 1" authenticated "$OP" "update public.clients_ops set notes='x' where name='Karol'"
assert "content card insert"        "INSERT 0 1" authenticated "$OP" "insert into public.content_pipeline (client_id,title) select id,'t' from public.clients_ops limit 1"

echo "==> admin (Sebastian) sees everything"
assert "clients visible"            "6"        authenticated "$AD" "select count(*) from public.clients"
assert "retainer sum"               "4500"     authenticated "$AD" "select sum(retainer) from public.clients"
assert "expenses sum"               "2500"     authenticated "$AD" "select sum(amount) from public.expenses"
assert "team_size setting"          "3"        authenticated "$AD" "select value::text from public.app_settings where key='team_size'"

echo "==> anonymous visitor: funnel write-only"
assert "funnel insert allowed"      "INSERT 0 1" anon "" "insert into public.funnel_events (session_id,stage) values ('abcd1234efgh','visitor')"
assert "funnel read blocked"        "0"        anon "" "select count(*) from public.funnel_events"
assert "clients_ops blocked"        "ERROR"    anon "" "select count(*) from public.clients_ops"

echo "==> seed idempotency (ran twice above)"
assert "clients still 6"            "6"        authenticated "$AD" "select count(*) from public.clients"

if [ "$FAILED" -eq 0 ]; then echo "ALL CHECKS PASSED"; else echo "SOME CHECKS FAILED"; fi
exit $FAILED
