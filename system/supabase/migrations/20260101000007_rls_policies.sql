-- Solar ERP — Row Level Security.
--
-- Every table below has RLS enabled. General shape:
--   - SELECT: any authenticated (active) staff member — Sales/Engineer
--     need product prices to quote, everyone needs Settings, etc.
--   - INSERT/UPDATE/DELETE: role-gated per table via staff_role()/
--     is_owner_or() (see 20260101000002_profiles_and_auth.sql) — OWNER
--     always passes, matching the server-side RBAC design this replaces.
--   - `requests`/`timeline_events`/`audit_logs` intentionally have NO
--     direct write policy for `authenticated` — those go through the
--     SECURITY DEFINER RPCs in 20260101000006, which run as the
--     migration-owning role and therefore bypass RLS (standard Supabase
--     behavior), so the append-only/audit guarantees can't be bypassed
--     by a client calling .insert()/.update() directly.

-- is_active_staff() now lives in 20260101000002_profiles_and_auth.sql —
-- the CRM write-path RPCs (20260101000006) need it too and run before
-- this file, so it moved next to staff_role()/is_owner_or() instead of
-- being defined here.

-- ── profiles ─────────────────────────────────────────────────
alter table public.profiles enable row level security;

create policy profiles_select_authenticated on public.profiles
  for select to authenticated
  using (true);

create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.is_owner_or('ADMIN'))
  with check (public.is_owner_or('ADMIN'));

-- ── requests / timeline_events ──────────────────────────────
alter table public.requests enable row level security;
alter table public.timeline_events enable row level security;

create policy requests_select_staff on public.requests
  for select to authenticated
  using (public.is_active_staff());

create policy timeline_events_select_staff on public.timeline_events
  for select to authenticated
  using (public.is_active_staff());

-- ── products / stock_movements ──────────────────────────────
alter table public.products enable row level security;
alter table public.stock_movements enable row level security;

create trigger stock_movements_no_update
  before update on public.stock_movements
  for each row execute function public.reject_timeline_mutation();
create trigger stock_movements_no_delete
  before delete on public.stock_movements
  for each row execute function public.reject_timeline_mutation();

create policy products_select_staff on public.products
  for select to authenticated
  using (public.is_active_staff());

create policy products_write_warehouse on public.products
  for all to authenticated
  using (public.is_owner_or('WAREHOUSE', 'ADMIN'))
  with check (public.is_owner_or('WAREHOUSE', 'ADMIN'));

create policy stock_movements_select_staff on public.stock_movements
  for select to authenticated
  using (public.is_active_staff());

create policy stock_movements_insert_warehouse on public.stock_movements
  for insert to authenticated
  with check (public.is_owner_or('WAREHOUSE', 'ADMIN'));

-- ── suppliers / purchase orders ─────────────────────────────
alter table public.suppliers enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;

create policy suppliers_select_staff on public.suppliers
  for select to authenticated using (public.is_active_staff());
create policy suppliers_write_warehouse on public.suppliers
  for all to authenticated
  using (public.is_owner_or('WAREHOUSE', 'ADMIN'))
  with check (public.is_owner_or('WAREHOUSE', 'ADMIN'));

create policy purchase_orders_select_staff on public.purchase_orders
  for select to authenticated using (public.is_active_staff());
create policy purchase_orders_write_warehouse on public.purchase_orders
  for all to authenticated
  using (public.is_owner_or('WAREHOUSE', 'ADMIN'))
  with check (public.is_owner_or('WAREHOUSE', 'ADMIN'));

create policy purchase_order_items_select_staff on public.purchase_order_items
  for select to authenticated using (public.is_active_staff());
create policy purchase_order_items_write_warehouse on public.purchase_order_items
  for all to authenticated
  using (public.is_owner_or('WAREHOUSE', 'ADMIN'))
  with check (public.is_owner_or('WAREHOUSE', 'ADMIN'));

-- ── packages ─────────────────────────────────────────────────
alter table public.packages enable row level security;
alter table public.package_components enable row level security;

create policy packages_select_staff on public.packages
  for select to authenticated using (public.is_active_staff());
create policy packages_write_admin on public.packages
  for all to authenticated
  using (public.is_owner_or('ADMIN'))
  with check (public.is_owner_or('ADMIN'));

create policy package_components_select_staff on public.package_components
  for select to authenticated using (public.is_active_staff());
create policy package_components_write_admin on public.package_components
  for all to authenticated
  using (public.is_owner_or('ADMIN'))
  with check (public.is_owner_or('ADMIN'));

-- ── projects / payments / installments / quotations ─────────
alter table public.projects enable row level security;
alter table public.payments enable row level security;
alter table public.installments enable row level security;
alter table public.quotations enable row level security;

create policy projects_select_staff on public.projects
  for select to authenticated using (public.is_active_staff());
create policy projects_write_sales on public.projects
  for all to authenticated
  using (public.is_owner_or('SALES', 'ADMIN', 'ENGINEER'))
  with check (public.is_owner_or('SALES', 'ADMIN', 'ENGINEER'));

create policy payments_select_staff on public.payments
  for select to authenticated using (public.is_active_staff());
create policy payments_write_finance on public.payments
  for all to authenticated
  using (public.is_owner_or('FINANCE', 'ADMIN'))
  with check (public.is_owner_or('FINANCE', 'ADMIN'));

create policy installments_select_staff on public.installments
  for select to authenticated using (public.is_active_staff());
create policy installments_write_finance on public.installments
  for all to authenticated
  using (public.is_owner_or('FINANCE', 'ADMIN'))
  with check (public.is_owner_or('FINANCE', 'ADMIN'));

create policy quotations_select_staff on public.quotations
  for select to authenticated using (public.is_active_staff());
create policy quotations_write_sales on public.quotations
  for all to authenticated
  using (public.is_owner_or('SALES', 'ADMIN'))
  with check (public.is_owner_or('SALES', 'ADMIN'));

-- ── audit_logs ───────────────────────────────────────────────
-- No write policy at all — every insert goes through record_audit(),
-- a SECURITY DEFINER function, never a direct client insert.
alter table public.audit_logs enable row level security;

create policy audit_logs_select_admin on public.audit_logs
  for select to authenticated
  using (public.is_owner_or('ADMIN'));

-- ── settings ─────────────────────────────────────────────────
alter table public.settings enable row level security;

create policy settings_select_staff on public.settings
  for select to authenticated using (public.is_active_staff());
create policy settings_write_admin on public.settings
  for update to authenticated
  using (public.is_owner_or('ADMIN', 'FINANCE'))
  with check (public.is_owner_or('ADMIN', 'FINANCE'));
