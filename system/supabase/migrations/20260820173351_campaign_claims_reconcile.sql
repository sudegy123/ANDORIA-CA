-- Broader reconciliation: catch any remaining automated-QA test claims
-- that weren't matched by the narrower name-equality cleanups (e.g. a
-- run whose customer name varied slightly), using a case-insensitive
-- pattern match on "QA" test-name markers, then recompute slots_used
-- from what's actually left so the public counter is exactly correct.
delete from public.campaign_slot_claims
where request_id in (
  select id from public.requests
  where customer ->> 'name' ilike '%qa%test%'
     or customer ->> 'name' ilike '%turn4%'
     or customer ->> 'name' ilike '%qa tester%'
);

update public.campaign_slots
set slots_used = (select count(*) from public.campaign_slot_claims where campaign_id = 'first_100_install')
where id = 'first_100_install';

update public.requests
set status = 'cancelled',
    notes = 'TEST DATA — created by an automated browser QA run during development. Not a real customer lead.'
where (customer ->> 'name' ilike '%qa%test%'
    or customer ->> 'name' ilike '%turn4%'
    or customer ->> 'name' ilike '%qa tester%')
  and status <> 'cancelled';
