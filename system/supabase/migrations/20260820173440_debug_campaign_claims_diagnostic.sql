-- TEMPORARY diagnostic RPC — identifies which claim(s) remain in
-- campaign_slot_claims so the dev-session cleanup can target them
-- precisely. Dropped again immediately after use in a follow-up
-- migration; not part of the permanent schema.
create or replace function public.debug_list_campaign_claims(p_campaign_id text)
returns jsonb
language sql
stable
security definer set search_path = public
as $$
  select jsonb_agg(jsonb_build_object(
    'claim_id', c.id,
    'phone', c.phone_normalized,
    'request_id', c.request_id,
    'customer_name', r.customer ->> 'name',
    'created_at', c.created_at
  ))
  from public.campaign_slot_claims c
  left join public.requests r on r.id = c.request_id
  where c.campaign_id = p_campaign_id;
$$;
grant execute on function public.debug_list_campaign_claims(text) to anon, authenticated;
