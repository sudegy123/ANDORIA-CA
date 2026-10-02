-- Solar ERP — CRM write path, as SECURITY DEFINER RPCs rather than direct
-- table INSERT/UPDATE. Two reasons:
--   1. The anonymous customer wizard must be able to CREATE a request
--      without being able to set its status/branch/assignedSales, which
--      a plain RLS insert policy on the whole row can't express cleanly.
--   2. Every mutation must also append a timeline_events row, atomically —
--      going through one function per operation is what makes "every
--      change is audited" a database guarantee instead of a convention
--      the frontend has to remember to follow.
-- The Repository layer (assets/js/crm-store.js) calls these via
-- supabase.rpc(...) instead of .from('requests').insert()/.update().

-- ── jsonb path helpers ──────────────────────────────────────
create or replace function public.jsonb_get(obj jsonb, path text)
returns jsonb language sql immutable as $$
  select obj #> string_to_array(path, '.');
$$;

create or replace function public.jsonb_get_text(obj jsonb, path text)
returns text language sql immutable as $$
  select obj #>> string_to_array(path, '.');
$$;

create or replace function public.jsonb_has_path(obj jsonb, path text)
returns boolean language sql immutable as $$
  select (obj #> string_to_array(path, '.')) is not null;
$$;

-- ── current staff display name, for timeline attribution ────
create or replace function public.current_staff_name()
returns text
language sql
stable
security definer set search_path = public
as $$
  select coalesce((select name from public.profiles where id = auth.uid()), 'Staff');
$$;

-- ── create_request — called by the anonymous wizard at checkout ────
create or replace function public.create_request(
  p_lang      text,
  p_customer  jsonb,
  p_recipient jsonb,
  p_property  jsonb,
  p_system    jsonb
)
returns public.requests
language plpgsql
security definer set search_path = public
as $$
declare
  v_row    public.requests;
  v_system jsonb := p_system;
begin
  if not (v_system ? 'monthlyConsumptionKwh') then
    v_system := v_system || jsonb_build_object(
      'monthlyConsumptionKwh', round(coalesce((v_system ->> 'dailyWh')::numeric, 0) * 30 / 1000)
    );
  end if;
  if coalesce(v_system ->> 'systemSize', '') = '' then
    v_system := v_system || jsonb_build_object(
      'systemSize',
      case when coalesce((v_system ->> 'panelCount')::numeric, 0) > 0
        then (v_system ->> 'panelCount') || ' × 400W'
        else ''
      end
    );
  end if;

  insert into public.requests (lang, customer, recipient, property, system)
  values (coalesce(p_lang, 'ar'), p_customer, p_recipient, p_property, v_system)
  returning * into v_row;

  insert into public.timeline_events (request_id, type, status, event_user)
  values (v_row.id, 'created', 'new_lead', 'Solar Smart Advisor Calculator');

  return v_row;
end;
$$;

grant execute on function public.create_request(text, jsonb, jsonb, jsonb, jsonb) to anon, authenticated;

-- ── update_request_status ───────────────────────────────────
create or replace function public.update_request_status(p_request_id text, p_new_status text)
returns public.requests
language plpgsql
security definer set search_path = public
as $$
declare
  v_row        public.requests;
  v_old_status text;
begin
  if not public.is_active_staff() then
    raise exception 'Your account is inactive — contact an admin.';
  end if;

  select * into v_row from public.requests where id = p_request_id for update;
  if not found then raise exception 'Request % not found', p_request_id; end if;
  if v_row.status = p_new_status then return v_row; end if;

  v_old_status := v_row.status;

  update public.requests set status = p_new_status where id = p_request_id returning * into v_row;
  insert into public.timeline_events (request_id, type, status, from_status, event_user)
  values (p_request_id, 'status', p_new_status, v_old_status, public.current_staff_name());

  return v_row;
end;
$$;

grant execute on function public.update_request_status(text, text) to authenticated;

-- ── add_request_note ────────────────────────────────────────
create or replace function public.add_request_note(p_request_id text, p_text text)
returns public.requests
language plpgsql
security definer set search_path = public
as $$
declare
  v_row public.requests;
begin
  if not public.is_active_staff() then
    raise exception 'Your account is inactive — contact an admin.';
  end if;
  if p_text is null or btrim(p_text) = '' then
    raise exception 'Note text is required';
  end if;

  select * into v_row from public.requests where id = p_request_id;
  if not found then raise exception 'Request % not found', p_request_id; end if;

  insert into public.timeline_events (request_id, type, note_text, event_user)
  values (p_request_id, 'note', btrim(p_text), public.current_staff_name());

  update public.requests set updated_at = now() where id = p_request_id returning * into v_row;
  return v_row;
end;
$$;

grant execute on function public.add_request_note(text, text) to authenticated;

-- ── update_request_fields — the Edit Request form's save action ────
-- One timeline entry PER changed field (never a bulk "updated" entry) —
-- same TRACKED_FIELDS set the frontend has followed since Phase 2,
-- ported here as the single source of truth.
create or replace function public.update_request_fields(p_request_id text, p_patch jsonb)
returns public.requests
language plpgsql
security definer set search_path = public
as $$
declare
  v_row     public.requests;
  v_current jsonb;
  v_actor   text := public.current_staff_name();
  rec       record;
  v_before  text;
  v_after   text;
  v_changed boolean := false;
begin
  if not public.is_active_staff() then
    raise exception 'Your account is inactive — contact an admin.';
  end if;

  select * into v_row from public.requests where id = p_request_id for update;
  if not found then raise exception 'Request % not found', p_request_id; end if;

  v_current := jsonb_build_object(
    'customer', v_row.customer,
    'property', v_row.property,
    'system', v_row.system,
    'notes', to_jsonb(v_row.notes),
    'branch', to_jsonb(v_row.branch),
    'assignedSales', to_jsonb(v_row.assigned_sales),
    'priority', to_jsonb(v_row.priority)
  );

  for rec in
    select * from (values
      ('customer.name', 'nameUpdated'),
      ('customer.mobileCountry', 'phoneUpdated'),
      ('customer.mobile', 'phoneUpdated'),
      ('customer.whatsapp', 'whatsappUpdated'),
      ('customer.email', 'emailUpdated'),
      ('customer.location', 'countryUpdated'),
      ('customer.city', 'cityUpdated'),
      ('customer.address', 'addressUpdated'),
      ('customer.mapsLink', 'mapsUpdated'),
      ('property.propertyType', 'propertyUpdated'),
      ('system.monthlyConsumptionKwh', 'consumptionUpdated'),
      ('system.packageId', 'packageChanged'),
      ('system.systemSize', 'systemSizeUpdated'),
      ('system.batteryKwh', 'batteryUpdated'),
      ('system.inverterW', 'inverterUpdated'),
      ('system.packagePrice', 'priceUpdated'),
      ('notes', 'notesUpdated'),
      ('branch', 'branchChanged'),
      ('assignedSales', 'assignedSalesChanged'),
      ('priority', 'priorityChanged')
    ) as t(path, action)
  loop
    if public.jsonb_has_path(p_patch, rec.path) then
      v_before := public.jsonb_get_text(v_current, rec.path);
      v_after  := public.jsonb_get_text(p_patch, rec.path);
      if v_before is distinct from v_after then
        v_current := jsonb_set(v_current, string_to_array(rec.path, '.'), public.jsonb_get(p_patch, rec.path), true);
        insert into public.timeline_events (request_id, type, action, field, before_val, after_val, event_user)
        values (p_request_id, 'field', rec.action, rec.path, v_before, v_after, v_actor);
        v_changed := true;
      end if;
    end if;
  end loop;

  if not v_changed then
    return v_row;
  end if;

  update public.requests set
    customer       = v_current -> 'customer',
    property       = v_current -> 'property',
    system         = v_current -> 'system',
    notes          = coalesce(v_current ->> 'notes', ''),
    branch         = v_current ->> 'branch',
    assigned_sales = coalesce(v_current ->> 'assignedSales', ''),
    priority       = coalesce(v_current ->> 'priority', 'medium')
  where id = p_request_id
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.update_request_fields(text, jsonb) to authenticated;
