-- Marketing/branding upgrade (2026-08-20):
--   1. Real WhatsApp/phone number in Company Settings (the customer
--      wizard reads these via get_public_company_info(), never hardcoded).
--   2. Fix create_request()'s stale "400W" fallback — it silently
--      fabricated a panel wattage whenever the caller omitted
--      systemSize, which crm-store.js's createRequest() has ALWAYS
--      done (it never sends that field), meaning every customer lead
--      saved to the CRM has been recording a fake "N × 400W" system
--      size regardless of the real panel class. Frontend now sends the
--      real class; this fallback is rewritten to never assume a
--      wattage it wasn't given.
--   3. Campaign slot counter for the "free installation, first 100
--      customers" offer — persisted server-side (not a client-side
--      counter that resets on refresh), with per-phone-number
--      deduplication so repeated submissions/clicks/WhatsApp-opens by
--      the same lead can never consume more than one slot.

-- ── 1. Real contact number ─────────────────────────────────────────
update public.settings
set company_whatsapp = '249123679129',
    company_phone    = '249123679129'
where id = 1;

-- ── 2. Fix create_request()'s hardcoded 400W fallback ──────────────
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
    -- Never assume a panel wattage the caller didn't provide — the
    -- catalog is brand/class-agnostic (550/585/625/715W and future
    -- classes), so a hardcoded number here would misrepresent
    -- whichever class this customer's system actually used.
    v_system := v_system || jsonb_build_object(
      'systemSize',
      case when coalesce((v_system ->> 'panelCount')::numeric, 0) > 0
        then (v_system ->> 'panelCount') || ' panels'
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

-- ── 3. Campaign slot counter ────────────────────────────────────────
create table public.campaign_slots (
  id          text primary key,
  slots_total integer not null check (slots_total > 0),
  slots_used  integer not null default 0 check (slots_used >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger campaign_slots_set_updated_at
  before update on public.campaign_slots
  for each row execute function public.set_updated_at();

insert into public.campaign_slots (id, slots_total, slots_used)
values ('first_100_install', 100, 0);

-- Per-lead claim record — the actual anti-duplication mechanism. The
-- unique (campaign_id, phone_normalized) constraint means the SAME
-- customer (by phone) can never consume more than one slot no matter
-- how many times they resubmit, across sessions, devices, or refreshes.
create table public.campaign_slot_claims (
  id                uuid primary key default gen_random_uuid(),
  campaign_id       text not null references public.campaign_slots(id),
  phone_normalized  text not null,
  request_id        text references public.requests(id),
  created_at        timestamptz not null default now(),
  unique (campaign_id, phone_normalized)
);

alter table public.campaign_slots enable row level security;
alter table public.campaign_slot_claims enable row level security;
-- No direct SELECT/INSERT policies for anon or staff on either table —
-- matches the settings/requests pattern established elsewhere in this
-- schema: all access (including staff) goes through narrow RPCs below,
-- and the anon customer wizard specifically only ever gets the two
-- functions granted to it.

create or replace function public.get_campaign_status(p_campaign_id text)
returns jsonb
language sql
stable
security definer set search_path = public
as $$
  select jsonb_build_object(
    'slotsTotal', slots_total,
    'slotsUsed',  slots_used,
    'remaining',  greatest(slots_total - slots_used, 0)
  )
  from public.campaign_slots
  where id = p_campaign_id;
$$;
grant execute on function public.get_campaign_status(text) to anon, authenticated;

create or replace function public.claim_campaign_slot(p_campaign_id text, p_phone text, p_request_id text default null)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_phone   text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_claimed boolean := false;
  v_status  public.campaign_slots;
begin
  if v_phone = '' then
    -- No usable phone to dedupe on — refuse the claim rather than let
    -- an unkeyable request silently consume a slot.
    select * into v_status from public.campaign_slots where id = p_campaign_id;
    return jsonb_build_object('claimed', false, 'reason', 'no_phone',
      'remaining', greatest(v_status.slots_total - v_status.slots_used, 0));
  end if;

  begin
    insert into public.campaign_slot_claims (campaign_id, phone_normalized, request_id)
    values (p_campaign_id, v_phone, p_request_id);
    v_claimed := true;
  exception when unique_violation then
    v_claimed := false; -- this phone already claimed a slot for this campaign
  end;

  if v_claimed then
    update public.campaign_slots
    set slots_used = least(slots_used + 1, slots_total)
    where id = p_campaign_id
    returning * into v_status;
  else
    select * into v_status from public.campaign_slots where id = p_campaign_id;
  end if;

  return jsonb_build_object(
    'claimed', v_claimed,
    'remaining', greatest(v_status.slots_total - v_status.slots_used, 0)
  );
end;
$$;
grant execute on function public.claim_campaign_slot(text, text, text) to anon, authenticated;
