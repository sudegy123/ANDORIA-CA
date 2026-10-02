-- TEMPORARY, read-only diagnostic — dropped in an immediate follow-up
-- migration after use.
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
    'status', r.status,
    'system', r.system,
    'created_at', c.created_at
  ) order by c.created_at)
  from public.campaign_slot_claims c
  left join public.requests r on r.id = c.request_id
  where c.campaign_id = p_campaign_id;
$$;
grant execute on function public.debug_list_campaign_claims(text) to anon, authenticated;
