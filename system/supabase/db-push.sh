#!/usr/bin/env bash
# Push pending migrations to the live Supabase project via the session
# pooler (the direct db.<ref>.supabase.co host is IPv6-only and
# unreachable from this dev environment — see .db-url for details).
# Usage: bash supabase/db-push.sh [supabase db push flags...]
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

DB_URL="postgresql://postgres.ywjvmnzutsphkkljbqwe:$(cat supabase/.db-password)@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"

supabase db push --db-url "$DB_URL" "$@"
