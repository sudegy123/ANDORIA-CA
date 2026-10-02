-- Solar ERP — cleanup for 20260101000013.
--
-- That migration added `profiles_write_admin`, not realizing Phase A
-- already shipped `profiles_update_admin` (20260101000007) with the
-- identical definition (for update ... using is_owner_or('ADMIN') ...).
-- Harmless — Postgres OR-combines redundant permissive policies — but
-- sloppy. Drop the duplicate; the original stays.

drop policy if exists profiles_write_admin on public.profiles;
