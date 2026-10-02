-- Solar ERP — Phase B Module 2 (Live Pricing Engine).
--
-- The calculator's package pricing (assets/js/calculations.js
-- calcPackagePrice) used mock constants for panel/battery/inverter unit
-- prices and three flat fees (see the "Pricing (mock — replace with API
-- in production)" comment in constants.js). This migration adds what's
-- needed to price live from real data instead:
--
--   - products.capacity_watts / capacity_kwh: structured capacity so a
--     panel's or inverter's $/W, or a battery's $/kWh, can be derived
--     from its actual selling_price instead of assuming every unit is a
--     standard 400W panel / 500W inverter block. Nullable — only
--     SOLAR_PANEL/INVERTER (watts) and BATTERY (kwh) populate these;
--     other categories leave them null.
--   - settings.protection_base / mppt_base: the two remaining flat fees
--     that don't map to a stocked product line. default_installation_cost
--     already existed (Phase A) and now doubles as the live source for
--     the third. Defaults match the old mock constants exactly, so
--     nothing changes in computed price until an Owner/Admin edits them.

alter table public.products
  add column capacity_watts numeric check (capacity_watts is null or capacity_watts > 0),
  add column capacity_kwh   numeric check (capacity_kwh is null or capacity_kwh > 0);

alter table public.settings
  add column protection_base numeric not null default 80,
  add column mppt_base       numeric not null default 100;

-- create_product needs two more optional params. The signature changes,
-- so the old 13-arg overload must be dropped explicitly — CREATE OR
-- REPLACE with an appended parameter creates a second overload instead
-- of replacing it, which would leave PostgREST with an ambiguous RPC name.
drop function if exists public.create_product(text, text, text, text, text, text, numeric, numeric, integer, integer, text, text, uuid);

create or replace function public.create_product(
  p_sku              text,
  p_category         text,
  p_brand            text,
  p_model            text,
  p_specification    text,
  p_unit             text,
  p_purchase_price   numeric,
  p_selling_price    numeric,
  p_initial_quantity integer,
  p_min_stock        integer,
  p_warranty         text,
  p_notes            text,
  p_supplier_id      uuid,
  p_capacity_watts   numeric default null,
  p_capacity_kwh     numeric default null
)
returns public.products
language plpgsql
security definer set search_path = public
as $$
declare
  v_row public.products;
begin
  if not public.is_owner_or('WAREHOUSE', 'ADMIN') then
    raise exception 'Only Warehouse/Admin/Owner can create products.';
  end if;

  insert into public.products (
    sku, category, brand, model, specification, unit,
    purchase_price, selling_price, quantity, min_stock, warranty, notes, supplier_id,
    capacity_watts, capacity_kwh
  ) values (
    p_sku, p_category, p_brand, p_model, p_specification, coalesce(p_unit, 'pcs'),
    p_purchase_price, p_selling_price, greatest(coalesce(p_initial_quantity, 0), 0),
    coalesce(p_min_stock, 0), p_warranty, p_notes, p_supplier_id,
    p_capacity_watts, p_capacity_kwh
  )
  returning * into v_row;

  if coalesce(p_initial_quantity, 0) > 0 then
    insert into public.stock_movements (product_id, type, quantity, reason, user_id)
    values (v_row.id, 'MANUAL_IN', p_initial_quantity, 'Initial stock on creation', auth.uid());
  end if;

  return v_row;
end;
$$;

grant execute on function public.create_product(text, text, text, text, text, text, numeric, numeric, integer, integer, text, text, uuid, numeric, numeric) to authenticated;

-- The customer-facing calculator (assets/js/pricing-engine.js) needs live
-- unit prices, but it runs unauthenticated — RLS on products/settings is
-- staff-only (products_select_staff, settings_select_staff), and rightly
-- so: purchase_price, stock quantities and supplier links are internal
-- data an anonymous visitor should never see. This RPC is the same
-- pattern as create_request() — a narrow, read-only, SECURITY DEFINER
-- surface that returns only aggregated selling-price averages and the
-- three flat fees, nothing row-level, nothing cost-level.
create or replace function public.get_live_pricing()
returns jsonb
language sql
stable
security definer set search_path = public
as $$
  select jsonb_build_object(
    'panelPerWatt', (
      select avg(selling_price / capacity_watts)
      from public.products
      where category = 'SOLAR_PANEL' and status = 'ACTIVE' and capacity_watts > 0
    ),
    'batteryPerKwh', (
      select avg(selling_price / capacity_kwh)
      from public.products
      where category = 'BATTERY' and status = 'ACTIVE' and capacity_kwh > 0
    ),
    'inverterPerWatt', (
      select avg(selling_price / capacity_watts)
      from public.products
      where category = 'INVERTER' and status = 'ACTIVE' and capacity_watts > 0
    ),
    'installationBase', (select default_installation_cost from public.settings where id = 1),
    'protectionBase',   (select protection_base           from public.settings where id = 1),
    'mpptBase',         (select mppt_base                 from public.settings where id = 1)
  );
$$;

grant execute on function public.get_live_pricing() to anon, authenticated;
