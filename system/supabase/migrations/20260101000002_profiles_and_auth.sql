-- Solar ERP — staff profiles, backed by Supabase Auth (module 17: Permissions).
--
-- Real accounts live in auth.users (Supabase-managed: email, password
-- hashing, sessions). This table only adds what auth.users doesn't have:
-- display name and the ERP role every RLS policy in this project checks.
--
-- Staff are created via the Auth Admin API by an Owner/Admin (see
-- config.toml: enable_signup = false) — the customer wizard's leads never
-- touch this table, they stay anonymous in `requests`.

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text not null,
  role       text not null check (role in ('OWNER','ADMIN','SALES','ENGINEER','FINANCE','WAREHOUSE')),
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Populates a profile row automatically whenever a staff account is
-- created in auth.users (Admin API `createUser` with
-- user_metadata: { name, role }). Defaults role to SALES if the caller
-- forgot to pass one, rather than failing the signup outright.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'role', 'SALES')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- SECURITY DEFINER so RLS policies elsewhere can call this without
-- recursing back into profiles' own RLS (the classic Supabase footgun).
-- Every policy in this project that needs "what role is the caller"
-- goes through this function, never a direct `select role from profiles`.
-- Named staff_role(), not current_role() — Postgres already has a
-- reserved CURRENT_ROLE keyword/function and there's no reason to court
-- ambiguity with it, even schema-qualified.
create or replace function public.staff_role()
returns text
language sql
stable
security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- coalesce(..., false) is load-bearing: staff_role() returns NULL for a
-- caller with no profile row (anon, or a deleted account), and plpgsql's
-- `if not <NULL>` silently evaluates as false — the guard clause never
-- fires and the exception it was supposed to raise never gets raised.
-- RLS policies are unaffected (NULL already reads as deny there), but
-- every RPC that gates on `if not is_owner_or(...)` depends on this
-- function never returning NULL.
create or replace function public.is_owner_or(variadic roles text[])
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce(public.staff_role() = 'OWNER' or public.staff_role() = any(roles), false);
$$;

-- Used both by RLS policies (20260101000007) and directly inside the CRM
-- write-path RPCs (20260101000006) to reject a deactivated-but-still-
-- logged-in staff member's mutation attempts.
create or replace function public.is_active_staff()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and active);
$$;
