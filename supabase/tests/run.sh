#!/usr/bin/env bash
#
# Applies every supabase/migrations/*.sql against a throwaway local Postgres,
# in the same order the Supabase CLI would, then checks the behaviour that
# cannot be read off the DDL: the generated columns, the snapshot rules, rename
# propagation, the commission trigger, and RLS.
#
# Needs a local Postgres install (initdb, pg_ctl, psql) and nothing else — no
# Supabase project, no network. 00_shim.sql supplies the pieces Supabase would
# normally provide: the auth and storage schemas, auth.uid(), pgcrypto, and the
# anon / authenticated / service_role roles.
#
#   ./supabase/tests/run.sh
#
# Exits non-zero if any file fails to apply. The behavioural assertions are
# printed with their expected values next to them — read the output.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS="$(dirname "$HERE")/migrations"
WORK="${TMPDIR:-/tmp}/mcn-schema-test.$$"
PORT="${PGTEST_PORT:-55433}"

PGBIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | tail -1 || true)"
[ -z "$PGBIN" ] && PGBIN="$(dirname "$(command -v initdb)")"

cleanup() {
  su_run "$PGBIN/pg_ctl -D $WORK/pgdata -m immediate stop" >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

# initdb refuses to run as root, so drop to the postgres user when we are it.
if [ "$(id -u)" = "0" ] && id postgres >/dev/null 2>&1; then
  su_run() { su postgres -c "$1"; }
  AS_POSTGRES=1
else
  su_run() { bash -c "$1"; }
  AS_POSTGRES=0
fi

mkdir -p "$WORK/pgdata" "$WORK/run"
if [ "$AS_POSTGRES" = "1" ]; then
  chmod o+x "$WORK" 2>/dev/null || true
  chown postgres:postgres "$WORK" "$WORK/pgdata" "$WORK/run"
  chmod 700 "$WORK/pgdata"
fi

echo "Starting Postgres on port $PORT…"
su_run "$PGBIN/initdb -D $WORK/pgdata -U postgres --auth=trust" >"$WORK/initdb.log" 2>&1
su_run "$PGBIN/pg_ctl -w -D $WORK/pgdata -o '-p $PORT -k $WORK/run -c listen_addresses=' -l $WORK/pg.log start" >/dev/null

export PGHOST="$WORK/run" PGPORT="$PORT" PGUSER=postgres PGDATABASE=postgres

for f in "$HERE/00_shim.sql" "$MIGRATIONS"/*.sql; do
  if psql -q -v ON_ERROR_STOP=1 -f "$f" >"$WORK/apply.log" 2>&1; then
    echo "  applied $(basename "$f")"
  else
    echo "  FAILED  $(basename "$f")"; grep -i error "$WORK/apply.log" | head -5; exit 1
  fi
done

echo
for f in "$HERE"/[123]0_*.sql; do
  echo "──────── $(basename "$f") ────────"
  psql -q -f "$f" 2>&1
  echo
done

echo "Done. Read the expectations printed beside each check."
