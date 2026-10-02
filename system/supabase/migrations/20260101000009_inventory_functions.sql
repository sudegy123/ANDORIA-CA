-- Solar ERP — Phase B Module 1 (Inventory Management) write-path RPCs.
--
-- Additive only — no table/column changes. Two functions, mirroring the
-- exact pattern the CRM write-path already uses (20260101000006):
-- product creation + stock quantity changes need to be atomic (a plain
-- client-side "read quantity, compute new value, write it back" is a
-- race condition waiting to happen the moment two staff touch the same
-- product at once), so both go through SECURITY DEFINER functions that
-- do the read+insert+update in one transaction, with the write-role
-- check enforced server-side as defense in depth alongside RLS.

create or replace function public.create_product(
  p_sku             text,
  p_category        text,
  p_brand           text,
  p_model           text,
  p_specification   text,
  p_unit            text,
  p_purchase_price  numeric,
  p_selling_price   numeric,
  p_initial_quantity integer,
  p_min_stock       integer,
  p_warranty        text,
  p_notes           text,
  p_supplier_id     uuid
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
    purchase_price, selling_price, quantity, min_stock, warranty, notes, supplier_id
  ) values (
    p_sku, p_category, p_brand, p_model, p_specification, coalesce(p_unit, 'pcs'),
    p_purchase_price, p_selling_price, greatest(coalesce(p_initial_quantity, 0), 0),
    coalesce(p_min_stock, 0), p_warranty, p_notes, p_supplier_id
  )
  returning * into v_row;

  if coalesce(p_initial_quantity, 0) > 0 then
    insert into public.stock_movements (product_id, type, quantity, reason, user_id)
    values (v_row.id, 'MANUAL_IN', p_initial_quantity, 'Initial stock on creation', auth.uid());
  end if;

  return v_row;
end;
$$;

grant execute on function public.create_product(text, text, text, text, text, text, numeric, numeric, integer, integer, text, text, uuid) to authenticated;

-- p_type: MANUAL_IN | MANUAL_OUT — the only two directions Module 1's UI
-- exposes. RESERVED/DEDUCTED/RETURNED (Module 7, Inventory Reservation)
-- get their own function once the Project workflow status transitions
-- exist to hook into, same reasoning as the original Phase A note.
create or replace function public.adjust_stock(
  p_product_id uuid,
  p_type       text,
  p_delta      integer,
  p_reason     text
)
returns public.products
language plpgsql
security definer set search_path = public
as $$
declare
  v_product     public.products;
  v_new_qty     integer;
begin
  if not public.is_owner_or('WAREHOUSE', 'ADMIN') then
    raise exception 'Only Warehouse/Admin/Owner can adjust stock.';
  end if;
  if p_type not in ('MANUAL_IN', 'MANUAL_OUT') then
    raise exception 'Invalid adjustment type: %', p_type;
  end if;
  if p_delta is null or p_delta <= 0 then
    raise exception 'Quantity must be greater than 0.';
  end if;

  select * into v_product from public.products where id = p_product_id for update;
  if not found then raise exception 'Product not found.'; end if;

  v_new_qty := case when p_type = 'MANUAL_IN' then v_product.quantity + p_delta else v_product.quantity - p_delta end;
  if v_new_qty < 0 then
    raise exception 'Only % units in stock — cannot remove %.', v_product.quantity, p_delta;
  end if;

  insert into public.stock_movements (product_id, type, quantity, reason, user_id)
  values (p_product_id, p_type, p_delta, p_reason, auth.uid());

  update public.products set quantity = v_new_qty where id = p_product_id returning * into v_product;
  return v_product;
end;
$$;

grant execute on function public.adjust_stock(uuid, text, integer, text) to authenticated;
