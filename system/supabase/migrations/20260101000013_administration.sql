-- Solar ERP — Administration module (Product Polish sprint).
--
-- Three pieces: (1) widen the role system to the 7 named roles the
-- product now exposes in a real Settings > Users screen, (2) a real
-- `branches` table replacing the hardcoded 2-entry array in
-- crm/assets/js/branches.js, (3) the remaining Company Settings fields.
--
-- Role rename: ENGINEER -> INSTALLER, FINANCE -> ACCOUNTANT (closer to
-- their real-world job titles), plus a new read-only VIEWER role. No
-- data migration risk — only the seeded OWNER account exists in
-- production today (confirmed before writing this), but the UPDATE
-- below is included anyway as a correctness guarantee, not a guess.
update public.profiles set role = 'INSTALLER'  where role = 'ENGINEER';
update public.profiles set role = 'ACCOUNTANT' where role = 'FINANCE';

alter table public.profiles
  drop constraint profiles_role_check,
  add constraint profiles_role_check check (role in (
    'OWNER','ADMIN','SALES','WAREHOUSE','ACCOUNTANT','INSTALLER','VIEWER'
  ));

-- VIEWER needs no new RLS anywhere: every existing SELECT policy already
-- gates on is_active_staff() (any active role), and VIEWER is deliberately
-- absent from every is_owner_or(...) write check below and elsewhere —
-- read-only falls out of the existing policy shape for free.

alter table public.profiles
  add column archived   boolean not null default false,
  add column branch_id  uuid;

create table public.branches (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique,  -- back-compat: matches existing requests.branch free-text values
  name        text not null,
  manager_id  uuid references public.profiles (id),
  phone       text,
  whatsapp    text,
  address     text,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger branches_set_updated_at before update on public.branches for each row execute function public.set_updated_at();

alter table public.profiles
  add constraint profiles_branch_id_fkey foreign key (branch_id) references public.branches (id);

-- Seed the two branches that already exist as a hardcoded array in
-- crm/assets/js/branches.js, same real WhatsApp numbers, so nothing
-- about the "Send to Kober/Madani Sales" feature breaks when that file
-- is switched to read from this table instead.
insert into public.branches (slug, name, phone, whatsapp) values
  ('kober',  'Kober',  '+249123679129', '+249123679129'),
  ('madani', 'Madani', '+249912234572', '+249912234572');

alter table public.settings
  add column company_address  text,
  add column company_email    text,
  add column company_phone    text,
  add column company_whatsapp text,
  add column timezone         text not null default 'Africa/Khartoum';

-- ── RLS: branches ────────────────────────────────────────────────
alter table public.branches enable row level security;
create policy branches_select_staff on public.branches
  for select to authenticated using (public.is_active_staff());
create policy branches_write_admin on public.branches
  for all to authenticated
  using (public.is_owner_or('ADMIN'))
  with check (public.is_owner_or('ADMIN'));

-- ── RLS: profiles gains a write policy ──────────────────────────
-- Profiles has been select-only since Phase A (accounts were meant to
-- be Admin-API-provisioned and otherwise untouched). A real Users
-- screen needs Admin/Owner to edit role/branch/active/archived/name —
-- the app UI (not this policy) additionally refuses to let an Admin
-- edit or deactivate an OWNER account or grant OWNER, as a guardrail;
-- consistent with how every other "ADMIN is broadly trusted" policy
-- already works in this project (e.g. products, packages).
create policy profiles_write_admin on public.profiles
  for update to authenticated
  using (public.is_owner_or('ADMIN'))
  with check (public.is_owner_or('ADMIN'));

-- ── Rename FINANCE -> ACCOUNTANT, ENGINEER -> INSTALLER in every
--    policy that referenced them (RLS policies can't ALTER, only
--    drop+recreate) ────────────────────────────────────────────────
drop policy projects_write_sales on public.projects;
create policy projects_write_sales on public.projects
  for all to authenticated
  using (public.is_owner_or('SALES', 'ADMIN', 'INSTALLER'))
  with check (public.is_owner_or('SALES', 'ADMIN', 'INSTALLER'));

drop policy payments_write_finance on public.payments;
create policy payments_write_accountant on public.payments
  for all to authenticated
  using (public.is_owner_or('ACCOUNTANT', 'ADMIN'))
  with check (public.is_owner_or('ACCOUNTANT', 'ADMIN'));

drop policy installments_write_finance on public.installments;
create policy installments_write_accountant on public.installments
  for all to authenticated
  using (public.is_owner_or('ACCOUNTANT', 'ADMIN'))
  with check (public.is_owner_or('ACCOUNTANT', 'ADMIN'));

drop policy settings_write_admin on public.settings;
create policy settings_write_admin on public.settings
  for update to authenticated
  using (public.is_owner_or('ADMIN', 'ACCOUNTANT'))
  with check (public.is_owner_or('ADMIN', 'ACCOUNTANT'));

drop policy receipts_finance_write on storage.objects;
create policy receipts_accountant_write on storage.objects
  for all to authenticated
  using (bucket_id = 'receipts' and public.is_owner_or('ACCOUNTANT', 'ADMIN'))
  with check (bucket_id = 'receipts' and public.is_owner_or('ACCOUNTANT', 'ADMIN'));
