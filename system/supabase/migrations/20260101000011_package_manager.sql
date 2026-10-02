-- Solar ERP — Phase B Module 3 (Package Manager).
--
-- Replaces the calculator's fixed essential/standard/premium formula
-- tiers (Module 2's live-priced version of the original mock tiers) with
-- real packages staff build from actual Inventory products. The formula
-- tiers stay in the codebase as a fallback (assets/js/app.js buildPackages)
-- for the period before any packages are published — the wizard must
-- never show an empty step.
--
-- `packages` had single name/description columns from Phase A (unused —
-- table confirmed empty before this migration) and no application code
-- read/wrote them yet. Splitting into _en/_ar now, before anything
-- depends on the old shape, since every other customer-facing string in
-- this project is bilingual.

alter table public.packages
  drop column name,
  drop column description,
  add column name_en text not null,
  add column name_ar text not null,
  add column description_en text,
  add column description_ar text;

-- Read: computed live price + aggregated specs + a component "bill of
-- materials" (category/brand/model/qty/capacity — never purchase_price,
-- stock quantity or supplier, same reasoning as get_live_pricing). Called
-- by both the anonymous calculator (ACTIVE packages only) and staff in
-- the CRM Package Manager (all statuses, to preview DRAFT/ARCHIVED
-- pricing while editing).
create or replace function public.get_priced_packages()
returns jsonb
language sql
stable
security definer set search_path = public
as $$
  select coalesce(jsonb_agg(pkg_row), '[]'::jsonb) from (
    select jsonb_build_object(
      'id', pk.id,
      'nameEn', pk.name_en,
      'nameAr', pk.name_ar,
      'descriptionEn', pk.description_en,
      'descriptionAr', pk.description_ar,
      'status', pk.status,
      'installationCost', pk.installation_cost,
      'defaultMarginPct', pk.default_margin_pct,
      'price', pk.installation_cost + coalesce((
        select sum(pc.quantity * p.selling_price)
        from public.package_components pc join public.products p on p.id = pc.product_id
        where pc.package_id = pk.id
      ), 0),
      'totalPanelWatts', coalesce((
        select sum(pc.quantity * p.capacity_watts)
        from public.package_components pc join public.products p on p.id = pc.product_id
        where pc.package_id = pk.id and p.category = 'SOLAR_PANEL'
      ), 0),
      'totalBatteryKwh', coalesce((
        select sum(pc.quantity * p.capacity_kwh)
        from public.package_components pc join public.products p on p.id = pc.product_id
        where pc.package_id = pk.id and p.category = 'BATTERY'
      ), 0),
      'totalInverterWatts', coalesce((
        select sum(pc.quantity * p.capacity_watts)
        from public.package_components pc join public.products p on p.id = pc.product_id
        where pc.package_id = pk.id and p.category = 'INVERTER'
      ), 0),
      'components', coalesce((
        select jsonb_agg(jsonb_build_object(
          'productId', pc.product_id, 'category', p.category, 'brand', p.brand, 'model', p.model,
          'quantity', pc.quantity, 'capacityWatts', p.capacity_watts, 'capacityKwh', p.capacity_kwh,
          'warranty', p.warranty, 'unitPrice', p.selling_price
        ) order by p.category)
        from public.package_components pc join public.products p on p.id = pc.product_id
        where pc.package_id = pk.id
      ), '[]'::jsonb)
    ) as pkg_row
    from public.packages pk
    where pk.status = 'ACTIVE' or public.is_active_staff()
  ) t;
$$;

grant execute on function public.get_priced_packages() to anon, authenticated;

-- Write: staff-only (packages_write_admin RLS already allows ADMIN/OWNER
-- direct writes, but replacing a package's full component list needs to
-- be atomic — a client-side "delete old components, insert new ones" can
-- fail halfway and leave a $0, zero-component package visible to
-- customers mid-edit). p_id null = create; non-null = replace in place.
-- p_components: jsonb array of {"productId": uuid, "quantity": int}.
create or replace function public.upsert_package(
  p_id                uuid,
  p_name_en           text,
  p_name_ar           text,
  p_description_en    text,
  p_description_ar    text,
  p_installation_cost numeric,
  p_default_margin_pct numeric,
  p_status            text,
  p_components        jsonb
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_id uuid;
  v_component jsonb;
begin
  if not public.is_owner_or('ADMIN') then
    raise exception 'Only Admin/Owner can manage packages.';
  end if;
  if jsonb_array_length(p_components) = 0 then
    raise exception 'A package needs at least one component.';
  end if;

  if p_id is null then
    insert into public.packages (name_en, name_ar, description_en, description_ar, installation_cost, default_margin_pct, status)
    values (p_name_en, p_name_ar, p_description_en, p_description_ar, coalesce(p_installation_cost, 0), coalesce(p_default_margin_pct, 0), coalesce(p_status, 'DRAFT'))
    returning id into v_id;
  else
    update public.packages set
      name_en = p_name_en, name_ar = p_name_ar,
      description_en = p_description_en, description_ar = p_description_ar,
      installation_cost = coalesce(p_installation_cost, 0),
      default_margin_pct = coalesce(p_default_margin_pct, 0),
      status = coalesce(p_status, status)
    where id = p_id
    returning id into v_id;
    if v_id is null then raise exception 'Package not found.'; end if;

    delete from public.package_components where package_id = v_id;
  end if;

  for v_component in select * from jsonb_array_elements(p_components) loop
    insert into public.package_components (package_id, product_id, quantity)
    values (v_id, (v_component->>'productId')::uuid, (v_component->>'quantity')::integer);
  end loop;

  return v_id;
end;
$$;

grant execute on function public.upsert_package(uuid, text, text, text, text, numeric, numeric, text, jsonb) to authenticated;
