-- Remove the test leads + campaign-slot claims created by this
-- session's automated browser QA run ("Turn4 QA"), recompute
-- slots_used from the actual remaining claim rows, and mark the
-- matching CRM requests as cancelled test data (requests can't be
-- deleted — append-only timeline_events cascade guard).
delete from public.campaign_slot_claims
where request_id in (select id from public.requests where customer ->> 'name' = 'Turn4 QA');

update public.campaign_slots
set slots_used = (select count(*) from public.campaign_slot_claims where campaign_id = 'first_100_install')
where id = 'first_100_install';

update public.requests
set status = 'cancelled',
    notes = 'TEST DATA — created by an automated browser QA run during development. Not a real customer lead.'
where customer ->> 'name' = 'Turn4 QA';
