# Push pending migrations to the live Supabase project via the session
# pooler (the direct db.<ref>.supabase.co host is IPv6-only and
# unreachable from this dev environment - see .db-url for details).
# Usage: powershell -File supabase/db-push.ps1 [supabase db push flags...]
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$password = Get-Content "supabase/.db-password" -Raw
$password = $password.Trim()
$dbUrl = "postgresql://postgres.ywjvmnzutsphkkljbqwe:$password@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"

supabase db push --db-url $dbUrl @args
